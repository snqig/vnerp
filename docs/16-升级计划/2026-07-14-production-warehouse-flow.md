# 生产工单 - 领料 - 库存 - 完工入库 全链路完善方案（落地方案，已实施）

> 本文档为「生产工单 → 领料 → 库存 → 完工入库」全链路的落地方案，基于 2026-07-10 代码事实核对。所有引用路径均为实际存在的代码位置。严格遵循**生产管业务状态、库存管数量成本、事件驱动解耦**的核心原则，生产模块仅负责工单生命周期与业务单据编排，所有库存变更通过领域事件由库存侧处理器承接，保证模块边界清晰、架构不腐化。

---

## 一、核心业务规则与全链路状态流转（已实施）

### 1.1 完整端到端链路

```
生产工单创建 → 工单审核 → 生成领料单 → 领料单审核
    ↓ （事件 prod.pick.approved）
库存模块：原材料出库扣减 + 成本核算 → 回写关联关系
    ↓
生产执行 → 生产报工（累计工时/产量/工装寿命）
    ↓
生成完工入库单 → 完工入库单审核
    ↓ （事件 prod.finish.approved）
库存模块：成品入库增加 + 成本归集 → 回写关联关系
    ↓
工单完工 → 成本核算 → 工单结案
```

### 1.2 生产工单状态机（数字枚举，已落地）

实际实现于 `src/domain/production/value-objects/WorkOrderStatus.ts`，`WorkOrderStatusVO` 类提供 `toDbCode()` / `fromDbCode()` 双向映射，`transitions` 表强制合法流转：

| DB 码 | 状态枚举 | 触发条件 | 可执行操作 |
| --- | --- | --- | --- |
| 1 | draft（草稿） | 新建工单 | 编辑、删除、提交审核 |
| 2 | approved（已审核） | 工单审核通过 | 生成领料单、开工、作废 |
| 3 | picking（领料中） | 首次领料单审核通过 | 继续领料、退料、开工 |
| 4 | in_progress（生产中） | 工单开工 | 报工、领料、退料、完工入库 |
| 5 | completed（已完工） | `WorkOrder.complete()` 显式调用 | 结案 |
| 6 | closed（已结案） | `WorkOrder.close()` 调用，结案前自动核算成本 | 仅查看 |
| 7 | cancelled（已作废） | `WorkOrder.cancel()` | 仅查看归档 |

**强制流转规则落地**：

1. ✅ 状态流转校验由 `WorkOrderStatusVO.transitionTo()` 强制，非法流转抛 `DomainError`
2. ✅ `canCancel()` 禁止 `closed/cancelled/completed` 态作废
3. ✅ `canComplete()` 仅 `in_progress` 可完工
4. ✅ `canClose()` 仅 `completed` 可结案
5. ✅ 支持部分领料、部分完工（一个工单可对应多张领料单、多张完工入库单）

### 1.3 核心单据关联规则

| 生产侧单据 | 库存侧联动 | 事件 | 处理器 |
| --- | --- | --- | --- |
| 领料单 `prd_pick_order` | 原材料出库扣减 | `prod.pick.approved` | `PickOrderInventoryHandler` |
| 退料单 `prd_return_order` | 原材料入库加回 | `prod.return.approved` | `MaterialReturnInventoryHandler` |
| 完工入库单 `prd_finish_order` | 成品入库增加 | `prod.finish.approved` | `FinishOrderInventoryHandler` |
| 工单领料（BOM 直接发料） | 原材料出库扣减（按批次） | `workorder.material_issued` | `WorkOrderMaterialIssuedHandler` |

> 库存侧完全复用现有出入库能力，包括 FIFO 批次分配（`src/lib/fifo-allocation.ts`）、移动加权平均成本（`src/application/services/InventoryCostService.ts`）、软删除、审计日志，生产模块零重复开发。

---

## 二、核心数据模型（已落地）

生产模块 4 张业务单据表，全部使用 `prd_` 前缀（与 `prod_work_order` 工单主表并存），仅存生产业务字段，不冗余库存数据。Drizzle schema 定义于 `src/lib/db/schema.ts`。

### 2.1 生产领料单（`prd_pick_order` / `prd_pick_order_item`）

schema.ts 第 1207-1255 行。聚合实现于 `src/domain/production/aggregates/PickOrder.ts`：

- 主表：`pick_order_no`、`work_order_id`、`warehouse_id`、`picker_name`、`total_qty`、`status`（1-草稿 2-已审核 3-已作废）
- 明细：`material_id`、`material_name`、`required_qty`、`actual_qty`、`batch_no`、`unit_cost`、`line_amount`、`unit`
- `PickOrder.create()` 校验单号、工单、明细非空
- `approve()` 发布 `PickOrderApprovedEvent`（含 items 数组：materialId/quantity/batchNo/warehouseId）

### 2.2 生产退料单（`prd_return_order` / `prd_return_order_item`）

schema.ts 第 1255-1300 行。退料事件 `MaterialReturnApprovedEvent` 由 `src/domain/production/events/PickOrderEvents.ts` 定义（与领料事件同文件），处理器 `MaterialReturnInventoryHandler` 监听 `prod.return.approved`：

- 退料明细含 `unit_price`，用于成本冲减
- 处理器调用 `InventoryCostService.onInbound()` 重算移动加权平均成本

### 2.3 完工入库单（`prd_finish_order`）

schema.ts 第 1331-1360 行。聚合实现于 `src/domain/production/aggregates/FinishOrder.ts`：

- 主表：`finish_no`、`work_order_id`、`warehouse_id`、`qualified_qty`、`defective_qty`、`status`
- `approve(userId, workOrderNo, productName)` 发布 `FinishOrderApprovedEvent`
- 处理器 `FinishOrderInventoryHandler` 查工单产品信息，`inv_inventory` 存在则 `quantity + ?`，否则插入新记录，并写 `inv_inventory_transaction`（`source_type='prod_finish'`）

### 2.4 生产报工表（`prd_work_report`）

schema.ts 第 1300-1331 行。聚合实现于 `src/domain/production/aggregates/WorkReport.ts`：

- 字段：`report_no`、`work_order_id`、`process_name`、`equipment_id`、`shift`、`operator_name`、`qualified_qty`、`defective_qty`、`work_hours`
- `approve()` 发布 `WorkReportApprovedEvent`

### 2.5 生产工单表扩展字段

`prod_work_order` 表（schema.ts:714）含累计统计字段：`completed_qty`、`total_material_cost`、`total_labor_cost`、`total_tool_cost`、`total_overhead_cost`、`unit_cost`，由 `ProductionApplicationService.calculateWorkOrderCosts()` 在结案前自动核算写入。

---

## 三、DDD 分层与事件驱动解耦实现（已实施）

### 3.1 分层职责边界

| 层级 / 模块 | 职责 | 落地位置 |
| --- | --- | --- |
| 生产领域层 | 工单 / 领料 / 退料 / 报工 / 完工单业务规则校验、数量累计逻辑、状态流转 | `src/domain/production/aggregates/`、`src/domain/production/value-objects/`、`src/domain/production/entities/` |
| 生产应用层 | 工单全流程编排、单据生成、事件发布（不包含业务规则，不直接修改库存） | `src/application/services/ProductionApplicationService.ts` |
| 库存模块 | 出入库执行、批次分配、成本计算、库存数量变更 | `src/application/handlers/` 下的库存处理器 + `src/lib/fifo-allocation.ts` + `src/application/services/InventoryCostService.ts` |
| 事件总线 | 跨模块数据同步、状态通知 | `src/infrastructure/event-bus/`（Redis Streams + Outbox） |

### 3.2 核心领域事件（已定义并注册）

生产模块发布的核心事件，均定义于 `src/domain/production/events/`：

| 事件 | 定义文件 | 触发点 | 库存侧处理器 |
| --- | --- | --- | --- |
| `PickOrderApprovedEvent`（`prod.pick.approved`） | `PickOrderEvents.ts` | `PickOrder.approve()` | `PickOrderInventoryHandler` |
| `MaterialReturnApprovedEvent`（`prod.return.approved`） | `PickOrderEvents.ts` | 退料单审核 | `MaterialReturnInventoryHandler` |
| `FinishOrderApprovedEvent`（`prod.finish.approved`） | `FinishOrderEvents.ts` | `FinishOrder.approve()` | `FinishOrderInventoryHandler` |
| `WorkOrderMaterialIssuedEvent`（`workorder.material_issued`） | `WorkOrderEvents.ts` | `WorkOrder.issueMaterials()` | `WorkOrderMaterialIssuedHandler` |
| `WorkReportApprovedEvent`（`workorder.reported`） | `WorkReportEvents.ts` | `WorkReport.approve()` | `ToolUsageSyncHandler`（工装累计） |
| `WorkOrderCompletedEvent`（`workorder.completed`） | `WorkOrderEvents.ts` | `WorkOrder.complete()` | `InkCostHandler` / `ScreenPlateCostHandler` / `ToolCostHandler` / `WorkOrderCompletedHandler` / `FinanceVoucherHandler` |
| `WorkOrderClosedEvent`（`workorder.closed`） | `WorkOrderEvents.ts` | `WorkOrder.close()` | `ProductionFinanceHandler` |

### 3.3 事件处理器实现细节

#### `WorkOrderMaterialIssuedHandler`（`src/application/handlers/WorkOrderMaterialIssuedHandler.ts`）

工单领料事件处理器，事务内执行：

1. `SELECT ... FOR UPDATE` 锁定 `inv_inventory` 行，校验库存充足（不足抛错）
2. `UPDATE inv_inventory SET quantity = quantity - ?, available_qty = available_qty - ?`
3. 若有 `batchNo`，锁定 `inv_inventory_batch` 行，扣减批次 `available_qty` / `quantity`，扣完置 `status=3`
4. 写 `inv_inventory_transaction`（`trans_type='out'`，`source_type='material_issue'`，数量为负）

#### `PickOrderInventoryHandler`（`src/application/handlers/PickOrderInventoryHandler.ts`）

领料单审核事件处理器，遍历 items 扣减 `inv_inventory` 并写流水（`source_type='prod_pick'`）。

#### `MaterialReturnInventoryHandler`（`src/application/handlers/MaterialReturnInventoryHandler.ts`）

退料单审核事件处理器，事务内：

1. `SELECT ... FOR UPDATE` 锁定库存行
2. 存在则 `quantity + ?`，否则插入新记录
3. 调用 `InventoryCostService.onInbound()` 重算移动加权平均成本
4. 批次存在则加回，否则新建批次记录
5. 写 `inv_inventory_transaction`（`trans_type='in'`，`source_type='material_return'`）

#### `FinishOrderInventoryHandler`（`src/application/handlers/FinishOrderInventoryHandler.ts`）

完工入库事件处理器：

1. 查 `prod_work_order` 获取产品信息（`product_id` / `product_code`）
2. `inv_inventory` 存在则 `quantity + ?`，否则插入新记录（含 `material_name` = `productName`）
3. 写 `inv_inventory_transaction`（`trans_type='in'`，`source_type='prod_finish'`）

### 3.4 一致性与可靠性保障（已落地）

1. **事务性发件箱**：`ProductionApplicationService.persistAndPublishEvents()` 在事务内调用 `getDomainEventOutbox().saveEvents(conn, aggregateType, id, events)`，保证「单据生效 = 事件必发」
2. **幂等处理**：所有库存处理器通过 `IdempotentHandler` 包装（`src/infrastructure/event-bus/IdempotentHandler.ts`），以事件 ID 为幂等键防重复消费
3. **失败重试与死信**：Outbox 两阶段（`sys_event_processed`：`checkAndMark→processing` → `markAsProcessed→processed`），`OutboxPoller` 定时回收过期 `processing`（`IDEMPOTENCY_STALE_THRESHOLD_MINUTES=5`），`XAUTOCLAIM` 回收死消费者
4. **反向回滚**：`PickOrder.cancel()` / `FinishOrder.cancel()` 发布 `Cancelled` 事件，`inbound.unapproved` 由 `InventoryRollbackHandler` 回滚库存

---

## 四、关键业务场景细化

### 4.1 领料场景：BOM 自动带出 + 批次策略

#### 基础版（已落地 ✅）

- 手动录入领料明细，支持按物料搜索选择
- 库存自动按 FIFO 规则分配批次（`src/lib/fifo-allocation.ts`）
- 领料单审核触发 `PickOrderInventoryHandler` 扣减库存
- 工单直接发料走 `WorkOrder.issueMaterials()` + `WorkOrderMaterialIssuedHandler`，按 `batchNo` 精确扣减批次

#### 进阶版（部分实施 🚧）

- 🚧 工单关联产品 BOM，生成领料单时自动展开 BOM 带出原材料清单（BOM 档案 API 已建，自动展开待实现）
- ⬜ 超额领料管控（超过 BOM 数量 ±5% 需二次审批）未实施
- ⬜ 指定批次领料、优先领余料 / 临期料规则未实施

### 4.2 退料场景：原批次退回 + 成本冲减（已落地 ✅）

1. ✅ 退料关联原领料单，`MaterialReturnInventoryHandler` 按 `batchNo` 加回原批次
2. ✅ 退料成本按 `unit_price` 通过 `InventoryCostService.onInbound()` 冲减，重算移动加权平均
3. ✅ 退料审核后冲减工单累计材料成本（`calculateWorkOrderCosts` 中 `total_return` 扣减）
4. 🚧 剩余未用完物料必须在工单结案前全部退回的强校验未实施

### 4.3 完工入库场景：多维度成本自动归集（已落地 ✅）

`ProductionApplicationService.calculateWorkOrderCosts(workOrderId)` 在 `closeWorkOrder()` 前自动核算：

```
材料成本 = SUM(prd_pick_order_item.line_amount) - SUM(prd_return_order_item.line_amount)
人工成本 = SUM(prd_work_report.work_hours) × 50  （默认 50 元/小时）
工装成本 = SUM(dcprint_tool_usage.amortized_cost)
制造费用 = 材料成本 × 50%  （可配置）
单位成本 = 总成本 / SUM(prd_finish_order.qualified_qty)
```

写入 `prod_work_order` 的 `total_material_cost` / `total_labor_cost` / `total_tool_cost` / `total_overhead_cost` / `unit_cost`。

### 4.4 双向追溯链路（部分实施 🚧）

- 🚧 追溯 API `src/app/api/production/trace/route.ts` 已建，链路串联待完善
- ⬜ 工单详情跳转库存单据、库存批次反查工单的双向跳转待补

---

## 五、异常与边界场景处理

| 场景 | 处理规则 | 落地情况 |
| --- | --- | --- |
| 领料审核时库存不足 | `WorkOrderMaterialIssuedHandler` 抛错「物料XXX库存不足: 当前X, 需领Y」 | ✅ |
| 工单中途作废 | `WorkOrder.cancel()` 校验 `canCancel()`，已完工/结案不可作废 | ✅ |
| 超产完工 | `WorkOrder.complete()` 校验 `completedQty > plannedQty` 抛错 | ✅ |
| 部分完工多次入库 | 支持一个工单多次完工入库，`completed_qty` 累计 | ✅ |
| 领料后物料批次变更 | 以库存实际出库批次为准，`WorkOrderMaterialIssuedHandler` 按 `batchNo` 精确扣减 | ✅ |
| 跨月退料 / 完工 | 成本按实际发生月份归集，`calculateWorkOrderCosts` 实时重算 | ✅ |

---

## 六、前端交互设计

### 6.1 已落地页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 工单管理 | `src/app/[locale]/production/workorder/page.tsx` | 工单列表 + 状态标签 + 操作按钮 |
| 领料单 | `src/app/[locale]/production/material-issue/page.tsx` | 领料单创建、审核、查看 |
| 退料单 | `src/app/[locale]/production/material-return/page.tsx` | 退料单管理 |
| 报工 | `src/app/[locale]/production/report/page.tsx` | 报工录入、审核 |
| 排产 | `src/app/[locale]/production/schedule/page.tsx` | 机台排产甘特图 |

### 6.2 待补页面

- ⬜ 完工入库独立管理页 `src/app/[locale]/production/finish/page.tsx`（当前通过 API + 工单详情入口操作）
- 🚧 工单详情页 Tab 分区（基本信息 / 领料记录 / 退料记录 / 完工记录 / 报工记录 / 成本统计）待完善

### 6.3 API 端点

- `src/app/api/production/work-orders/route.ts` — 工单 CRUD
- `src/app/api/production/work-report/route.ts` — 报工 CRUD
- `src/app/api/production/material-issue/route.ts` — 领料单 CRUD
- `src/app/api/production/schedule/route.ts` — 排产
- `src/app/api/production/trace/route.ts` — 追溯

---

## 七、分阶段执行 TODO 清单（给 Trae CN）

### 前置约束

1. ✅ 严格模块解耦，生产模块禁止直接操作库存表，所有库存变更通过事件驱动
2. ✅ 表命名 `prd_` 前缀（业务单据）/ `prod_` 前缀（工单主表），状态数字枚举，审计字段齐全
3. ✅ 所有事件处理通过 `IdempotentHandler` 幂等校验，支持失败重试
4. ✅ 复用库存模块现有出入库、成本、批次能力，不重复造轮子
5. ✅ 交付前通过 `pnpm lint`、`pnpm ts-check` 与核心场景单元测试

### 第一阶段：基础主链路闭环（P0）

| 任务 | 状态 | 落地位置 |
| --- | --- | --- |
| 数据模型与 schema | ✅ | `src/lib/db/schema.ts`（`prdPickOrder` / `prdReturnOrder` / `prdFinishOrder` / `prdWorkReport`） |
| 生产领域层与应用层 | ✅ | `src/domain/production/aggregates/{WorkOrder,PickOrder,WorkReport,FinishOrder}.ts` + `ProductionApplicationService.ts` |
| 事件联动与库存对接 | ✅ | `src/application/handlers/{WorkOrderMaterialIssuedHandler,PickOrderInventoryHandler,MaterialReturnInventoryHandler,FinishOrderInventoryHandler}.ts` + `EventRegistry.ts` |
| 基础 API 与前端页面 | 🚧 | 领料/退料/报工 API + 页面已实现；完工入库独立页待补 |

### 第二阶段：业务深度优化（P1）

| 任务 | 状态 | 落地位置 / 说明 |
| --- | --- | --- |
| BOM 自动展开领料 | 🚧 | BOM 档案 API 已建，自动展开待实现 |
| 完工成本自动归集 | ✅ | `ProductionApplicationService.calculateWorkOrderCosts`（材料+人工+工装+制造费用） |
| 双向追溯能力 | 🚧 | 追溯 API/页已建，批次回写待完善 |

### 第三阶段：进阶管控能力（P2）

| 任务 | 状态 | 说明 |
| --- | --- | --- |
| 超额领料与损耗管控 | ⬜ | 未实施 |
| 工单结案流程 | ✅ | `closeWorkOrder` 结案前自动核算成本，`closed` 态不可再操作 |
| 在制品管理 | ⬜ | 未实施 |

---

## 八、关键技术底座（已就绪）

| 能力 | 位置 | 说明 |
| --- | --- | --- |
| 事件总线 | `src/infrastructure/event-bus/` | Redis Streams（`erp:domain-events`，`STREAM_MAX_LENGTH=10000`）+ Outbox 两阶段 + XAUTOCLAIM |
| Outbox 持久化 | `src/infrastructure/event-bus/{DomainEventOutbox,OutboxPoller,StreamPublisher,StreamConsumer}.ts` | `sys_event_processed` 表，`IDEMPOTENCY_STALE_THRESHOLD_MINUTES=5` |
| 幂等处理 | `src/infrastructure/event-bus/IdempotentHandler.ts` | 包装所有库存处理器，防重复消费 |
| FIFO 批次分配 | `src/lib/fifo-allocation.ts` | 已修 SQL 注入，乐观锁重试 |
| 成本核算 | `src/application/services/InventoryCostService.ts`、`src/lib/cost-engine.ts` | 移动加权平均 |
| 库存同步 | `src/lib/inventory-sync.ts` | 乐观锁 |
| 单号生成 | `src/lib/document-numbering.ts` | `generateDocumentNo('material_pick'|'process_report'|'finish_inbound')` |
| 事务 | `src/lib/db/index.ts` | `transaction()` / `transactionWithRetry()`（乐观锁冲突指数退避重试） |
| 中间件 | `src/proxy.ts` | Next.js 16 自动探测（替代已删 `src/middleware.ts`），i18n + 鉴权 + CSRF |

---

> 最后更新：2026-07-10
