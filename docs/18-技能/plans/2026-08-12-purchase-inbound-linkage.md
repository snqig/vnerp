# 采购入库单与采购订单联动改造 — 实施计划

> **目标**：实现采购入库强制关联有效采购订单、信息自动带入、数量强校验（含超收容差）、订单状态双向回写（入库审核累加 / 作废·反审核回补），打通「采购 → 入库 → 应付」核心链路。
>
> **约束铁律**：先计划后落地（本文档）；最小改动（仅动采购入库链路，不碰生产入库/其他入库）；向下兼容（历史无来源入库单可正常查询编辑，仅新增单据生效）；类型隔离（仅「采购入库」强制关联订单）；每步必验（`pnpm lint` / `pnpm ts-check`，核心逻辑补单元测试）。

**架构**：DDD 分层（domain / application / infrastructure / api）+ Drizzle ORM + 事件驱动（DomainEventOutbox + EventBus）。

**技术栈**：Next.js App Router + TypeScript + Drizzle ORM (mysql-core) + MySQL + Zod + pnpm + Vitest。

---

## 0. 现状基线（改造起点）

| 已有基础 | 缺口 |
|---|---|
| 入库单已含 `poId/poNo/supplierId/orderType` 字段 | 缺标准化 `source_type/source_order_id`（入库单）、`purchase_order_item_id`（明细行） |
| `PurchaseOrder.receive()` 已含容差校验 + `partially_received` 状态机 | 缺 `reverseReceive()`（作废/反审核回补）与 `PurchaseOrderReceiveReversedEvent` |
| `InboundApplicationService.createInboundFromPO()` 已存在 | 数量校验未含容差；未写入 source 字段与行级 PO 行 id |
| `PurchaseInboundSyncHandler`（inbound.approved → SQL 直写累加）已存在 | 未走领域 `receive()`；`inbound.unapproved/cancelled` 无 PO 回补 |
| `over_receipt_tolerance` 订单级字段已存在 | 创建订单时 `body.over_receipt_tolerance \|\| 0` 导致默认 0；系统级默认配置缺失 |
| 前端 AddDialog 已有 PO 搜索下拉、选单填充 | 缺入库类型第一步、物料/单价/规格只读、实时容差校验 |
| PO 详情页已有「入库记录」Tab | 过滤逻辑有缺陷（`order_type==='purchase'` 会把所有采购入库列出），且无 PO 详情/入库记录 API |

---

## 1. 影响文件清单（全量）

### 修改（16 个）
| 文件 | 改动 |
|---|---|
| `src/lib/db/schemas/warehouse.ts` | `invInboundOrders` + `source_type/source_order_id`；`invInboundItems` + `purchase_order_item_id/purchase_order_line_no` |
| `src/lib/db/schemas/procurement.ts` | `purPurchaseOrder` + `received_quantity` 汇总字段 |
| `src/domain/warehouse/aggregates/InboundOrder.ts` | Props + `sourceType/sourceOrderId`；create 校验；cancel/unapprove 事件 payload 补 poId+items |
| `src/domain/warehouse/entities/InboundItem.ts` | + `purchaseOrderItemId/purchaseOrderLineNo` |
| `src/domain/warehouse/events/InboundOrderEvents.ts` | `InboundOrderUnapprovedEvent/InboundOrderCancelledEvent` payload + `poId/items` |
| `src/domain/purchase/aggregates/PurchaseOrder.ts` | + `reverseReceive()`、`canReverseReceive()`；修复 reconstitute 容差 `\|\| 0` → `?? 0` |
| `src/domain/purchase/entities/PurchaseOrderLine.ts` | + `reverseReceive(quantity)` 反向扣减 |
| `src/domain/purchase/value-objects/PurchaseOrderStatus.ts` | transitions/operations + 回退（completed/partially_received → approved / partially_received）+ `canReverseReceive()` |
| `src/domain/purchase/events/PurchaseOrderEvents.ts` | + `PurchaseOrderReceiveReversedEvent` |
| `src/application/services/InboundApplicationService.ts` | `createInboundFromPO` 含容差强校验 + source 字段透传 |
| `src/application/handlers/PurchaseInboundSyncHandler.ts` | 重构为「加载聚合根 → receive() → 事务内持久化 + outbox」+ 维护 `received_quantity` |
| `src/application/handlers/PurchaseInboundReversalHandler.ts` | **新增**：inbound.unapproved / inbound.cancelled → `reverseReceive()` 回补 |
| `src/application/EventRegistry.ts` | 注册 ReversalHandler；`purchase.receive_reversed` 注册 AuditLog |
| `src/app/api/purchase/orders/route.ts` | GET 支持 `status` 逗号分隔（待入库列表）；POST 容差默认值读系统配置 |
| `src/app/api/warehouse/inbound/route.ts` | POST schema + `source_type/source_order_id`；GET 支持 `poId` 参数 + 序列化 source 字段 |
| `src/app/api/warehouse/inbound/from-po/route.ts` | 透传容差校验信息、返回 source 信息 |

### 新增（6 个）
| 文件 | 用途 |
|---|---|
| `database/migrations/20260812090000_purchase_inbound_linkage.ts` | 加字段 + 历史数据回填 + sys_config 默认值 |
| `src/app/api/purchase/orders/[id]/route.ts` | 采购订单详情（含行可入库上限） |
| `src/app/api/purchase/orders/[id]/inbound-records/route.ts` | 按 po_id 精确查入库记录 |
| `src/application/handlers/PurchaseInboundReversalHandler.ts` | 作废/反审核回补处理器 |
| `tests/unit/purchase/purchase-order-receive-reverse.test.ts` | 领域层回补单测 |
| `tests/unit/warehouse/inbound-from-po.test.ts` | 应用层容差校验单测 |

### 前端（4 个）
| 文件 | 改动 |
|---|---|
| `src/app/[locale]/warehouse/inbound/types.ts` | + `inboundType`；PO 类型补 `status_label/over_receipt_tolerance/total_received_qty`；行补 `max_receivable_qty` |
| `src/app/[locale]/warehouse/inbound/hooks/usePurchaseOrderSearch.ts` | 只查可入库单（status 30,40）+ 返回容差上限 |
| `src/app/[locale]/warehouse/inbound/components/dialogs/AddDialog.tsx` | 入库类型第一步；采购入库只读字段 + 实时容差校验标红 |
| `src/app/[locale]/purchase/orders/[id]/page.tsx` | 入库记录 Tab 改按 po_id 精确匹配（走新 API） |

---

## 2. 风险点与控制措施

| 风险 | 等级 | 控制措施 |
|---|---|---|
| 入库审核事件处理器改为领域 `receive()` 后，极端并发超收会抛 DomainError 导致 outbox 重试阻塞 | 中 | 创建时应用层强校验（含容差）+ `FOR UPDATE` 行锁；receive() 抛错即事务回滚并告警，人工介入；不影响库存（InventorySync 独立事务） |
| 作废/反审核回补重复执行（事件重放） | 高 | `IdempotentHandler` 幂等 + 回补前校验 PO 状态 ∈ {40,50} 且行已收量 > 0，否则跳过 |
| 历史无来源入库单（po_id 为空）在事件链中误处理 | 中 | 事件 payload 增加 poId 后，handler 判空跳过；回补 SQL 仅处理 po_id 非空单 |
| `over_receipt_tolerance \|\| 0` 使默认容差恒为 0 | 中 | API 改 `?? `（null/undefined 才用系统默认 5，显式 0 表示不允许超收） |
| 状态机回退（completed→approved）破坏既有流转约束 | 中 | 仅在 `reverseReceive` 专用转换中加入，`canReverseReceive` 仅 completed/partially_received 为 true；补单测锁定 |
| 列表查询性能（received_quantity 冗余） | 低 | 主表字段由 handler 事务内维护，领域 getter 仍以 lines 求和为准（单一事实来源） |
| 其他入库类型（生产入库/其他入库）被误伤 | 中 | 全部校验以 `orderType==='purchase'` 为前提；普通创建路径不动 |

---

## 子任务 1：数据库结构改造与迁移脚本

### 1.1 修改 `src/lib/db/schemas/warehouse.ts`

`invInboundOrders` 追加（放在 `poNo` 之后）：

```typescript
sourceType: varchar('source_type', { length: 20 }), // 'purchase_order' | NULL
sourceOrderId: bigint('source_order_id', { mode: 'number', unsigned: true }),
```

索引块追加：`sourceIdx: index('idx_source_order').on(table.sourceType, table.sourceOrderId)`

`invInboundItems` 追加：

```typescript
purchaseOrderItemId: bigint('purchase_order_item_id', { mode: 'number', unsigned: true }),
purchaseOrderLineNo: int('purchase_order_line_no', { unsigned: true }),
```

### 1.2 修改 `src/lib/db/schemas/procurement.ts`

`purPurchaseOrder` 追加（放在 `overReceiptTolerance` 之后）：

```typescript
receivedQuantity: decimal('received_quantity', { precision: 18, scale: 4 }).default('0.0000'),
```

### 1.3 新增迁移 `database/migrations/20260812090000_purchase_inbound_linkage.ts`

导出 `up(conn)` / `down(conn)`，内容：
1. `ALTER TABLE inv_inbound_order ADD COLUMN source_type ... , ADD COLUMN source_order_id ... , ADD INDEX idx_source_order(source_type, source_order_id)`
2. `ALTER TABLE inv_inbound_item ADD COLUMN purchase_order_item_id ..., ADD COLUMN purchase_order_line_no ...`
3. `ALTER TABLE pur_purchase_order ADD COLUMN received_quantity DECIMAL(18,4) NOT NULL DEFAULT 0.0000`
4. 历史数据回填：
   - `UPDATE inv_inbound_order SET source_type='purchase_order', source_order_id=po_id WHERE po_id IS NOT NULL`
   - `UPDATE pur_purchase_order o SET received_quantity = (SELECT IFNULL(SUM(l.received_qty),0) FROM pur_purchase_order_line l WHERE l.po_id = o.id)`
5. 系统配置默认值：`INSERT INTO sys_config(config_key, config_value, description) VALUES ('purchase.over_receipt_tolerance','5','采购入库超收比例(%)，范围0~20') ON DUPLICATE KEY UPDATE description=VALUES(description)`
   （先确认 `sys_config` 表真实列名，以 `src/lib/system-config.ts` 读取逻辑为准）
6. `down(conn)` 按相反顺序 DROP COLUMN / DELETE 配置（保守起见 down 仅 DROP 新增列）。

**验证**：`pnpm migrate`（`npx tsx scripts/migrate.ts up`）后 `pnpm migrate` status 显示该迁移已应用；用 SQL 确认列存在与回填数据正确。

---

## 子任务 2：领域层核心逻辑改造

### 2.1 `InboundItem.ts`（实体）

`InboundItemProps` + `purchaseOrderItemId?: number; purchaseOrderLineNo?: number`；构造函数与 create/reconstitute 透传两个 getter：`purchaseOrderItemId`、`purchaseOrderLineNo`。

### 2.2 `InboundOrder.ts`（聚合根）

- `InboundOrderProps` + `sourceType?: string; sourceOrderId?: number`；构造函数新增只读属性 `sourceType`、`sourceOrderId`。
- `create()` 来源合法性校验（新增，仅采购入库生效）：
  ```typescript
  const sourceType = props.sourceType || (props.poId ? 'purchase_order' : undefined);
  if (sourceType === 'purchase_order') {
    if (!props.poId) throw new DomainError('采购入库必须关联采购订单');
    if (!props.poNo) throw new DomainError('采购入库缺少采购订单号');
    if (!props.supplierId) throw new DomainError('采购入库缺少供应商');
    if (props.orderType !== 'purchase') { /* 允许：orderType 统一由上层传 purchase */ }
  }
  ```
- `cancel()` / `unapprove()`：事件 payload 补 `poId: this.poId, items: this._items.map(i => ({ materialId, materialCode, materialName, quantity, unitPrice, batchNo }))`（供回补 handler 精确扣减，不再依赖回查库）。

### 2.3 `InboundOrderEvents.ts`

`InboundOrderUnapprovedEvent` / `InboundOrderCancelledEvent` payload 增加：
```typescript
poId?: number;
items?: Array<{ materialId: number; materialCode: string; materialName: string; quantity: number; unitPrice: number; batchNo: string }>;
```

### 2.4 `PurchaseOrderLine.ts`

新增反向方法（与 `receive` 对称）：
```typescript
reverseReceive(quantity: number): void {
  if (quantity <= 0) throw new DomainError('回补数量必须大于0');
  if (quantity > this._receivedQty) {
    throw new DomainError(`回补数量${quantity}超过已收数量${this._receivedQty}`);
  }
  this._receivedQty = Math.round((this._receivedQty - quantity) * 10000) / 10000;
}
```

### 2.5 `PurchaseOrderStatus.ts`

- `transitions` 增加回退：`completed: ['partially_received', 'approved', 'closed']`、`partially_received: ['approved', 'completed', 'closed', 'voided']`
- `operations` 增加：`completed: ['view', 'close', 'reverse_receive']`、`partially_received: ['receive', 'close', 'void', 'reverse_receive']`
- 新增 `canReverseReceive(): boolean`（operations 含 'reverse_receive'）

### 2.6 `PurchaseOrder.ts`（聚合根）

- 新增方法 `reverseReceive(lineReceives: Array<{ lineNo: number; quantity: number }>): void`：
  ```typescript
  if (!this._status.canReverseReceive()) {
    throw new DomainError(`当前状态"${this._status.label()}"不允许回补`);
  }
  for (const recv of lineReceives) {
    const line = this._lines.find((l) => l.lineNo === recv.lineNo);
    if (!line) throw new DomainError(`行号${recv.lineNo}不存在`);
    line.reverseReceive(recv.quantity);
  }
  // 重算状态
  const allZero = this._lines.every((l) => l.receivedQty <= 0);
  if (allZero) this._status = this._status.transitionTo('approved');
  else if (this.isFullyReceived) this._status = this._status.transitionTo('completed');
  else this._status = this._status.transitionTo('partially_received');
  this._domainEvents.push(new PurchaseOrderReceiveReversedEvent({ ... }));
  ```
- 新增 `canReverseReceive(): boolean` 透传。
- 修复 `reconstitute()` 中 `props.overReceiptTolerance || 0` → `props.overReceiptTolerance ?? 0`（避免 NaN，保持持久化值语义）。

### 2.7 `PurchaseOrderEvents.ts`

新增 `PurchaseOrderReceiveReversedEvent`（`eventType = 'purchase.receive_reversed'`），payload：`orderId/orderNo/supplierId/supplierName/reversedItems{lineNo,materialId,materialName,quantity,unitPrice}/totalReversedAmount`。

**验证**：`pnpm ts-check` + 后续单测（子任务 7）。

---

## 子任务 3：应用服务与事件处理器

### 3.1 `InboundApplicationService.createInboundFromPO()` 增强

1. 容差强校验（替代现有 `item.quantity > line.remainingQty`）：
   ```typescript
   const tolerance = purchaseOrder.overReceiptTolerance; // DB 默认 5，0 表示不允许超收
   const maxAllowed = line.orderQty * (1 + tolerance / 100);
   const newReceived = line.receivedQty + item.quantity;
   if (newReceived > maxAllowed) {
     throw new DomainError(`行${item.lineNo}入库将超限：订购${line.orderQty}、已收${line.receivedQty}、本次${item.quantity}、容差${tolerance}%、上限${maxAllowed}`);
   }
   ```
   （同一入库单内同物料多行也需累加：按 lineNo 聚合 items 后再逐行校验）
2. `props` 增加 `sourceType: 'purchase_order'`、`sourceOrderId: purchaseOrder.id`；
3. `items` 映射增加 `purchaseOrderItemId: line.id`、`purchaseOrderLineNo: line.lineNo`。

### 3.2 `PurchaseInboundSyncHandler` 重构（审核回写走领域）

`handle()` 逻辑改为：
1. `poId` 为空 → 跳过（兼容非采购入库）；
2. 事务内：
   - `SELECT * FROM pur_purchase_order WHERE id=? AND deleted=0 AND status IN (30,40) FOR UPDATE`（锁单，防并发）；
   - 加载 `PurchaseOrder` 聚合根（`MysqlPurchaseOrderRepository.findById` 语义，但需同连接锁行 —— 用 SQL 锁行后自行 `reconstitute`）；
   - 由 event.items 构造 `lineReceives`（按 materialId 匹配 lineNo；优先用 item 行的 `purchaseOrderLineNo`）；
   - 调用 `order.receive(lineReceives)`（领域容差校验 + 状态机 + 事件）；
   - SQL 更新各行 `received_qty`、订单 `status`（`order.status.toDbCode()`）、`received_quantity = SUM(lines)`；
   - `getDomainEventOutbox().saveEvents(conn, 'PurchaseOrder', poId, order.getDomainEvents())`（保存 `PurchaseOrderReceivedEvent`）。
3. `receive()` 抛 `DomainError`（并发超收）→ 整个事务回滚 + `logger.error` 告警 + 抛错进 outbox 重试（人工介入）。

> 备选（若验证时发现重试阻塞风险不可控）：回退为原 SQL 直写 + 仅补 `received_quantity` 汇总，领域 `receive()` 仍保留供 from-po 创建后自检使用。**实现顺序：先做聚合根版，单测 + 集成验证通过则保留；不通过则切换备选并记录。**

### 3.3 新增 `PurchaseInboundReversalHandler`（作废/反审核回补）

- 监听 `inbound.unapproved`、`inbound.cancelled`；
- `handle(event)`：
  1. `event.payload.poId` 为空 → 跳过；
  2. 事务内：
     - `SELECT ... FOR UPDATE` 锁 PO（`status IN (40,50)` 才处理，否则跳过并 info 日志）；
     - 加载聚合根，构造 `lineReceives`（用 payload.items 按 materialId 匹配行；若 payload 无 items 则查 `inv_inbound_item` 按 `purchase_order_item_id` 精确匹配）；
     - 调用 `order.reverseReceive(lineReceives)`；
     - SQL 更新行 `received_qty`、订单 `status`（回退到 approved/partially_received/completed）、`received_quantity`；
     - outbox 保存 `PurchaseOrderReceiveReversedEvent`；
  3. 全程包 `IdempotentHandler`（事件重放安全）。

### 3.4 `EventRegistry.ts`

```typescript
eventBus.subscribe('inbound.unapproved', new IdempotentHandler(new PurchaseInboundReversalHandler()));
eventBus.subscribe('inbound.cancelled', new IdempotentHandler(new PurchaseInboundReversalHandler()));
eventBus.subscribe('purchase.receive_reversed', new AuditLogHandler());
```

**验证**：`pnpm lint`、`pnpm ts-check`。

---

## 子任务 4：API 接口改造

### 4.1 `src/app/api/purchase/orders/route.ts`（GET 增强）

- `status` 支持逗号分隔（如 `status=30,40`）→ 传 `statusList` 给 service/仓储 → SQL `WHERE status IN (...)`。**待入库列表即 `?status=30,40&pageSize=20`**（approved + partially_received）。
- 序列化行数据补：`max_receivable_qty = round(orderQty*(1+tol/100) - receivedQty, 4)`、`over_receipt_tolerance`（订单级）。

### 4.2 `src/app/api/purchase/orders/[id]/route.ts`（新增）

- `GET`：按 id 查聚合根，返回订单头 + lines（含 `remaining_qty`、`max_receivable_qty`、`received_qty`）；复用 GET 列表的序列化结构。
- `PUT`：如需操作（如重新审核）可后续补充，本次仅 GET。

### 4.3 `src/app/api/purchase/orders/[id]/inbound-records/route.ts`（新增）

- `GET`：`SELECT ... FROM inv_inbound_order WHERE po_id = ? AND deleted = 0 ORDER BY create_time DESC`，序列化 `id/order_no/inbound_date/status/supplier_name/total_quantity/total_amount`。

### 4.4 `src/app/api/warehouse/inbound/route.ts`

- `createInboundOrderSchema`（`src/lib/validations/inbound.ts`）补 `source_type`（枚举 `['purchase_order']` 可选）、`source_order_id`（number 可选）；校验：`source_type === 'purchase_order'` 时 `source_order_id` 必填。
- POST 透传 `sourceType/sourceOrderId` 进 `InboundOrderProps`；普通创建（非 from-po）若 `source_type` 缺失且 `order_type==='purchase'` 则强制要求关联（由 `InboundApplicationService.createOrder` 或 route 校验决定——**默认：普通 POST 走原有逻辑，强制关联仅由 from-po 路径 + 前端类型选择保证**，满足"最小改动 + 类型隔离"）。
- GET 支持 `poId` 参数（`o.po_id = ?` 精确匹配，供 PO 详情页入库记录使用）；列表序列化补 `source_type/source_order_id`。

### 4.5 `src/app/api/warehouse/inbound/from-po/route.ts`

- 透传 `over_receipt_tolerance` 至响应（或由前端从所选 PO 行数据获得，本步仅确保校验一致）；返回体补 `source_type/source_order_id`。

**验证**：`pnpm lint`、`pnpm ts-check`；curl 验证：`GET /api/purchase/orders?status=30,40`、`GET /api/purchase/orders/1`、`GET /api/purchase/orders/1/inbound-records`、`GET /api/warehouse/inbound?poId=1`。

---

## 子任务 5：前端页面交互改造

### 5.1 `types.ts`

- `InboundFormData` + `inboundType: 'purchase' | 'other'`（默认 `'purchase'`）；+ `sourceType/sourceOrderId`；`INITIAL_FORM_DATA` 同步。
- `PurchaseOrder` 类型补：`status_label/over_receipt_tolerance/total_received_qty/po_no`；行类型补 `max_receivable_qty`。

### 5.2 `usePurchaseOrderSearch.ts`

- `searchPurchaseOrders(keyword)` 改调 `GET /api/purchase/orders?status=30,40&keyword=...&pageSize=20`（只返回可入库单）。
- 选行填充补：`maxReceivableQty = max_receivable_qty`、`tolerance = over_receipt_tolerance`；填充 `sourceType='purchase_order'`、`sourceOrderId=po.id`。

### 5.3 `AddDialog.tsx`

- **第一步**：入库类型 radio（采购入库 / 其他入库）；「采购入库」强制显示订单选择器且 `sourceType` 必填；「其他入库」隐藏订单选择器、字段可编辑（完全保留现逻辑）。
- **选单后**：供应商、物料编码/名称、规格、单价、单位 → `disabled` 只读；数量预填 `remaining_qty`；显示「可入库上限 = max_receivable_qty」。
- **实时校验**：`quantity > maxReceivableQty` 时输入框红框 + 错误提示 + 阻止提交；提交时再次校验（双保险）。
- **提交**：`inboundType==='purchase'` 且 `poId && lineNo` → 走 `/api/warehouse/inbound/from-po`（body 已含 source 信息）；否则走原 `/api/warehouse/inbound`。
- 详情/列表行：采购入库单展示来源订单号，点击跳转 `/purchase/orders/[poId]`。

### 5.4 `purchase/orders/[id]/page.tsx`

- 「入库记录」Tab 改调 `GET /api/purchase/orders/[id]/inbound-records`（精确按 po_id），删除原 `r.po_no === order.po_no || r.order_type === 'purchase'` 缺陷过滤。

**验证**：`pnpm lint`、`pnpm ts-check`；浏览器手工验证采购入库流程（选单→带出→超量标红→提交）与 PO 详情入库记录。

---

## 子任务 6：系统配置与管控参数

- 新增配置项：`purchase.over_receipt_tolerance`（默认 `5`，取值 0~20；0 表示不允许超收）。迁移脚本已 INSERT 默认值。
- `src/app/api/purchase/orders/route.ts` POST 改：
  ```typescript
  overReceiptTolerance:
    body.over_receipt_tolerance === undefined || body.over_receipt_tolerance === null
      ? await getSystemConfigNumber('purchase.over_receipt_tolerance', 5)
      : Number(body.over_receipt_tolerance),
  ```
  （领域层不再硬编码 5；显式 0 保留）
- 入库侧容差一律取订单自身 `over_receipt_tolerance`（DB 默认值由创建时系统配置注入），领域/应用层不读库硬编码。
- `getSystemConfigNumber` 已有 60s 缓存，无需新增缓存机制。

**验证**：`pnpm lint`、`pnpm ts-check`；单测覆盖默认值注入。

---

## 子任务 7：单元测试与全流程回归

### 7.1 `tests/unit/purchase/purchase-order-receive-reverse.test.ts`

- 正常回补：partially_received 单 reverseReceive 后状态回退 approved（全行归零）；
- 分批回补：部分回补后 completed → partially_received；
- 超量回补拦截：reverseReceive 数量 > 已收 → 抛 DomainError；
- 非法状态拦截：draft/approved（未收过）调用 reverseReceive → 抛错；
- 事件断言：receive 后 reverseReceive 产生 `PurchaseOrderReceiveReversedEvent`。

### 7.2 `tests/unit/warehouse/inbound-from-po.test.ts`

- 容差内通过：`quantity <= maxAllowed - receivedQty` 成功；
- 超容差拦截：`quantity > maxAllowed - receivedQty` 抛 DomainError（mock 仓储）；
- source 透传：`sourceType/sourceOrderId/purchaseOrderItemId` 写入 props；
- 非法订单状态拦截：draft/completed 单拒绝创建。

### 7.3 集成/回归

- 事件链冒烟：inbound.unapproved → ReversalHandler → PO 行回退 + 状态回退（mock EventBus/Outbox 断言调用序列）；
- 全量回归：`pnpm lint`、`pnpm ts-check`、`pnpm test:unit:run`；
- 手工回归：历史无来源入库单查询/编辑不受影响；其他入库类型创建流程不变；生产入库/完工入库不受影响。

**验收标准映射**：
- 管控生效：采购入库从 from-po 路径强制关联（`source_order_id` 非空）；
- 数据一致：审核后 PO `received_qty/status/received_quantity` 正确；作废/反审核回补后一致；
- 超量拦截：> 容差上限提交被拒（应用层 + 领域层双重）；
- 自动带入：供应商/物料/单价/规格只读自动带出；
- 向下兼容：历史单可查可编辑；
- 类型隔离：非采购入库不受影响；
- 质量达标：lint / ts-check / 单测全绿。

---

## 3. 执行顺序与验证节奏

1. 子任务 1（schema + 迁移）→ `pnpm migrate` 验证
2. 子任务 2（领域层）→ `pnpm ts-check` + 子任务 7.1 单测
3. 子任务 6（系统配置）→ `pnpm ts-check`
4. 子任务 3（应用服务 + 处理器）→ `pnpm lint` + `pnpm ts-check` + 7.2 单测
5. 子任务 4（API）→ 接口 curl 冒烟
6. 子任务 5（前端）→ 浏览器手工验证
7. 子任务 7（回归）→ 全量命令 + 手工回归

每完成一个子任务运行对应验证命令，全部完成后跑一次完整回归（`pnpm lint` + `pnpm ts-check` + `pnpm test:unit:run`）。

## 4. 自检清单（提交前）

- [ ] `pnpm lint` 通过
- [ ] `pnpm ts-check` 通过
- [ ] 新增单测全部通过（receive-reverse / inbound-from-po）
- [ ] 迁移已应用且 down 脚本可用
- [ ] 历史无来源入库单查询/编辑不受影响
- [ ] 非采购入库类型创建流程不变
- [ ] 采购入库：强制选单、自动带出、超量标红、提交成功
- [ ] 入库审核 → PO 已收/状态更新；入库作废/反审核 → PO 回补
