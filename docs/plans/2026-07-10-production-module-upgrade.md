# Production Module Upgrade Implementation Plan (35% → 85%)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade production module from skeleton to full lifecycle: work order → pick → report → finish → cost, with cross-module integration.

---

## 实施进度（2026-07-10 核对）

> 基于代码事实核对，Phase 1-3 核心任务已落地，Phase 4 前端基本就绪，仅完工入库页与少量增强项待补。整体进度约 85%。

### 已实施 ✅

| 计划任务 | 落地位置 | 说明 |
| --- | --- | --- |
| Task 1: Schema 统一 | `src/lib/db/schema.ts`（第 1207-1360 行） | 6 张表已入 Drizzle schema：`prdPickOrder`、`prdPickOrderItem`、`prdReturnOrder`、`prdReturnOrderItem`、`prdWorkReport`、`prdFinishOrder`。注意实际表前缀为 `prd_`（非计划中的 `prod_`），与 `prod_work_order` 工单主表并存。 |
| Task 2: 工单状态统一 tinyint | `src/domain/production/value-objects/WorkOrderStatus.ts` | 7 态枚举 `draft/approved/picking/in_progress/completed/closed/cancelled` ↔ DB 码 1-7，`toDbCode()`/`fromDbCode()` 双向映射，`transitions` 表强制合法流转。 |
| Task 3: WorkOrder 聚合修正 | `src/domain/production/aggregates/WorkOrder.ts`、`src/infrastructure/repositories/MysqlWorkOrderRepository.ts` | 聚合操作 `prod_work_order` 表，含 `approve/start/markPicking/issueMaterials/complete/close/cancel` 全套流转，物料需求 `MaterialRequirement` 内嵌。 |
| Task 4: PickOrder 聚合+仓储 | `src/domain/production/aggregates/PickOrder.ts`、`src/domain/production/repositories/IPickOrderRepository.ts`、`src/infrastructure/repositories/MysqlPickOrderRepository.ts` | `PickOrder` + `PickOrderItem` 双类，`draft/approved/cancelled` 状态机，`approve()` 发布 `PickOrderApprovedEvent`。 |
| Task 5: WorkReport 聚合+仓储 | `src/domain/production/aggregates/WorkReport.ts`、`src/domain/production/repositories/IWorkReportRepository.ts`、`src/infrastructure/repositories/MysqlWorkReportRepository.ts` | 字段对齐实际表：`equipmentId`（非 `machineId`）、`operatorName`（单操作人）、`qualifiedQty/defectiveQty`。`approve()` 发布 `WorkReportApprovedEvent`。 |
| Task 6: FinishOrder 聚合+仓储 | `src/domain/production/aggregates/FinishOrder.ts`、`src/domain/production/repositories/IFinishOrderRepository.ts`、`src/infrastructure/repositories/MysqlFinishOrderRepository.ts` | `draft/approved/cancelled` 状态机，`approve()` 发布 `FinishOrderApprovedEvent`。 |
| Task 7: ProductionApplicationService 扩展 | `src/application/services/ProductionApplicationService.ts` | 已实现 `createPickOrder/approvePickOrder/cancelPickOrder`、`createWorkReport/approveWorkReport/cancelWorkReport`、`createFinishOrder/approveFinishOrder/cancelFinishOrder`、`calculateWorkOrderCosts`（材料-退料+报工工时×50+工装分摊+制造费用 50%）、`closeWorkOrder`（结案前自动核算成本）。 |
| Task 8: 库存联动事件处理器 | `src/application/handlers/{PickOrderInventoryHandler,FinishOrderInventoryHandler,MaterialReturnInventoryHandler,WorkOrderMaterialIssuedHandler}.ts` | 4 个处理器均已创建并在 `src/application/EventRegistry.ts` 注册：`prod.pick.approved`→扣库存、`prod.finish.approved`→加成品库存、`prod.return.approved`→退料加库存、`workorder.material_issued`→按批次扣库存+流水。 |
| Task 9: 工装联动 | `src/application/handlers/ToolUsageSyncHandler.ts` | 注册 `workorder.reported`，报工审核后累计刀模/网版使用次数。 |
| Task 10: 财务成本联动 | `src/application/handlers/{ProductionFinanceHandler,InkCostHandler,ScreenPlateCostHandler,ToolCostHandler}.ts` | `workorder.completed` 触发油墨/网版/工装成本归集；`workorder.closed` 触发 `ProductionFinanceHandler` 生成财务凭证。 |
| Task 11: 销售→工单 | `src/application/handlers/SalesToWorkOrderHandler.ts` | 注册 `sales.approved`，销售审核后自动生成生产工单。 |
| Task 12-14: 工单/领料/报工前端页 | `src/app/[locale]/production/{workorder,material-issue,material-return,report}/page.tsx` | 4 个页面均已存在。 |

### 未实施 / 待补 ⬜

| 计划任务 | 状态 | 说明 |
| --- | --- | --- |
| Task 15: 完工入库管理页 | ⬜ 未实施 | `src/app/[locale]/production/finish/page.tsx` 不存在，完工入库目前通过 API + 工单详情入口操作，缺独立管理页。 |
| 迁移 061/062 脚本 | ⬜ 未按计划编号 | 实际通过 `database/vnerpdacahng_schema.sql` + 现有迁移 001-060 体系管理，未新增 061/062。`database/migrations/` 当前止于 `060_unify_status_codes.sql`。 |
| 多人报工 / 班次 OEE | ⬜ 未实施 | `WorkReport` 仍为单操作人 `operatorName`，无 `operatorIds` JSON 数组；班次字段为字符串 `shift`，未做 OEE 按班次统计。 |
| 报工联动油墨库存扣减 | ⬜ 未实施 | `WorkReportApprovedEvent` 中 `toolIds` 为空数组占位，油墨配方扣减链路未接通。 |

### 验收清单核对

- [x] 工单状态流转 draft→approved→picking→in_progress→completed→closed（`WorkOrderStatusVO.transitions`）
- [x] 领料单审核触发库存出库（`PickOrderInventoryHandler`）
- [x] 退料单审核触发库存入库（`MaterialReturnInventoryHandler`）
- [x] 报工审核更新工单产量与工装使用（`ToolUsageSyncHandler`）
- [x] 完工入库审核触发成品入库（`FinishOrderInventoryHandler`）
- [x] 工单结案核算总成本（`ProductionApplicationService.calculateWorkOrderCosts`）
- [x] 状态流转校验（`WorkOrderStatusVO.transitionTo` 抛 `DomainError`）
- [x] 前端页面展示工单/领料/退料/报工
- [ ] 完工入库独立管理页
- [x] API 端点可用（`src/app/api/production/work-orders|work-report|material-issue|schedule` 等）
- [x] 事件处理器幂等（`IdempotentHandler` 包装）

---

**Architecture:** Unify the dual work order system (`prd_work_order` tinyint + `prod_work_order` varchar), add missing tables to Drizzle schema, fix DDD aggregate type mismatches, wire up event handlers, and ensure frontend pages work correctly.

**Tech Stack:** Node.js 22, Next.js 16, TypeScript 5, Drizzle ORM, MySQL, shadcn/ui, React 19

---

## Current State Analysis

### What exists:
- 2 work order tables: `prd_work_order` (tinyint status) + `prod_work_order` (varchar status)
- DDD aggregate `WorkOrder.ts` (277 lines) with status machine
- Application service `ProductionApplicationService.ts` (195 lines)
- 18 API route files
- 10 frontend pages
- Event handlers registered in EventRegistry

### Key problems:
1. **Dual table system**: `prd_work_order` (tinyint 1-4) vs `prod_work_order` (varchar pending/confirmed/etc.)
2. **Type mismatch**: DDD writes tinyint codes but DB column is varchar
3. **Missing schema**: Tables exist in DB but not in Drizzle ORM schema
4. **Status inconsistency**: 3 different status definitions exist
5. **Missing BOM table**: `prd_work_order_bom` not in schema
6. **Missing pick/return/report/finish tables**: Not in Drizzle schema

---

## Phase 1: Schema Unification + State Machine (3 days)

### Task 1: Consolidate work order tables in Drizzle schema

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `database/migrations/061_production_schema_consolidation.sql`

**Step 1: Add missing production tables to schema.ts**

Add after the existing `prodWorkOrderMaterialReq` definition (line ~785):

```typescript
// ============================================================
// 生产模块 - 领料/退料/报工/完工
// ============================================================

export const prdPickOrder = mysqlTable('prd_pick_order', {
  id: serial('id').primaryKey(),
  pickOrderNo: varchar('pick_order_no', { length: 50 }).notNull(),
  workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
  workOrderNo: varchar('work_order_no', { length: 50 }),
  warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
  warehouseName: varchar('warehouse_name', { length: 100 }),
  totalQty: decimal('total_qty', { precision: 18, scale: 4 }).default('0.0000'),
  totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).default('0.0000'),
  status: tinyint('status').default(1), // 1=草稿 2=已审核 3=已作废
  pickBy: bigint('pick_by', { mode: 'number', unsigned: true }),
  pickTime: datetime('pick_time'),
  remark: text('remark'),
  createBy: bigint('create_by', { mode: 'number', unsigned: true }),
  updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
  deleted: tinyint('deleted').default(0),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

export const prdPickOrderItem = mysqlTable('prd_pick_order_item', {
  id: serial('id').primaryKey(),
  pickOrderId: bigint('pick_order_id', { mode: 'number', unsigned: true }).notNull(),
  lineNo: int('line_no').default(1),
  materialId: bigint('material_id', { mode: 'number', unsigned: true }),
  materialCode: varchar('material_code', { length: 50 }),
  materialName: varchar('material_name', { length: 200 }),
  materialSpec: varchar('material_spec', { length: 200 }),
  unit: varchar('unit', { length: 20 }).default('pcs'),
  planQty: decimal('plan_qty', { precision: 18, scale: 4 }).default('0.0000'),
  actQty: decimal('act_qty', { precision: 18, scale: 4 }).default('0.0000'),
  batchNo: varchar('batch_no', { length: 50 }),
  unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
  amount: decimal('amount', { precision: 18, scale: 4 }).default('0.0000'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
});

export const prdReturnOrder = mysqlTable('prd_return_order', {
  id: serial('id').primaryKey(),
  returnOrderNo: varchar('return_order_no', { length: 50 }).notNull(),
  workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
  workOrderNo: varchar('work_order_no', { length: 50 }),
  pickOrderId: bigint('pick_order_id', { mode: 'number', unsigned: true }),
  warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
  totalQty: decimal('total_qty', { precision: 18, scale: 4 }).default('0.0000'),
  totalAmount: decimal('total_amount', { precision: 18, scale: 4 }).default('0.0000'),
  reason: varchar('reason', { length: 500 }),
  status: tinyint('status').default(1), // 1=草稿 2=已审核 3=已作废
  returnBy: bigint('return_by', { mode: 'number', unsigned: true }),
  returnTime: datetime('return_time'),
  remark: text('remark'),
  createBy: bigint('create_by', { mode: 'number', unsigned: true }),
  updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
  deleted: tinyint('deleted').default(0),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

export const prdReturnOrderItem = mysqlTable('prd_return_order_item', {
  id: serial('id').primaryKey(),
  returnOrderId: bigint('return_order_id', { mode: 'number', unsigned: true }).notNull(),
  lineNo: int('line_no').default(1),
  materialId: bigint('material_id', { mode: 'number', unsigned: true }),
  materialCode: varchar('material_code', { length: 50 }),
  materialName: varchar('material_name', { length: 200 }),
  unit: varchar('unit', { length: 20 }).default('pcs'),
  actQty: decimal('act_qty', { precision: 18, scale: 4 }).default('0.0000'),
  batchNo: varchar('batch_no', { length: 50 }),
  unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
  amount: decimal('amount', { precision: 18, scale: 4 }).default('0.0000'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
});

export const prdWorkReport = mysqlTable('prd_work_report', {
  id: serial('id').primaryKey(),
  reportNo: varchar('report_no', { length: 50 }).notNull(),
  workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
  workOrderNo: varchar('work_order_no', { length: 50 }),
  processName: varchar('process_name', { length: 100 }),
  machineNo: varchar('machine_no', { length: 50 }),
  shift: varchar('shift', { length: 20 }),
  operator: varchar('operator', { length: 100 }),
  goodQty: decimal('good_qty', { precision: 18, scale: 4 }).default('0.0000'),
  defectQty: decimal('defect_qty', { precision: 18, scale: 4 }).default('0.0000'),
  defectReason: varchar('defect_reason', { length: 500 }),
  workHours: decimal('work_hours', { precision: 18, scale: 4 }).default('0.0000'),
  status: tinyint('status').default(1), // 1=草稿 2=已审核 3=已作废
  reportBy: bigint('report_by', { mode: 'number', unsigned: true }),
  reportTime: datetime('report_time'),
  remark: text('remark'),
  createBy: bigint('create_by', { mode: 'number', unsigned: true }),
  updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
  deleted: tinyint('deleted').default(0),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

export const prdFinishOrder = mysqlTable('prd_finish_order', {
  id: serial('id').primaryKey(),
  finishOrderNo: varchar('finish_order_no', { length: 50 }).notNull(),
  workOrderId: bigint('work_order_id', { mode: 'number', unsigned: true }).notNull(),
  workOrderNo: varchar('work_order_no', { length: 50 }),
  warehouseId: bigint('warehouse_id', { mode: 'number', unsigned: true }),
  warehouseName: varchar('warehouse_name', { length: 100 }),
  goodQty: decimal('good_qty', { precision: 18, scale: 4 }).default('0.0000'),
  defectQty: decimal('defect_qty', { precision: 18, scale: 4 }).default('0.0000'),
  totalCost: decimal('total_cost', { precision: 18, scale: 4 }).default('0.0000'),
  unitCost: decimal('unit_cost', { precision: 18, scale: 4 }).default('0.0000'),
  status: tinyint('status').default(1), // 1=草稿 2=已审核 3=已作废
  finishBy: bigint('finish_by', { mode: 'number', unsigned: true }),
  finishTime: datetime('finish_time'),
  remark: text('remark'),
  createBy: bigint('create_by', { mode: 'number', unsigned: true }),
  updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
  deleted: tinyint('deleted').default(0),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});
```

**Step 2: Add type exports**

Add to the type exports section (after line ~1241):

```typescript
export type PrdPickOrder = typeof prdPickOrder.$inferSelect;
export type PrdPickOrderItem = typeof prdPickOrderItem.$inferSelect;
export type PrdReturnOrder = typeof prdReturnOrder.$inferSelect;
export type PrdReturnOrderItem = typeof prdReturnOrderItem.$inferSelect;
export type PrdWorkReport = typeof prdWorkReport.$inferSelect;
export type PrdFinishOrder = typeof prdFinishOrder.$inferSelect;
```

**Step 3: Create migration 061**

Create `database/migrations/061_production_tables.sql`:

```sql
-- Production module: Add missing tables for pick/return/report/finish

CREATE TABLE IF NOT EXISTS `prd_pick_order` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pick_order_no` varchar(50) NOT NULL,
  `work_order_id` int UNSIGNED NOT NULL,
  `work_order_no` varchar(50) DEFAULT NULL,
  `warehouse_id` int UNSIGNED DEFAULT NULL,
  `warehouse_name` varchar(100) DEFAULT NULL,
  `total_qty` decimal(18,4) DEFAULT '0.0000',
  `total_amount` decimal(18,4) DEFAULT '0.0000',
  `status` tinyint DEFAULT 1 COMMENT '1=草稿 2=已审核 3=已作废',
  `pick_by` int UNSIGNED DEFAULT NULL,
  `pick_time` datetime DEFAULT NULL,
  `remark` text,
  `create_by` int UNSIGNED DEFAULT NULL,
  `update_by` int UNSIGNED DEFAULT NULL,
  `deleted` tinyint DEFAULT 0,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pick_order_no` (`pick_order_no`),
  KEY `idx_pick_work_order` (`work_order_id`),
  KEY `idx_pick_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ... (similar for prd_pick_order_item, prd_return_order, prd_return_order_item, prd_work_report, prd_finish_order)
```

**Step 4: Run lint**

Run: `pnpm lint`
Expected: 0 new errors

---

### Task 2: Unify work order status to tinyint

**Files:**
- Modify: `src/domain/production/value-objects/WorkOrderStatus.ts`
- Modify: `src/domain/production/aggregates/WorkOrder.ts`
- Create: `database/migrations/062_unify_work_order_status.sql`

**Step 1: Define canonical status codes**

The canonical status mapping (tinyint):
```
1 = draft (草稿)
2 = confirmed (已审核)
3 = material_preparing (领料中)
4 = producing (生产中)
5 = completed (已完工)
6 = closed (已结案)
9 = cancelled (已作废)
```

**Step 2: Update WorkOrderStatus.ts**

Replace the existing status definitions with the canonical mapping.

**Step 3: Create migration 062**

```sql
-- Convert prod_work_order.status from varchar to tinyint
UPDATE `prod_work_order` SET `status` = 1 WHERE `status` = 'pending';
UPDATE `prod_work_order` SET `status` = 2 WHERE `status` = 'confirmed';
UPDATE `prod_work_order` SET `status` = 4 WHERE `status` = 'producing';
UPDATE `prod_work_order` SET `status` = 5 WHERE `status` = 'completed';
UPDATE `prod_work_order` SET `status` = 9 WHERE `status` = 'cancelled';

ALTER TABLE `prod_work_order` MODIFY COLUMN `status` tinyint DEFAULT 1;
```

---

### Task 3: Fix WorkOrder aggregate to use correct table

**Files:**
- Modify: `src/domain/production/aggregates/WorkOrder.ts`
- Modify: `src/infrastructure/repositories/MysqlWorkOrderRepository.ts`

**Step 1: Ensure aggregate operates on `prod_work_order` with tinyint status**

The aggregate should:
- Use `prod_work_order` table (not `prd_work_order`)
- Read/write tinyint status codes
- Implement all 7 status transitions with validation

**Step 2: Update repository to match**

The repository should:
- Query `prod_work_order` table
- Map tinyint status correctly
- Handle the `prd_work_order_bom` → `prod_work_order_item` mapping

---

## Phase 2: Core Production Flow (5 days)

### Task 4: Pick Order aggregate + repository

**Files:**
- Create: `src/domain/production/aggregates/PickOrder.ts`
- Create: `src/domain/production/entities/PickOrderLine.ts`
- Create: `src/domain/production/repositories/IPickOrderRepository.ts`
- Create: `src/infrastructure/repositories/MysqlPickOrderRepository.ts`

**Step 1: Create PickOrder aggregate**

```typescript
export class PickOrder {
  private constructor(
    public readonly id: number | undefined,
    public readonly pickOrderNo: string,
    public readonly workOrderId: number,
    public readonly workOrderNo: string,
    public warehouseId: number | undefined,
    public totalQty: number,
    public totalAmount: number,
    public status: number, // 1=草稿 2=已审核 3=已作废
    public items: PickOrderLine[],
    private domainEvents: DomainEvent[] = [],
  ) {}

  static create(workOrderId: number, workOrderNo: string, warehouseId: number): PickOrder {
    const pickOrderNo = generatePickOrderNo();
    return new PickOrder(undefined, pickOrderNo, workOrderId, workOrderNo, warehouseId, 0, 0, 1, []);
  }

  approve(): void {
    if (this.status !== 1) throw new DomainError('只有草稿状态可以审核');
    this.status = 2;
    this.addEvent(new PickOrderApprovedEvent(this.id!, this.pickOrderNo, this.workOrderId, this.items));
  }

  cancel(): void {
    if (this.status !== 1) throw new DomainError('只有草稿状态可以作废');
    this.status = 3;
  }

  addItem(item: PickOrderLine): void {
    this.items.push(item);
    this.recalculate();
  }

  private recalculate(): void {
    this.totalQty = this.items.reduce((sum, i) => sum + i.actQty, 0);
    this.totalAmount = this.items.reduce((sum, i) => sum + i.amount, 0);
  }
}
```

**Step 2: Create repository interface and MySQL implementation**

Follow the same pattern as `MysqlReturnOrderRepository`.

---

### Task 5: Work Report aggregate + repository

**Files:**
- Create: `src/domain/production/aggregates/WorkReport.ts`
- Create: `src/domain/production/repositories/IWorkReportRepository.ts`
- Create: `src/infrastructure/repositories/MysqlWorkReportRepository.ts`

**Step 1: Create WorkReport aggregate**

```typescript
export class WorkReport {
  private constructor(
    public readonly id: number | undefined,
    public readonly reportNo: string,
    public readonly workOrderId: number,
    public readonly workOrderNo: string,
    public processName: string,
    public machineNo: string,
    public shift: string,
    public operator: string,
    public goodQty: number,
    public defectQty: number,
    public defectReason: string,
    public workHours: number,
    public status: number, // 1=草稿 2=已审核 3=已作废
    private domainEvents: DomainEvent[] = [],
  ) {}

  static create(workOrderId: number, workOrderNo: string): WorkReport {
    return new WorkReport(undefined, generateReportNo(), workOrderId, workOrderNo, '', '', '', '', 0, 0, '', 0, 1);
  }

  approve(): void {
    if (this.status !== 1) throw new DomainError('只有草稿状态可以审核');
    this.status = 2;
    this.addEvent(new WorkReportedEvent(this.id!, this.workOrderId, this.goodQty, this.defectQty, this.workHours, this.processName));
  }

  cancel(): void {
    if (this.status !== 2) throw new DomainError('只有已审核状态可以作废');
    this.status = 3;
    this.addEvent(new WorkReportCancelledEvent(this.id!, this.workOrderId, this.goodQty, this.workHours));
  }
}
```

---

### Task 6: Finish Order aggregate + repository

**Files:**
- Create: `src/domain/production/aggregates/FinishOrder.ts`
- Create: `src/domain/production/repositories/IFinishOrderRepository.ts`
- Create: `src/infrastructure/repositories/MysqlFinishOrderRepository.ts`

**Step 1: Create FinishOrder aggregate**

```typescript
export class FinishOrder {
  private constructor(
    public readonly id: number | undefined,
    public readonly finishOrderNo: string,
    public readonly workOrderId: number,
    public readonly workOrderNo: string,
    public warehouseId: number | undefined,
    public goodQty: number,
    public defectQty: number,
    public totalCost: number,
    public unitCost: number,
    public status: number, // 1=草稿 2=已审核 3=已作废
    private domainEvents: DomainEvent[] = [],
  ) {}

  static create(workOrderId: number, workOrderNo: string, warehouseId: number): FinishOrder {
    return new FinishOrder(undefined, generateFinishOrderNo(), workOrderId, workOrderNo, warehouseId, 0, 0, 0, 0, 1);
  }

  approve(): void {
    if (this.status !== 1) throw new DomainError('只有草稿状态可以审核');
    this.status = 2;
    this.addEvent(new FinishOrderApprovedEvent(this.id!, this.workOrderId, this.goodQty, this.warehouseId!));
  }

  cancel(): void {
    if (this.status !== 2) throw new DomainError('只有已审核状态可以作废');
    this.status = 3;
    this.addEvent(new FinishOrderCancelledEvent(this.id!, this.workOrderId, this.goodQty));
  }
}
```

---

### Task 7: ProductionApplicationService expansion

**Files:**
- Modify: `src/application/services/ProductionApplicationService.ts`

**Step 1: Add pick/return/report/finish methods**

```typescript
// Pick Order methods
async createPickOrder(workOrderId: number, warehouseId: number, items: PickOrderLine[]): Promise<PickOrder>
async approvePickOrder(id: number, userId: number): Promise<void>
async cancelPickOrder(id: number): Promise<void>

// Return Order methods
async createReturnOrder(workOrderId: number, pickOrderId: number, warehouseId: number, items: ReturnOrderLine[]): Promise<ReturnOrder>
async approveReturnOrder(id: number, userId: number): Promise<void>

// Work Report methods
async createWorkReport(data: WorkReportData): Promise<WorkReport>
async approveWorkReport(id: number, userId: number): Promise<void>
async cancelWorkReport(id: number): Promise<void>

// Finish Order methods
async createFinishOrder(workOrderId: number, warehouseId: number, goodQty: number, defectQty: number): Promise<FinishOrder>
async approveFinishOrder(id: number, userId: number): Promise<void>
async cancelFinishOrder(id: number): Promise<void>

// Cost calculation
async calculateWorkOrderCost(workOrderId: number): Promise<WorkOrderCost>
async closeWorkOrder(workOrderId: number): Promise<void>
```

---

### Task 8: Event handlers for inventory integration

**Files:**
- Create: `src/application/handlers/PickOrderInventoryHandler.ts`
- Create: `src/application/handlers/ReturnOrderInventoryHandler.ts`
- Create: `src/application/handlers/FinishOrderInventoryHandler.ts`
- Modify: `src/application/EventRegistry.ts`

**Step 1: PickOrderInventoryHandler**

```typescript
export class PickOrderInventoryHandler implements IdempotentHandler {
  async handle(event: PickOrderApprovedEvent): Promise<void> {
    // 1. Create outbound order (inv_outbound) for each pick item
    // 2. Deduct inventory by batch
    // 3. Update work order pickedQty
    // 4. Update work order BOM pickedQty
  }
}
```

**Step 2: Register in EventRegistry**

```typescript
registerHandler('prod.pick.approved', PickOrderInventoryHandler);
registerHandler('prod.return.approved', MaterialReturnInventoryHandler);
registerHandler('prod.finish.approved', FinishOrderInventoryHandler);
```

---

## Phase 3: Cross-Module Integration (4 days)

### Task 9: Dcprint integration (tool usage)

**Files:**
- Create: `src/application/handlers/ProductionDcprintHandler.ts`
- Modify: `src/application/EventRegistry.ts`

**Step 1: Handle workorder.reported → tool usage sync**

When work report is approved:
1. Find associated tool (die/screen plate) from work order
2. Increment tool usage count
3. Check if usage exceeds threshold → trigger warning

---

### Task 10: Finance cost integration

**Files:**
- Create: `src/application/handlers/ProductionFinanceHandler.ts`
- Modify: `src/application/EventRegistry.ts`

**Step 1: Handle workorder.closed → cost voucher**

When work order is closed:
1. Calculate total cost (material + labor + tool + overhead)
2. Create finance voucher entry
3. Update product unit cost in inventory

---

### Task 11: Sales → Work Order integration

**Files:**
- Modify: `src/application/handlers/SalesToWorkOrderHandler.ts`

**Step 1: Ensure sales order can generate work order**

When sales order is approved:
1. Create work order from sales order lines
2. Auto-populate BOM from product BOM
3. Link work order to sales order

---

## Phase 4: Frontend Pages (3 days)

### Task 12: Work Order management page

**Files:**
- Modify: `src/app/[locale]/production/workorder/page.tsx`

**Step 1: Fix status display and actions**

Ensure:
- Status labels match tinyint codes
- Action buttons (审核/领料/报工/完工/结案) appear correctly by status
- Detail view shows BOM, pick history, report history, finish history

---

### Task 13: Pick Order page

**Files:**
- Modify: `src/app/[locale]/production/material-issue/page.tsx`

**Step 1: Fix pick order creation and approval**

Ensure:
- Can select work order
- Can add materials with quantities
- Can submit and approve
- Inventory deduction on approval

---

### Task 14: Work Report page

**Files:**
- Modify: `src/app/[locale]/production/report/page.tsx`

**Step 1: Fix work report creation and approval**

Ensure:
- Can select work order and process
- Can input good/defect quantities
- Can submit and approve
- Work order quantity updates on approval

---

### Task 15: Finish Order page

**Files:**
- Create: `src/app/[locale]/production/finish/page.tsx`

**Step 1: Create finish order management page**

- List finish orders
- Create finish order (select work order, input quantities)
- Approve finish order (triggers inventory inbound)
- View cost calculation

---

## Verification Checklist

After all tasks complete:

- [ ] Work order can flow: draft → confirmed → material_preparing → producing → completed → closed
- [ ] Pick order approval triggers inventory outbound
- [ ] Return order approval triggers inventory inbound
- [ ] Work report approval updates work order quantity and tool usage
- [ ] Finish order approval triggers inventory inbound
- [ ] Work order close calculates total cost
- [ ] All status transitions validate correctly
- [ ] Frontend pages display correct status and actions
- [ ] All API endpoints work correctly
- [ ] No lint errors
- [ ] All existing tests still pass

> 最后更新：2026-07-10
