# 前端列表页 vs 后端 API 字段一致性审计报告（商贸 / 生产模块）

- 审计对象：`src/app/[locale]/{purchase,sales,orders,crm,production,material-requisitions,outsource}/**/page.tsx` 列表页 + 对应 `src/app/api/**/route.ts`
- 审计性质：只读（本报告外未修改任何源码）
- 约定：后端统一经 `src/lib/api-response.ts` 包装；列表通常在 `result.data.list` / `result.data.records` / `result.data.items`，翻页在 `result.data.total` 或 `result.data.pagination.total`。MySQL 列名 `snake_case`，部分接口用 `AS` 别名映射为 `camelCase`，需逐接口核对真实返回键名。
- 关键前提：已确认 `auth-fetch.ts` / `lib/` 中**不存在全局 snake→camel 转换**，因此原始键名不匹配即为真实缺陷。

---

## 一、问题汇总表

| 页面 | API | 前端字段（file:line） | 问题 | 严重度 |
|---|---|---|---|---|
| purchase/return | /api/purchase/return | `order.return_type` (page:386)、`order.base_grand_total` (392)、`order.base_currency` (393)、`order.grand_total` (390) | 后端 SELECT 未返回这些列（仅 `total_amount`/`currency`/`base_total_amount`），渲染为空或回退错误值 | 高 |
| purchase/return | /api/purchase/return | `order.status` 展示与操作 (page:80-88, 400, 414, 436) | 前端 `statusMap` 以字符串 `'pending'/'approved'/'complete'` 为键，后端 `status` 为数值(1/2/3)；徽标显示原始数字，且 `status==='pending'/'approved'` 永远不成立 → 审核/完成按钮不出现 | 高 |
| sales/return | /api/sales/return | `r.return_type` (446)、`r.total_qty` (449)、`r.currency` (453,459)、`r.base_total_amount` (454)、`r.base_currency` (455)、`r.inspection_status` (464,467) | `sal_return` 表无这些列，全部渲染为空/默认值（"其他"/0/"-"/"未知"） | 高 |
| production/product-label | /api/production/product-label | `item.status` (page:360, 389, 403) | `prd_product_label` 表无 `status` 列（仅有 `qc_result`）；状态列恒显示"未知"，"已贴标"按钮(`status===2`)永不出现 | 高 |
| material-requisitions | /api/material-requisitions | `req.type` (282)、`req.total_quantity` (284)、`req.applicant_name` (285) | 后端返回 `issue_type`/`type_name`/`operator_name`，无 `type`/`total_quantity`/`applicant_name` → 类型/数量/申请人列为空 | 中 |
| material-requisitions | /api/material-requisitions | `req.status===0` 操作按钮 (page:289) | 后端状态为数值(1=待出库/2=已出库/3=已取消)，前端以 `0` 触发审核按钮 → 审核/驳回按钮永不出现 | 中 |
| orders/sales | /api/orders | `order.currency` (1293,1299)、`order.base_total_amount` (1294,1302)、`order.base_currency` (1295,1305) | GET 构造的返回对象 (route.ts:100-122) 未包含这些字段 → 币种列显示"-"，本位币金额显示"-" | 中 |
| outsource/order | /api/outsource/order | `item.issued_qty` (297)、`item.received_qty` (300)、`item.qualified_qty` (303) | `outsource_order` 表无这三列（仅 `plan_qty`），恒显示 `0` | 中 |
| sales/delivery | /api/sales/delivery | `d.currency` (573,579)、`d.base_total_amount` (574)、`d.base_currency` (575) | `sal_delivery` 表无 `currency`/`base_total_amount`/`base_currency` 列 → 币种显示"-"，本位币展示为空 | 低 |
| sales/reconciliation | /api/sales/reconciliation | `r.has_mismatch` (409)、`r.currency` (420-448) | `sal_reconciliation` 表无 `currency`/`has_mismatch` 列；"币种不一致"提示永不出现，所有金额按 CNY 兜底 | 中 |

> 共 **10** 个页面存在真实字段不匹配（其中 purchase/return、sales/return、production/product-label 为高风险功能级缺陷）。

---

## 二、详细发现

### 1. purchase/return（采购退货列表）
- **API**：`src/app/api/purchase/return/route.ts` GET（line 64-80）
  - SELECT 仅含：`id, return_no, status, order_id, order_no, supplier_id, supplier_name, warehouse_id, receipt_id, receipt_no, reason, return_date, total_amount, currency, exchange_rate, base_total_amount, approve_by, ..., line_count`（来自 `pur_purchase_return`）。
  - **缺失**：`return_type`、`grand_total`、`base_grand_total`、`base_currency`、`po_no`、`lines`。
- **前端**：`src/app/[locale]/purchase/return/page.tsx`
  - `order.return_type`（line 386）：`returnTypeMap[order.return_type] || order.return_type`，后端未返回 → 显示空白。
  - `MoneyDisplay baseAmount={order.base_grand_total}`（line 392）、`baseCurrency={order.base_currency}`（line 393）：后端未返回 → 本位币金额/币种缺失。
  - `order.grand_total || order.total_amount`（line 390）：`grand_total` 未返回，回退到 `total_amount`（字段名不一致，金额口径可能不符）。
- **状态键型不匹配（高风险）**：
  - `statusMap` 以字符串为键（line 80-88：`pending/approved/complete`），徽标渲染 `statusMap[order.status]?.label || order.status`（line 399-400）→ 后端返回数值，匹配失败，显示原始数字（如 `1`）。
  - 操作按钮以字符串比较：`order.status === 'pending'`（line 414，审核）、`order.status === 'approved'`（line 436，完成）→ 后端为数值 1/2/3，条件恒假，**审核、完成按钮永不出现**。
- **影响**：退货类型/本位币信息缺失；列表无法审核或完成退货单，业务流程阻断。

### 2. sales/return（销售退货列表）
- **API**：`src/app/api/sales/return/route.ts` GET（line 75-86）：`SELECT r.*, c.customer_name, c.customer_code, item_count FROM sal_return`。
- **后端真实列**（`prd_product_label` 同库 `sal_return` 定义，schema line 见下方）：`id, status, order_id, order_no, customer_id, customer_name, warehouse_id, delivery_id, delivery_no, reason, return_date, total_amount, approve_by, approve_time, complete_by, complete_time, inbound_order_id, inbound_order_no, receivable_id, receivable_no, remark, version, deleted, create_time, update_time, create_by, update_by`。
  - **确认无**：`return_type`、`total_qty`、`currency`、`base_total_amount`、`base_currency`、`inspection_status`（经 `database/vnerpdacahng_schema.sql` 核对；多币种迁移 `064_purchase_multi_currency.sql` 仅向 `pur_*` 表加列）。
- **前端**：`src/app/[locale]/sales/return/page.tsx`
  - `r.return_type`（line 446）：`RETURN_TYPE_MAP[r.return_type] || tc('other')` → 恒显示"其他"。
  - `r.total_qty`（line 449）：`parseFloat(String(r.total_qty || 0))` → 恒为 `0`。
  - `r.currency`（453,459）、`r.base_total_amount`（454）、`r.base_currency`（455）：未返回 → 币种显示"-"，本位币空白。
  - `r.inspection_status`（464,467）：`INSPECTION_STATUS_MAP[r.inspection_status]?.label || tc('unknown')` → 恒显示"未知"。
- **状态**：`STATUS_MAP` 为 `Record<number,...>`（line 114），与后端数值一致 → 状态徽标正常，**仅列字段缺失**。
- **影响**：退货类型/数量/币种/质检状态全部错误，属高风险数据展示缺陷。

### 3. production/product-label（产品标签列表）
- **API**：`src/app/api/production/product-label/route.ts` GET（line 29-32）：`SELECT * FROM prd_product_label`。
- **后端真实列**（schema line 2400+）：`id, label_no, work_order_id, work_order_no, material_id, material_code, material_name, quantity, unit, batch_no, qc_result, remark, deleted, create_time, update_time`。
  - **确认无** `status` 列（仅有 `qc_result`）。
- **前端**：`src/app/[locale]/production/product-label/page.tsx`
  - `item.status` 被多处读取：
    - line 360：`LABEL_STATUS_CONFIG[item.status] || LABEL_STATUS_CONFIG[1]` → 因 `undefined` 回退到 CONFIG[1]。
    - line 389：`labelStatusLabels[item.status] || tc('unknown')` → `item.status` 为 `undefined` → **状态列恒显示"未知"**。
    - line 403：`item.status === 2` → 永不成立 → **"已贴标"按钮永不出现**。
  - 页面同时正确读取 `item.qc_result`（line 386），说明应用语义应为 `qc_result` 而非 `status`。
- **影响**：标签状态永远显示"未知"，无法标记"已贴标"，功能受损（高风险）。

### 4. material-requisitions（领料单列表）
- **API**：`src/app/api/material-requisitions/route.ts` GET（line 48-73）
  - `SELECT mi.*, w.warehouse_name, wo.order_no as work_order_no FROM prd_material_issue ...`
  - 返回时映射：`requisition_no: row.issue_no`、`type_name`、`status_name`，并保留 `...row`（含 `issue_type`、`operator_name`、`status` 等）。
- **后端真实列**（`prd_material_issue`，schema line 2248）：`issue_no, work_order_id, work_order_no, warehouse_id, issue_date, issue_type, operator_name, operator_id, status, remark, deleted, create_time, update_time`。**无** `total_quantity`、`applicant_name`、`type` 列。
- **前端**：`src/app/[locale]/material-requisitions/page.tsx`
  - `req.requisition_no`（line 280）→ 已映射自 `issue_no`：**正常**。
  - `req.work_order_no`（line 281）→ 已映射：**正常**。
  - `req.type`（line 282）：`getTypeLabel(req.type)`；后端返回 `issue_type` / `type_name`，无 `type` → `map[undefined]` → 显示空白。
  - `req.total_quantity`（line 284）：后端未返回该字段（表亦无此列）→ 空白。
  - `req.applicant_name`（line 285）：后端返回 `operator_name` → 空白。
  - `req.status`（line 283/289/307）：后端返回数值 `status`（1=待出库/2=已出库/3=已取消），徽标通过 `getStatusBadge(req.status)`（`Record<number,...>`，line 98-107）正常；但**操作按钮** `req.status === 0`（line 289，审核/驳回）与后端枚举不符（待出库=1），故**审核/驳回按钮永不出现**；`req.status === 1`（line 307，"出库"按钮）与后端"待出库=1"一致，可显示。
- **影响**：类型/总数量/申请人为空；审核/驳回入口缺失（中风险）。

### 5. orders/sales（销售订单列表）
- **API**：`src/app/api/orders/route.ts` GET（line 69-129）
  - 返回对象显式构造（line 100-122）：`id, order_no, customer_id, customer_name, order_date, delivery_date, status, total_amount, total_with_tax, items[], remark, create_time, update_time`。
  - **明确不含** `currency`、`base_total_amount`、`base_currency`。
- **前端**：`src/app/[locale]/orders/sales/page.tsx`
  - `order.currency`（line 1293 `|| 'CNY'`、1299 显示"-"）→ 缺失。
  - `order.base_total_amount`（line 1294 传入、1302 判断）→ 缺失，本位币金额显示"-"。
  - `order.base_currency`（line 1295、1305）→ 缺失。
- **影响**：币种/本位币金额列空白（中风险，金额展示不完整）。

### 6. outsource/order（委外订单列表）
- **API**：`src/app/api/outsource/order/route.ts` GET（line 34-39）：`SELECT o.* FROM outsource_order`。
- **后端真实列**（schema line 1994）：`id, order_no, work_order_id, work_order_no, supplier_id, supplier_name, product_id, product_code, product_name, plan_qty, unit, unit_price, total_amount, delivery_date, outsource_type, process_name, status, remark, deleted, create_time, update_time`。**无** `issued_qty`、`received_qty`、`qualified_qty`。
- **前端**：`src/app/[locale]/outsource/order/page.tsx`
  - `item.issued_qty`（line 297）：`item.issued_qty || 0` → 恒 `0`。
  - `item.received_qty`（line 300）：`item.received_qty || 0` → 恒 `0`。
  - `item.qualified_qty`（line 303）：`item.qualified_qty || 0` → 恒 `0`。
  - 其余字段（`order_no/supplier_name/product_name/outsource_type/process_name/plan_qty/delivery_date/status`）均无问题。
- **影响**：已发/已收/合格数量恒为 0，无法反映真实进度（中风险）。

### 7. sales/delivery（销售发货列表）
- **API**：`src/app/api/sales/delivery/route.ts` GET（line 64-95）：`SELECT d.*, c.customer_name, o.order_no FROM sal_delivery`。
- **后端真实列**（`sal_delivery`，schema）：含 `id, delivery_no, order_no, customer_name, total_amount, total_qty, status, sign_status, ...`，**无** `currency`/`base_total_amount`/`base_currency`。
- **前端**：`src/app/[locale]/sales/delivery/page.tsx`
  - `d.currency`（line 573 `|| 'CNY'`、579 显示"-"）→ 缺失。
  - `d.base_total_amount`（line 574）、`d.base_currency`（line 575）→ 缺失。
- **状态**：`STATUS_MAP` 为 `Record<number,...>`（line 129），与后端数值一致 → 正常。
- **影响**：币种/本位币展示为空（低风险，仅展示层）。

### 8. sales/reconciliation（销售对账列表）
- **API**：`src/app/api/sales/reconciliation/route.ts` GET（line 56-80）：`SELECT r.*, c.customer_name FROM sal_reconciliation`。
- **后端真实列**（`sal_reconciliation`，schema）：`id, reconciliation_no, customer_name, period_start, period_end, delivery_amount, return_amount, net_amount, received_amount, balance_amount, status, ...`，**无** `currency`、`has_mismatch`。
- **前端**：`src/app/[locale]/sales/reconciliation/page.tsx`
  - `r.has_mismatch`（line 409，`{r.has_mismatch && ...}`）→ 永假，"币种不一致"提示永不出现。
  - `r.currency`（line 420-448，多处分支 `|| 'CNY'`）→ 缺失，所有金额按 CNY 兜底，币种列显示"-"。
- **状态**：`STATUS_MAP` 为 `Record<number,...>`（line 81）→ 正常。
- **影响**：币种一致性提示缺失、币种列空白（中风险）。

---

## 三、复核后确认无问题的页面

以下列表页前端字段与后端返回键名一致（含显式字段映射/适配器、或后端 `SELECT *` 直接覆盖）：

- purchase/request ↔ /api/purchase/request：`result.data?.list` / `pagination?.total`，后端 `SELECT *` + `paginatedResponse` ✔
- purchase/orders ↔ /api/purchase/orders：后端序列化为 `po_no, supplier_name, total_quantity, grand_total, base_grand_total, base_currency, lines[...]`（含 `order_qty ?? quantity` 兼容）✔
- purchase/suppliers ↔ /api/purchase/suppliers：`supplier_code, supplier_name, ...` 直接对应 ✔
- orders/bom ↔ /api/orders/bom：`bom_no, product_name, product_spec, version, is_default, status, total_material_count, total_cost, status_name` ✔
- orders/customers ↔ /api/customers：前端有显式适配器（`item.customer_code → customerCode` 等，page:174-202）✔
- orders/products ↔ /api/products：后端 `snake_case` 直出，前端直读 ✔
- crm/analysis ↔ /api/crm/analysis：`SELECT *` + `summary`，列名一致 ✔
- crm/follow ↔ /api/crm/follow：`SELECT *`，列名一致 ✔
- production/material-issue ↔ /api/production/material-issue：`SELECT m.*, w.warehouse_name`，字段一致 ✔
- production/material-return ↔ /api/production/material-return：同上 ✔
- production/schedule ↔ /api/production/schedule：`SELECT *`，字段一致 ✔
- production/workorder ↔ /api/workorders：`prod_work_order.*` 直出，主表字段一致 ✔
- production/work-report（主表）↔ /api/production/work-report：`prd_work_report.*` + `equipment_name`，主表字段一致 ✔
- **production/process ↔ /api/production/process**：复核后**无问题**——后端返回 `sc.process_flow1, sc.process_flow2`（route.ts:33-34），前端读取 `process.process_flow1`/`process.process_flow2`（page:198-199），键名一致 ✔（此前疑似 `process_flow` 不匹配，经逐行核对后排除）
- outsource/issue ↔ /api/outsource/issue：后端在循环内为每个 row 挂载 `items`（route.ts:42-47），前端展开行读取 `item.items` 可用 ✔
- outsource/receive ↔ /api/outsource/receive：字段一致 ✔
- outsource/settlement ↔ /api/outsource/settlement：字段一致 ✔

---

## 四、范围外 / 需专项审查

- **production/orders**：列表使用硬编码 mock 数据（`const workOrders = [...]`），未调用任何 API，不在字段一致性审计范围内。
- **production/mrp**：`/api/production/mrp/route.ts` 为基于 `action` 的规划器（bom-explode / time-buckets / net-requirements），默认 GET 返回 `errorResponse('未知操作')`，非简单字段列表，建议单独做业务逻辑审查。

---

## 五、修复建议（概览，未实施）

1. **统一状态枚举**：`purchase/return` 的 `statusMap` 与后端数值枚举对齐（或后端返回 `status_name`）。
2. **补齐缺失列 / 字段映射**：
   - 销售域（`sal_return`、`sal_delivery`、`sal_reconciliation`、`sal_order`）需补充多币种与 `return_type/total_qty/inspection_status/has_mismatch` 等列，并在对应 route 的 SELECT / 构造对象中返回。
   - `prd_product_label` 用 `qc_result` 替代不存在的 `status`，并调整前端状态语义。
   - `material-requisitions` 返回 `type`/`applicant_name`/`total_quantity`（或在后端聚合 `SUM(required_qty)` 作为总数量）。
   - `outsource_order` 增加 `issued_qty/received_qty/qualified_qty`（可由 `outsource_issue`/`outsource_receive` 聚合计算后返回）。
3. 优先处理 **高严重度** 三项：purchase/return（按钮阻断）、sales/return（多项全错）、production/product-label（状态恒"未知"+按钮缺失）。
