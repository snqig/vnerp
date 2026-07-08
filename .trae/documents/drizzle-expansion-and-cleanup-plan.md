# Drizzle ORM 扩大覆盖 + 废弃目录清理 计划

## 背景与上下文

承接前序会话已完成的 P0/P1 工作（错误边界、authFetch 集中化、schema.sql 重导出、Sprint D.1 schema.ts 扩展至 20 表）。
本计划聚焦 **Sprint D.2/D.3 + 最终验证**，目标：把 Drizzle ORM 覆盖率从 2.4% 扩大至示范水平（3 个仓储），清理 `drizzle/` 废弃目录，并通过 tsc + vitest + build 三重验证。

### 当前状态盘点（Phase 1 已验证）

| 项 | 状态 | 证据 |
|----|------|------|
| `src/lib/db/schema.ts` | ✅ 已扩展至 20 表（619 行） | 20 个 `mysqlTable` export，覆盖 warehouse 8 + sales 5 + purchase 4 + finance 2 + production 1 |
| `src/lib/db/index.ts` | ✅ 已导出 `drizzleDb`、`transaction` | L407: `drizzle({ client: getPool(), schema, mode: 'default' })` |
| `DrizzleInboundOrderRepository` | ⚠️ 存在但**从未被实例化** | grep `new DrizzleInboundOrderRepository` 返回 0 条 |
| `MysqlSalesOrderRepository` | ⚠️ 存在但**从未被实例化** | grep `new MysqlSalesOrderRepository` 返回 0 条；`/api/orders/sales/route.ts` 与 `/api/sales/orders/route.ts` 均走裸 SQL |
| `MysqlInboundOrderRepository` 接入点 | ✅ 2 处 | `src/app/api/warehouse/inbound/route.ts:19`、`src/app/api/sales/return/route.ts:18-22` |
| `MysqlPurchaseOrderRepository` 接入点 | ✅ 1 处 | `src/app/api/purchase/orders/route.ts:20` |
| `drizzle/` 目录 | ❌ 6 个废弃文件待删 | `DEPRECATED.md` + 2 SQL + 3 meta JSON |
| `REPOSITORY_IMPL` 环境变量 | ❌ 未使用 | grep 仅在 `.trae/documents/` 历史计划中出现，运行时代码 0 引用 |
| 后台 dev server | 🔄 仍在运行 | job-bfbf0171d9e6407e9ceb0f69d3560f76（next dev），HMR 编译正常 |

### 接入模式参考

3 个 API 路由均使用「工厂函数 + DI」模式，例如：

```ts
// src/app/api/warehouse/inbound/route.ts
function getInboundService(): InboundApplicationService {
  registerEventHandlers();
  const orderRepo = new MysqlInboundOrderRepository();  // ← 替换点
  return new InboundApplicationService(orderRepo);
}
```

替换为：
```ts
const orderRepo = RepositoryRegistry.getInboundOrderRepository();
```

---

## Sprint D.2：创建 2 个 Drizzle 仓储 + RepositoryRegistry

### D.2.1 创建 `DrizzleSalesOrderRepository.ts`

**文件**：`src/infrastructure/repositories/DrizzleSalesOrderRepository.ts`（新建）

**实现接口**：`ISalesOrderRepository`（7 方法）
- `findById(id)` → `drizzleDb.query.salOrder.findFirst` + `inArray` 加载 `salOrderDetail`
- `findByStatus(status, pagination, filters)` → `select + where(and(...)) + orderBy(desc) + limit/offset`，count 单独查询，items 用 `inArray` 一次性加载
- `save(order)` → `transaction` 内 `drizzleDb.insert` 主表 + 批量 `insert` 明细
- `updateStatus(id, status, currentStatus)` → `drizzleDb.update().set().where(and(eq, eq))` 乐观锁
- `updateShippedQty(lineId, shippedQty)` → `drizzleDb.update(salOrderDetail).set({shippedQty}).where(eq(id))`
- `updateAuditInfo(id, auditBy, auditTime)` → `drizzleDb.update(salOrder).set({auditBy, auditTime}).where(eq(id))`
- `softDelete(id)` → `drizzleDb.update(salOrder).set({deleted: true}).where(eq(id))`

**字段映射参考**：
- `sal_order` schema 已在 schema.ts L241-270 定义（`salOrder` 导出）
- `sal_order_detail` schema 已在 schema.ts L273+ 定义（`salOrderDetail` 导出）
- 状态映射：使用 `SalesOrderStatus.from(domain).toDbCode()`（已有 value object，与 MysqlSalesOrderRepository 一致）

**模式参照**：`DrizzleInboundOrderRepository.ts`（含状态映射表、`inArray` 批量加载、`transaction` 包装）

### D.2.2 创建 `DrizzlePurchaseOrderRepository.ts`

**文件**：`src/infrastructure/repositories/DrizzlePurchaseOrderRepository.ts`（新建）

**实现接口**：`IPurchaseOrderRepository`（8 方法）
- `findById(id)` / `findByOrderNo(orderNo)` → 两个 findFirst 查询
- `findByStatus(status, pagination, filters)` → 同 Sales 模式
- `save(order)` → `transaction` 内插入 `pur_purchase_order` + 批量插入 `pur_purchase_order_line`
- `updateStatus(id, status, currentStatus)` → 乐观锁 UPDATE
- `updateReceivedQty(lineId, receivedQty)` → UPDATE `pur_purchase_order_line`
- `updateAuditInfo(id, auditBy, auditTime)` → UPDATE `pur_purchase_order`
- `softDelete(id)` → 软删除

**字段映射参考**：
- `pur_purchase_order` schema 在 schema.ts L399+ 定义（`purPurchaseOrder` 导出，**注意 PK 是 `int unsigned autoincrement`**，非 `serial`）
- `pur_purchase_order_line` schema 在 schema.ts L439+ 定义（`purPurchaseOrderLine` 导出）
- 状态映射：使用 `PurchaseOrderStatus.from(domain).toDbCode()`（已有 value object）

### D.2.3 创建 `RepositoryRegistry.ts`

**文件**：`src/infrastructure/RepositoryRegistry.ts`（新建）

**职责**：基于 `REPOSITORY_IMPL` 环境变量返回 Drizzle 或 MySQL 仓储实例，默认 `mysql` 保持向后兼容。

**实现骨架**：
```ts
import { MysqlInboundOrderRepository } from './repositories/MysqlInboundOrderRepository';
import { DrizzleInboundOrderRepository } from './repositories/DrizzleInboundOrderRepository';
import { MysqlSalesOrderRepository } from './repositories/MysqlSalesOrderRepository';
import { DrizzleSalesOrderRepository } from './repositories/DrizzleSalesOrderRepository';
import { MysqlPurchaseOrderRepository } from './repositories/MysqlPurchaseOrderRepository';
import { DrizzlePurchaseOrderRepository } from './repositories/DrizzlePurchaseOrderRepository';
import { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
import { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';

type ImplType = 'mysql' | 'drizzle';
const impl: ImplType = (process.env.REPOSITORY_IMPL as ImplType) === 'drizzle' ? 'drizzle' : 'mysql';

export const RepositoryRegistry = {
  getInboundOrderRepository(): IInboundOrderRepository {
    return impl === 'drizzle' ? new DrizzleInboundOrderRepository() : new MysqlInboundOrderRepository();
  },
  getSalesOrderRepository(): ISalesOrderRepository {
    return impl === 'drizzle' ? new DrizzleSalesOrderRepository() : new MysqlSalesOrderRepository();
  },
  getPurchaseOrderRepository(): IPurchaseOrderRepository {
    return impl === 'drizzle' ? new DrizzlePurchaseOrderRepository() : new MysqlPurchaseOrderRepository();
  },
};
```

**关键决策**：
- 默认 `mysql` — 零行为变更，Drizzle 路径仅在显式设置 `REPOSITORY_IMPL=drizzle` 时启用
- 每次调用 `new` — 与现有「工厂函数每次构造」模式一致，不引入单例缓存（避免测试间状态泄漏）
- 仅暴露 3 个有 Drizzle 对应实现的仓储 — 其他 15 个 MySQL 仓储保持直接 `new` 调用，不在本次扩展范围

### D.2.4 重构 3 个 API 路由接入点

| 文件 | 行号 | 旧代码 | 新代码 |
|------|------|--------|--------|
| `src/app/api/warehouse/inbound/route.ts` | L19 | `const orderRepo = new MysqlInboundOrderRepository();` | `const orderRepo = RepositoryRegistry.getInboundOrderRepository();` |
| `src/app/api/sales/return/route.ts` | L20 | `new MysqlInboundOrderRepository(),`（在 `ReturnOrderApplicationService` 构造参数中） | `RepositoryRegistry.getInboundOrderRepository(),` |
| `src/app/api/purchase/orders/route.ts` | L20 | `const orderRepo = new MysqlPurchaseOrderRepository();` | `const orderRepo = RepositoryRegistry.getPurchaseOrderRepository();` |

**Import 调整**：
- 移除 `import { MysqlInboundOrderRepository } from '@/infrastructure/repositories/MysqlInboundOrderRepository';`
- 移除 `import { MysqlPurchaseOrderRepository } from '@/infrastructure/repositories/MysqlPurchaseOrderRepository';`
- 添加 `import { RepositoryRegistry } from '@/infrastructure/RepositoryRegistry';`

**Sales 路由说明**：
- `/api/orders/sales/route.ts` 与 `/api/sales/orders/route.ts` **不修改** — 它们走裸 SQL，未使用任何 Repository
- `RepositoryRegistry.getSalesOrderRepository()` 暴露但当前无调用方，与 `MysqlSalesOrderRepository` 现状一致（dead code，待后续 Sales 路由重构时接入）
- 在 `DrizzleSalesOrderRepository.ts` 头部注释说明此情况

---

## Sprint D.3：清理 `drizzle/` 废弃目录

**删除 6 个文件**（用 DeleteFile 工具，禁止用 shell `rm`）：

1. `drizzle/DEPRECATED.md`
2. `drizzle/0000_chilly_retro_girl.sql`
3. `drizzle/0001_ordinary_valkyrie.sql`
4. `drizzle/meta/_journal.json`
5. `drizzle/meta/0000_snapshot.json`
6. `drizzle/meta/0001_snapshot.json`

**保留**：
- `src/lib/db/schema.ts` — 活跃使用（被 `src/lib/db/index.ts` 导入，drizzleDb 实例依赖）
- `src/lib/db/index.ts` — 活跃使用（导出 drizzleDb、transaction）
- `src/infrastructure/repositories/Drizzle*Repository.ts` — 3 个实现（Inbound + Sales + Purchase）

**前置检查**：
- grep `from '.*drizzle/'` 或 `import.*drizzle/` 在 `src/` 中应返回 0 条（已验证仅 `.trae/documents/` 中有历史引用）
- 检查 `package.json` 中是否有 `drizzle-kit` 相关 scripts（如 `db:generate`、`db:push`），如有则一并清理

**头部注释更新**：`src/lib/db/schema.ts` L9 已有注释 "drizzle-kit 迁移路径已废弃（drizzle/ 目录已清理），ORM 查询构建器活跃使用中" — 删除目录后此注释由预言变为事实，无需修改

---

## 最终验证

按顺序执行（每步通过才进入下一步）：

1. **TypeScript 类型检查**
   ```
   npx tsc --noEmit
   ```
   预期：0 errors, 0 warnings
   失败处理：根据报错定位到 Drizzle 仓储或 schema.ts 字段映射问题，逐一修复

2. **单元测试**
   ```
   pnpm vitest run
   ```
   预期：与上次基线一致（82 文件 / 1505 用例通过，8 skipped）
   失败处理：若新增 Drizzle 仓储引入测试失败，检查 RepositoryRegistry 默认值是否为 `mysql`

3. **生产构建**
   ```
   pnpm build
   ```
   预期：构建成功，无 lint 警告
   失败处理：检查 Next.js standalone 输出是否被 drizzle/ 删除影响（应无影响，drizzle/ 不在 src/ 中）

4. **手动抽样验证**（dev server 已在运行）
   - 访问 `http://localhost:5000/warehouse/inbound` — 列表加载正常
   - 访问 `http://localhost:5000/purchase/orders` — 列表加载正常
   - 访问 `http://localhost:5000/sales/return` — 列表加载正常
   - 默认 `REPOSITORY_IMPL` 未设置 → 仍走 MySQL 仓储，行为不变

---

## 假设与决策

1. **`REPOSITORY_IMPL` 默认 `mysql`** — 零行为变更，Drizzle 路径仅作为 opt-in 验证，不在本次切换为生产默认
2. **不修改 Sales orders 路由** — 该路由走裸 SQL，从未使用 `MysqlSalesOrderRepository`；本次仅创建 `DrizzleSalesOrderRepository` 作为参考实现，待后续 Sales 路由重构时统一接入
3. **仅接入 3 个有 Drizzle 对应的仓储** — 其他 15 个 MySQL 仓储（Return、Receivable、Payable、Delivery、Reconciliation、Outbound、Transfer、Stocktaking、WorkOrder、Voucher、DomainEventOutbox、Unqualified、StandardCard、PurchaseReturn、PurchaseReconciliation）保持现状，不在本次扩展范围
4. **不引入单例缓存** — `RepositoryRegistry.getXxx()` 每次返回新实例，与现有「工厂函数每次 new」模式一致，避免测试间状态泄漏
5. **`DrizzleInboundOrderRepository` 一并接入 Registry** — 即使它原本是「演示性实现」，本次借 Registry 接入将其激活，与 Sales/Purchase 对齐
6. **schema.ts 不再单独验证** — 用户决策：合并到最终验证统一跑 tsc

---

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Drizzle 仓储字段映射错误（如 `salOrder.customerId` 拼错） | 中 | 类型检查失败 | 严格对照 schema.ts 中导出的字段名；tsc 会立即报错 |
| `pur_purchase_order` PK 类型特殊（int 而非 bigint）导致 Drizzle 查询类型不匹配 | 中 | 类型检查失败 | schema.ts L399 已用 `int('id', { unsigned: true }).autoincrement().primaryKey()`，与 DDL 一致 |
| `transaction()` 内 `conn.execute` 与 Drizzle `drizzleDb.transaction` 混用 | 低 | 事务语义不一致 | 沿用 `DrizzleInboundOrderRepository` 的既有模式（`transaction` 包装 + `conn.execute` raw SQL），保持兼容 |
| 删除 `drizzle/` 影响构建 | 极低 | build 失败 | 已验证 `src/` 中无 import 引用 `drizzle/` 目录；该目录仅含 drizzle-kit 历史迁移产物 |
| `REPOSITORY_IMPL=drizzle` 时 Drizzle 仓储查询结果与 MySQL 不一致 | 中 | 业务数据错误 | 默认 `mysql`；Drizzle 路径仅手动 opt-in 验证；后续可加对比测试 |
| 后台 dev server HMR 缓存旧 schema.ts | 低 | 验证时类型报错与运行时不符 | 验证前重启 dev server |

---

## 回滚策略

- **代码回滚**：所有变更均在新文件或工厂函数替换层，未触碰 Domain/Application 层逻辑。`git checkout -- src/app/api/warehouse/inbound/route.ts src/app/api/sales/return/route.ts src/app/api/purchase/orders/route.ts` + 删除新建文件即可完全回滚
- **数据回滚**：本计划不涉及数据库变更，无需数据回滚
- **drizzle/ 目录回滚**：`git checkout -- drizzle/` 即可恢复

---

## 执行顺序（建议 TodoList）

```
1. [D.2.1] 创建 DrizzleSalesOrderRepository.ts
2. [D.2.2] 创建 DrizzlePurchaseOrderRepository.ts
3. [D.2.3] 创建 RepositoryRegistry.ts
4. [D.2.4] 重构 3 个 API 路由接入点
5. [D.3]    删除 drizzle/ 目录 6 个废弃文件
6. [验证]   tsc → vitest → build → 手动抽样
7. [收尾]   更新 TaskList，标记 #27/#28/#29/#30 完成
```
