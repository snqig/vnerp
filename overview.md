# #20 应用层校验加固 — 入库写路径 Pilot

> 范围：用户选择的「引用完整性整改」4 项之首（应用层校验加固，入库写路径先行）。
> 目标：在数据层 FK 缺失的字段上，于业务写入前拦截悬空引用，纵深防御。

## 交付物

### 1. 新共享模块 `src/lib/reference-validation.ts`
应用层「存在性断言」唯一入口，与 `category-validation.ts`（物料是否归类）互补：
- `assertEntityExists({table,idColumn?,softDeleteColumn?,label,nameColumn?})`
  - 只读 `SELECT ... WHERE id=? AND deleted=0 LIMIT 1`
  - 缺失 → `AppError.badRequest(400)`；DB 故障上抛（不静默放行）
  - 返回首行，调用方可复用 `name` 等字段免二次查询
- 便捷封装：`assertWarehouseExists` / `assertMaterialExists` / `assertSupplierExists`
- 批量：`assertAllMaterialsExist(ids)` — 单次往返、去重、过滤 `material_id<=0`（自由录入）、缺失列出 ID

### 2. 接入 `InboundApplicationService`（落库前守卫）
| 方法 | 守卫 |
|------|------|
| `createOrder` | warehouse + 各 materialId>0 + supplierId(若有) |
| `updateOrderContent` | warehouse + materialId>0 |
| `createInboundFromPO` | warehouse + materialId>0 + supplierId |
| `approveOrder` | 用 `assertWarehouseExists` 替换原「SELECT warehouse_name 不校验存在」写法 |

路由已确认委托这些 service 方法（`inbound/route.ts`、`from-po/route.ts`），守卫在真实请求链路生效。

## 关键发现 / 约束
- `inv_inbound_item.material_id` **无数据库外键** → 本守卫是其唯一悬空防护（审计发现的 material_id=0 痛点）。
- `inv_inbound_order.warehouse_id` 已有 DB FK（迁移 031）→ 应用层仅作友好 400 + 纵深防御。
- `InboundApplicationService.ts` 的 9 个 tsc 错误（338/352/368/377/393/402/428/437/450，均在 submit/cancel/unapprove/delete 的 transaction 块）为**预存 baseline 错误**（`@/lib/db` 的 `DbResult/DbConnection` vs `ResultSetHeader/PoolConnection` 类型不匹配），**非本次引入**。本次改动区域零新增类型错误。

## 验证
- 新增 `tests/unit/lib/reference-validation.test.ts`（9 用例，全绿）
- `tests/unit/warehouse/inbound-from-po.test.ts` 加 `vi.mock('@/lib/reference-validation')` 桩（5 用例仍绿）
- 合计 14 passed；`npx tsc --noEmit` 我改动区域无新增错误。

## 下一步（待用户确认范围）
- #20 剩余：主数据删除守卫、铺开至出库/调拨/销售/采购/领料/分切等写路径。
- #18 续：定向修复 4 类真实悬空（material_id=0 / 生产领料工单 / 用户部门 / 分切标签）。
- #21 分切物料类型限制；#22 DB 层 FK 兜底（原生 SQL ALTER）。
