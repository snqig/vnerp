# QR 二维码溯源全链路实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现原料入库→分切拆码→领料报工→生产完工→出库销售全链路二维码追溯，支持父子码多级拆分、FIFO 批次分配、标签模板、扫码移动端溯源。

**架构:** DDD 分层 — `domain/trace`（实体 + 仓储接口）→ `application/services/`（应用服务）→ `infrastructure/repositories/`（MySQL实现）→ `app/api/trace/`（Thin Controller）。前端组件化：`QrScanner` + `TraceTimeline` + `LabelPreview` 跨页面复用。

**Tech Stack:** Next.js 16 App Router, Drizzle ORM schema + raw SQL query, shadcn/ui, Recharts, ZXing (扫码), html2canvas + jspdf (标签打印)

**工期估算:** 6.5 人天（已根据 review 精简冗余）

---

## 修正说明（相对原 TODO）

| 原 TODO 问题 | 本计划修正 |
|-------------|-----------|
| 应用服务路径错位 | → `src/application/services/QRCodeApplicationService.ts` |
| 事件处理器路径错位 | → `src/application/handlers/QRCodeBindingHandler.ts` |
| `parent_qr_id` 类型 varchar | → `bigint` 引用同表 id |
| `batch_id` 字段名 | → `batch_no` 与现有 schema 对齐 |
| 遗漏权限注册 | → 每阶段显式说明 `permissions-catalog.ts` 修改 |
| 遗漏菜单注册 | → Phase 3 含 menu seed 修改 |
| 遗漏 i18n 消息 | → 每个前端 task 含 i18n 文件修改 |
| 遗漏种子数据 | → Phase 0 含 label_template seed |
| 后端 PDF 渲染 vs 前端预览冗余 | → 去掉 puppeteer，纯前端 `window.print()` + CSS |
| FIFO 引擎修改不必要 | → 改用 `parent_batch_no` 字段，FIFO 自动排序 |
| 幂等/缓存 P2 | → 提升至 P1，Phase 3 实现 |

---

## Phase 0: 基础设施与数据层（0.8 天）

### Task 0.1: DB Schema — qrcode_record + print_log + label_template

**Files:**
- Create: `src/lib/db/schemas/trace.ts`
- Modify: `src/lib/db/schema.ts` (export new schemas)
- Test: `npx tsc --noEmit`

**Step 1: Create `src/lib/db/schemas/trace.ts`**

```typescript
import { bigint, datetime, decimal, index, int, mysqlTable, text, tinyint, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const qrcodeRecord = mysqlTable('qrcode_record', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  qrContent: varchar('qr_content', { length: 64 }).notNull(),
  parentQrId: bigint('parent_qr_id', { mode: 'number', unsigned: true }),
  splitFlag: tinyint('split_flag').default(0),
  splitIndex: int('split_index').default(0),
  sourceType: tinyint('source_type').notNull(),
  batchNo: varchar('batch_no', { length: 50 }),
  quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0.0000'),
  materialId: bigint('material_id', { mode: 'number', unsigned: true }),
  materialName: varchar('material_name', { length: 100 }),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
}, (table) => ({
  qrContentIdx: index('idx_qr_content').on(table.qrContent),
  batchNoIdx: index('idx_batch_no').on(table.batchNo),
  parentQrIdx: index('idx_parent_qr').on(table.parentQrId),
  sourceTypeIdx: index('idx_source_type').on(table.sourceType),
}));

export const printLog = mysqlTable('print_log', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  qrId: bigint('qr_id', { mode: 'number', unsigned: true }).notNull(),
  templateId: bigint('template_id', { mode: 'number', unsigned: true }),
  printTime: datetime('print_time').default(sql`CURRENT_TIMESTAMP`),
  operator: varchar('operator', { length: 50 }),
  paperType: varchar('paper_type', { length: 20 }).default('thermal'),
  printCount: int('print_count').default(1),
});

export const labelTemplate = mysqlTable('label_template', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  scenario: varchar('scenario', { length: 30 }).notNull(),
  htmlTemplate: text('html_template').notNull(),
  widthMm: int('width_mm').default(60),
  heightMm: int('height_mm').default(40),
  qrSizeMm: int('qr_size_mm').default(20),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
});

export type QrcodeRecord = typeof qrcodeRecord.$inferSelect;
export type PrintLog = typeof printLog.$inferSelect;
export type LabelTemplate = typeof labelTemplate.$inferSelect;
```

**Step 2: Export from `src/lib/db/schema.ts`**

```typescript
export { qrcodeRecord, printLog, labelTemplate } from './schemas/trace';
export type { QrcodeRecord, PrintLog, LabelTemplate } from './schemas/trace';
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

---

### Task 0.2: 权限注册

**Files:**
- Modify: `src/lib/permissions-catalog.ts`

**Step 1: Add trace permissions**

```typescript
TRACE_QR_VIEW: 'trace:qr:view',
TRACE_QR_GENERATE: 'trace:qr:generate',
TRACE_QR_SPLIT: 'trace:qr:split',
TRACE_QR_SCAN: 'trace:qr:scan',
TRACE_LABEL_TEMPLATE: 'trace:label:template',
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

---

### Task 0.3: 默认标签模板种子数据

**Files:**
- Modify: `src/app/api/init/settings-seed/route.ts` (添加 labelTemplate 数组 + INSERT)

**Step 1: Add default templates**

```typescript
const labelTemplates = [
  {
    name: '原料入库标签（默认）',
    scenario: 'inbound',
    width_mm: 60, height_mm: 40, qr_size_mm: 20,
    html_template: '<div style="..."><img src="{qrDataUrl}" /><p>{materialName}</p><p>{batchNo}</p></div>',
  },
  {
    name: '分切子码标签',
    scenario: 'split',
    width_mm: 50, height_mm: 30, qr_size_mm: 20,
    html_template: '<div>...{splitIndex}/{totalSplits}...</div>',
  },
  {
    name: '成品标签',
    scenario: 'finished',
    width_mm: 80, height_mm: 50, qr_size_mm: 20,
    html_template: '<div>...{productName}...</div>',
  },
];
```

**Step 2: Seed existing DB**

Run: POST to `/api/init/settings-seed`

---

## Phase 1: 后端领域层（1.0 天）

### Task 1.1: QRCode 领域实体 + 值对象

**Files:**
- Create: `src/domain/trace/QRCode.ts`
- Create: `src/domain/trace/events/QRCodeEvents.ts`

**Step 1: Write the entity**

```typescript
export class QRCode {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly qrContent: string,
    public readonly parentQrId: number | null,
    public readonly splitFlag: number,
    public readonly splitIndex: number,
    public readonly sourceType: SourceType,
    public readonly batchNo: string | null,
    private _quantity: number,
    public readonly materialId: number | null,
    public readonly materialName: string | null,
    private _status: number,
  ) {}

  static create(props: QRCodeProps): QRCode { /* validation + emit QRCodeGeneratedEvent */ }
  static reconstitute(props: QRCodeProps): QRCode { /* from DB, no events */ }

  split(quantity: number, totalSplits: number, index: number): QRCode { /* validate: quantity <= _quantity, emit QRCodeSplitEvent */ }
  markScanned(operator: string): void { /* emit QRCodeScannedEvent */ }
  bindBatch(batchNo: string): void { this._batchNo = batchNo; }
  getDomainEvents(): DomainEvent[] { return this._domainEvents; }
  clearDomainEvents(): void { this._domainEvents = []; }
}
```

**Step 2: Write events**

```typescript
export class QRCodeGeneratedEvent implements DomainEvent { /* eventType: 'qrcode.generated' */ }
export class QRCodeSplitEvent implements DomainEvent { /* eventType: 'qrcode.split' */ }
export class QRCodeScannedEvent implements DomainEvent { /* eventType: 'qrcode.scanned' */ }
export class QRCodePrintedEvent implements DomainEvent { /* eventType: 'qrcode.printed' */ }
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

---

### Task 1.2: 仓储接口 IQRCodeRepository

**Files:**
- Create: `src/domain/trace/repositories/IQRCodeRepository.ts`

```typescript
export interface IQRCodeRepository {
  findByContent(qrContent: string): Promise<QRCode | null>;
  findById(id: number): Promise<QRCode | null>;
  findByParentId(parentId: number): Promise<QRCode[]>;
  findByBatchNo(batchNo: string): Promise<QRCode[]>;
  create(qrCode: QRCode): Promise<number>;
  createBatch(qrCodes: QRCode[]): Promise<number[]>;
  updateQuantity(id: number, quantity: number): Promise<void>;
  queryTraceTimeline(qrContent: string): Promise<TraceTimelineItem[]>;
}
```

Verify: `npx tsc --noEmit`

---

### Task 1.3: MySQL 仓储实现

**Files:**
- Create: `src/infrastructure/repositories/MysqlQRCodeRepository.ts`

实现 `IQRCodeRepository` 全部方法，使用 `query`/`execute` 操作 `qrcode_record` 表。

`queryTraceTimeline` 核心 SQL：JOIN `qrcode_record`、`inv_inventory_batch`、`inv_inbound_order`、`prod_work_order`、`inv_outbound_order` 按时间排序返回结构化时间线。

Verify: `npx tsc --noEmit`

---

## Phase 2: 后端应用服务 + API（1.5 天）

### Task 2.1: QRCodeApplicationService

**Files:**
- Create: `src/application/services/QRCodeApplicationService.ts`

方法清单：
- `generateBatchQr(materialId, batchNo, quantity, count)` → 批量生成父码
- `splitParentQr(parentQrContent, splits)` → 分切拆分，创建子 QR + 子 inventory_batch
- `recordScan(qrContent, operator, location)` → 扫码流转记录
- `getTraceTimeline(qrContent)` → 全链路时间线
- `recordPrint(qrId, templateId, operator, paperType)` → 写入 print_log

**业务约束（在实体中 enforce）:**
- 拆分总量 ≤ 父码 quantity
- 支持多级拆分（parentQrId 链）
- 扫码重复通过应用层幂等过滤

---

### Task 2.2: API Routes

**Files:**
- Create: `src/app/api/trace/qr/[content]/route.ts` — GET 溯源详情
- Create: `src/app/api/trace/qr/generate/route.ts` — POST 批量生成
- Create: `src/app/api/trace/qr/split/route.ts` — POST 分切拆码
- Create: `src/app/api/trace/qr/scan/route.ts` — POST 扫码登记
- Create: `src/app/api/trace/label/route.ts` — GET/POST 标签模板 CRUD
- Create: `src/app/api/trace/label/[id]/route.ts` — PUT/DELETE

每个路由用 `withPermission()` 包装，参考 `src/app/api/organization/warehouse-category/route.ts` 模式。

---

### Task 2.3: 事件绑定处理器

**Files:**
- Create: `src/application/handlers/QRCodeBindingHandler.ts`

监听事件：
- `inbound.approved` → 自动为入库物料生成父 QRCode
- `qrcode.split` → 子码绑定新 `inv_inventory_batch`
- `workorder.completed` → 成品自动绑定 QRCode
- `outbound.approved` → 出库扫码记录

注册到 `EventRegistry.ts`:

```typescript
import { QRCodeBindingHandler } from '@/application/handlers/QRCodeBindingHandler';
const qrBindingHandler = new QRCodeBindingHandler(qrCodeService);
eventBus.subscribe('inbound.approved', new IdempotentHandler(qrBindingHandler.handleInbound.bind(qrBindingHandler)));
eventBus.subscribe('workorder.completed', new IdempotentHandler(qrBindingHandler.handleWorkOrderCompleted.bind(qrBindingHandler)));
eventBus.subscribe('outbound.approved', new IdempotentHandler(qrBindingHandler.handleOutbound.bind(qrBindingHandler)));
```

---

### Task 2.4: 幂等扫码守卫

**Files:**
- Modify: `src/infrastructure/event-bus/IdempotencyGuard.ts` 或新增扫码专用幂等表

按 `qrContent + operator + date` 做唯一约束，防止同一操作员重复扫码。

---

## Phase 3: 前端公共组件（1.0 天）

### Task 3.1: QrScanner 扫码组件

**Files:**
- Create: `src/components/common/QrScanner.tsx`
- Create: `src/components/common/QrScanner.i18n.ts`

使用 ZXing (`@zxing/browser`) 调用摄像头 + 手动输入兜底。

Props: `onScan(result: string)`, `onError(err: string)`

### Task 3.2: TraceTimeline 溯源时间线组件

**Files:**
- Create: `src/components/trace/TraceTimeline.tsx`

输入 `TraceTimelineItem[]`，渲染垂直时间线：操作时间 | 操作人 | 单据号 | 数量变更 | 工序/质检 | 批次信息。

支持父子码展开树形查看。

### Task 3.3: LabelPreview + LabelPrintButton

**Files:**
- Create: `src/components/label/LabelPreview.tsx`
- Create: `src/components/label/LabelPrintButton.tsx`

`LabelPreview`: 接收模板 HTML + 业务数据，动态渲染预览。使用 `dangerouslySetInnerHTML`（模板由管理员配置视为可信）。

`LabelPrintButton`: 调 `window.print()` + `@media print` CSS。支持批量队列（最多 50 份）+ 进度提示。

约束：二维码渲染尺寸 2cm×2cm，使用 `QRCode` npm 包 (`qrcode`) 生成 data URL 嵌入 label。

---

## Phase 4: 业务页面（1.5 天）

### Task 4.1: 溯源查询页

**Files:**
- Create: `src/app/[locale]/warehouse/trace/page.tsx`
- Create: `src/app/[locale]/warehouse/trace/[content]/page.tsx`

功能：
- 扫码入口 + 手动输入框
- 调用 GET `/api/trace/qr/{content}` 获取全链路时间线
- 使用 `TraceTimeline` 组件渲染
- 导出 PDF 溯源报告（前端 `html2canvas` + `jspdf`）

i18n: `trace.query.title`, `trace.query.input_placeholder`, `trace.query.scan_button`, `trace.timeline.title`, ...

### Task 4.2: 标签模板配置页

**Files:**
- Create: `src/app/[locale]/settings/label-template/page.tsx`
- Create: `src/app/[locale]/settings/label-template/[id]/page.tsx`

CRUD 模板，实时预览（`LabelPreview`），启用/停用。

### Task 4.3: 分切页面改造

**Files:**
- Modify: `src/app/[locale]/warehouse/batch/split/page.tsx`

分切完成后：
1. 调 POST `/api/trace/qr/split` 生成子 QRCode
2. 弹窗预览子码标签（`LabelPreview`）
3. 调批量打印（`LabelPrintButton`）

### Task 4.4: 入库/完工入库页改造

**Files:**
- Modify: `src/app/[locale]/warehouse/inbound/page.tsx`
- Modify: `src/app/[locale]/warehouse/inbound/[id]/page.tsx`

入库确认时：
- 可选复选框"同时生成二维码"
- 调 POST `/api/trace/qr/generate`
- 成功后弹窗打印标签

**Files:**
- Modify: `src/app/[locale]/production/work-order/[id]/page.tsx`

完工入库时自动绑定二维码（事件驱动，如前端需展示则调用 GET trace API）。

### Task 4.5: 菜单注册

**Files:**
- Modify: `src/app/api/init/menus/route.ts`

添加菜单项：
```
warehouse -> trace (溯源查询)         path: /warehouse/trace
settings -> label_template (标签模板)   path: /settings/label-template
warehouse -> batch_split (库存分切)     path: /warehouse/batch/split
```

---

## Phase 5: 集成测试与联调（0.7 天）

### Task 5.1: 单元测试 — 领域实体

**Files:**
- Create: `tests/unit/domain/trace/QRCode.test.ts`

测试覆盖：
- `QRCode.create()` 正常创建
- `QRCode.split()` 正常拆分
- `QRCode.split()` 超量拆分被拒绝
- `QRCode.split()` 多级拆分
- 领域事件正确发射

### Task 5.2: 单元测试 — 应用服务

**Files:**
- Create: `tests/unit/application/services/QRCodeApplicationService.test.ts`

Mock 仓储接口，测试：
- `generateBatchQr` 批量生成
- `splitParentQr` 分切逻辑
- `recordScan` 幂等

### Task 5.3: 集成测试 — 全链路

**Files:**
- Modify: `tests/integration/cross-module-consistency.test.ts` 或创建 `tests/integration/qr-trace-flow.test.ts`

场景：入库→分拆二维码→扫码领料→完工→扫码出库→溯源查询返回完整链路

---

## 执行顺序依赖图

```
Phase 0 (DB + Permissions + Seed)
  │
  ▼
Phase 1 (Domain Entity + Interface + MySQL Repo)
  │
  ▼
Phase 2 (Application Service + API Routes + Event Handlers)
  │
  ├─────────────────────────────┐
  ▼                             ▼
Phase 3 (Frontend Components)   Phase 5 (Tests — domain unit)
  │                             │
  ▼                             ▼
Phase 4 (Business Pages + Menu) Phase 5 (Tests — app service + integ)
  │
  ▼
Phase 5 Validation (tsc + lint + vitest)
```

**并行可选：** Phase 3 前端组件与 Phase 5 领域测试可以并行开发。

---

## 总工期

| Phase | 天数 | 产出 |
|-------|------|------|
| 0 | 0.8 | schema + permissions + seed |
| 1 | 1.0 | domain entity + repo interface + mysql impl |
| 2 | 1.5 | app service + API + event handler |
| 3 | 1.0 | QrScanner + TraceTimeline + LabelPreview |
| 4 | 1.5 | 4 业务页面 + 菜单 |
| 5 | 0.7 | 单元 + 集成测试 |
| **合计** | **6.5** | |

---

## 验收标准

- [x] `npx tsc --noEmit` 0 errors
- [x] `npx eslint src/ --rule '@typescript-eslint/no-unused-vars: error' --quiet` 0 errors
- [x] `npx vitest run` 全部通过（含新增 15+ tests）
- [x] 任意子 QR 码可向上追溯至原始父批次
- [x] 分切数量 ≤ 父码剩余数量（实体层校验）
- [x] FIFO 领料自动命中最早子批次（`inv_inventory_batch.produce_date` 排序）
- [x] 所有打印行为持久化 `print_log`
- [x] 2cm×2cm QR 码在各品牌手机下可稳定识别
- [x] 移动端扫码页面自适应无缩放
- [x] 无中文硬编码（全部通过 i18n key）
