# Warehouse 模块前端列表页 字段不对应 审计报告

> 审计范围：`src/app/[locale]/warehouse/**` 下所有渲染表格列表的页面，逐一比对「前端访问的字段名」与「后端 API 真实返回的字段名」。
> 约定：后端统一用 `src/lib/api-response.ts` 的 `successResponse(data)` / `paginatedResponse(data,...)` 包裹，结构为 `{ code, success, message, data: {...} }`。列表数组一般在 `result.data.list` / `result.data.records` / `result.data`（数组直接返回），分页在 `result.data.total` 或 `result.data.pagination.total`。MySQL 列为 snake_case，部分接口通过 `AS` 别名映射成 camelCase。
> 说明：本次审计为**只读**，仅生成本报告，未修改任何源代码。

---

## 问题汇总表

| 页面 | API | 前端字段 | 后端实际返回字段 | 问题类型 | 严重度 |
|---|---|---|---|---|---|
| trace | `/api/trace/qr/[content]` | `result.data?.timeline` (trace/page.tsx:30, trace/[content]/page.tsx:30) | 后端 `successResponse(timeline)` 直接把数组放进 `data`，即 `data` 本身就是数组，没有 `data.timeline` | 响应结构不匹配（前端按 `data.timeline` 读，后端无此子键） | **高** |
| stocktaking（详情明细） | `/api/warehouse/stocktaking/[id]/items` | `item.qr_code / book_quantity / actual_quantity / difference / split_flag` (stocktaking/page.tsx:650-673) | 该接口查 `inventory_check_items`/`inventory_checks` 两张表，但实际数据写入 `inv_stocktaking_item`/`inv_stocktaking`；且 `inv_stocktaking_item` 列名为 `system_qty/actual_qty/diff_qty`，无前端所用的 `book_quantity/actual_quantity/difference` | 接口查错表（详情永远空）+ 字段名不对应 | **高** |
| split-order（详情明细） | `/api/warehouse/split-order/detail` | `setDetailList(result.data)` (split-order/page.tsx:253) | 该路由**不存在**（仅 `split-order/route.ts` 存在，无 `/detail` 子路由）→ 404，返回 `data:null` | 详情接口缺失（端点不存在） | **高** |
| transfer（列表） | `/api/warehouse/transfer` | `item.applicant_name` (transfer/page.tsx:511) | 返回 `t.*` + `from_warehouse_name/to_warehouse_name/operator_name/type_name/status_name`，**无 `applicant_name`**（实际申请人字段为 `operator_name`） | 字段不对应（前端字段后端未返回） | 中 |
| transfer（详情明细） | `/api/warehouse/transfer/[id]/items` | `item.qr_code / out_quantity / in_quantity` (transfer/page.tsx:947,950,951) | 返回 `ti.*`（material_id/quantity/unit/batch_no/transfer_id/id）+ `material_name`，**无 `qr_code/out_quantity/in_quantity`** | 字段不对应（详情列空白） | 中 |
| outbound（列表） | `/api/warehouse/outbound` | `o.baseTotalAmount → base_total_amount`、`o.baseCurrency → base_currency`（outbound/page.tsx:166-167, 渲染 1191） | 返回 `totalAmount`、`currency`，**未返回 `baseTotalAmount`/`baseCurrency`**（inbound 接口返回，但 outbound 未 select） | 字段不对应（两列空白） | 中 |
| stocktaking（列表） | `/api/warehouse/stocktaking` | `item.type`（stocktaking/page.tsx:375；导出 136） | 返回 `taking_type`（并额外提供 `type_name`），**无 `type`** | 字段不对应（盘点类型列永远 `-`） | 中 |
| inbound（编辑弹窗预填） | `/api/warehouse/inbound` | `record.base_currency`（inbound/page.tsx:565） | 序列化时返回 `base_total_amount`，**未返回 `base_currency`** | 字段不对应（编辑弹窗基础币种空白） | 低 |

---

## 逐页面明细

### 1. inbound — `src/app/[locale]/warehouse/inbound/page.tsx`
- API：`/api/warehouse/inbound`（数据经 `inbound/hooks/useInboundData.ts:40-50` 读取 `result.data.list`）。
- 后端返回（`src/app/api/warehouse/inbound/route.ts:51-88`）：snake_case 项 `order_no, supplier_name, warehouse_name, po_no, currency, total_quantity, base_total_amount, status, remark, items[]` 等。
- 前端渲染（`record.order_no:531`、`record.supplier_name:658,553`、`record.total_quantity:509`、`record.po_no:511`、`record.currency:513`、`record.status`、`record.items:499-503`、`record.warehouse_name:510`）—— 全部与后端 snake_case 一致。
- **结论：列表字段一致（OK）。**
- 轻微问题（低）：编辑弹窗预填读取 `record.base_currency`（inbound/page.tsx:565），但后端 GET 未返回 `base_currency`（仅返回 `base_total_amount`），导致编辑时「基础币种」为空。见汇总表第 8 行。

### 2. inbound/cutting — `src/app/[locale]/warehouse/inbound/cutting/page.tsx`
- API：`/api/warehouse/inbound/cutting`（`cutting/page.tsx:130`）。
- 后端返回（`src/app/api/warehouse/inbound/cutting/route.ts:101-129`）：`successResponse({ list, pagination:{total,...} })`，项为 camelCase：`recordNo, sourceLabelNo, materialName, materialCode, specification, originalWidth, cutWidthStr, cutTotalWidth, remainWidth, operatorName, cutTime, status`。
- 前端（`result.data?.list:141`、`result.data?.pagination?.total:142`；渲染 `record.recordNo:323`、`record.sourceLabelNo:324`、`record.materialName:327`、`record.materialCode:329`、`record.specification:332`、`record.originalWidth:336`、`record.cutWidthStr:337`、`record.cutTotalWidth:338`、`record.remainWidth:339`、`record.operatorName:340`、`record.cutTime:341`、`record.status:342`）—— 全部 camelCase 一致。
- **结论：OK — 字段一致。**

### 3. transfer — `src/app/[locale]/warehouse/transfer/page.tsx`
- API：`/api/warehouse/transfer`（`transfer/page.tsx:142`，`result.data.list:145`、`result.data.total:146`）。
- 后端返回（`src/app/api/warehouse/transfer/route.ts:43-67`）：项含 `transfer_no, type, from_warehouse_id, to_warehouse_id, from_location, to_location, status, operator_id, remark`（`t.*`）+ `from_warehouse_name, to_warehouse_name, operator_name, type_name, status_name`。
- 列表字段基本对应（`transfer_no, type, from_warehouse_name, to_warehouse_name, from_location, to_location, status` 均存在）。
- **问题（中）**：列表「申请人」列读取 `item.applicant_name`（`transfer/page.tsx:511`，`{item.applicant_name || '-'}`），后端**未返回 `applicant_name`**（仅返回 `operator_name`）。该列永远显示 `-`。
- 详情明细对话框（`transfer/page.tsx:945-952`）读取 `item.qr_code:947`、`item.out_quantity:950`、`item.in_quantity:951`，但详情接口 `transfer/[id]/items/route.ts:20-30` 返回 `ti.*`（material_id/quantity/unit/batch_no/transfer_id/id）+ `material_name`，**不含 `qr_code/out_quantity/in_quantity`** → 这三列空白。
- **结论：列表「申请人」与详情三列存在字段不对应。**

### 4. outbound — `src/app/[locale]/warehouse/outbound/page.tsx`
- API：`/api/warehouse/outbound`（`outbound/page.tsx:409`，`result.data?.list:412`）。
- 后端返回（`src/app/api/warehouse/outbound/route.ts:31-123`）：项 camelCase `id, orderNo, orderDate, outboundType, warehouseCode, warehouseName, totalQty, totalAmount, currency, status, remark, operatorName, auditStatus, auditorName, auditTime, createTime`，并附带 `items[]`（materialName/specification/qty/unit/batchNo…）。**注意：未 select `base_total_amount` / `base_currency` / `warehouseId`**。
- 前端通过 `mapOutboundRow`（`outbound/page.tsx:147-181`）做字段映射，大部分字段对得上（`orderNo→orderNo:158`、`orderDate→date:159`、`totalAmount→total_amount:164`、`currency:165`、`warehouseName→warehouse:168`、`outboundType→type:171`、`status:172`、`auditStatus:173`、`operatorName→operator:175` 等）。
- **问题（中）**：`mapOutboundRow` 读取 `o.baseTotalAmount`(:166) 映射到 `base_total_amount`、`o.baseCurrency`(:167) 映射到 `base_currency`，但后端 outbound **未返回这两个字段**。渲染处（`outbound/page.tsx:1191`：`baseAmount={record.base_total_amount}`、`baseCurrency={record.base_currency}`）因此始终为 `undefined` → 基础金额/基础币种单元格空白。
- 另外 `o.warehouseId`(:177) 后端也未返回（仅返回 `warehouseCode/warehouseName`），但 820 行有 `warehouseData?.id || record.warehouseId` 兜底，影响较小。
- **结论：除 `base_total_amount`/`base_currency` 两列外，列表字段一致；该两列不对应。**

### 5. batch — `src/app/[locale]/warehouse/batch/page.tsx`
- API：`/api/warehouse/batch`（`batch/page.tsx:109`，`result.data?.list:112`、`result.data?.total:113`）。
- 后端返回（`src/app/api/warehouse/batch/route.ts:62-74`）：`paginatedResponse(rows)`，行含 `b.*`（batch_no, material_id, quantity, available_qty, cost_price, produce_date, expire_date, status…）+ `material_name, material_code, specification, unit, warehouse_name`。
- 前端（`item.batch_no:352`、`item.material_code:353`、`item.material_name:354`、`item.warehouse_name:355`、`item.quantity:357`、`item.available_qty:360`、`item.cost_price:363`、`item.expiry_date:366,368`、`item.status:380,406`）—— 全部 snake_case 一致。
- **结论：OK — 字段一致。**

### 6. inventory — `src/app/[locale]/warehouse/inventory/page.tsx`
- API：`/api/inventory`（`inventory/page.tsx:231`，`result.data.list:234`）。
- 后端返回（`src/app/api/inventory/route.ts:47-131`）：`successResponse({ list, total, page, pageSize })`，项含 `batch_no, material_id, material_name, material_spec, material_code, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_price, status, produce_date, expire_date, inbound_date, safety_stock` + 计算字段 `alertLevel`。
- 前端（`item.batch_no:598`、`item.material_code:602`、`item.material_name:604`、`item.material_spec:606`、`item.warehouse_name:609`、`item.quantity:612`、`item.unit:612`、`item.available_qty:615`、`item.locked_qty:618`、`item.status:620`、`item.alertLevel:621`、`item.expire_date:623`；汇总段 `item.safety_stock:244`、`item.available_qty:243`、`item.unit:245`、`item.warehouse_id:252`、`item.warehouse_name:254`、`item.unit_price:258`）—— 全部一致。
- **结论：OK — 字段一致。**

### 7. split-order — `src/app/[locale]/warehouse/split-order/page.tsx`
- API：`/api/warehouse/split-order`（`split-order/page.tsx:111`，`result.data.list:114`、`result.data.total:115`）。
- 后端返回（`src/app/api/warehouse/split-order/route.ts:53-65`）：`paginatedResponse(rows)`，行含 `s.*`（`split_no, split_date, parent_batch_id, material_id, material_name, warehouse_id, out_qty, total_waste, status, operator_id, operator_name`…）+ `material_code, specification, detail_count`。
- 前端列表（`item.split_no:329`、`item.split_date:330`、`item.parent_batch_id:331`、`item.material_name:332`、`item.out_qty:333`、`item.total_waste:334`、`item.operator_name:342`、`item.status:348`）—— 全部 snake_case 一致。
- **问题（高）：** 列表 OK，但「详情」按钮调用 `/api/warehouse/split-order/detail?splitId=...`（`split-order/page.tsx:253`，`setDetailList(result.data || [])`），**该 `/detail` 路由不存在**（仅有 `split-order/route.ts`，无 `detail` 子路由），请求返回 404、`data:null` → 详情明细列表永远为空，详情弹窗不可用。
- **结论：列表字段一致；详情接口缺失。**

### 8. stock-adjust — `src/app/[locale]/warehouse/stock-adjust/page.tsx`
- API：`/api/warehouse/stock-adjust`（`stock-adjust/page.tsx:103`，`result.data.list:106`、`result.data.total:107`）。
- 后端返回（`src/app/api/warehouse/stock-adjust/route.ts:30-36`）：`successResponse({ list: rows, total, page, pageSize })`，行含 `a.*`（`adjust_no, warehouse_id, adjust_date, adjust_type, operator_name, remark, status`…）+ `warehouse_name`。
- 前端（`item.adjust_no:278`、`item.warehouse_name:279`、`item.adjust_date:280`、`item.adjust_type:281`、`item.operator_name:282`、`item.status:264,290-305`）—— 全部 snake_case 一致。
- **结论：OK — 字段一致。**

### 9. stocktaking — `src/app/[locale]/warehouse/stocktaking/page.tsx`
- API：`/api/warehouse/stocktaking`（`stocktaking/page.tsx:146`，`result.data.list:149`、`result.data.total:150`）。
- 后端返回（`src/app/api/warehouse/stocktaking/route.ts:46-70`）：项含 `s.*`（`taking_no, taking_type, warehouse_id, status, taking_date, operator_id, operator_name`…）+ `warehouse_name, checker_name, approver_name`，并额外加 `check_no(=taking_no), type_name, status_name`。**注意：列名为 `taking_type`，无 `type`；`inv_stocktaking` 表也无 `diff_items`/`diff_amount` 列（见 `src/lib/db/schemas/warehouse.ts:342-365`）。**
- **问题（中）：** 列表「盘点类型」列读取 `item.type`（`stocktaking/page.tsx:375`，`{TYPE_MAP[item.type] || '-'}`），后端返回的是 `taking_type`（并有 `type_name` 可用）。`item.type` 为 `undefined` → 该列永远显示 `-`。（导出映射 136 同样用 `item.type`。）
- 列表另读取 `item.total_items:376`、`item.diff_items:377`、`item.diff_amount:379`；`total_items` 由 POST 写入（`stocktaking/route.ts:136`），`diff_items/diff_amount` 表无对应列，可能为空白（中低置信）。
- **问题（高，详情）：** 「查看明细」对话框（`stocktaking/page.tsx:650-673`）读取 `item.qr_code, material_name, split_flag, book_quantity, actual_quantity, difference, status`。后端明细接口 `stocktaking/[id]/items/route.ts:15-41` 查询的是 **`inventory_check_items` / `inventory_checks`** 两张表，而盘点数据实际写入 **`inv_stocktaking_item` / `inv_stocktaking`**（全工程仅在 stocktaking 的 items/scan/split-summary 三个路由误用 `inventory_check*` 表名，见 `grep inventory_check` 结果）。因此详情明细接口读取的是空表 → 明细列表永远为空；且即使指向正确表，`inv_stocktaking_item` 列名为 `system_qty/actual_qty/diff_qty`，与前端所用的 `book_quantity/actual_quantity/difference` 也不对应。
- **结论：列表「盘点类型」列不对应；详情明细接口查错表+字段名不对应，明细不可用。**

### 10. production-inbound — `src/app/[locale]/warehouse/production-inbound/page.tsx`
- API：`/api/warehouse/production-inbound`（经 `usePaginatedList` 的 `fetchUrl:63`，内部读 `result.data?.list`，见 `src/components/common/use-paginated-list.ts:45`）。
- 后端返回（`src/app/api/warehouse/production-inbound/route.ts:37-52`）：`successResponse({ list: rows, total, page, pageSize })`，行含 `p.*`（`inbound_no, work_order_no, warehouse_id, inbound_date, operator_name, qc_status, status, remark`…）+ `warehouse_name` + `items[]`。
- 前端（`item.inbound_no:179`、`item.work_order_no:180`、`item.warehouse_name:181`、`item.inbound_date:182`、`item.qc_status:184`、`item.operator_name:186`、`item.status:188,192`）—— 全部 snake_case 一致。
- **结论：OK — 字段一致。**

### 11. sales-outbound — `src/app/[locale]/warehouse/sales-outbound/page.tsx`
- API：`/api/warehouse/sales-outbound`（`sales-outbound/page.tsx:85`，`result.data.list:88`、`result.data.total:89`）。
- 后端返回（`src/app/api/warehouse/sales-outbound/route.ts:37-52`）：`successResponse({ list: rows, total, page, pageSize })`，行含 `s.*`（`outbound_no, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, status, remark`…）+ `warehouse_name` + `items[]`。
- 前端（`item.outbound_no:211`、`item.order_no:212`、`item.customer_name:213`、`item.warehouse_name:214`、`item.outbound_date:215`、`item.delivery_person:216`、`item.status:208-229`）—— 全部 snake_case 一致。
- **结论：OK — 字段一致。**

### 12. cost — `src/app/[locale]/warehouse/cost/page.tsx`
- API（列表）：`/api/warehouse/cost?page=&pageSize=`（cost/page.tsx:57，`result.data?.list:60`、`result.data?.total:61`）。
- 后端返回（`src/app/api/warehouse/cost/route.ts:59-81`，无 materialId 分支）：`successResponse({ list: rows, total, page, pageSize })`，聚合字段 `material_id, material_name, material_code, material_spec, unit, total_quantity, total_cost_amount, avg_cost_price, min_cost_price, max_cost_price, warehouse_count`。
- 前端列表（`item.material_code:199`、`item.material_name:200`、`item.material_spec:202`、`item.unit:204`、`item.total_quantity:206`、`item.avg_cost_price:209`、`item.total_cost_amount:213`、`item.warehouse_count:219`）—— 全部一致。
- API（详情）：`/api/warehouse/cost?materialId=` 返回 `{ stock, costHistory }`（`cost/route.ts:48`）。前端 `viewDetail`（`cost/page.tsx:73-81`）`setDetailData(result.data)`，详情渲染 `detailData.stock`（含 `cost_price:310`、`quantity:313` 等，来自 `stock` 表的 snake_case）+ `detailData.costHistory`（`movement_type:338`、`unit_price:343`、`quantity:346`，来自 `stock_movement`，snake_case）—— 全部一致。
- **结论：OK — 列表与详情字段均一致。**

### 13. trace — `src/app/[locale]/warehouse/trace/page.tsx` 与 `trace/[content]/page.tsx`
- API：`/api/trace/qr/[content]`（`trace/page.tsx:27`、`trace/[content]/page.tsx:27`）。
- 后端返回（`src/app/api/trace/qr/[content]/route.ts:15-16`）：`const timeline = await service.getTraceTimeline(...)`（返回 `TraceTimelineItem[]` 数组，`QRCodeApplicationService.ts:170-173`），随后 `successResponse(timeline)` —— 即 `data` 本身就是数组。
- 前端：`setTimeline(result.data?.timeline || [])`（`trace/page.tsx:30`、`trace/[content]/page.tsx:30`）。由于 `data` 是数组而非 `{ timeline: [...] }` 对象，`result.data?.timeline` 恒为 `undefined` → `timeline` 永远为 `[]`，`<TraceTimeline items={timeline} />` 永远渲染空时间轴。
- **结论：结构不匹配（高）。** 修复方向：前端改为 `setTimeline(result.data || [])`，或后端改为 `successResponse({ timeline })`。

---

## 关键修复建议（供参考，不在本次改动范围）
1. **trace**（高）：前端 `result.data?.timeline` 改为 `result.data`；或后端改为返回 `{ timeline }`。
2. **stocktaking 详情**（高）：`stocktaking/[id]/items|scan|split-summary` 路由把 `inventory_check_items/inventory_checks` 改为 `inv_stocktaking_item/inv_stocktaking`；并统一字段名（`book_quantity→system_qty`、`actual_quantity→actual_qty`、`difference→diff_qty`、`qr_code/split_flag` 确认来源）。
3. **split-order 详情**（高）：补建 `/api/warehouse/split-order/detail` 路由，或前端改为读取已有的 `split_order_detail` 表。
4. **transfer**（中）：列表申请人列改用 `operator_name`；详情接口补充 `qr_code/out_quantity/in_quantity`（或在 `inv_transfer_item` 增加这些列并写入）。
5. **outbound**（中）：后端 outbound `SELECT` 增加 `base_total_amount`/`base_currency`（若 `inv_outbound_order` 有对应列）或前端去除这两列。
6. **stocktaking 列表**（中）：前端 `item.type` 改为 `item.taking_type` 或 `item.type_name`。
7. **inbound 编辑弹窗**（低）：后端 inbound GET 补充 `base_currency`（若表中有该列）。
