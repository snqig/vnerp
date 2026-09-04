# 引用完整性守卫 — 深层服务扩展 (#① 续)

把 `reference-validation.ts` 的存在性断言同法扩展到 ReturnOrder / Delivery / Production 三个深层应用服务，与其余 4 个（Outbound/Transfer/Sales/Purchase）一致，形成「写入前 verify-before-act」的统一防线。

## 新增共享守卫（src/lib/reference-validation.ts）
- `assertSalesOrderExists(orderId)` → `sal_order`（label 销售订单，复用 `order_no`）
- `assertDeliveryExists(deliveryId)` → `sal_delivery`（label 发货单，复用 `delivery_no`）
- `assertWorkOrderExists(workOrderId)` → `prod_work_order`（label 生产工单，复用 `work_order_no`）

三者均沿用 `assertEntityExists`：只读 `SELECT ... WHERE id=? AND deleted=0 LIMIT 1`，不存在/已软删 → `AppError.badRequest(400)`；非法 id（≤0/非整数）直接拦截不查库。软删除列均经 live 库 `INFORMATION_SCHEMA` 核实存在。

## 接入点（写路径 createX 之前）
| 服务 | 方法 | 接入守卫 |
|---|---|---|
| ReturnOrderApplicationService | createReturn | orderId→销售订单、customerId→客户、warehouseId→仓库、lines[].materialId→物料；deliveryId 非空时→发货单 |
| DeliveryApplicationService | createDelivery | orderId→销售订单、customerId→客户、warehouseId→仓库、lines[].materialId→物料 |
| ProductionApplicationService | createWorkOrder | materialRequirements[].materialId→物料 |
| | createPickOrder | workOrderId→生产工单、items[].materialId→物料 |
| | createWorkReport | workOrderId→生产工单 |
| | createFinishOrder | workOrderId→生产工单、warehouseId→仓库 |

## 验证
- `npx vitest run tests/unit/lib/reference-validation.test.ts` → 21/21（新增 3 个守卫 describe 全过）
- ReturnOrder/Delivery 三个 handler 测试 → 12/12 通过
- `npx tsc --noEmit`：我改动的 4 个文件**零新增错误**；其余报错为既有基线（`page.tsx` 的 `DbRow/unknown`、`Production/ReturnOrder` 内 `transaction` 包裹 `conn.execute<ResultSetHeader>` 的 `DbConnection↔PoolConnection` 类型，均非本次引入）。

## 待办 / 观察
- ⚠️ **`prod_work_order` 无 `product_id` 列**：`MysqlWorkOrderRepository` 第 118 行仍 `INSERT INTO prod_work_order (... product_id ...)`，但 live 库 `prod_work_order` 只有 `product_name`（且探查显示实际也不含 `product_code`）。这是与本次无关的**潜在写入 bug**——工单创建经该 repo 落库时可能报 `Unknown column 'product_id'`。本次未动（守卫不覆盖 `productId`，因其无可靠主数据表可校验：`mdm_product` 存在但工单表未存该外键）。建议另立 issue 核实 `prod_work_order` schema 与 repo 映射一致性。
- `PurchaseReturnApplicationService.createReturn` 已有「原采购订单不存在→404」判断（走 `orderRepo.findById` 而非统一守卫），与本次模式不同，暂未改动以保持最小影响面。
