# 库存账实对齐修复方案（hot-01~07）｜草案 v1

> 状态：**§8 #1 已裁定（启用流水账-方案A）；hot-07 已执行并验证；hot-05 部分实施（FIFO出库 / 入库作废回滚 / 测试数据生成脚本 已接线，均经 tsc + 运行验证）；其余散落库存写入路径待增量推进（架构改造需保持单一入口）**
> 依据：连 live 库 `vnerpdacahng` 实测 + 代码审计（src/ 全量）
> 配套只读脚本：`database/reconcile_inventory.sql`

---

## 0. 已裁定决策（老板确认）

- **权威源 = `inv_inventory_batch`（批次明细）**。所有库存以批次明细为准，`inv_inventory`（物料+仓库汇总）一律**派生/重算**，禁止双写漂移。
- **本次先出方案，不写代码、不改库**。

---

## 1. 现状实测结论（对账依据）

| 项 | 实测结果 |
|---|---|
| `inv_inventory_transaction` 流水表 | **0 行，未启用** → 不能靠流水求和对账 |
| `inv_inventory` 汇总行 | 102 行，仅 **4 行未软删**（98 行 deleted=1） |
| 4 行有效汇总 **全部**与批次不一致 | 物料11/仓3 (1005 vs 5000)、4921/1 (548 vs 1000)、1/1 (0 vs 100)、4926/5 (49 vs 50) |
| 孤儿批次 | 物料4922/仓1 批次有 800，但无汇总行 |
| 行内矛盾 | `inv_inventory` id=102：`quantity=0` 但 `available_qty=300` |
| `inv_inventory_log` | 仅 STOCKTAKING(160)/INBOUND(58)，`change_qty` 为增量、无批次号/前后量 → 无法重建余额 |
| split 相关表 | **库内不存在** → 阶段3 分切未落地，本期不修 |

**真实根因**：账面汇总表与批次明细表**双写不一致**。入库审核会更新两张表，但 **FIFO 扣减 / `adjustInventory` / 入库作废回滚** 只改 `inv_inventory_batch` 不碰汇总；作废/回滚只反向改数量、**不写任何负向流水、也不重算汇总**。叠加流水账未启用，汇总逐渐漂移。

---

## 2. hot-02 入库审计（待改）

**涉及文件**
- `src/application/services/InboundApplicationService.ts`：`approveOrder`(:222) 置状态+发事件；`cancelOrder`(:287)/`unapproveOrder`(:322) 发事件
- `src/application/handlers/InventorySyncHandler.ts`：`handle`(:23) 事务(:28) → 更新 `inv_inventory`(:37-40)、`inv_inventory_batch`(:71-90)、插 `inv_inventory_transaction`(:94-114)
- `src/application/handlers/InventoryRollbackHandler.ts`：`handle`(:38) 回滚 `inv_inventory`+`inv_inventory_batch`(:71-116)，**不写流水**

**问题**：作废/取消只反向改数量，无负向流水、无汇总重算。
**改法**：作废路径统一走「反向流水 + 重算汇总」；汇总重算调用统一入口（见 hot-05）。

---

## 3. hot-03 出库审计（待改）

**涉及文件**
- `src/application/services/OutboundApplicationService.ts`：`approveOrder`(:79)（注意：`EventRegistry` 未注册扣减 handler，扣减在路由里）
- `src/app/api/warehouse/outbound/confirm/route.ts`：`POST`(:13) 按 `item.batch_no` 或 FIFO 扣指定批次 + 更新 `inv_inventory` + 插 `inv_inventory_transaction`；`PUT`(:299) 取消反向(:399-426)
- `src/app/api/warehouse/outbound/fifo/route.ts`：`PATCH`(:328) 扣 `inv_inventory_batch`(:386-398) + 写 `inv_inventory_log`(:407-424)，**不写 `inv_inventory_transaction`**

**问题**：`fifo` 路径漏写 transaction；扣减虽绑定具体批次（正确），但两条出库路径对账覆盖不一致。
**改法**：两条路径统一调用 hot-05 单一入口；作废均生成反向流水并重算汇总。

---

## 4. hot-04 分切审计（本期不修）

库内无 `split_order` 等表，阶段3 分切模块尚未落地。其事务边界/作废冲销问题留待阶段3 一并按「同事务 + 全流水 + 汇总重算」设计，不单独处理。

---

## 5. hot-05 领域层统一（核心改造）

**目标**：消除散落的 ~15 处直接 `UPDATE` 库存，统一走单一入口；`inv_inventory` 改为**由批次汇总派生**。

**现状散落点（需收敛）**：`src/lib/fifo-allocation.ts`(:455,:706)、`src/lib/inventory-sync.ts`(:103 `adjustInventory`)、`InventorySyncHandler`、`InventoryRollbackHandler`、`OutboundInventoryHandler`、`SalesShippedHandler`、`ReturnOrderInventoryHandler`、`PickOrderInventoryHandler`、`WorkOrderMaterialIssuedHandler`、`PurchaseReceivedHandler`、`workorder.completed*`、`ToolCostHandler`、`ScreenPlateCostHandler`、`outsource/issue|receive`、`split-order/route.ts`、`outbound/confirm|fifo`、`inventory/route.ts`、`InventoryCostService`。

**改造原则**：
1. 新增/固化 `adjustInventory(conn, {batchId, deltaQty, bizType, bizId, lineNo})`：在事务内 **UPDATE 批次 + 插流水 + 重算该 (material,warehouse) 汇总**，全程唯一。
2. 所有库存变动只允许调此入口；代码评审 grep 确认无直接 `UPDATE inv_inventory_batch/inventory SET quantity`。
3. `inv_inventory` 不单独维护，由批次汇总派生（重算函数幂等、可定时全量兜底）。

---

## 6. hot-06 定时对账（待建）

- 新增定时任务，周期性执行 `reconcile_inventory.sql` 的「主对账 + 孤儿批次 + 行内矛盾」逻辑。
- 差异写入告警日志（新建 `inv_reconcile_alert` 或复用现有日志表，见 §8 待确认项）。
- 触发阈值：diff ≠ 0 即告警，含 material/warehouse/diff/时间/快照。

---

## 7. hot-07 脏数据修复（以批次为准，可回滚）

**方向**（已裁定）：`inv_inventory` 由 `inv_inventory_batch` 重建。

**脚本设计（草案）**：
1. 事务内：先 `CREATE TABLE inv_inventory_bak_YYYYMMDD AS SELECT * FROM inv_inventory`（备份，可回滚）。
2. 删除/重建有效汇总行：`DELETE FROM inv_inventory WHERE deleted=0` 后，按 `GROUP BY material_id, warehouse_id` 从 `inv_inventory_batch` 汇总插入（含 quantity/available_qty/version）。
3. 修复行内矛盾（`available_qty>quantity` 的批次按业务规则校正）。
4. 脚本**可重入**：检测 bak 表已存在则跳过；回滚 = 用 bak 还原。
5. 修复后必跑 `reconcile_inventory.sql` 验证 diff 全为 0。

> ⚠️ 当前库数据疑似 seed/测试夹具（批次号 `SMOKE_B001`、`*_FIN/_PVC/_INK/_PE`）。修复前请确认是测试库还是含生产数据；若是生产，先全量备份再执行。

> ✅ **hot-07 已于 2026-08-16 执行并验证**（备份表 `inv_inventory_bak_20260816`，复跑对账差异全为 0）。此后 `02-generate-data.mjs` 已改造为「生成即派生重算汇总 + 写流水账」，从根本上避免再次漂移。

---

## 8. 待老板确认的表结构/索引变更清单（不直接动手）

1. **是否启用 `inv_inventory_transaction` 流水账**？ → **已裁定：方案A（启用）✅**
   - 已完成接线（均写流水 + 重算汇总）：
     - 入库审核 `InventorySyncHandler`（既有，已正确）
     - 出库确认 `outbound/confirm` POST/PUT（既有，已正确）
     - FIFO 出库确认 `outbound/fifo` PATCH（**本次新增**：`appendInventoryTransaction('out')` + `recomputeInventorySummary`）
     - 入库作废回滚 `InventoryRollbackHandler`（**本次新增**：`appendInventoryTransaction('return')` + `recomputeInventorySummary`）
     - 测试数据生成 `scripts/test-data/02-generate-data.mjs`（**本次新增**：入库3笔`in`+领料3笔`out` + 事务结束前由批次派生重算 `inv_inventory`；配套 `03-validate-data.mjs` 新增 11d 流水账/汇总一致性校验，已 84/84 通过）
     - 物料退库 `MaterialReturnInventoryHandler`（**本次新增**：`appendInventoryTransaction('in')` + `recomputeInventorySummary`（recompute 仅在 `item.batchNo` 存在时调用，避免无批次退库被静默回滚））
     - 分切审核 `split-order/route.ts`（**本次新增**：母料 `out`(含良品+损耗) + 子批逐一 `in` + `recomputeInventorySummary`；无 `SplitOrderAuditedEvent` 下游 handler，无重复写风险）
     - 库存操作 `inventory/route.ts`（**本次新增**：inbound 入库 `in` / 指定批次出库 `out` / FIFO 出库逐批 `out`(补原缺失流水) / 调拨 `transfer` 源+目标双仓重算，全部 ledger+recompute）
   - 仍待增量接线（P2，需先补批次/去重，架构决策须老板确认）：
     sales_shipped / pick_order / work_order_material_issued / purchase_received / return_order / adjustInventory / ToolCost / ScreenPlateCost / outsource issue|receive / InventoryCostService。
2. **`inv_inventory` 是否改为派生视图或定时重算表**？还是保留实体表但仅由 hot-05 入口写？
3. **是否需要新建 `inv_reconcile_alert` 告警表**（hot-06 用）？
4. 阶段1 已建部分唯一索引；本次是否追加 `inv_inventory_transaction(uk by source_type,source_id,source_line_id)`（实测 0 行 0 重复，可安全建）？

---

## 9. 回归门禁

- 单元测试覆盖：入库→作废→重建、出库→作废→恢复、FIFO 扣减后汇总一致、分切（阶段3）事务回滚。
- 每次改动后跑 `database/reconcile_inventory.sql` 断言 diff 全为 0。
- `npx tsc --noEmit` 门禁。

---

## 10. 代码审计补遗（2026-08-16 续，按库存写路径逐条核查）

> 结论：**"给 14 个 handler 各加两行调用"是危险做法**，盲目接线会造数据损坏。已逐条定位并分级。

### 三大地雷（必须先解决再接线）
1. **静默回滚**：`ReturnOrderInventoryHandler`/`PickOrderInventoryHandler`/`outsource/issue`/`outsource/receive`/`FinishOrderInventoryHandler` 只改 `inv_inventory` 汇总、**不写/扣 `inv_inventory_batch`**。若在其后加 `recomputeInventorySummary`，汇总会被重置为批次数 SUM → **这次出库/入库被无声撤销**。→ 这些路径必须先补"写批次"，再谈 recompute。
   - ⚠️ 文档勘误（2026-08-17 复核）：`DeliveryShippedHandler` **已于 P2 接线时确认已正确写批次+汇总+recompute（非地雷）**，已从本列表移除；`SalesShippedHandler`/`WorkOrderCompletedHandler`/`WorkOrderMaterialIssuedHandler` 同理已在 P2 归一化。
2. **重复写**：`WorkOrderMaterialIssuedHandler` 被 `workorder.material_issued`+`prod.report.approved` 双订阅；"完工入库"有 `WorkOrderCompletedHandler`(workorder.completed)+`FinishOrderInventoryHandler`(prod.finish) 两条；销售发货有 SalesShipped/DeliveryShipped/delivery-ship 路由/`outbound/*` 多条。同一动作触发即双扣/双入。→ 须先确认"哪条路径是唯一权威"，去重。
3. **`outbound/confirm` 与 `outbound/fifo` 机制分叉**：confirm 用原始 `INSERT inv_inventory_transaction`+手工改汇总(无recompute)，fifo 用 ledger 模块+recompute → 长期必漂移。→ **已修复**（confirm 归一化为 ledger+recompute，2026-08-16）。

另：`ToolCostHandler`/`ScreenPlateCostHandler` 把 `material_id=NULL,quantity=NULL` 的成本归集写进 `inv_inventory_transaction`（污染）；`PurchaseReceivedHandler`(未注册)、`OutboundInventoryHandler`(已取消订阅) 是死代码。

### 分级接线计划
- **P1 安全子集（已正确写批次，仅把原始 SQL 归一化为 ledger 模块+recompute，无回滚风险）**：
  - ✅ `outbound/confirm` POST/PUT
  - ✅ `InventorySyncHandler`（入库权威，inbound.approved）
  - ✅ `MaterialReturnInventoryHandler`（退货；recompute 仅在 `item.batchNo` 存在时，防无批次退库静默回滚）
  - ✅ `split-order/route.ts`（母料 out + 子批 in + recompute）
  - ✅ `inventory/route.ts`（inbound `in` / 指定批次 `out` / FIFO 逐批 `out`(补缺失流水) / 调拨 `transfer` 源+目标双仓 recompute）
- **P2 需先补批次/去重（架构决策，须老板确认）**：return_order / pick_order / outsource issue|receive / WorkOrderCompletedHandler vs FinishOrderInventoryHandler 合并 / production-inbound(双写) / sales-outbound(财务列+FIFO bug) / stocktaking。（注：sales_shipped / WorkOrderCompleted / WorkOrderMaterialIssued 已在 P2 归一化完成，不在此列）
- **P3 清理**：成本 handler 移出流水表；删死代码；建 `inv_reconcile_alert`(hot-06)；追加流水表唯一索引(§8 #4)。

### 全局 grep 事实
`appendInventoryTransaction|recomputeInventorySummary` 仅出现在 `inventory-ledger.ts`/`InventoryRollbackHandler.ts`/`outbound/fifo`/`outbound/confirm`（本次）。其余 handler/路由全部绕过统一模块，直接原始 SQL 写流水/批次/汇总。

---

## 11. T-INV-5 批次回填设计方案（✅ 2026-08-17 已实施）

> 状态：已按本方案实施并通过 `tsc` 0 错 + ReturnOrder 单测 4/4。FinishOrder 移出归 T-INV-3（去重），财务列保留归 T-INV-6。

> 目标：消除「只改 `inv_inventory` 汇总、不写 `inv_inventory_batch`」的**静默回滚地雷**——让这些路径在改汇总前先写/扣批次，再 `recomputeInventorySummary`，使「汇总 = 批次 SUM」恒成立。

### 11.1 本次范围（4 条无去重重叠的路径）
| 路径 | 入口/事件 | 方向 | 批次操作 |
|---|---|---|---|
| `ReturnOrderInventoryHandler` | `prod.return.approved` | `'in'` 退料入库 | **UPSERT** 批次（按 `batch_no` 命中则 `+qty`，否则新建该批次） |
| `PickOrderInventoryHandler` | `prod_pick` | `'out'` 领料 | **扣减**指定 `batch_no` 批次（`quantity`/`available_qty` -=，耗尽软删） |
| `outsource/issue` PUT post | `outsource_issue` | `'out'` 委外发料 | **扣减**指定 `batch_no` 批次 |
| `outsource/receive` PUT post | `outsource_receive` | `'in'` 委外收货 | **新建**批次（收货成品，payload 无 `batch_no` → 自动生成） |

### 11.2 明确不在本次范围（避免范围蔓延/新双写）
- **`FinishOrderInventoryHandler`**：虽列于地雷清单，但它与 `WorkOrderCompletedHandler`(`workorder.completed`) 是**同一完工动作的两条事件路径**（production-inbound 发 `FinishOrderApprovedEvent` 触发它）。两者都会建批次 → **直接在这里加批次会造成双批次**。必须先做 **T-INV-3 去重**（定唯一权威路径）再回填。→ **移出 T-INV-5，并入 T-INV-3**。
- **财务列(`account_dr/cr`)重构**：outsource 两路由现用 raw `INSERT` 带财务列。本次仅补批次 + recompute，**保留原 raw transaction INSERT 不动**（财务列治理归 **T-INV-6**），避免共享模块改动扩大。
- **成本 handler 污染 / 死代码**：归 P3。

### 11.3 统一改造模板（以 PickOrder 为例）
```ts
// 1) 定位/扣减批次（复用 SalesShipped/DeliveryShipped 已验证写法）
const [batch] = await conn.execute(
  'SELECT id, quantity, available_qty FROM inv_inventory_batch WHERE batch_no=? AND material_id=? AND warehouse_id=? AND deleted=0 FOR UPDATE',
  [item.batchNo, item.materialId, item.warehouseId]
) as any;
if (batch.length > 0) {
  // 耗尽则软删，否则扣减
  if (newQty <= 0) UPDATE inv_inventory_batch SET deleted=1 ...
  else UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-? ...
} else {
  // 告警：指定批次不存在，跳过扣减；recompute 仍以真实批次为准，不造伪批次
  logger.warn(...)
}
// 2) 派生重算汇总（MUST 在批次变动之后）
await recomputeInventorySummary(conn, item.materialId, item.warehouseId);
// 3) 流水：outsource 两路由保留 raw INSERT(含财务列)；其余转 appendInventoryTransaction
```
`return_order` / `outsource_receive` 把 `-=` 改为 `+=`、耗尽判定改为「不存在则新建批次」。

### 11.4 边界与回滚
- 全部在各自既有 `transaction(...)` 内，批次写失败整体回滚。
- **批次不存在的扣减场景**：仅告警、不造伪批次、`recompute` 仍以真实批次为准（不破坏账实）。
- `recomputeInventorySummary` 已加固为环境无关（`undefined`/非元组兜底），测试 mock 下不再崩。

### 11.5 测试
- 为 4 路径各补集成测试：`mock conn.execute` 按真实调用顺序预设（含 recompute 的 UPDATE 返回 `{affectedRows:1}`），断言批次表 `qty` 变化 + 汇总一致 + 流水入账。
- 复用 e2e 修复范式（断言改校验绑定参数，不查 SQL 字面量）。
- 门禁：`tsc` 0 错 + 相关集成测试全绿。

### 11.6 上线验证
- 实施后在 live 库对一条退料/领料/委外发收实际跑一遍，再跑 `database/reconcile_inventory.sql` 断言 diff = 0。

---

## 12. T-INV-3 / T-INV-4 去重设计方案（✅ 2026-08-17 已实施）

> 状态：✅ 2026-08-17 已按本方案实施并通过验证。老板于本会话确认 **D2 方案A（事件权威）** + **D3 报工不扣料**。
> 验证：`npx tsc --noEmit` 0 错；全量 vitest **1572 通过 / 19 失败**，与去重前基线**完全一致，零新增失败**（1 个集成测试 mock 因方案A 改写同步修正）。
> 铁律遵守：去重涉及 EventRegistry 订阅与路由直写取舍，属架构改动，**先交老板确认方向（AskUserQuestion）再写码**。

### 12.1 事件-处理器映射（核实事实）
| 事件 (eventType) | 发射源 | 订阅处理器 | 库存动作 |
|---|---|---|---|
| `prod.pick.approved` | `material-issue/route.ts:302` 发 `PickOrderApprovedEvent` | `PickOrderInventoryHandler` ×**2**（EventRegistry 225-228 & 255-258） | 扣批次+汇总 |
| `workorder.material_issued` | `WorkOrder.issue()` → `WorkOrderMaterialIssuedEvent`（WorkOrder.ts:230） | `WorkOrderMaterialIssuedHandler`（EventRegistry 219-221） | 扣批次+汇总 |
| `prod.report.approved` | `WorkReportApprovedEvent`（WorkReportEvents.ts:18） | `WorkOrderMaterialIssuedHandler`（EventRegistry 271-274） | 扣批次+汇总 |
| `prod.finish.approved` | `FinishOrder.approve()`（FinishOrder.ts:93）**+`production-inbound/route.ts:265`** | `FinishOrderInventoryHandler`（EventRegistry 280-283） | 写汇总+流水（无批次） |
| `workorder.completed` | `WorkOrder.complete()` → `WorkOrderCompletedEvent`（WorkOrder.ts:251） | `WorkOrderCompletedHandler`（EventRegistry 239-241） | 建批次+汇总+流水 |

### 12.2 四类去重目标核实结论
| 编号 | 现象 | 是否真 bug | 依据 |
|---|---|---|---|
| **D1** | `PickOrderInventoryHandler` 被同事件 `prod.pick.approç.approved` 注册两次 | **否（无害冗余）** | `IdempotentHandler` 按 `(eventId, handlerName)` 去重：同事件二次投递因 eventId 已 mark → 跳过，不双扣。**仅清理价值，不紧急。** |
| **D2** | `production-inbound` PUT(post) 直写 `inv_inventory` 汇总+`inv_inventory_transaction`(production_inbound) **且** 发 `FinishOrderApprovedEvent` → `FinishOrderInventoryHandler` 再写汇总+流水(prod_finish) | **是真双写** | 两路径 source_type 不同（production_inbound vs prod_finish），IdempotentHandler **不跨 source 去重**；汇总被 +2×qualifiedQty，流水两行。**库存虚增 = 双写 bug。** |
| **D3** | `WorkOrderMaterialIssuedHandler` 同时订阅 `workorder.material_issued`(领料) 与 `prod.report.approved`(报工审核) | **条件性双扣（待业务确认）** | 两事件 eventId 不同，IdempotentHandler 不去重。若「领料」与「报工审核」为同一动作的两个触发点 → 双扣；若本就是两个独立业务动作（先领料、后报工各自扣）则合理。需老板定：报工审核是否应扣料。 |
| **D4** | `FinishOrderInventoryHandler`(prod.finish.approved) 与 `WorkOrderCompletedHandler`(workorder.completed) 均写完工成品入库 | **条件性重叠（待业务确认）** | 两事件不同。若生产入库过账同时触发 `WorkOrder.complete()`，则两 handler 同动作双写。当前 `production-inbound` 路由仅发 `prod.finish.approved`（非 workorder.completed），故**单独跑生产入库不触发 D4**；但若存在「完工同时调 complete()」的入口则双写。 |

### 12.3 去重策略选项（核心架构抉择）
**D2（production-inbound 双写）权威方选择：**
- **方案 A（事件权威，推荐）**：删除 `production-inbound/route.ts` PUT(post) 内的直写汇总+流水代码，仅保留单据状态更新+二维码+事件发布；库存写入全部交由 `FinishOrderInventoryHandler`（`prod.finish.approved`）统一完成，并为其补「建批次+recompute+统一 ledger」（复用 T-INV-5 模板，纳入 T-INV-3）。→ 一致性强、契合 EventBus 架构。
- **方案 B（路由权威）**：保留路由直写（补批次+ledger，套 T-INV-5 模板），改为**不发 `FinishOrderApprovedEvent`**（或 `FinishOrderInventoryHandler` 退化为只做非库存动作）。→ 改动面小，但弱化事件驱动。

**D3（两事件扣料）选择：**
- 选项 1：报工审核**不扣料** → 删除 `EventRegistry` 中 `prod.report.approved → WorkOrderMaterialIssuedHandler` 订阅，仅留 `workorder.material_issued`（领料）为权威。
- 选项 2：报工审核**也扣料**（领料+报工是两个独立扣减点）→ 保留双订阅，但须确保两事件 payload 不重复同一批料（业务逻辑保证）。

**D4（完工双 handler）选择：**
- 选项 1：`WorkOrderCompletedHandler`(workorder.completed) 为唯一完工入库权威（已含建批次+ledger）；`FinishOrderInventoryHandler` 仅作 `prod.finish.approved` 的非库存动作（或下线）。
- 选项 2：反之。

### 12.4 建议实施顺序（已实施记录）
1. ✅ **D2 方案 A**（确定性双写，优先级最高）→ 删除 `production-inbound/route.ts` PUT(post) 直写汇总+流水，由 `FinishOrderInventoryHandler` 单一权威完成「建批次+recompute+统一 ledger（含 account_dr/cr 财务列，治理归 T-INV-6）」。
2. ✅ **D1** 顺手删 `EventRegistry` 中 `prod.pick.approved` 对 `PickOrderInventoryHandler` 的重复订阅（无害冗余清理）。
3. ⏸ **D3 / D4**：D3 已裁定**报工不扣料**并实施（删 `prod.report.approved → WorkOrderMaterialIssuedHandler` 订阅）；D4 完工双 handler 条件性重叠仍**待老板定业务语义**（当前 production-inbound 仅发 `prod.finish.approved`，不触发 D4）。
4. 财务列(`account_dr/cr`)随 D2 在 `FinishOrderInventoryHandler` 的流水行保留，统一治理归 T-INV-6。

### 12.5 实施改动清单（2026-08-17）
**代码：**
- `src/app/api/warehouse/production-inbound/route.ts`：PUT(post) 事务块移除对 `inv_inventory` 汇总直写 + `inv_inventory_transaction`(production_inbound) 直写，仅保留单据状态更新 + 工单回写 + 发 `FinishOrderApprovedEvent`。库存写入全交 handler。
- `src/application/handlers/FinishOrderInventoryHandler.ts`：幂等块内由「只写汇总」升级为「建/加 `inv_inventory_batch`（按 finishOrderId 确定性批次号）+ `recomputeInventorySummary` 派生汇总」，流水行补充 `material_code/batch_no/account_dr/account_cr`（财务列保留，治理归 T-INV-6）。
- `src/application/EventRegistry.ts`：删 D1 重复订阅；删 D3 `prod.report.approved → WorkOrderMaterialIssuedHandler` 订阅（报工不扣料）。

**测试：**
- `tests/unit/app/api/warehouse/production-inbound.test.ts`："正常过账" mock 序列由 10 步精简为 6 步（移除库存直写步骤），outbox 断言保留。
- `tests/unit/application/handlers/FinishOrderInventoryHandler-idempotent.test.ts`：重写为基于 SQL 路由的 `mockImplementation`（消除脆弱的顺序 once 队列），断言批次建/加 + recompute 一次 + 财务列 + 幂等/并发/回滚。
- `tests/unit/integration/event-flow-template.test.ts`：阶段3 由「硬断言 4 次 execute」改为断言「INSERT IGNORE + 批次写 + recompute 派生 UPDATE」均发生（方案A 下调用链变长）。

**验证结果：** tsc 0 错；全量 vitest 1572/19（与基线一致）；3 个直接受影响文件全绿。
