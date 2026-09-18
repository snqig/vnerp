# 印刷场景生产 + 仓储专项升级方案（落地方案，已实施）

> 本文档为「印刷场景生产 + 仓储专项升级」的落地方案，基于 2026-07-10 代码事实核对。所有引用路径均为实际存在的代码位置。完全贴合丝网印刷行业刚需，拒绝通用 MES/ERP 的冗余功能，所有能力围绕「降损耗、提效率、可追溯」三个核心目标设计，复用现有工单、库存、工装、油墨模块底座，通过事件驱动解耦，不破坏现有 DDD 分层架构。

---

## 一、整体设计原则

1. **行业优先**：只做印刷场景特有功能，通用生产 / 仓储能力复用现有底座，不重复造轮子
2. **轻量落地**：每个功能第一版只做 80% 核心场景，比如排产只做机台甘特图拖拽，不上复杂 APS 自动排程
3. **链路闭环**：所有新能力和现有工单 - 领料 - 完工 - 成本链路打通，不做孤立功能点
4. **事件解耦**：跨模块联动全部通过领域事件，生产不直接操作库存，库存不直接修改生产数据

---

# 第一部分：生产管理 印刷场景适配升级

## 模块一：工序报工轻量化落地（已实施）

### 1.1 核心业务规则（印刷专属）

针对印刷核心工序（晒版、印刷、模切、覆膜、分切、品检）做极简报工，只记录核心生产数据。

| 报工核心字段 | 印刷场景说明 | 实际落地字段（`prd_work_report` 表 / `WorkReport` 聚合） |
| --- | --- | --- |
| 机台 | 绑定具体生产设备 | `equipment_id` / `equipmentId`（关联设备表，非独立的 `machine_id`） |
| 操作人员 | 支持多人报工，工时按人数折算 | `operator_name` / `operatorName`（当前为单操作人，多人报工未实施） |
| 班次 | 早班 / 中班 / 晚班 | `shift`（字符串，未做 OEE 按班次统计） |
| 产量 | 合格数量 + 不良数量 | `qualified_qty` / `defective_qty`（合格/不良双字段） |
| 实际工时 | 开机时长 + 有效生产时长 | `work_hours` / `workHours` |
| 关联工装 | 自动带出工单绑定的网版 / 刀模 | 当前 `WorkReportApprovedEvent.toolIds` 为空数组占位，工装联动走 `ToolUsageSyncHandler`（监听 `workorder.reported`） |
| 油墨消耗 | 关联工单油墨配方，报工后自动扣减油墨库存 | ⬜ 未实施，报工未联动油墨库存扣减 |

**强制规则落地情况**：

1. ✅ 报工必须关联对应工序的生产工单（`WorkReport.create` 校验 `workOrderId` 非空）
2. 🚧 累计合格产量达到工单计划量时工单自动标记「生产完成」— 由 `WorkOrder.complete()` 显式调用触发，未做报工累计自动判定
3. 🚧 不良品超损耗率预警 — 未实施弹窗预警
4. ✅ 报工审核后不可修改，作废走反向流程（`WorkReport.cancel` 仅允许 `draft/approved` 态作废）

### 1.2 数据模型（已落地）

实际表为 `prd_work_report`（非本文档早期设计的 `prod_work_report`），Drizzle schema 定义于 `src/lib/db/schema.ts:1300`。聚合实现于 `src/domain/production/aggregates/WorkReport.ts`，字段对齐实际表：

- `reportNo`、`workOrderId`、`processName`、`equipmentId`、`equipmentName`、`shift`、`operatorName`
- `qualifiedQty`、`defectiveQty`、`defectReason`、`workHours`、`reportDate`
- `status`：`draft/approved/cancelled` 三态

> 与早期设计的差异：`machine_id`→`equipment_id`、`operator_ids`（JSON 数组）→`operator_name`（单操作人）、无 `tool_ids` 列（工装联动走事件）、增补 `is_first_piece/first_piece_status/first_piece_inspector` 首件检验字段（印刷行业刚需）。

### 1.3 跨模块联动（事件驱动，已实施）

报工审核通过后发布 `WorkReportApprovedEvent`（`src/domain/production/events/WorkReportEvents.ts`），`src/application/EventRegistry.ts` 注册以下订阅：

1. **工装模块**：`ToolUsageSyncHandler`（`workorder.reported`）累计对应刀模/网版使用次数 ✅
2. **库存模块**：油墨库存扣减 ⬜ 未实施
3. **成本模块**：`InkCostHandler` / `ScreenPlateCostHandler` / `ToolCostHandler`（`workorder.completed`）归集油墨、网版、工装成本 ✅
4. **工单模块**：`WorkOrder.complete()` 累计完工数量并更新状态 ✅

### 1.4 前端交互

- 报工页：`src/app/[locale]/production/report/page.tsx` ✅
- 报工 API：`src/app/api/production/work-report/route.ts` ✅

---

## 模块二：分切业务专项优化（未实施）

印刷行业核心特色场景：大卷原材料（纸张、PVC、不干胶）分切成多个小卷投入生产，直接关系物料损耗管控。

### 2.1 现状

⬜ **未实施**。无 `prd_slitting_order` / `prod_slitting_order` 表、无 Service / API / 前端。schema.ts 中无对应定义。

### 2.2 设计要点（待落地参考）

- 分切单流程：创建→选原批次→录小卷规格→审核执行→库存自动变更
- 批次号规则：`原批次号-F001/F002`
- 损耗率 = (大卷总重量 - 小卷总重量) / 大卷总重量 × 100%，超 3% 预警
- 余料自动入库（`is_surplus=1` 标记）
- 成本按重量比例分摊

---

## 模块三：简易机台排产适配（部分实施）

### 3.1 现状

🚧 **部分实施**。

- 排产页：`src/app/[locale]/production/schedule/page.tsx` ✅
- 排产 API：`src/app/api/production/schedule/route.ts`、`auto`、`capacity`、`stats` ✅
- 排产领域：`src/domain/production/repositories/IScheduleRepository.ts`、`src/infrastructure/repositories/MysqlScheduleRepository.ts` ✅
- schema：`prdSchedule` / `prdScheduleDetail`（`src/lib/db/schema.ts:941/976`）✅
- 🚧 甘特图拖拽交互待确认，`@xyflow/react` 已纳入依赖但排产页拖拽体验待补

### 3.2 设计要点

- 机台维度甘特图（纵轴机台、横轴时间）
- 待排产工单池拖拽到机台时间轴
- 同机台时间重叠红色高亮（不强制拦截）
- 报工后自动更新任务条进度
- 日 / 周 / 月视图切换

---

# 第二部分：仓储管理 印刷物料适配升级

## 模块一：批次全链路追溯深化（部分实施）

### 1.1 现状

🚧 **部分实施**。

- 追溯 API：`src/app/api/production/trace/route.ts`、`src/app/api/dcprint/trace/route.ts` ✅
- 追溯页：`src/app/[locale]/dcprint/trace/page.tsx` ✅
- 🚧 聚合查询链路串联待完善（原料→领料→工单→报工→完工→出库→客户 全链路图谱）

### 1.2 设计要点

- 正向追溯：原材料批次 → 领料单 → 生产工单 → 工序报工 → 成品入库 → 销售出库 → 客户
- 反向追溯：成品批次 → 生产工单 → 所用原材料批次 → 供应商 → 操作人员 / 机台
- 基于现有单据批次关联关系聚合查询，不新建冗余追溯表
- 批次详情页新增「全链路追溯」Tab，支持导出追溯报告

---

## 模块二：物料有效期与批次管控（部分实施）

### 2.1 现状

🚧 **部分实施**。效期 FIFO 分配与定时任务已就绪，临期看板与过期锁定待补。

- 效期服务：`src/application/services/MaterialLifecycleService.ts` ✅
- 定时任务：`src/infrastructure/schedulers/BatchExpiryScheduler.ts` ✅
- FIFO 分配（含效期优先）：`src/lib/fifo-allocation.ts` ✅
- 效期字段迁移：`database/migrations/005_align_warehouse_schema.sql`、`material_lifecycle_migration.sql` ✅
- 🚧 临期物料预警看板、过期批次自动锁定禁出待补

### 2.2 设计要点

- 物料档案 `shelf_life_days`、`need_expiry_manage` 字段
- 批次表 `produce_date`、`expire_date`、`expiry_status`（1-正常 2-临期 3-过期锁定）
- 入库自动算到期日，每日定时任务扫描更新状态
- 出库强制按到期日升序分配（效期 FIFO 替代纯 FIFO）
- 提前 30 天临期预警，首页看板推送仓管

---

## 模块三：余料专属管理（未实施）

### 3.1 现状

⬜ **未实施**。批次表无 `is_surplus` / `surplus_source` 字段，无余料优先分配逻辑。

### 3.2 设计要点（待落地参考）

- 分切余料批次号 `原批次号-FY001`，生产退料余料 `原批次号-TY001`
- 领料单生成时按「余料优先→常规批次 FIFO」顺序分配
- 余料超 30 天未领用自动提醒
- 月度余料产生量 / 领用量 / 报废量统计

---

## 三、生产 + 仓储事件驱动闭环（已实施）

> 跨模块联动全部通过领域事件，生产模块不直接操作库存表。事件总线基于 Redis Streams + Outbox 两阶段（`src/infrastructure/event-bus/`），无 Redis 时降级 direct publish。

### 3.1 生产侧聚合（`src/domain/production/aggregates/`）

| 聚合 | 文件 | 状态机 |
| --- | --- | --- |
| WorkOrder | `WorkOrder.ts` | draft→approved→picking→in_progress→completed→closed / cancelled（7 态，`WorkOrderStatusVO`） |
| PickOrder | `PickOrder.ts` | draft→approved / cancelled |
| WorkReport | `WorkReport.ts` | draft→approved / cancelled |
| FinishOrder | `FinishOrder.ts` | draft→approved / cancelled |

### 3.2 仓储侧聚合（`src/domain/warehouse/aggregates/`）

| 聚合 | 文件 | 用途 |
| --- | --- | --- |
| InboundOrder | `InboundOrder.ts` | 入库单（采购入库 / 生产完工入库 / 退料入库） |
| OutboundOrder | `OutboundOrder.ts` | 出库单（销售出库 / 生产领料出库） |
| TransferOrder | `TransferOrder.ts` | 调拨单 |
| StocktakingOrder | `StocktakingOrder.ts` | 盘点单 |

### 3.3 事件处理器（`src/application/handlers/`，均在 `EventRegistry.ts` 注册）

| 事件 | 处理器 | 作用 |
| --- | --- | --- |
| `inbound.approved` | `InventorySyncHandler` | 入库加库存 + 成本核算（`InventoryCostService`） |
| `inbound.approved` | `FinanceVoucherHandler` | 生成应付凭证 |
| `inbound.approved` | `PurchaseInboundSyncHandler` | 采购入库回写 |
| `inbound.approved` | `QrCodeGenerationHandler` | 生成批次二维码 |
| `inbound.unapproved` | `InventoryRollbackHandler` | 反审入库回滚库存 |
| `outbound.approved` | `OutboundInventoryHandler` | 出库扣库存 + 批次扣减 + 成本结转 |
| `outbound.approved` | `OutboundReceivableHandler` | 销售出库生成应收 |
| `workorder.material_issued` | `WorkOrderMaterialIssuedHandler` | 工单领料扣库存 + 批次扣减 + 流水 |
| `prod.pick.approved` | `PickOrderInventoryHandler` | 领料单审核扣库存 + 流水 |
| `prod.return.approved` | `MaterialReturnInventoryHandler` | 退料单审核加库存 + 批次加回 + 成本 |
| `prod.finish.approved` | `FinishOrderInventoryHandler` | 完工入库加成品库存 + 流水 |
| `workorder.reported` | `ToolUsageSyncHandler` | 报工累计工装使用次数 |
| `workorder.completed` | `InkCostHandler` / `ScreenPlateCostHandler` / `ToolCostHandler` | 完工归集油墨/网版/工装成本 |
| `workorder.completed` | `WorkOrderCompletedHandler` / `FinanceVoucherHandler` / `QrCodeGenerationHandler` | 完工凭证 + 二维码 |
| `workorder.closed` | `ProductionFinanceHandler` | 结案生成财务凭证 |

### 3.4 应用服务编排

- `src/application/services/ProductionApplicationService.ts`：工单 / 领料 / 报工 / 完工 / 成本核算全流程编排
- `src/application/services/InboundApplicationService.ts` / `OutboundApplicationService.ts` / `TransferApplicationService.ts` / `StocktakingApplicationService.ts`：仓储四大单据编排
- `src/application/services/InventoryCostService.ts`：移动加权平均成本核算
- `src/application/services/MaterialLifecycleService.ts`：效期管控

---

## 四、分阶段落地 TODO 清单（给 Trae CN）

### 前置约束

1. 严格遵循 DDD 分层，跨模块联动全部通过领域事件，禁止直接跨库操作 ✅
2. 表命名规范：生产用 `prd_` / `prod_` 前缀，库存用 `inv_` 前缀，状态用数字枚举 ✅
3. 所有新功能复用现有工单、库存、工装模块的底座能力 ✅
4. 交付前通过 `pnpm lint`、`pnpm ts-check` 与核心场景单元测试 ✅

### P0 级：核心刚需功能

| 任务 | 状态 | 落地位置 / 说明 |
| --- | --- | --- |
| 工序报工轻量化 | 🚧 部分实现 | `prd_work_report` 表 + `WorkReport` 聚合 + `work-report` API/页；事件联动工装已通，油墨扣减待补 |
| 分切业务核心流程 | ⬜ 未实现 | 无 `prd_slitting_order` 表、无 Service/API/前端 |
| 物料有效期基础管控 | 🚧 部分实现 | `MaterialLifecycleService` + `BatchExpiryScheduler` + `fifo-allocation` 已实现效期 FIFO；临期看板/过期锁定待补 |

### P1 级：深化闭环功能

| 任务 | 状态 | 落地位置 / 说明 |
| --- | --- | --- |
| 批次全链路追溯 | 🚧 部分实现 | 追溯 API `production/trace` + `dcprint/trace` + 页面 `/dcprint/trace`；链路串联待完善 |
| 余料专属管理 | ⬜ 未实现 | 批次表无 `is_surplus` / `surplus_source` 字段 |
| 简易机台排产 | 🚧 部分实现 | `schedule` API/页 + `prdSchedule` schema；甘特图拖拽待确认 |

### P2 级：数据分析优化

| 任务 | 状态 | 落地位置 / 说明 |
| --- | --- | --- |
| 生产损耗分析 | ⬜ 未实现 | 分切损耗率/不良品原因分布统计未启动 |
| 机台稼动率统计 | ⬜ 未实现 | OEE 按班次统计未启动（`WorkReport.shift` 为字符串，未做结构化） |

---

## 五、关键技术底座（已就绪）

| 能力 | 位置 | 说明 |
| --- | --- | --- |
| 事件总线 | `src/infrastructure/event-bus/` | Redis Streams（`erp:domain-events`）+ Outbox 两阶段（`sys_event_processed`）+ XAUTOCLAIM 回收；无 Redis 降级 memory |
| Outbox 持久化 | `src/infrastructure/event-bus/{DomainEventOutbox,OutboxPoller,StreamPublisher,StreamConsumer}.ts` | 幂等键防重复消费，`IDEMPOTENCY_STALE_THRESHOLD_MINUTES=5` 回收死消费者 |
| FIFO 分配 | `src/lib/fifo-allocation.ts` | 已修 SQL 注入，乐观锁重试 |
| 成本核算 | `src/lib/cost-engine.ts`、`src/application/services/InventoryCostService.ts` | 移动加权平均 |
| 库存同步 | `src/lib/inventory-sync.ts` | 乐观锁 |
| 状态机 | `src/domain/production/value-objects/WorkOrderStateMachine.ts`、`src/domain/warehouse/value-objects/WarehouseStateMachine.ts` | 状态流转校验 |
| 单号生成 | `src/lib/document-numbering.ts` | `generateDocumentNo('material_pick'|'process_report'|'finish_inbound')` |
| 中间件 | `src/proxy.ts` | Next.js 16 自动探测（替代已删 `src/middleware.ts`），i18n + 鉴权 + CSRF |

---

> 最后更新：2026-07-10
