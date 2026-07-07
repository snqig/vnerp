# P0-2 Schema 双轨统一实施方案

## 概述

将项目当前三套互斥的 schema 管理路径统一为单一权威来源，消除"SQL 改了 Drizzle 没更"的数据结构不一致风险，并修复迁移体系完全失效的 P0 级隐患。

## 现状分析（基于 Phase 1 探索）

### 1. 权威 SQL 文件：`database/vnerpdacahng_schema.sql`
- **表数**：~50 张，带模块前缀命名（`sys_`/`crm_`/`pur_`/`inv_`/`sal_`/`prd_`/`fin_`/`qc_`/`eqp_`/`material_`/`work_order_`/`inv_inventory_`）
- **覆盖模块**：系统/客户/供应商/物料/仓库/采购/销售/生产/财务/质量/设备/排程/领料退料/成本核算
- **缺失表**（仅存在于迁移补丁中，SQL 主文件未包含）：
  - 事件总线：`domain_event_outbox`、`sys_event_processed`
  - 标准主档：`inv_material_std`、`prd_bom_std`、`prd_bom_line_std`
  - 总账：`fin_account`、`fin_period`、`fin_voucher`、`fin_voucher_line`、`fin_account_balance`
  - 入库：`inv_inbound_order`、`inv_inbound_item`（代码在用，但 SQL 主文件无定义）

### 2. Drizzle schema.ts：`src/lib/db/schema.ts`
- **表数**：41 张，扁平命名（`customers`/`products`/`materials`/`warehouses`/`work_orders`/`boms` 等）
- **与 SQL 表名零交集**：例如 schema.ts 的 `customers` vs SQL 的 `crm_customer`，`work_orders` vs `prd_work_order`
- **唯一消费者**：`src/infrastructure/repositories/DrizzleInboundOrderRepository.ts`（仅用 `invInboundOrders`/`invInboundItems`）
- 其余 39 张表定义无任何 import 引用（孤儿代码）
- 还包含 dcprint 模块表（`material_labels`/`cutting_records`/`process_cards` 等），这些表在 SQL 主文件中也不存在

### 3. 三条互斥迁移路径（全部有问题）

| 路径 | 命令 | 脚本 | 问题 |
|------|------|------|------|
| A. 全量 SQL | `pnpm setup:db` | `scripts/setup-db.mjs` | 只读 `vnerpdacahng_schema.sql`，不读迁移补丁 → 缺 11 张关键表 |
| B. 增量迁移 | `pnpm migrate` | `scripts/migrate.ts` | 只找 `.ts/.js` 文件，但 migrations 目录全是 `.sql` → **找到 0 个文件，完全失效** |
| C. Drizzle | `pnpm db:generate/push` | `drizzle-kit` + `drizzle.config.ts` | 基于孤儿 schema.ts 生成，表名与生产 SQL 完全脱节 |
| D. Docker init | `docker-compose up` | MySQL entrypoint | 只挂载 `vnerpdacahng_schema.sql`，不挂载迁移补丁 → 同路径 A |

### 4. 6 个迁移补丁全部无人执行

| 文件 | 内容 | 现状 |
|------|------|------|
| `001_create_domain_event_outbox.sql` | `domain_event_outbox` 表 | ❌ 无人执行 |
| `002_add_outbox_dispatching.sql` | ALTER 加 `claimed_at`/`dispatched_at` | ❌ 无人执行 |
| `003_create_event_processed.sql` | `sys_event_processed` 表 | ❌ 无人执行 |
| `004_add_status_to_event_processed.sql` | ALTER 加 `status` 列 | ❌ 无人执行 |
| `20260701_add_std_master_tables.sql` | `inv_material_std`/`prd_bom_std`/`prd_bom_line_std` + ALTER `inv_inventory`/`sal_order_detail` | ❌ 无人执行 |
| `20260701_add_gl_tables.sql` | `fin_account`/`fin_period`/`fin_voucher`/`fin_voucher_line`/`fin_account_balance` | ❌ 无人执行 |

**影响**：任何新环境（Docker 或 `pnpm setup:db`）部署后，事件总线、标准主档、总账模块都会因缺表而崩溃。当前系统能运行仅因为旧环境通过已禁用的 HTTP `/api/setup/create-tables` 接口建过这些表。

---

## 实施方案

### Phase 0：合并权威 SQL（合并迁移补丁到主文件）

**目标**：将 6 个迁移补丁的内容合并进 `database/vnerpdacahng_schema.sql`，使主文件成为真正的单一权威来源。

**文件**：`database/vnerpdacahng_schema.sql`

**改动**：
1. 在"质量管理模块"后新增"事件总线模块"章节，加入 `domain_event_outbox`（含 002 的 `claimed_at`/`dispatched_at` 列）和 `sys_event_processed`（含 004 的 `status` 列）
2. 在"物料管理模块"章节加入 `inv_material_std` 表
3. 在"生产管理模块"章节加入 `prd_bom_std`/`prd_bom_line_std` 表
4. 在"财务管理模块"章节加入 `fin_account`/`fin_period`/`fin_voucher`/`fin_voucher_line`/`fin_account_balance` 表
5. 在"仓库入库"相关位置加入 `inv_inbound_order`/`inv_inbound_item` 表（从 schema.ts 的 L782-814 反推 DDL，对齐 DrizzleInboundOrderRepository 的实际查询字段）
6. 将 `20260701_add_std_master_tables.sql` 中的 ALTER 语句（给 `inv_inventory` 加 `material_code`/`material_name`/`unit`/`deleted`，给 `sal_order_detail` 加 `material_name`/`deleted`）直接写入主文件的 CREATE TABLE 定义中
7. 保留 `database/migrations/` 下的 6 个 `.sql` 文件不动（已部署环境的增量补丁，不删除以保留历史记录）

**验证**：
- `grep -c "CREATE TABLE" database/vnerpdacahng_schema.sql` 应从 ~50 增至 ~61
- `grep "domain_event_outbox\|sys_event_processed\|inv_material_std\|fin_voucher\|inv_inbound_order" database/vnerpdacahng_schema.sql` 应有匹配

### Phase 1：重写 schema.ts 对齐 SQL

**目标**：将 `src/lib/db/schema.ts` 的表名和字段名全部对齐 `vnerpdacahng_schema.sql`，使 Drizzle ORM 与生产 SQL 保持一致。

**文件**：`src/lib/db/schema.ts`（全量重写）

**改动原则**：
- 表名使用 SQL 中的实际名称（如 `crm_customer` 而非 `customers`，`prd_work_order` 而非 `work_orders`）
- 字段名使用 SQL 列名（如 `customer_code` 而非 `code`，`create_time` 而非 `createdAt`）
- 字段类型对齐 SQL 类型（`BIGINT UNSIGNED` → `bigint unsigned mode: 'bigint'`，`TINYINT` → `tinyint`，`DECIMAL(18,4)` → `decimal({ precision: 18, scale: 4 })`）
- 保留 Drizzle 的 `.references()` 外键定义（SQL 文件未定义外键约束，但 ORM 层声明外键有助于类型推导）
- 移除 schema.ts 中存在但 SQL 不存在的表（`material_labels`/`cutting_records`/`process_cards`/`process_card_materials`/`trace_records`/`scan_logs`）——这些表如代码在用，需同步加入 SQL 主文件；如代码不在用则删除

**需新增到 SQL 也需在 schema.ts 定义的表**（dcprint 模块，代码在用）：
- 先 grep 确认 `material_labels`/`process_cards` 等表是否被 API 路由引用
- 若被引用：在 Phase 0 一并加入 SQL 主文件
- 若未引用：从 schema.ts 删除

**表名映射表**（核心，需逐表对齐）：

| schema.ts 当前名 | SQL 目标名 | 模块 |
|-----------------|-----------|------|
| `customers` | `crm_customer` | 客户 |
| `products` | `inv_material`（成品类型）或新建 `prd_product` | 产品 |
| `materials` | `inv_material` | 物料 |
| `suppliers` | `pur_supplier` | 供应商 |
| `equipments` | `eqp_equipment` | 设备 |
| `employees` | `sys_user`（或新建 `hr_employee`） | 员工 |
| `warehouses` | `inv_warehouse` | 仓库 |
| `locations` | （SQL 无，需新增或删除） | 库位 |
| `inventoryBatches` | `inv_inventory_batch` | 批次库存 |
| `inventoryTransactions` | `inv_inventory_log` | 库存流水 |
| `salesOrders` | `sal_order` | 销售订单 |
| `salesOrderItems` | `sal_order_detail` | 销售明细 |
| `boms` | `prd_bom` | BOM |
| `bomItems` | `prd_bom_detail` | BOM 明细 |
| `workOrders` | `prd_work_order` | 工单 |
| `processes` | （SQL 无，需新增或删除） | 工序 |
| `workOrderProcesses` | （SQL 无） | 工单工序 |
| `productionReports` | （SQL 无） | 报工 |
| `inspectionStandards` | （SQL 无，qc_inspection 是检验单） | 检验标准 |
| `inspectionRecords` | `qc_inspection` | 检验记录 |
| `defectRecords` | `qc_unqualified` | 不良品 |
| `purchaseRequests` | `pur_request` | 采购申请 |
| `purchaseRequestItems` | `pur_request_detail` | 采购申请明细 |
| `purchaseOrders` | `pur_order` | 采购订单 |
| `purchaseOrderItems` | `pur_order_detail` | 采购明细 |
| `outsourceOrders` | （SQL 无，需新增或删除） | 委外 |
| `vehicles` | （SQL 无） | 车辆 |
| `deliveryOrders` | `sal_delivery` | 出库 |
| `deliveryItems` | `sal_delivery_detail` | 出库明细 |
| `sampleRequests` | （SQL 无） | 打样 |
| `maintenancePlans` | （SQL 无） | 保养计划 |
| `invInboundOrders` | `inv_inbound_order` | 入库主表 |
| `invInboundItems` | `inv_inbound_item` | 入库明细 |

**对于"SQL 无"的表**：需逐一 grep 确认是否有 API 路由/服务层引用。有引用则补入 SQL，无引用则从 schema.ts 删除。

**验证**：
- `pnpm ts-check` 通过（DrizzleInboundOrderRepository 的 import 不报错）
- `pnpm db:studio` 能打开且显示的表名与 SQL 一致
- `grep "from '@/lib/db/schema'" src/` 仅返回 DrizzleInboundOrderRepository

### Phase 2：修复 ORM 唯一消费者

**目标**：确保 `DrizzleInboundOrderRepository` 在 schema.ts 重写后仍能正常工作。

**文件**：`src/infrastructure/repositories/DrizzleInboundOrderRepository.ts`

**改动**：
- `import { invInboundOrders, invInboundItems } from '@/lib/db/schema'` 保持不变（变量名不变）
- 确认 schema.ts 中 `invInboundOrders` 的 `mysqlTable('inv_inbound_order', ...)` 表名与 SQL 一致
- 确认字段名（`order_no`/`order_type`/`warehouse_id` 等）与 SQL DDL 一致
- 若 schema.ts 字段名有变化（如 `orderNo` → `order_no`），需同步更新 DrizzleInboundOrderRepository 中的引用
- save 方法（L221-263）已使用裸 SQL，不依赖 schema.ts，无需改动
- findById/findByStatus/updateStatus/softDelete 使用 Drizzle 构建器，需确认字段名对齐

**验证**：
- `pnpm ts-check` 通过
- `pnpm test:unit:run -- src/infrastructure` 通过（若有测试）

### Phase 3：统一迁移体系

**目标**：废弃 drizzle-kit 迁移路径，保留 `setup-db.mjs`（全量初始化）+ `migrate.ts`（增量补丁）双轨但协同的机制。

**文件改动**：

1. **`scripts/migrate.ts`**（L85）：将 `.ts/.js` 过滤改为 `.sql` 文件支持
   - 当前：`.filter((f) => f.endsWith('.ts') || f.endsWith('.js'))`
   - 改为：支持 `.sql` 文件，读取文件内容并按分号分割执行
   - 新增 `.ts/.js` 动态 import 与 `.sql` 静态执行两种分支

2. **`package.json`**：
   - 移除 `db:generate`/`db:push`/`db:migrate`（drizzle-kit 迁移相关）
   - 保留 `db:studio`（可视化工具，不涉及迁移）
   - 更新 `setup:db` 说明为"全量初始化（首次部署）"
   - 更新 `migrate` 说明为"增量迁移（版本迭代）"

3. **`drizzle.config.ts`**：保留（db:studio 需要），但 `out: './drizzle'` 目录标记为废弃

4. **`drizzle/` 目录**：删除 2 个 `.sql` 文件（基于孤儿 schema.ts 生成，与生产无关）

5. **`database/migrations/` 目录**：保留 6 个 `.sql` 文件（已部署环境的增量历史），新增 `.sql` 迁移文件继续放此目录

**验证**：
- `pnpm migrate:status` 能列出 6 个 `.sql` 迁移文件
- `pnpm setup:db` 在空库上执行后，表数量与 `pnpm migrate:status` 显示"已执行 0 个"一致（setup:db 是全量，migrate 是增量，两者不重叠）

### Phase 4：修复 Docker 配置

**目标**：确保 Docker 环境通过 init 挂载创建完整的表结构。

**文件**：`docker-compose.yml`

**改动**：
- L17-18 当前只挂载 `vnerpdacahng_schema.sql` 和 `vnerp-seed-data.sql`
- Phase 0 完成后，`vnerpdacahng_schema.sql` 已包含所有表，无需额外挂载迁移补丁
- 但需确认：MySQL entrypoint 的 init SQL 是否有文件大小限制（通常无）
- 可选优化：改用 entrypoint 脚本先执行 schema 再执行 migrations，但 Phase 0 已合并则无需

**额外修复**（非 P0-2 范围但发现即修）：
- L68 `NODE_ENV: development` → 应在 `docker-compose.prod.yml` 中为 `production`（本项不在本方案范围，记录待后续处理）

**验证**：
- `docker-compose down -v && docker-compose up -d` 后，`docker exec vnerp-mysql mysql -uroot -p vnerp -e "SHOW TABLES"` 应包含 `domain_event_outbox`/`fin_voucher`/`inv_material_std` 等

### Phase 5：清理与文档

**目标**：移除废弃产物，文档化统一后的 schema 管理流程。

**文件改动**：

1. **删除**：`drizzle/0000_chilly_retro_girl.sql`、`drizzle/0001_ordinary_valkyrie.sql`（孤儿迁移产物）
2. **更新**：`docs/04-部署文档/` 下的数据库初始化文档，说明：
   - 首次部署：`pnpm setup:db --seed`
   - 版本迭代：`pnpm migrate:status` → `pnpm migrate`
   - schema 变更流程：修改 `vnerpdacahng_schema.sql` + 新增 `database/migrations/YYYYMMDD_*.sql`
3. **更新**：`project_memory.md` 追加经验教训

**验证**：
- `ls drizzle/*.sql` 返回空
- 文档存在且内容准确

---

## 假设与决策

### 决策
1. **以 SQL 文件为权威**（用户选择）：schema.ts 对齐 SQL，而非反过来
2. **保留 migrate.ts**：修复后作为增量迁移工具，不废弃
3. **保留 drizzle-kit studio**：作为可视化工具，但移除其迁移生成功能
4. **不删除 migrations/ 目录**：保留历史补丁，供已部署环境增量升级

### 已验证事实（Phase 1 探索期 grep 确认）
1. **`inv_inbound_order`/`inv_inbound_item` 被 30 个文件引用**：包括 API 路由（warehouse/inbound、qrcode/trace、dashboard 等）、应用服务（InboundApplicationService）、基础设施（MysqlInboundOrderRepository、DrizzleInboundOrderRepository）、工具（document-numbering、data-fix-tool）——**必须加入 SQL 主文件**
2. **dcprint 表（`material_labels`/`process_cards` 等）仅在 `src/app/api/init/menus/route.ts` 中出现**：疑似仅菜单种子数据引用，无实际业务逻辑消费——**倾向从 schema.ts 删除**（执行时需进一步确认 menus 路由是否仅是菜单项配置）
3. 已部署的生产环境已有这些表（通过旧 HTTP 接口创建），Phase 0 合并后 `CREATE TABLE IF NOT EXISTS` 不会影响已有数据

### 风险
1. **schema.ts 重写工作量大**：41 张表逐表对齐，需 ~2-3 小时
2. **字段名差异需逐一核对**：如 SQL 用 `create_time` 而 schema.ts 用 `createdAt`，重写后所有 ORM 查询的字段访问需同步更新
3. **dcprint 表去向需确认**：若代码在用但 SQL 无定义，需补 DDL；若补错可能影响运行

---

## 验证步骤

1. **Phase 0 完成后**：
   - `grep -c "CREATE TABLE" database/vnerpdacahng_schema.sql` ≥ 60
   - 在空 MySQL 上执行 `pnpm setup:db`，确认 0 失败
   - `pnpm setup:db --seed` 后 `SHOW TABLES` 包含所有预期表

2. **Phase 1-2 完成后**：
   - `pnpm ts-check` 通过
   - `pnpm test:unit:run` 通过（特别是 DrizzleInboundOrderRepository 相关测试）
   - `pnpm db:studio` 显示的表名与 SQL 一致

3. **Phase 3 完成后**：
   - `pnpm migrate:status` 列出 6 个迁移文件
   - `pnpm setup:db && pnpm migrate:status` 显示"待执行 6 个"（setup:db 不记录迁移状态）

4. **Phase 4 完成后**：
   - `docker-compose down -v && docker-compose up -d`
   - `docker exec vnerp-mysql mysql -uroot -p${DB_PASSWORD} -e "SHOW TABLES FROM vnerp"` 包含全部表

5. **全流程**：
   - 启动 dev server，访问入库单页面，确认列表加载正常
   - 触发一次入库操作，确认 `domain_event_outbox` 有记录写入

---

## 执行顺序

Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1 和 Phase 2 可合并执行（重写 schema.ts 时同步检查消费者）。Phase 3-5 可并行准备但需 Phase 0-2 先完成。
