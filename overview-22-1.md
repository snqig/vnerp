# #① 应用层校验加固 —— 扩展到出库/调拨/销售/采购写路径

> 继 #20（入库 pilot）+ #22（FK 兜底）之后，把「写入前存在性断言」从入库扩展到其余 4 个主写路径，完成原 4 项 remediation 中唯一仅做了一半的 **① 应用层校验加固**。

## 改动总览

### 守卫模块 `src/lib/reference-validation.ts`
- 新增 `assertCustomerExists`（引用表 `crm_customer`，即 `sal_order.customer_id` 的目标；省略 `nameColumn`，避免臆测列名）。
- 把 `assertEntityExists` 及 4 个包装器（`assertWarehouseExists` / `assertMaterialExists` / `assertSupplierExists` / `assertCustomerExists`）参数放宽为 `number | null | undefined`。运行时已对 `null/undefined/≤0/非整数` 抛 `AppError.badRequest(400)`，此次仅为类型放宽、向后兼容。

### 4 个写路径的 `createOrder` 接入（#18 类悬空的产生点）
| 服务 | 接入守卫 |
|---|---|
| `OutboundApplicationService` | `assertWarehouseExists(warehouseId)` + `assertAllMaterialsExist(items[].materialId)` |
| `TransferApplicationService` | `assertWarehouseExists(fromWarehouseId)` + `assertWarehouseExists(toWarehouseId)` |
| `SalesApplicationService` | `assertCustomerExists(customerId)` + `assertAllMaterialsExist(lines[].materialId)` |
| `PurchaseApplicationService` | `assertSupplierExists(supplierId)` + `assertAllMaterialsExist(lines[].materialId)` |

> `assertAllMaterialsExist` 自动过滤 `material_id≤0`（自由录入物料允许为 0，不查主数据），与 #20 行为一致。

## 测试与验证
- **reference-validation 单测**：15/15（新增 `assertCustomerExists` 命中/缺失 2 例 + 既有 13 例）。
- **purchase-application-service 单测**：5/5（已补 `vi.mock('@/lib/reference-validation')` 桩，否则命中被 mock 的 `query` 误判“供应商不存在”）。
- **purchase 分类校验集成测试**：8/8（整 mock 了 `PurchaseApplicationService`，不受影响）。
- **tsc**：4 个服务文件报错全部位于 `transaction` 区块的 `DbConnection`/`ResultSetHeader` **既有基线**（与 InboundApplicationService 那 9 个同模式），本次新增的 `createOrder` 守卫行号不在其中；`reference-validation.ts` 零新增错误。

## 说明 / 后续
- 更深层服务（ReturnOrder / Delivery / Production 等）本次未覆盖；如需可同法扩展。
- 与 #22 的 DB 层 FK 形成双保险：应用层在写入前拦截非法引用并返回 400（友好），DB 层在极端情况下兜底（RESTRICT）。
