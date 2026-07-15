# Print MIS 多数据库兼容精细化方案（落地方案，已实施）

> 本文档为「Print MIS 数据库访问层精细化」的落地方案，基于 2026-07-10 代码事实核对。所有引用路径均为实际存在的代码位置。
>
> **重要说明**：早期方案设想「MySQL / PostgreSQL / SQL Server 三库兼容」的路线**未实施**。实际落地路线为：**Drizzle ORM（MySQL 方言）查询构建器全面激活 + drizzle-kit 迁移路径废弃 + 仓储实现可切换（REPOSITORY_IMPL 环境变量）**。本文档已重写为反映实际落地状态。

 **适配基线**：Print MIS v0.2.0 现有架构（Next.js 16 + Drizzle ORM 0.45.1 + mysql2 3.20 + DDD 分层 + MySQL 8.0）

 **实际兼容目标**：MySQL 8.0+（唯一支持数据库），通过 Drizzle ORM 提供类型安全查询构建器，仓储层支持 MySQL raw SQL 与 Drizzle ORM 两种实现切换

 **核心约束**：领域层 / 应用层零修改，所有数据库差异封装在基础设施层；不破坏现有 CI 质量门禁

---

## 一、整体设计原则（实际落地）

1. **分层隔离原则**：100% 遵循 DDD 分层规范，数据库访问内聚在 `src/lib/db/` 与 `src/infrastructure/repositories/`，领域层、应用层、API 层通过仓储接口访问数据
2. **最小侵入原则**：保留原有 MySQL raw SQL（`query`/`execute`/`transaction`）入口，新增 Drizzle ORM 查询构建器作为类型安全补充，业务代码可渐进迁移
3. **配置化切换原则**：通过单个环境变量 `REPOSITORY_IMPL`（默认 `mysql`，可设 `drizzle`）切换仓储实现，无需修改业务代码
4. **迁移路径分离原则**：drizzle-kit 迁移路径（`db:generate` / `db:push` / `db:migrate`）已废弃并打印警告；权威 schema 来源为 `database/vnerpdacahng_schema.sql`，增量迁移走 `database/migrations/001-060` + `scripts/migrate.ts`

---

## 二、架构层实际落地

### 2.1 目录结构（实际）

```
src/lib/db/
├── index.ts                  # mysql2 连接池单例 + Drizzle ORM 实例 + query/execute/transaction CRUD 辅助
└── schema.ts                 # 66 张 Drizzle ORM 消费表定义（mysqlTable）

src/infrastructure/
├── RepositoryRegistry.ts     # 仓储工厂注册中心（REPOSITORY_IMPL 切换入口）
├── repositories/
│   ├── Mysql*Repository.ts   # 18 个 MySQL raw SQL 仓储实现（默认）
│   └── Drizzle*Repository.ts # 3 个 Drizzle ORM 仓储实现（SalesOrder/PurchaseOrder/InboundOrder）
└── event-bus/                # 事件总线（与数据库无关）

database/
├── vnerpdacahng_schema.sql   # 权威 schema SQL（SHOW CREATE TABLE 导出）
└── migrations/
    └── 001-060_*.sql         # 增量迁移脚本（scripts/migrate.ts 执行）
```

> 早期方案设想的 `src/infrastructure/database/{dialects/{mysql,postgres,mssql},builders,functions}/` 多方言目录结构**未创建**。

### 2.2 数据库客户端实现（`src/lib/db/index.ts`）

实际实现为 MySQL 专用，未做多数据库工厂：

- **连接池**：`mysql.createPool(dbConfig)` 全局单例（防热重载重复创建），配置：`connectionLimit=20`、`maxIdle=10`、`idleTimeout=30000`、`queueLimit=100`、`connectTimeout=8000`
- **Drizzle 实例**：`drizzle({ client: getPool(), schema, mode: 'default' })`（drizzle-orm 0.45.x 仅识别 `client` 参数）
- **配置来源**：`DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` 环境变量（默认 `127.0.0.1:3306` / `vnerpdacahng`）
- **查询 API**：`query<T>()`（参数化 SELECT，2 次重试）、`execute()`（INSERT/UPDATE/DELETE）、`queryOne()`、`queryPaginated()`、`transaction()`、`transactionWithRetry()`（乐观锁冲突指数退避）
- **安全**：所有查询使用 `?` 占位符参数化，防 SQL 注入

### 2.3 仓储实现切换（`src/infrastructure/RepositoryRegistry.ts`）

通过 `REPOSITORY_IMPL` 环境变量切换仓储实现，覆盖 3 个有 Drizzle 对应实现的仓储：

```typescript
const impl: ImplType =
  (process.env.REPOSITORY_IMPL as ImplType) === 'drizzle' ? 'drizzle' : 'mysql';

export const RepositoryRegistry = {
  getInboundOrderRepository(): IInboundOrderRepository { ... },   // DrizzleInboundOrderRepository | MysqlInboundOrderRepository
  getSalesOrderRepository(): ISalesOrderRepository { ... },        // DrizzleSalesOrderRepository | MysqlSalesOrderRepository
  getPurchaseOrderRepository(): IPurchaseOrderRepository { ... },  // DrizzlePurchaseOrderRepository | MysqlPurchaseOrderRepository
  getActiveImpl(): ImplType { return impl; },
};
```

其他 15 个仓储（Return/Receivable/Payable/Delivery/Reconciliation/WorkOrder/PickOrder/FinishOrder/WorkReport/Transfer/Stocktaking/Tool/SampleOrder/SampleProcessCard/Schedule 等）保持直接 `new Mysql*Repository()` 调用，不在本次扩展范围。

### 2.4 类型一致性保障

- TypeScript 层返回类型统一：`bigint` 主键通过 `{ mode: 'number', unsigned: true }` 转为 `number`、日期为 `Date` / `string`、布尔值为 `boolean`
- 所有仓储接口返回类型统一，业务层无需做任何类型判断与兼容
- Drizzle 仓储通过 `typeof table.$inferSelect` 推导行类型

---

## 三、Schema 层实际落地

### 3.1 Drizzle ORM 消费表（`src/lib/db/schema.ts`，66 张）

> 2026-07-14 更新：Schema 对齐补全后从 **42 张 → 66 张**（新增 15 张 `prd_` 生产基础资料表 + 已存在但未入表的 9 张表）。权威 SQL 来源：`database/vnerpdacahng_schema.sql`。

| 域 | 表数 | 表清单 |
| --- | --- | --- |
| 仓库 `inv_` | 10 | `inv_material`、`inv_inventory_batch`、`inv_inbound_order`、`inv_inbound_item`、`inv_warehouse`、`inv_inventory`、`inv_outbound_order`、`inv_outbound_item`、`inv_transfer_order`、`inv_stocktaking` |
| 销售 `sal_` | 9 | `sal_order`、`sal_order_detail`、`sal_delivery`、`sal_return_order`、`sal_reconciliation`、`sal_quote`、`sal_quote_item`、`sal_sample_feedback`、`sal_sample_quotation` |
| 采购 `pur_` | 4 | `pur_purchase_order`、`pur_purchase_order_line`、`pur_purchase_return`、`pur_purchase_reconciliation` |
| 财务 `fin_` | 2 | `fin_receivable`、`fin_payable` |
| 生产 `prd_`/`prod_` | 28 | `prd_work_order`、`prod_work_order`、`prod_work_order_item`、`prod_work_order_material_req`、`prd_schedule`、`prd_schedule_detail`、`prd_pick_order`、`prd_pick_order_item`、`prd_return_order`、`prd_return_order_item`、`prd_work_report`、`prd_finish_order`、`prd_work_order_bom`、`prd_standard_card`、`prd_product_label`、`prd_bom`、`prd_bom_detail`、`prd_bom_std`、`prd_bom_line_std`、`prd_die`、`prd_die_template`、`prd_ink`、`prd_screen_plate`、`prd_process_card`、`prd_process_card_material`、`prd_process_route`、`prd_process_route_step`、`prd_work_order_color_seq` |
| 印前 `dcprint_` | 12 | `dcprint_ink_color`、`dcprint_ink_formula_version`、`dcprint_ink_formula_item`、`dcprint_tool`、`dcprint_tool_usage`、`dcprint_tool_maintenance`、`dcprint_sample_process_template`、`dcprint_sample_process_template_item`、`dcprint_sample_process_template_step`、`dcprint_sample_process_card`、`dcprint_sample_process_item`、`dcprint_sample_process_step` |
| 打样 `sample_` | 1 | `sample_order` |

**遗留表（经原始 SQL 管理，非 Drizzle）**：`sys_user`、`sys_role`、`sys_permission`、`sys_menu`、`sys_config`、`sys_dict_type`、`sys_dict_data`、`sys_oper_log`、`sys_login_log`、`sys_event_processed`、`domain_event_outbox`、`hr_employee`、`hr_department`、`qc_inspection`、`qc_unqualified_product`、`material`、`material_category`、`supplier`、`customer`、`bom`、`bom_item`、`equipment` 等（具体以 `database/vnerpdacahng_schema.sql` 为准）。

### 3.2 公共字段约定

所有 Drizzle 消费表遵循：`id`（`serial` / `bigint unsigned` PK）+ `create_by`/`update_by`（`bigint unsigned`）+ `create_time`/`update_time`（`datetime default CURRENT_TIMESTAMP`）+ `deleted`（`boolean` 软删除）+ 索引（`index` / `uniqueIndex`）。

### 3.3 索引与约束

- 普通 B 树索引：Drizzle `index('idx_xxx').on(table.col)`
- 唯一索引：Drizzle `uniqueIndex('uk_xxx').on(table.col)`
- 联合索引：多列 `.on(table.a, table.b)`
- 外键约束：通过 SQL DDL 管理（`database/vnerpdacahng_schema.sql`），Drizzle schema 不强制定义外键

---

## 四、SQL 查询兼容层（实际落地）

### 4.1 两种查询风格并存

| 风格 | 入口 | 使用场景 | 覆盖范围 |
| --- | --- | --- | --- |
| MySQL raw SQL（参数化） | `query` / `execute` / `queryOne` / `queryPaginated` / `transaction` | 复杂联表、账龄分析、报表统计、仓储实现 | 18 个 Mysql*Repository + 大量 API 路由直连 |
| Drizzle ORM 查询构建器 | `drizzleDb.select().from(table).where(eq(...))` | 类型安全 CRUD、简单查询 | 3 个 Drizzle*Repository + 部分 API 路由 |

### 4.2 复杂查询处理

账龄分析、损耗统计、报表等复杂原生 SQL 查询，下沉到仓储实现层，直接使用 MySQL 方言：

```typescript
// 示例：MysqlReceivableRepository 中的账龄查询
const rows = await query(`
  SELECT 
    CASE 
      WHEN DATEDIFF(CURDATE(), bill_date) <= 30 THEN '0-30'
      WHEN DATEDIFF(CURDATE(), bill_date) <= 60 THEN '31-60'
      ...
    END AS aging_bucket,
    SUM(balance) AS total
  FROM fin_receivable
  WHERE deleted = 0
  GROUP BY aging_bucket
`);
```

### 4.3 分页与事务

- **分页**：`queryPaginated()` 自动生成 `COUNT` 查询 + `LIMIT ? OFFSET ?`，支持旧格式 `(sql, values, page, pageSize)` 与新格式 `(sql, countSql, values, pagination)`
- **事务**：`transaction()` 自动 `beginTransaction` / `commit` / `rollback`，连接在 `finally` 中释放
- **乐观锁重试**：`transactionWithRetry()` 检测「已被其他操作修改」/ `affectedRows` / `version` 关键字，指数退避重试（`min(100 * 2^attempt + random(0-50), 1000)ms`），默认 3 次

---

## 五、迁移体系（实际落地）

### 5.1 drizzle-kit 迁移路径已废弃

> `drizzle/` 目录已清理。`package.json` 中 `db:generate` / `db:push` / `db:migrate` 命令保留但打印废弃警告，引导使用 `setup:db` / `migrate`。

| 命令 | 用途 | 状态 |
| --- | --- | --- |
| `pnpm setup:db` | 全量初始化（`node scripts/setup-db.mjs`，建库 + 导入 schema + 可选 seed） | ✅ 推荐 |
| `pnpm migrate` | 增量迁移（`npx tsx scripts/migrate.ts`，up/down/status/create） | ✅ 推荐 |
| `pnpm migrate:status` | 查看迁移状态 | ✅ |
| `pnpm db:studio` | Drizzle Studio（可视化查询） | ✅ 辅助 |
| `pnpm db:generate` / `db:push` / `db:migrate` | drizzle-kit 迁移 | ❌ 已废弃（打印警告） |

### 5.2 增量迁移规范（`database/migrations/001-060`）

- **编号**：`001`-`060`，三位数字前缀 + 下划线 + 描述
- **执行器**：`scripts/migrate.ts`（up/down/status/create，按 `;` 拆分，记录 applied 不管单条失败——故迁移须幂等，用 `INFORMATION_SCHEMA` 守卫）
- **近期新增 053-060**：
  - `053_add_tool_columns_to_work_report.sql` / `053_enhance_sample_order.sql`
  - `054_add_work_order_cumulative_fields.sql` / `054_enhance_production_tables.sql`
  - `055_add_prd_schedule_indexes.sql`
  - `056_expand_tool_unified_fields.sql`
  - `057_unify_pk_to_bigint.sql`（PK 统一 `bigint unsigned`）
  - `058_unify_collation.sql`（统一 `utf8mb4_0900_ai_ci`）
  - `059_add_missing_indexes.sql`
  - `060_unify_status_codes.sql`（状态码统一）

### 5.3 权威 schema 来源

`database/vnerpdacahng_schema.sql`（从目标数据库 `SHOW CREATE TABLE` 导出）为权威 DDL 来源。`src/lib/db/schema.ts` 中 Drizzle 表定义从该 SQL 翻译而来，新增 ORM 消费表时从 SQL DDL 对应翻译并追加。

---

## 六、现有代码改造清单（实际落地）

### 6.1 已完成改造

| 文件路径 | 改造内容 | 状态 |
| --- | --- | --- |
| `src/lib/db/index.ts` | mysql2 连接池单例 + Drizzle ORM 实例 + `query`/`execute`/`transaction`/`queryPaginated` 全套 API | ✅ |
| `src/lib/db/schema.ts` | 66 张 Drizzle ORM 消费表定义（`mysqlTable`） | ✅ |
| `src/infrastructure/RepositoryRegistry.ts` | `REPOSITORY_IMPL` 环境变量切换 3 个仓储实现 | ✅ |
| `src/infrastructure/repositories/DrizzleSalesOrderRepository.ts` | Drizzle ORM 实现销售订单仓储，修复 MysqlSalesOrderRepository 查询不存在列的 SQL 错误 | ✅ |
| `src/infrastructure/repositories/DrizzlePurchaseOrderRepository.ts` | Drizzle ORM 实现采购订单仓储 | ✅ |
| `src/infrastructure/repositories/DrizzleInboundOrderRepository.ts` | Drizzle ORM 实现入库单仓储 | ✅ |
| `scripts/setup-db.mjs` | 全量初始化脚本 | ✅ |
| `scripts/migrate.ts` | 增量迁移执行器（up/down/status/create） | ✅ |
| `package.json` scripts | `setup:db` / `migrate` / `migrate:down` / `migrate:status` / `migrate:create` / `db:studio`；废弃 `db:generate` / `db:push` / `db:migrate` | ✅ |

### 6.2 未改造（早期方案设想但未实施）

| 早期方案项 | 状态 | 说明 |
| --- | --- | --- |
| PostgreSQL 兼容 | ⬜ 未实施 | 无 `dialects/postgres/` 目录，无 PG 字段构造器与函数适配 |
| SQL Server 兼容 | ⬜ 未实施 | 无 `dialects/mssql/` 目录，无 SQL Server 字段构造器与函数适配 |
| 通用字段构造器（`CommonFields` 接口） | ⬜ 未实施 | 各表直接使用 `mysqlTable` 定义，未抽象通用字段构造器 |
| 通用 SQL 函数封装（`dbNow`/`dbDateAdd`/`dbJsonGet` 等） | ⬜ 未实施 | 直接使用 MySQL 原生函数（`NOW()` / `DATE_ADD()` / `JSON_EXTRACT()`） |
| 多配置 drizzle-kit（`drizzle.mysql.config.ts` 等） | ⬜ 未实施 | drizzle-kit 迁移路径已废弃 |
| Testcontainers 三库集成测试 | ⬜ 未实施 | 仅 MySQL 测试 |
| Docker Compose 多环境（PG / MSSQL） | ⬜ 未实施 | 仅 MySQL 部署 |

### 6.3 无需改造的模块

- 所有领域层、应用层代码：完全不感知数据库差异（通过仓储接口访问）✅
- 领域事件、消息队列、缓存、认证等基础设施：与数据库无关 ✅
- 前端页面、API 路由：仅调用应用服务，无直接数据库操作（少数 API 路由直连 `query`/`execute` 仍属 MySQL 专用）✅

---

## 七、Drizzle 仓储实现示例（`DrizzleSalesOrderRepository.ts`）

```typescript
import { eq, and, like, or, gte, lte, desc, inArray, sql, count } from 'drizzle-orm';
import { drizzleDb } from '@/lib/db';
import { salOrder, salOrderDetail } from '@/lib/db/schema';
import { transaction } from '@/lib/db';
import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
import { SalesOrder, SalesOrderProps } from '@/domain/sales/aggregates/SalesOrder';

export class DrizzleSalesOrderRepository implements ISalesOrderRepository {
  async findById(id: number): Promise<SalesOrder | null> {
    const rows = await drizzleDb.select().from(salOrder).where(eq(salOrder.id, id)).limit(1);
    // ... 映射为 SalesOrder 聚合
  }
  // ... save / updateStatus / findByStatus / softDelete
}
```

> 已知架构缺口（`DrizzleSalesOrderRepository` 头部注释记录）：`SalesOrder` 聚合期望 `customerName/totalQuantity/warehouseId/auditBy/auditTime` 字段，但 `sal_order` 实际表无对应列，本仓储用合理默认值填充以保持聚合并发兼容；`SalesOrderLine` 期望 `materialCode/specification/shippedQty`，但 `sal_order_detail` 无对应列（仅有 `deliveredQty`），本仓储将 `shippedQty` 映射为 `deliveredQty`。

---

## 八、测试与验证体系（实际）

### 8.1 单元测试

- 仓储层测试：Vitest 单测覆盖仓储接口契约（`pnpm test:unit` / `pnpm test:coverage`）
- 通用函数测试：`query`/`execute`/`transaction` 行为验证

### 8.2 E2E 测试

- Playwright E2E（`pnpm test`）覆盖核心业务链路

### 8.3 业务回归用例

| 核心链路 | 验证点 |
| --- | --- |
| 采购 - 入库 - 应付 | 单据创建、审核、库存增减、应付生成、成本计算 |
| 销售 - 出库 - 应收 | 订单、发货、库存扣减、应收生成、FIFO 分配 |
| 生产 - 领料 - 完工 | 工单创建、领料扣库存、报工、完工入库、成本归集 |
| 印前模块 | 油墨配方、工装管理、打样工艺卡、版本流转 |
| 系统管理 | 用户、权限、登录、Token 黑名单、限流 |

---

## 九、部署与运维（实际）

### 9.1 环境变量清单

```env
# 数据库连接（MySQL 专用）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=vnerpdacahng
DB_USER=root
DB_PASSWORD=your_password

# 仓储实现切换
REPOSITORY_IMPL=mysql          # mysql（默认）/ drizzle

# 调试
DEBUG_DB=false                 # true 时打印 SQL 日志
```

### 9.2 数据库初始化

```bash
# 全量初始化（建库 + 导入 schema + 可选 seed）
pnpm setup:db

# 增量迁移
pnpm migrate
pnpm migrate:status

# 备份恢复
pnpm backup
pnpm backup:list
pnpm backup:restore
```

---

## 十、风险与回滚方案

### 10.1 核心风险与应对

| 风险 | 影响 | 应对方案 |
| --- | --- | --- |
| raw SQL 与 Drizzle 查询结果类型不一致 | 部分功能在两种实现下行为有差异 | 仓储接口统一返回聚合类型，Drizzle 仓储用默认值填充缺失字段 |
| MySQL 专用函数（`NOW()`/`JSON_EXTRACT()` 等）锁定方言 | 未来切换其他数据库需重写 | 接受当前约束，MySQL 为唯一支持数据库；如需多库再启动早期方案 |
| 遗留表非 Drizzle 管理 | `sys_*`/`hr_*`/`qc_*`/`material` 等表无类型安全 | 通过 raw SQL 参数化查询，后续按需逐步纳入 Drizzle schema |

### 10.2 回滚方案

1. **仓储回滚**：`REPOSITORY_IMPL=mysql`（默认）即可回退到全 raw SQL 实现
2. **Drizzle 实例回滚**：`drizzleDb` 仅用于 Drizzle 仓储，不影响 `query`/`execute` 入口；移除 Drizzle 仓储即回退
3. **迁移回滚**：`pnpm migrate:down` 按版本回退增量迁移

---

## 十一、落地执行 TODO 清单（Trae CN）

### P0 基础架构改造（已完成 ✅）

- [x] mysql2 连接池单例 + Drizzle ORM 实例（`src/lib/db/index.ts`）
- [x] 66 张 Drizzle ORM 消费表定义（`src/lib/db/schema.ts`）
- [x] 仓储工厂注册中心 + `REPOSITORY_IMPL` 切换（`src/infrastructure/RepositoryRegistry.ts`）
- [x] 3 个 Drizzle 仓储实现（SalesOrder / PurchaseOrder / InboundOrder）
- [x] 废弃 drizzle-kit 迁移路径，引导 `setup:db` / `migrate`
- [x] 全量回归测试，验证 MySQL 功能与改造前完全一致

### P1 仓储层 Drizzle 化扩展（待规划）

- [ ] 将 Drizzle 仓储覆盖扩展到 ReturnOrder / Reconciliation / Delivery / WorkOrder / PickOrder / FinishOrder / WorkReport 等聚合
- [ ] 为 raw SQL 直连的 API 路由补全仓储接口，收敛数据访问层
- [ ] 消除 `Loose = any` 类型黑洞（1911 处），为 `query()` 调用补全泛型 `query<MyRow>(sql)`

### P2 多数据库兼容（早期方案，暂不实施）

- [ ] PostgreSQL 字段构造器与函数适配（需新建 `dialects/postgres/`）
- [ ] SQL Server 字段构造器与函数适配（需新建 `dialects/mssql/`）
- [ ] 通用字段构造器 `CommonFields` 抽象
- [ ] 通用 SQL 函数封装（`dbNow`/`dbDateAdd`/`dbJsonGet` 等）
- [ ] Testcontainers 三库集成测试

> 多数据库兼容为早期方案设想，当前 MySQL 单库已满足业务需求。如未来确需多库支持，再按早期方案启动。

---

## 十二、关键文件清单

| 文件 | 用途 |
| --- | --- |
| `src/lib/db/index.ts` | mysql2 连接池 + Drizzle ORM 实例 + query/execute/transaction API |
| `src/lib/db/schema.ts` | 66 张 Drizzle ORM 消费表定义 |
| `src/infrastructure/RepositoryRegistry.ts` | 仓储工厂（REPOSITORY_IMPL 切换） |
| `src/infrastructure/repositories/DrizzleSalesOrderRepository.ts` | Drizzle 销售订单仓储 |
| `src/infrastructure/repositories/DrizzlePurchaseOrderRepository.ts` | Drizzle 采购订单仓储 |
| `src/infrastructure/repositories/DrizzleInboundOrderRepository.ts` | Drizzle 入库单仓储 |
| `src/infrastructure/repositories/Mysql*Repository.ts` | 18 个 MySQL raw SQL 仓储（默认实现） |
| `database/vnerpdacahng_schema.sql` | 权威 schema SQL |
| `database/migrations/001-060_*.sql` | 增量迁移脚本 |
| `scripts/setup-db.mjs` | 全量初始化脚本 |
| `scripts/migrate.ts` | 增量迁移执行器 |
| `src/proxy.ts` | Next.js 16 中间件（替代已删 `src/middleware.ts`） |

---

> 最后更新：2026-07-14（Schema 补全 15 张 `prd_` 表为 66 张，修复类型别名）
