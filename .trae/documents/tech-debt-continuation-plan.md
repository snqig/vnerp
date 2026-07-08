# ERP 技术债务清偿 — 续作计划

## Context

承接上一会话的部分执行结果。原计划见 `tech-debt-resolution-plan.md`（4 个 Sprint：A→B→C→D）。
本计划聚焦 **尚未完成** 的工作，避免与正在运行的后台 Agent 重复。

## 当前状态盘点（已验证）

### ✅ 已完成

| 项目 | 状态 |
|------|------|
| `src/app/global-error.tsx` | 已创建（完整 `<html><body>`，硬编码中文） |
| `src/app/[locale]/not-found.tsx` | 已创建 |
| `src/app/[locale]/error.tsx` | 已创建 |
| 16 个模块级 `error.tsx` | 已创建（sales/hr/finance/production/sample/purchase/settings/dashboard/quality/equipment/orders/outsource/dcprint/engineering/crm/plm/warehouse） |
| `src/middleware.ts` | 已清理 BLOCKED_ROUTES（移除 `/debug` `/test-api` `/diagnostic` `/test`） |
| `warehouse/inventory/page.tsx` authFetch | 已改为 import |
| `finance/receivable/page.tsx` authFetch | 已 import，但残留 `const authFetchFn = authFetch;` 冗余别名（L96） |

### 🔄 进行中（后台 Agent，勿重复）

| 项目 | Agent ID |
|------|----------|
| `warehouse/inbound/page.tsx` 拆分（2902 行） | d1791373-2829-42b3-86e6-288af58e9f56 |
| `hr/employee/page.tsx` 拆分（2156 行） | 8ddb2b69-4836-42fa-87a6-93baf9498c83 |

**注意**：这两个 Agent 在拆分过程中应同时删除原文件内联的 `authFetch`（warehouse/inbound L349, hr/employee L74）。本计划不再处理这两个文件的 authFetch。

### ❌ 待完成

1. **Sprint A.2 残留**：4 个调试目录尚未删除（`test-api/`, `debug/inbound/`, `diagnostic/`, `test/`）
2. **Sprint C.1 残留**：5 个文件的内联 authFetch 未替换 + 1 处冗余别名待清理
3. **Sprint C.2**：schema.sql 未重新导出
4. **Sprint D**：Drizzle ORM 覆盖未扩展（仍为 2/83 表）

---

## Sprint A.2: 删除调试目录（4 个）

**目标文件**：
- `src/app/[locale]/test-api/page.tsx`（及目录）
- `src/app/[locale]/debug/inbound/page.tsx`（及目录）
- `src/app/[locale]/diagnostic/page.tsx`（及目录）
- `src/app/[locale]/test/page.tsx`（及目录）

**前置检查**（已验证）：
- `src/middleware.ts` 已从 BLOCKED_ROUTES 移除这些路径
- Glob 确认这 4 个目录下仅有 page.tsx，无其他文件

**操作**：用 DeleteFile 工具递归删除 4 个 page.tsx 文件（目录会自动空）

**验证**：`npx tsc --noEmit` 通过，无 import 报错

---

## Sprint C.1: authFetch 集中化（5 文件 + 1 清理）

### C.1.1 `src/app/[locale]/finance/cost/page.tsx`

**当前**（L66-76）：
```tsx
const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}, []);
```

**改为**：
1. 文件顶部添加 `import { authFetch } from '@/lib/auth-fetch';`
2. 删除 L66-76 的 useCallback 块
3. 调用点（L86, L98）保持 `await authFetch(...)` 不变

### C.1.2 `src/app/[locale]/settings/roles/page.tsx`

**当前**（L111-121）：同上 useCallback 模式

**改为**：
1. 顶部添加 `import { authFetch } from '@/lib/auth-fetch';`
2. 删除 L111-121 的 useCallback 块
3. 移除 `useCallback` 的 import（若文件中无其他用途）
4. 14 个调用点保持不变

### C.1.3 `src/app/[locale]/purchase/orders/page.tsx`

**当前**（L137-147）：组件函数内定义的常规 async function（非 useCallback）

**改为**：
1. 顶部添加 `import { authFetch } from '@/lib/auth-fetch';`
2. 删除 L137-147 的函数定义
3. 调用点保持不变

### C.1.4 `src/hooks/useCompanyName.ts`

**当前**：自定义 `getAuthHeaders()` + `fetchWithRetry()` 两层封装（L10-36）

**改为**：
1. 顶部添加 `import { authFetch } from '@/lib/auth-fetch';`
2. 删除 `getAuthHeaders` 函数（L10-16）
3. 将 `fetchWithRetry` 改为基于 authFetch 的轻量包装（保留重试逻辑，但用 authFetch 替代裸 fetch）：
   ```ts
   const fetchWithRetry = async (url: string, retries = 2): Promise<Response | null> => {
     for (let i = 0; i <= retries; i++) {
       try {
         const res = await authFetch(url);
         if (res.status === 401) return null;
         if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
           return res;
         }
         if (i < retries) {
           await new Promise((r) => setTimeout(r, 500 * (i + 1)));
         }
       } catch {
         if (i < retries) {
           await new Promise((r) => setTimeout(r, 500 * (i + 1)));
         }
       }
     }
     return null;
   };
   ```
4. 其余调用点（`fetchWithRetry('/api/system/config?pageSize=200')`, `fetchWithRetry('/api/organization?type=company')`）保持不变

### C.1.5 `src/components/layout/sidebar.tsx`

**当前**（L303-323）：`debouncedSaveToDatabase` 内 `localStorage.getItem('token')` + 裸 `fetch`

**改为**：
1. 顶部添加 `import { authFetch } from '@/lib/auth-fetch';`
2. 将 L303-323 整个 `debouncedSaveToDatabase` 改为：
   ```ts
   const debouncedSaveToDatabase = useCallback((orders: MenuItem[]) => {
     const orderData = orders.map((m, index) => ({
       id: m.id,
       sort_order: index + 1,
     }));

     authFetch('/api/menu/sort-order', {
       method: 'POST',
       body: JSON.stringify({ orders: orderData }),
     }).catch(() => {});
   }, []);
   ```
3. 移除 token 检查（authFetch 内部已处理；未登录时 401 会触发 refresh 或跳转登录）

### C.1.6 `src/app/[locale]/finance/receivable/page.tsx` 清理

**当前**（L96）：`const authFetchFn = authFetch;`（冗余别名，无调用方使用 `authFetchFn`）

**改为**：删除 L96 这一行

### C.1 验证

- `npx tsc --noEmit` 通过
- `pnpm vitest run` 通过
- 手动测试：sidebar 拖拽排序、roles 页面 CRUD、purchase orders 列表、finance/cost 列表

---

## Sprint C.2: schema.sql 重新导出

**目标**：从已迁移的目标数据库导出最新 schema，覆盖 `database/vnerpdacahng_schema.sql`

**步骤**：

1. **创建导出脚本** `scripts/export-schema.mjs`：
   - 读取 `.env` 中的 `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`
   - 使用 `mysql2/promise` 执行 `SHOW TABLES`
   - 对每张表执行 `SHOW CREATE TABLE`
   - 拼接结果写入 `database/vnerpdacahng_schema.sql`（保留头部注释）

2. **运行脚本**：`node scripts/export-schema.mjs`

3. **验证指标**（用 grep 统计）：
   - FK 数量 ≥ 140（迁移 017/029-034 累计 ~147）
   - `utf8mb4_0900_ai_ci` 表占比 ≥ 70%
   - `BIGINT UNSIGNED` 主键占比 ≥ 90%
   - `deleted` 列存在表数 ≥ 40

4. **Diff 检查**：与 git HEAD 版本对比，确认变更仅为迁移补建内容

5. **全新 DB 验证**（可选）：在测试库执行 `pnpm setup:db`，确认无报错

**回滚**：如导出异常，`git checkout -- database/vnerpdacahng_schema.sql` 恢复

---

## Sprint D: Drizzle ORM 扩大覆盖

### D.1 扩展 `src/lib/db/schema.ts`

**现有**：2 表（`invInboundOrders`, `invInboundItems`）

**新增**（18 张表，按模块分组）。每张表遵循现有模式：`mysqlTable()` + `index()` + `$inferSelect` 类型导出。

**翻译依据**：`database/vnerpdacahng_schema.sql` 中对应表的 DDL

| 模块 | 表名 | Drizzle 变量名 | 优先级 |
|------|------|----------------|--------|
| warehouse | `inv_outbound_order` | `invOutboundOrders` | 高 |
| warehouse | `inv_outbound_item` | `invOutboundItems` | 高 |
| warehouse | `inv_transfer_order` | `invTransferOrders` | 中 |
| warehouse | `inv_stocktaking_order` | `invStocktakingOrders` | 中 |
| warehouse | `inv_inventory` | `invInventory` | 高 |
| warehouse | `inv_warehouse` | `invWarehouse` | 高 |
| sales | `sal_order` | `salOrder` | 高 |
| sales | `sal_order_detail` | `salOrderDetail` | 高 |
| sales | `sal_delivery` | `salDelivery` | 中 |
| sales | `sal_return_order` | `salReturnOrder` | 中 |
| sales | `sal_reconciliation` | `salReconciliation` | 中 |
| purchase | `pur_purchase_order` | `purPurchaseOrder` | 高 |
| purchase | `pur_purchase_order_detail` | `purPurchaseOrderDetail` | 高 |
| purchase | `pur_return_order` | `purReturnOrder` | 中 |
| purchase | `pur_reconciliation` | `purReconciliation` | 中 |
| finance | `fin_receivable` | `finReceivable` | 中 |
| finance | `fin_payable` | `finPayable` | 中 |
| production | `prd_work_order` | `prdWorkOrder` | 中 |

**文件组织**：schema.ts 按 9 个限界上下文分区块，每区块前加注释标题（如 `// ==================== 销售模块 ====================`）

**列类型映射规则**：
- `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY` → `serial('id').primaryKey()`
- `VARCHAR(n) NOT NULL` → `varchar('col', { length: n }).notNull()`
- `DECIMAL(p,s)` → `decimal('col', { precision: p, scale: s })`
- `DATETIME DEFAULT CURRENT_TIMESTAMP` → `datetime('col').default(sql\`CURRENT_TIMESTAMP\`)`
- `TINYINT(1) DEFAULT 0` → `boolean('col').default(false)`
- `INT` → `int('col')`
- `TEXT` → `text('col')`
- 索引：`index('idx_name').on(table.col1, table.col2)`

**验证**：每加一组表，运行 `npx tsc --noEmit` 确认类型正确

### D.2 创建 2 个示范 Drizzle 仓储

**目标**：在 `src/infrastructure/repositories/` 创建：

1. **`DrizzleSalesOrderRepository.ts`** — 实现 `ISalesOrderRepository`
   - 参考 `MysqlSalesOrderRepository.ts` 的查询语义
   - 使用 `drizzleDb.query.salOrder.findFirst` + `inArray` 加载明细
   - findById / findByStatus / save / updateStatus / softDelete 5 个方法
   - 字段映射与 `DrizzleInboundOrderRepository.ts` 模式一致

2. **`DrizzlePurchaseOrderRepository.ts`** — 实现 `IPurchaseOrderRepository`
   - 同上模式
   - 状态映射：DB code（10/20/30/40/50/90）↔ Domain 状态值对象

**接口位置**：
- `src/domain/sales/repositories/ISalesOrderRepository.ts`
- `src/domain/purchase/repositories/IPurchaseOrderRepository.ts`

**并行运行策略**：
- 不替换现有 `MysqlSalesOrderRepository` / `MysqlPurchaseOrderRepository`
- 通过环境变量 `REPOSITORY_IMPL=drizzle|mysql` 切换（默认 mysql）
- 切换点在 `src/infrastructure/RepositoryRegistry.ts`（或等价的服务注册处）

**验证**：
- `npx tsc --noEmit` 通过
- 编写对比测试 `tests/drizzle-vs-mysql-repository.test.ts`：
  - 同一 DB 数据，分别用两个仓储查询，断言结果一致
  - 覆盖 findById / findByStatus 两个核心查询

### D.3 清理 `drizzle/` 废弃目录

**删除**：
- `drizzle/DEPRECATED.md`
- `drizzle/0000_chilly_retro_girl.sql`
- `drizzle/0001_ordinary_valkyrie.sql`
- `drizzle/meta/_journal.json`
- `drizzle/meta/0000_snapshot.json`
- `drizzle/meta/0001_snapshot.json`
- `drizzle/` 目录本身

**保留**：
- `src/lib/db/schema.ts`（活跃使用）
- `src/lib/db/index.ts`（drizzleDb 导出）
- `src/infrastructure/repositories/Drizzle*Repository.ts`（3 个实现）

**更新文档**：在 `src/lib/db/schema.ts` 头部注释中追加说明："drizzle-kit 迁移路径已废弃，ORM 查询构建器活跃使用中"

### D.4 长期路线图（本 Sprint 不完成，仅记录）

- Phase 2: 为剩余 65+ 张表添加 schema 定义
- Phase 3: 将 15 个 MySQL 仓储迁移为 Drizzle 仓储
- Phase 4: 统一切换到 Drizzle 仓储，删除 MySQL 仓储
- Phase 5: 评估 `drizzle-kit push` 作为迁移工具的可行性

---

## 执行顺序

```
1. Sprint A.2（删除 4 个调试目录）— 5 分钟
2. Sprint C.1（5 文件 authFetch 替换 + 1 冗余清理）— 30 分钟
3. 等待后台 Agent 完成 Sprint B（warehouse/inbound + hr/employee 拆分）
4. Sprint C.2（schema.sql 导出脚本 + 运行 + 验证）— 20 分钟
5. Sprint D.1（schema.ts 扩展 18 表）— 60 分钟
6. Sprint D.2（2 个 Drizzle 仓储 + 对比测试）— 60 分钟
7. Sprint D.3（清理 drizzle/ 目录）— 5 分钟
8. 最终验证：tsc --noEmit + vitest run + pnpm build
```

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 后台 Agent 拆分结果与预期不符 | Agent 完成后用 `npx tsc --noEmit` 验证，发现问题再补救 |
| authFetch 替换改变 401 行为 | authFetch 有 401-refresh 逻辑，是改进；测试覆盖 |
| schema.sql 导出与迁移不一致 | Diff 检查 + 全新 DB 执行 setup:db |
| Drizzle schema 列类型翻译错误 | 每加一组表跑 tsc；对比 MySQL DDL |
| Drizzle 仓储查询结果与 MySQL 不一致 | 对比测试覆盖 |
| drizzle/ 目录删除影响构建 | drizzle-kit 迁移已废弃，不影响 ORM 查询；tsc + build 验证 |

## 假设与决策

1. **后台 Agent 会处理 warehouse/inbound 和 hr/employee 中的内联 authFetch** — 本计划不重复处理
2. **Drizzle 扩大覆盖（非弃用）** — 用户已决策
3. **schema.sql 导出使用 mysql2 而非 mysqldump** — 避免依赖外部二进制，跨平台兼容
4. **新 Drizzle 仓储与 MySQL 仓储并存** — 通过环境变量切换，不破坏现有功能
5. **不处理 P2 任务**（any 类型、next/image、代码分割）— 本季度改进项，非本周紧急
