# 引用完整性守卫推广 + prod_work_order product_id 不一致修复

> 日期：2026-08-28｜范围：应用层存在性守卫扩展到 SampleOrder / PurchaseReturn，并修复 `prod_work_order` 表与 `MysqlWorkOrderRepository` 的 schema/repo 不一致（含 `product_id`）。

## 一、守卫推广（同法，与既有 8 个服务一致）

### 新增共享守卫
`src/lib/reference-validation.ts`
- `assertMaterialByCode(code)`：按 `material_code` + `deleted=0` 断言物料存在（打样单等以**编码**引用物料的场景；逻辑与 `assertEntityExists` 一致：只读 SELECT + 软删过滤，缺失→400，空编码直接拦）。

### 接入写路径（create 之前，生成单号之前）
| 服务 | 方法 | 守卫 |
|---|---|---|
| SampleOrderApplicationService | createOrder | `customerId`→客户（非空才校验）；`materialNo`→物料（按编码，非空才校验） |
| PurchaseReturnApplicationService | createReturn | `supplierId`→供应商；`warehouseId`→仓库；`lines[].materialId`→物料（批量）。`orderId` 仍由原有 `orderRepo.findById` 校验（404 不变） |

**覆盖现状**：存在性守卫现已覆盖 Inbound(#22 pilot) / Outbound / Transfer / Sales / Purchase / ReturnOrder / Delivery / Production / **SampleOrder** / **PurchaseReturn** 共 10 个主写路径。其余 CRUD 类服务（StandardCard/Equipment/Die/Ink 等）多为单表操作、无跨主数据引用，未强行扩展。

## 二、修复 prod_work_order 的 product_id schema/repo 不一致

### 根因（实测 live 库 vnerpdacahng）
- live `prod_work_order` **缺 7 列**：`product_id / product_code / planned_qty / completed_qty / process_id / process_name / warehouse_id`。
- 但领域层（WorkOrder 聚合）与仓储层（`MysqlWorkOrderRepository`）按这套 schema 设计：`save()` 写入上述列、`mapToProps()` 读取、`findByStatus` 按 `product_id` 过滤 → **`save()` 一旦被调用即报 `ER_BAD_FIELD_ERROR(1054) Unknown column`**。
- 线上真实写路径 `/api/workorders/route.ts`、`SampleProcessCardService` 走「现有列」写入，故生产未炸；DDD 仓储层成为悬空坏代码。
- 另有 `src/lib/services/sales-order-service.ts:54` 写错列名：`sales_order_id`（应为 `order_id`）、`plan_qty`（应为 `quantity`），且当时 `product_id` 亦不存在。

### 修复
1. **新增幂等迁移** `database/migrations/20260828103000_add_prod_work_order_columns.ts`
   - `up`：逐列探测 `INFORMATION_SCHEMA.COLUMNS`，仅缺才 `ADD`（含默认值，不影响现有写入）。
   - **不建外键**：`product_id` 仅作可选关联（`mdm_product.id`），建 FK 会反噬 route 创建的 `product_id=0` 工单。
   - `down`：逆序逐列 `DROP`（不影响数据）。
2. 已用内联脚本应用到 live，7 列全部落地并注册 `sys_migration`（batch 续接）。
3. 同步修 `sales-order-service.ts:54`：列名 `sales_order_id→order_id`、`plan_qty→quantity`（保留 `product_id`，现列已存在）。

### 验证
- `prod_work_order` 现已含 7 新列；route.ts 写路径依赖的 13 个列全部仍在。
- 单测：reference-validation 24/24（新增 `assertMaterialByCode` 3 例）；SampleOrder 服务 25/25；PurchaseReturn 服务 6/6。
- `tsc --noEmit`：改动 4 文件零新增错误（既有的 `DbConnection↔PoolConnection`、`DbRow[]↔ResultSetHeader` 基线位于 `transaction` 区块，非本次引入）。
- 两个服务单测原只 mock `@/lib/db`（query 默认 `undefined`）会触发守卫误判/崩溃 → 已补 `vi.mock('@/lib/reference-validation', ...)` 桩（与上一轮 purchase 同法）。

## 三、改动文件清单
- `src/lib/reference-validation.ts`（新增 `assertMaterialByCode`）
- `src/application/services/SampleOrderApplicationService.ts`（createOrder 接入守卫）
- `src/application/services/PurchaseReturnApplicationService.ts`（createReturn 接入守卫）
- `src/lib/services/sales-order-service.ts`（列名修正）
- `database/migrations/20260828103000_add_prod_work_order_columns.ts`（新增迁移）
- `tests/unit/lib/reference-validation.test.ts`（+3 例）
- `tests/unit/application/services/SampleOrderApplicationService.test.ts`（补 reference-validation mock）
- `tests/unit/application/services/purchase-return-application-service.test.ts`（补 reference-validation mock）

## 四、后续可选项（未做）
- E2E 独立测试库隔离（更大基础设施决策）。
- `prod_work_order` 若需强约束 `product_id→mdm_product`，待评估现有 `product_id=0` 数据后再建 FK。
