# 前端列表页 ↔ 后端字段 / 接口 全面审计报告（运行时验证版）

> 审计时间：2026-08-25 ｜ 方法：**直连 live DB（320 表）+ 启动 dev server 抓取真实接口响应**（权威，非静态推断）
> 范围：全部前端列表页（warehouse / 进销存 / 生产 / 财务 / 质量 / 基础数据 / 设置 / HR / 组织 / 印前 / 工程 / 仪表盘 / 报表 / 设备 / 二维码）

---

## 0. 重大方法论更正（务必先读）

此前的审计（包括"warehouse 干净"结论、以及基于 `database/vnerpdacahng_schema.sql` 的字段推断）**建立在损坏的 schema 基础上，结论不可全信**：

- `database/vnerpdacahng_schema.sql` 虽列出 163 张表，但**列被截断**（`fin_receivable` 只有 4 列，实际 18 列；`sys_announcement`/`quality_*` 直接 0 列）。
- `_schema_dump.txt` 仅覆盖 37 张表（格式也不同）。
- 真实库 `vnerpdacahng` 有 **320 张表**，且大量表名/列与代码期望**不一致**（见 §2）。

本次采用权威方法：**用 live DB 的 `DESCRIBE` 取真实列 + 启动 dev server 用 dev JWT 真实请求每个列表接口，比对返回 JSON 的 key**。所有结论均可复现。

---

## 1. 执行摘要

| 类别 | 数量 | 严重度 |
|---|---|---|
| **接口直接 500 崩溃（整页打不开）** | 14+ 个列表接口 | 🔴 最高 |
| **接口设计/逻辑缺陷（无 GET 处理器、读错字段导致整块空白/恒为 0）** | 7 处（财务仪表盘 + 成本，已逐项核实，见 §3.0） | 🔴 高 |
| **字段缺失（接口 200 但页面字段取不到 / 类型冲突）** | 11 处确认（§3.1–§3.4） | 🟠 中–高 |
| **字段缺失但页面已优雅降级（显示空白/“-”）** | 若干 | 🟡 低 |
| **已确认干净** | warehouse 模块 + 68/110 运行时接口（含多数 quality/settings 子页面） | 🟢 |

**核心结论**：比"字段不对应"更严重的是——**由于代码期望的数据库 schema 与 live 库严重漂移，十余个列表接口直接 500，整页无法渲染**（§2）。其次，**财务仪表盘整块功能失效**（§3.0）：收款/付款 Tab 永远空白、4 张 KPI 卡片恒为 ¥0.00、详情弹窗空白、成本来源单号列空白——这些不是字段名不匹配，而是**接口设计/取数逻辑错误**，但用户感知同样是"页面打不开/没数据"。

---

## 1.5 第三方审计复核结论（来源：`scripts/_audit/remaining_modules.md`）

本次审计中后期，一份同事审计报告（`remaining_modules.md`）对"剩余模块"做了字段一致性审计，提出 **7 个财务问题**并把 quality/settings/hr/dcprint/prepress/plm/engineering/equipment/qrcode 等模块判为 **CLEAN**。我以**源码 + live DB + 运行时抓包**对其结论做了独立复核，结果如下：

### ✅ 已采纳并核实（4 项为本次新增、原报告未覆盖）
| # | 结论 | 复核证据 | 严重度 |
|---|---|---|---|
| F1 | `/api/finance/receipt`、`/api/finance/payment` **只导出 POST，无 GET** | `src/app/api/finance/receipt/route.ts:10` 与 `payment/route.ts:10` 均为 `export const POST`，无 GET；`finance/page.tsx:230/245` 却以 `authFetch GET` 调用 → Tabs 永远空 | 🔴 高 |
| F2 | 财务仪表盘 KPI 卡片**恒为 ¥0.00** | `finance/page.tsx:194/216` 读 `data.data?.summary`，但 `receivables/route.ts:45`、`payable/route.ts:45` 仅返回 `{list,total,page,pageSize}`，无 `summary`（虽有 `/api/finance/stats` 返回汇总，本页未调用）| 🔴 高 |
| F3 | 应收/应付详情弹窗**读到的是列表信封而非单条** | `handleViewDetail` 以 `/api/finance/receivables?id=${id}` 调用，两路由 GET 不处理 `id`，返回整页 `{list,...}` → `detailData.*` 全 undefined | 🟠 中 |
| F4 | 成本页"来源单号"列**恒为空** | `cost/page.tsx:204` 渲染 `c.source_no`；live `DESCRIBE fin_cost_record` 列含 `order_no`、**无 `source_no`** → 应改读 `c.order_no` | 🟠 中 |

> 其余 3 项（payables/receivable 多币种列缺失）与本人 §3.3.6 结论重合，已由本人报告覆盖，不再重复计数。

### ❌ 已推翻（CLEAN 结论无效）
`remaining_modules.md` 将 **quality / settings / hr / dcprint / qrcode** 等判为 CLEAN，并假设 `qms_*` 表"走 `SELECT *` + 双写适配器所以安全"。**该结论与运行时抓包直接矛盾**：

| 被误判为 CLEAN 的接口 | 运行时实际状态 | 根因 |
|---|---|---|
| `GET /api/quality/complaint` | **500** | `qms_complaint` 无 `deleted` 列，`WHERE deleted=0` 崩溃 |
| `GET /api/quality/lab-test` | **500** | `qms_lab_test` 同上 |
| `GET /api/quality/supplier-audit` | **500** | `qms_supplier_audit` 同上 |
| `GET /api/system/announcement` | **500** | live 库**无 `sys_announcement` 表**（SHOW TABLES LIKE 为空）|
| `GET /api/qrcode` | **500** | 排序规则冲突 / 缺失表（见 §2.4）|
| `GET /api/dcprint/tool` | **500** | `ToolManagementService.toolToRow` 依赖的表/列在 live 库漂移 |

> 教训：**"前端有双写适配器 / 后端 `SELECT *`" 不能证明接口可用**。一旦后端 SQL 因 schema 漂移直接 500，前端适配器再完美也无数据可兜底。`remaining_modules.md` 的 CLEAN 判定建立在"假设路由能正常返回"之上，而本审计的运行时抓包证明这些路由根本进不了返回逻辑。
> **因此：quality/settings/hr/dcprint/qrcode 等模块不得视为已验证 CLEAN**；其中已被运行时 500 证实的接口见 §2，其余需在修复 §2 的 500 后重新抓包复核。

---

## 2. 🔴 严重：接口 500 崩溃（DB schema 漂移，整页打不开）

通过 dev server 抓取，以下列表接口返回 HTTP 500，根因是路由 SQL 引用了 live 库中**不存在的表或列**：

### 2.1 `WHERE deleted = 0` 但表无 `deleted` 列（13 次同类错误）
代码对所有表统一加软删过滤，但 `qms_*` 系列质量表**没有 `deleted` 列**：
- `GET /api/quality/complaint` → `SELECT COUNT(*) FROM qms_complaint WHERE deleted = 0` → `Unknown column 'deleted'`
- `GET /api/quality/lab-test` → `qms_lab_test WHERE deleted = 0` → 同上
- `GET /api/quality/supplier-audit` → `qms_supplier_audit WHERE deleted = 0` → 同上
- 同类还波及其它 `qms_*` / 无 `deleted` 列的表（日志中 `Unknown column 'deleted'` 共 13 次）

> ✅ **[已修复 2026-08-25]** 给 `qms_complaint` / `qms_lab_test` / `qms_supplier_audit` / `qms_sgs_cert_item` 各补 `deleted TINYINT NOT NULL DEFAULT 0` 列（live 库）。`/api/quality/complaint`、`/quality/lab-test`、`/quality/supplier-audit` 运行时已验证返回 **200**。

### 2.2 表被改名 / 已删除（ER_NO_SUCH_TABLE）
代码引用的表在 live 库中**不存在**（实测 `SHOW TABLES LIKE` 为空）：
| 代码引用的表 | 状态 | 影响接口 | 修复 |
|---|---|---|---|
| `sys_announcement` | **不存在**（无任何 announcement 表） | `GET /api/system/announcement`（设置→公告）| ✅ 已按 `scripts/fix_security_issues.sql:677` DDL 建表 + `sys_announcement_read` |
| `label_template` | **不存在**（仅有 inv_inbound_label / inv_material_label / prd_product_label） | `GET /api/trace/label`（设置→标签模板）| ✅ 已按 `src/app/api/init/supplement-tables/route.ts:1542` DDL 建表 |
| `sys_scheduled_task` | **不存在** | `GET /api/system/scheduler`（设置→定时任务）| ✅ 已按 `scripts/fix_security_issues.sql:254` DDL 建表 + `sys_task_execution_log` |
| `sales_order` | 不存在（真实为 `sal_order`） | 销售相关列表 | ⏸️ **未修（系统级，见 §7.4）** |
| `ink_usage` | 不存在 | `GET /api/ink-usages`（印前→油墨用量）| ✅ 已建表（DDL 见 `src/app/api/dcprint/ink-init/route.ts:169`），并补 6 列 |

### 2.3 列被改名 / 缺失（ER_BAD_FIELD_ERROR）
- `GET /api/purchase/suppliers` → `Unknown column 'default_currency' in 'field list'`（真实表为 `pur_supplier`）
- 另有 `Unknown column 'business_type'` 命中 2 次

> ✅ **[已修复 2026-08-25]** 给 `pur_supplier` 补 `default_currency VARCHAR(10) NOT NULL DEFAULT 'CNY'` 列（live 库）。`/api/purchase/suppliers` 运行时已验证返回 **200**。`business_type` 命中项与 §2.4 剩余 500 一并待处理。

### 2.4 其它 500（同属 schema 漂移，根因待逐一确认）
`GET /api/qrcode`、`/api/reports/dashboard`、`/api/dcprint/tool`、`/api/system/oper-log`、`/api/hr/reports/turnover`、`/api/purchase/suppliers`、`/api/ink-usages` 均 500。其中一处为 **排序规则冲突**（`utf8mb4_unicode_ci` vs `utf8mb4_0900_ai_ci` 在 JOIN `=` 上 `Illegal mix of collations`）。

> ✅ **[已修复 2026-08-25]** `/api/purchase/suppliers`（补 `default_currency` 列）与 `/api/ink-usages`（建 `ink_usage` 表 + 补 6 列 `ink_id`/`screen_plate_id`/`usage_date`/`usage_qty`/`ink_code`/`ink_name`）已运行时验证返回 **200**。
> ⏸️ **仍 500、待下一轮处理**：`/api/qrcode`、`/api/reports/dashboard`、`/api/dcprint/tool`、`/api/system/oper-log`、`/api/hr/reports/turnover`；以及 `business_type` 列缺失、`Illegal mix of collations` 排序规则冲突。

> 受影响的前端页面（整页空白/报错）：质量→客诉、实验室检测、供应商审核；设置→公告、标签模板、定时任务、操作日志；采购→供应商；印前→油墨用量；二维码；报表→仪表盘；DC 打印→工具；HR→流动率报表 等。

---

## 3. 🟠 字段缺失（接口 200，但页面字段取不到 / 逻辑错位）

以下均经**运行时抓包**确认接口确实未返回该字段（或返回类型与页面逻辑冲突）：

### 3.0 财务仪表盘集群：接口设计 / 取数逻辑缺陷（🔴 高，已核实，源自 §1.5 复核）

> 这 4 项不是"字段名不一致"，而是**接口根本没提供页面需要的数据 / 接口不存在**。用户感知与 500 同等级：页面能开但全是空/零。
> ✅ **[全部已修复 2026-08-25，运行时验证 200]** 详见 §7 修复记录。

1. **收款 / 付款 Tab 永远空白（🔴 高）** — `src/app/[locale]/finance/page.tsx`
   - **根因**：`src/app/api/finance/receipt/route.ts` 与 `payment/route.ts` 只 `export const POST`，无 GET 处理器。
   - ✅ **修复**：两路由均新增 GET 列表处理器（查 `fin_receipt_record` / `fin_payment_record` 并 LEFT JOIN 客户/供应商），返回 `{list,total,page,pageSize}`。运行时验证 sample 字段 `receipt_no/customer_name/amount`、`payment_no/supplier_name/amount` 齐全。
2. **KPI 卡片恒为 ¥0.00（🔴 高）** — `src/app/[locale]/finance/page.tsx`
   - **根因**：`fetchReceivables`/`fetchPayables` 读不存在的 `data.data?.summary`。
   - ✅ **修复**：新增 `fetchSummary()` 调用 `/api/finance/stats`（该接口返回 `recv`/`payable` 的 `total_amount/total_received/total_balance/overdue_balance`），并写入 `summary`；移除无效的 `summary` 死码。运行时验证 `/api/finance/stats` 返回 `recv.total_amount=8600`。
3. **应收/应付详情弹窗空白（🟠 中）** — `handleViewDetail` 以 `/api/finance/receivables?id=${id}` 调用，路由不处理 `id`，返回整页信封。
   - ✅ **修复**：改为从已加载的 `receivables`/`payables` 列表按 `id` 取单条填充 `detailData`。⚠️ 已知小限制：详情内的 `receipts`/`payments` 子明细列表不回填（主列表不携带），显示为空属预期。
4. **成本"来源单号"列空白（🟠 中）** — `finance/cost/page.tsx:204` 渲染 `{c.source_no}`；live `fin_cost_record` 无 `source_no`，有 `order_no`。
   - ✅ **修复**：`cost/route.ts` 关键字过滤由 `source_no LIKE` 改为 `order_no LIKE`；`cost/page.tsx` 的 `CostItem` 接口 `source_no`→`order_no`，渲染 `c.order_no`。运行时验证 `order_no` 字段存在。

### 3.1 高风险（功能级缺陷）

> ✅ **[已修复 2026-08-25 第四轮]** 三项均按计划对齐到后端领域模型（见 §7.7）。运行时验证 3 端点全 200、字段正确。
> 关键复核结论：**销售退货的 `status` 实际上是数字、且页面 `STATUS_MAP` 已用数字 `1/2/3/9` 并写 `r.status === 1/2`** —— 原报告"同 §3.1.1 逻辑错位"的判断**不成立**，销售退货按钮本就能渲染；其真实缺陷仅是 `return_reason` 字段名写错（表列为 `reason`）。采购退货才是真正因 `statusMap` 用字符串导致按钮永不渲染的那个。

1. **采购退货 `GET /api/purchase/return`** — 根因确证：页面 `statusMap` 用字符串 `'pending'/'approved'/'completed'`，但后端 `pur_purchase_return.status` 是数字（1待审核/2已审核/3已完成/9已取消，见 `PurchaseReturnStatus.ts`），且 `order.status === 'pending'` 永远为假 → **审核/完成/取消按钮从不渲染**；页面还读取后端未建模的 `return_type`，以及不存在的 `grand_total`/`base_grand_total`（后端实际返回 `total_amount`/`base_total_amount`）。
   - **修复（前端对齐后端，零 schema 漂移）**：`statusMap` 改为数字键 `1/2/3/9`；状态下拉值改为 `'1'/'2'/'3'/'9'`；按钮条件改为 `status === 1`（审核+取消）、`=== 2`（完成退货）；`grand_total`/`base_grand_total` → `total_amount`/`base_total_amount`；移除后端未持久化的 `return_type` 列/表单/详情展示。路由无需改动（已返回 `total_amount`/`currency`/`base_total_amount`）。
2. **销售退货 `GET /api/sales/return`** — 真实缺陷只有字段名：`return_reason` 应为 `reason`（表列是 `reason`，`SELECT r.*` 已返回）；其余 `return_type`/`total_qty`/`currency`/`inspection_*` 后端未建模，`r.*` 不返回，页面已有 `|| 'CNY'`/`|| tc('unknown')`/`|| '-'` 兜底，不崩溃。
   - **修复**：`ReturnOrder` 接口与所有读取 `return_reason` → `reason`（详情弹窗的"退货原因"现能正确显示；保存时 `form.reason` 让退货原因真正入库）；`return_type` 徽章在无值时显示 `-` 而非误导性的"其他原因"。`status` 保持数字（本就正确）。
3. **生产贴标 `GET /api/production/product-label`** — 根因确证：live 表 `prd_product_label` **无 `status` 列**（POST 也不插入），`SELECT *` 无 `status` → 页面 `item.status === 2` 的"已贴标"按钮**永不出现**。
   - **修复（补列 + 持久化）**：live 库 `prd_product_label` 加 `status TINYINT NOT NULL DEFAULT 1`（1待打印/2已打印/3已贴标）；路由 POST 插入 `status=1`；`SELECT *` 自动返回。页面无需改（已按 1/2/3 处理）。

### 3.2 中风险（列显示空白）
4. **质量来料检 `GET /api/quality/incoming`** — ⚠️ **运行时证伪（2026-08-25 第五轮）**：接口实际返回 `materialName`(camelCase)、`specification`、`inspectionResult`，以及 `items[]` 内 `itemName`/`standard`/`actualValue`/`result`——与 `mapApiToInternal` 读取的 `item.materialName` / `item.items[].itemName` 完全一致。**无缺陷**，原"物料名称列空白"为误报（与第四轮销售退货 status 误报同类）。
5. **质量追溯 `GET /api/dcprint/trace`** — **确证为真缺陷并已修复（2026-08-25 第五轮）**：SQL 已 `SELECT c.product_name, l.material_code as main_material_code, l.material_name as main_material_name, l.batch_no as main_batch_no`，但 `dbResult.list.map()` 丢弃了这 4 列 + `remark`，只回传扁平的 `traceNo/cardNo/workOrderNo/productCode/traceType/operatorName/traceTime` → 页面 `fetchRecords` 映射到 `product_name`/`main_material_*` 全为 `undefined`。
   - **修复（路由对齐 SQL）**：`map()` 补全 `productName`/`mainMaterialCode`/`mainMaterialName`/`mainBatchNo`/`remark` 5 字段；并在追溯列表表格新增「产品名称」「主物料」两列 + 导出工具栏同步，使数据真正可见。

### 3.3 低风险（运行时复核：均为误报/优雅降级，无需改动）
6. **财务应收 `GET /api/finance/receivables`** — 审计称"接口不返回 currency → 页面空白"。**运行时证伪（2026-08-25 第六轮）**：该页面 `finance/receivables/page.tsx` 根本不读取 `currency`/`source_currency`/`source_amount`，只读 `receivable_no/source_no/customer_name/amount/received_amount/balance/due_date/status`；接口亦无这些列。**页面与接口完全对齐，无缺陷。**
7. **设置→用户 `GET /api/system/user`** — 审计称"页面取 department_id，接口只返回 id"。**运行时证伪（第六轮）**：接口实际返回 `department_id`(+`dept_name`/`roles`)，页面 `settings/user/page.tsx` 用 `department_id` 做下拉与显示，**完全对齐，无缺陷。**

### 3.4 来自前期进销存/生产报告的其它项（运行时复核：均为误报/优雅降级，无需改动）
- 物料请购 `/api/purchase/request`：审计称"页面 `req.type`/`applicant_name` vs 后端 `issue_type`/`operator_name`"。**运行时证伪（第六轮）**：接口返回 `request_type`/`requester_name`/`total_amount` 等 camelCase，与页面读取一致；审计用了错误源字段名。**无字段错位。**
- 订单/销售 `/api/sales/orders`：审计称"列表缺 currency/base_total_amount"。**运行时证伪（第六轮）**：接口**返回** `currency`/`exchange_rate`/`base_currency`/`base_total_amount`/`base_grand_total`，页面读取一致。**已对齐。**
- 销售发货 `/api/sales/delivery`：审计称"列表缺 currency/base_total_amount"。**运行时复核（第六轮）**：发货单本无币种概念，页面只读 `total_amount`/`total_qty`/`tracking_no` 等，接口均返回。**无错位。**
- 销售对账 `/api/sales/reconciliation`：审计称"列表缺 currency/has_mismatch → 空白"。**运行时复核（第六轮）**：页面用 `r.currency || 'CNY'`、`r.has_mismatch && ...`、`r.currency || '-'` 兜底——接口不返回这些列时**优雅降级显示 CNY/"-"**，不崩溃、不空白。属"后端未建模币种/对账字段"的数据增强需求，非前端字段映射 bug。
- 委外订单 `/api/outsource/order`：审计称"issued_qty/received_qty/qualified_qty 接口未返回 → 空白"。**运行时复核（第六轮）**：页面用 `item.issued_qty || 0` 兜底——接口不返回时显示 0，**不崩溃**；实际收发/合格数量在 issue/receive 子表跟踪。属后端数据模型增强需求，非前端字段映射 bug。

---

## 4. 🟢 已确认干净

- **warehouse 模块**（transfer / inbound / cutting 等）：接口返回字段与页面读取一致（运行时验证）。
- **68/110** 个被测剩余模块接口返回 200 且 key 匹配（含 quality/incoming 的其它列、quality/sgs、quality/final、quality/process、hr/salary、settings/user 主体等）。
- 采购请购、采购订单、采购供应商（供应商接口 500 除外）、CRM、生产排产/工单/报工/工序 等列表正常。

> ⚠️ **关于"quality/settings/hr/dcprint/qrcode 等模块 CLEAN"的更正**：`remaining_modules.md` 曾将上述模块整体判为 CLEAN，但**该结论已被运行时抓包推翻**（见 §1.5）。其中 `/quality/complaint`、`/quality/lab-test`、`/quality/supplier-audit`、`/system/announcement`、`/api/qrcode`、`/api/dcprint/tool` 已实测 500（§2），其余子页面需在 §2 的 500 修复后**重新抓包复核**，目前**不得**视为已验证干净。本 §4 的"CLEAN"仅指：在**已成功返回 200 的接口**上，字段 key 与前端读取一致。

---

## 5. 修复优先级建议 / 执行状态

1. **P0（立刻）**：修复 §2 的 500 集群——这是整页打不开，影响远大于字段错位。
   - ✅ **已执行（2026-08-25）**：统一处理 `deleted` 软删列缺失（qms 4 表补列）；建缺失表 `sys_announcement`/`sys_announcement_read`/`label_template`/`sys_scheduled_task`/`sys_task_execution_log`/`ink_usage`；补缺失列 `pur_supplier.default_currency` 与 `ink_usage` 6 列；财务仪表盘 F1/F2/F3/F4 全部修复。运行时 13 端点全绿。
   - ⏸️ **仍待处理**：`sales_order`→`sal_order` 系统级重命名（§7.4）；`/api/qrcode`、`/api/reports/dashboard`、`/api/dcprint/tool`、`/api/system/oper-log`、`/api/hr/reports/turnover` 500；`business_type` 列缺失；`Illegal mix of collations` 排序冲突。
2. **P1（高）**：§3.1 三处逻辑/字段错位（采购退货 status 字符串比较、销售退货缺列、生产贴标 status 列）→ **✅ 已修复（2026-08-25 第四轮，见 §7.7）**。§3.0 F3/F4 已随财务修复一并完成。
3. **P2（中）**：§3.2 字段改名对齐（来料检 `materialName`、追溯字段映射）— **✅ 已修复（2026-08-25 第五轮，见 §7.8）**。结论：来料检 `materialName` 为**误报**（接口本就返回）；追溯 `GET /api/dcprint/trace` 的 `product_name`/`main_material_*`/`remark` 字段缺失为**真缺陷已修**。
4. **P3（低）**：§3.3/§3.4 币种字段补齐 — **✅ 已运行时复核结案（2026-08-25 第六轮，见 §7.6/§7.9）**：全部为误报或优雅降级，零代码改动。若后续需真实显示币种/对账/收发数量，属后端数据增强需求（给 reconciliation/outsource 等表补列并在路由返回），非前端字段对齐 bug。

---

## 6. 验证证据（可复现命令）

- live 连接：`mysql2` → `127.0.0.1/vnerpdacahng`（root）。`DESCRIBE fin_receivable` 得 18 列；`qms_complaint` 等无 `deleted`；`SHOW TABLES LIKE '%announce%'` 为空。
- 运行时抓包：`npm run dev`（:5000），用 `.env` 的 `JWT_SECRET` 现场签发 admin JWT 作 `access_token` Cookie，请求各 `GET /api/...?pageSize=3`，比对 `data.list[0]` 的 key。
- 500 根因：dev server 日志（`_devlog_runtime.txt`）中的 `sqlMessage`：`Unknown column 'deleted'` / `Table '...' doesn't exist` / `Illegal mix of collations`。

> 说明：本审计覆盖 warehouse（干净）+ 进销存/生产（10 处）+ 剩余 13 个模块（110 个接口运行时抓取）。仍有少量低频页面未逐一运行时验证，但其依赖接口若 200 且 key 匹配则视为干净。

---

## 7. 修复执行记录（2026-08-25 已落地）

> 本轮按用户指令 **"直接开始修这两类"** 执行：① §2 的 500 崩溃集群；② §3.0 财务仪表盘 F1–F4。
> 验证方式：`npm run dev`（:5000）启动后，用 `.env` 的 `JWT_SECRET` 现场签发 admin JWT，跑 `scripts/_audit/verify_fixes.cjs` 抓取 13 个接口。**全部返回 HTTP 200**。
> ⚠️ 所有 DB 改动均为 **live 库 `vnerpdacahng` 的生产性变更**，且采用"最小 schema 漂移"原则（补列/建表而非改路由 SQL），未触及其他功能。

### 7.1 代码改动（已改文件）
| 文件 | 改动 | 对应问题 |
|---|---|---|
| `src/app/api/finance/receipt/route.ts` | 新增 GET 列表处理器（`fin_receipt_record` LEFT JOIN `crm_customer`）| F1 |
| `src/app/api/finance/payment/route.ts` | 新增 GET 列表处理器（`fin_payment_record` LEFT JOIN `pur_supplier`）| F1 |
| `src/app/[locale]/finance/page.tsx` | 移除 `summary` 死码；新增 `fetchSummary()` 调 `/api/finance/stats`；`handleViewDetail` 改为从已加载列表按 `id` 取单条 | F2 / F3 |
| `src/app/api/finance/cost/route.ts` | 关键字过滤 `source_no LIKE` → `order_no LIKE` | F4 |
| `src/app/[locale]/finance/cost/page.tsx` | `CostItem.source_no` → `order_no`，渲染 `c.order_no` | F4 |

### 7.2 数据库迁移（live 库，建表/补列）
1. **补 `deleted` 列**（软删过滤修复）：
   - `qms_complaint` +`deleted TINYINT NOT NULL DEFAULT 0`
   - `qms_lab_test` +`deleted TINYINT NOT NULL DEFAULT 0`
   - `qms_supplier_audit` +`deleted TINYINT NOT NULL DEFAULT 0`
   - `qms_sgs_cert_item` +`deleted TINYINT NOT NULL DEFAULT 0`
2. **补 `pur_supplier.default_currency`** `VARCHAR(10) NOT NULL DEFAULT 'CNY'`
3. **建缺失表**（DDL 取自仓库自有 SQL，保证与代码期望一致）：
   - `sys_announcement` + `sys_announcement_read`（`scripts/fix_security_issues.sql:677/695`）
   - `sys_scheduled_task` + `sys_task_execution_log`（`scripts/fix_security_issues.sql:254/272`）
   - `label_template`（`src/app/api/init/supplement-tables/route.ts:1542`）
   - `ink_usage`（`src/app/api/dcprint/ink-init/route.ts:169`）
4. **补 `ink_usage` 6 列**（路由 `ink-usages` 引用）：`ink_id BIGINT UNSIGNED`、`screen_plate_id BIGINT UNSIGNED`、`usage_date DATETIME`、`usage_qty DECIMAL(10,3)`、`ink_code VARCHAR(50)`、`ink_name VARCHAR(100)`

> 辅助脚本（已落地于 `scripts/_audit/`）：`create_missing_tables.cjs`（建 6 表）、`verify_fixes.cjs`（运行时验证）。`add_missing_columns` / `add_ink_usage_columns` 为内联 `node -e` 执行，未单独落文件。

### 7.3 运行时验证结果（verify_fixes.cjs，全部 200）
```
OK  /api/finance/receipt       -> HTTP 200 | list=3 | sample_ok=YES
OK  /api/finance/payment       -> HTTP 200 | list=3 | sample_ok=YES
OK  /api/finance/stats         -> HTTP 200 | stats:recv.total=8600
OK  /api/finance/cost          -> HTTP 200 | list=3 | sample_ok=YES
OK  /api/finance/receivables   -> HTTP 200 | list=3
OK  /api/quality/complaint     -> HTTP 200 | list=3
OK  /api/quality/lab-test      -> HTTP 200 | list=3
OK  /api/quality/supplier-audit-> HTTP 200 | list=3
OK  /api/purchase/suppliers    -> HTTP 200 | list=3
OK  /api/system/announcement   -> HTTP 200 | list=0
OK  /api/system/scheduler      -> HTTP 200 | list=0
OK  /api/trace/label           -> HTTP 200
OK  /api/ink-usages            -> HTTP 200 | list=0
```
> 注：`/api/ink-usages`、`/api/system/announcement`、`/api/system/scheduler`、`/api/trace/label` 列表为 0 是因为 live 库对应表新建为空，接口已能正常返回（非 500），前端可正常渲染空态。

### 7.4 第二轮修复执行记录（2026-08-25 下午，用户指令"依次修改"第 1 批）

> 修复 §2.4 剩余的 5 个 500 接口 + `business_type` 列缺失 + `Illegal mix of collations` 冲突。验证方式同 §7.3（forge admin JWT 跑 `scripts/_audit/verify_remaining.cjs`）。**全部 200**。

**根因定位（运行时 + live DB DESCRIBE）**
| 接口 | 根因 | 修复 |
|---|---|---|
| `/api/qrcode` | `qrcode_record.batch_no`(utf8mb4_unicode_ci) JOIN `inv_inventory_batch.batch_no`(utf8mb4_0900_ai_ci) → `Illegal mix of collations` | route JOIN 加 `q.batch_no COLLATE utf8mb4_0900_ai_ci = b.batch_no` |
| `/api/reports/dashboard` | `sales_order`/`purchase_order` 表不存在（实为 `sal_order`/`pur_purchase_order`）；`finance_flow` 表不存在 | 路由内 `sales_order`→`sal_order`、`purchase_order`→`pur_purchase_order`；finance 段改查 `fin_receivable`/`fin_payable` 子查询 |
| `/api/dcprint/tool` | `dcprint_tool` 软删列名为 `is_deleted`，但 repo/domain 全部用 `deleted` → `Unknown column 'deleted'` | live 库 `dcprint_tool` 补 `deleted` 列并回填 `= is_deleted` |
| `/api/system/oper-log` | `sys_operation_log` 缺 `business_type`/`business_id`/`response_result`（含 `business_type` 命中之一）| live 库补 3 列 |
| `/api/hr/reports/turnover` | `sys_employee` 无 `deleted` 列 → `WHERE deleted=0` 崩 | live 库补 `deleted` 列 |

**DB 迁移（live 库，最小 schema 漂移）**
- `sys_operation_log` +`business_id`(VARCHAR100) +`business_type`(VARCHAR50) +`response_result`(TEXT)
- `sys_employee` +`deleted`(TINYINT NOT NULL DEFAULT 0)
- `dcprint_tool` +`deleted`(TINYINT NOT NULL DEFAULT 0)，并 `UPDATE dcprint_tool SET deleted = COALESCE(is_deleted,0)` 回填
- `qrcode_record` +`print_count`(INT) +`last_print_time`(DATETIME) +`scan_count`(INT) +`last_scan_time`(DATETIME)（使打印/扫描 PUT 不再 500）
- 建 `qrcode_scan_log`（DDL 取自 `database/qrcode_and_print_template.sql:34`）

**验证（verify_remaining.cjs，全部 200）**
```
OK  /api/qrcode            -> HTTP 200 | list=3
OK  /api/reports/dashboard -> HTTP 200 | orders=10, invAvail=1938, finRecv=8600
OK  /api/dcprint/tool      -> HTTP 200 | list=3
OK  /api/system/oper-log   -> HTTP 200 | list=0
OK  /api/hr/reports/turnover -> HTTP 200 | keys=monthly,byDepartment
```
> dashboard 的 `finRecv=8600` 与 finance/stats 一致 → finance 段改查真实表后返回真实数据（非 0）。

### 7.5 第三轮修复执行记录（2026-08-25 下午，"依次修改"第 2 批：sales_order→sal_order 实际 500）

> 用运行时抓包定位真正 500 的销售类接口（而非盲目重命名 33 个含 `sales_order` 字符串的文件）。结果：绝大多数销售接口已用 `sal_order` 正常返回 200；**仅 2 个真正 500**：`/api/reports/delivery-rate`、`/api/finance/cost-variance`。其余 `sales_order` 字符串出现在 repo 类名、Drizzle schema 定义、demo/mock 数据中，不触发运行时 500。

**根因与修复**
| 接口 | 根因 | 修复 |
|---|---|---|
| `/api/reports/delivery-rate` | 路由硬编码 `FROM sales_order so`（表不存在，实为 `sal_order`）；`LEFT JOIN customer`（表不存在，实为 `crm_customer`）；引用 `actual_delivery_date`（sal_order 无此列）| 路由内 `sales_order`→`sal_order`、`customer`→`crm_customer`；live 库 `sal_order` 补 `actual_delivery_date` 列 |
| `/api/finance/cost-variance` | ① `LEFT JOIN sales_order_item`（实为 `sal_order_item`）；② `inv_inventory_transaction` 无 `source_no` 列；③ **代码 bug**：逐工单子查询里引用了外层别名 `wo.work_order_no`（该子查询 FROM 中无 `wo` 表）→ `Unknown column` | ① `sales_order_item`→`sal_order_item`；② 补 `inv_inventory_transaction.source_no` 列；③ 将该引用改为参数 `?` 并在 params 传入 `wo.work_order_no` |

**DB 迁移（live 库）**
- `sal_order` +`actual_delivery_date`(DATETIME NULL)
- `inv_inventory_transaction` +`source_no`(VARCHAR100)
（注：`sal_order_item` 已存在且含 `order_id/unit_price/total_price`，无需改动）

**验证（verify_sales.cjs，2 个原 500 现 200）**
```
OK  /api/reports/delivery-rate -> HTTP 200 | list=1
OK  /api/finance/cost-variance -> HTTP 200 | list=3
```
全量回归（verify_fixes + verify_remaining + verify_sales 共 28 端点）**全部 200，无回归**。

### 7.6 已结案（第六轮运行时复核，无代码改动）
> **结论：§3.3 / §3.4 全部为审计启发式误报或"优雅降级"，无真实字段断裂，零代码改动。** 2026-08-25 第六轮用 `scripts/_audit/verify_s33.cjs`（清 `.next` 启 dev 后 forge admin JWT 抓 7 端点）逐一比对"页面实际读取字段"与"接口实际返回 key"，结果如下：

| 原报告项 | 接口 | 页面实际读取 | 接口实际返回 | 裁定 |
|---|---|---|---|---|
| §3.3.6 财务应收 currency | /api/finance/receivables | **不读** currency/source_currency/source_amount（仅 receivable_no/source_no/customer_name/amount/received_amount/balance/due_date/status）| 无 currency 列 | **误报**：页面从不读这些字段 |
| §3.3.7 设置→用户 department_id | /api/system/user | `department_id` | `department_id`(+`dept_name`/`roles`) | **正常**：接口已返回，页面下拉/显示可用 |
| §3.4 物料请购 req.type/total_quantity/applicant_name | /api/purchase/request | `request_type`/`requester_name`/`total_amount`(camel) | 返回 `request_type`/`requester_name`/`total_amount` | **误报**：审计用了错误源字段名(req_type/issue_type/applicant_name)，页面读的是正确 camelCase |
| §3.4 销售发货 currency/base_total_amount | /api/sales/delivery | `total_amount`/`total_qty`/`tracking_no` 等 | 返回对应字段 | **正常**：发货单本无币种概念，页面不读 currency |
| §3.4 销售对账 currency/has_mismatch | /api/sales/reconciliation | `currency`/`source_currency`/`has_mismatch`（均带 `|| 'CNY'`/`|| '-'` 兜底）| 无 currency/has_mismatch 列 | **优雅降级**：接口不返回时显示 CNY/"-"，**不崩溃**、不空白 |
| §3.4 委外订单 issued_qty/received_qty/qualified_qty | /api/outsource/order | 三字段（均带 `|| 0` 兜底）| 不返回（委外数量在 issue/receive 子表跟踪）| **优雅降级**：显示 0，**不崩溃** |
| §3.4 销售订单 currency/base_total_amount | /api/sales/orders | `currency`/`base_total_amount` | **返回** `currency`/`base_currency`/`base_total_amount`/`base_grand_total` | **正常**：本就是对齐的 |

> **经验固化**：本仓库前端列表普遍用 `item.camel || item.snake` 与 `|| 'CNY'`/`|| 0`/`|| '-'` 兜底，camel/snake 错位与"接口缺列"绝大多数**不致命**；真正会断裂的只有 (a) 接口 500（schema 漂移，§2 已全修）(b) 数字 vs 字符串的 status 逻辑比较（§3.1 已修）(c) 路由 SELECT 了却 `.map()` 丢弃的真实字段丢失（§3.2 trace 已修）。**审计脚本把"接口缺列 + 页面有兜底"误判为"字段不对应"，导致 §3.3/§3.4 整批误报。**

> **字段映射审计至此全部结案**：§3.0/§3.1/§3.2 真实缺陷已修复并运行时验证；§3.3/§3.4 经运行时复核确认为误报/降级，无需改动。后续若发现某列表"币种/对账字段显示不对"，应作为**后端数据增强需求**（给 reconciliation/outsource 表补列并在路由返回），而非前端字段对齐 bug。

### 7.7 第四轮修复执行记录（2026-08-25，§3.1 字段逻辑对齐）

> 原则：**对齐前端到后端领域模型**（而非盲目加列）。`PurchaseReturnStatus.ts` / `ReturnOrderStatus.ts` 均定义 `1=待审核/2=已审核/3=已完成/9=已取消`，且两个聚合根都**无** `return_type`/`grand_total`/`total_qty`/`inspection_*` 建模。验证：`npm run dev`（清 `.next`）启动后 `scripts/_audit/verify_s31.cjs` 抓 3 端点。**全 200、字段正确**。
> 复核修正：原报告称"销售退货 status 同采购为逻辑错位"——经读页源码证伪，销售页 `STATUS_MAP` 本就用数字且 `r.status === 1/2`，按钮正常；其唯一真缺陷是 `return_reason` 字段名误写。

**修改文件（前端对齐）**
| 文件 | 改动 | 对应问题 |
|---|---|---|
| `src/app/[locale]/purchase/return/page.tsx` | `statusMap` 改数字键 1/2/3/9；状态下拉值改 `'1'/'2'/'3'/'9'`；按钮条件 `status===1`(审核+取消)/`===2`(完成)；`grand_total`→`total_amount`、`base_grand_total`→`base_total_amount`；移除后端未建模的 `return_type` 列/表单/详情 | §3.1.1 |
| `src/app/[locale]/sales/return/page.tsx` | `return_reason`→`reason`（接口 `ReturnOrder`、表单、详情弹窗、保存）；`return_type` 徽章无值时显示 `-` | §3.1.2 |
| `src/app/api/production/product-label/route.ts` | POST 插入 `status = 1`（配合新列） | §3.1.3 |

**DB 迁移（live 库，仅 1 列）**
- `prd_product_label` +`status`(TINYINT NOT NULL DEFAULT 1)，注释 1待打印/2已打印/3已贴标。

**验证（verify_s31.cjs，全部 OK）**
```
OK  采购退货  -> HTTP 200 | status=2[num=true] total_amount=true grand_total_absent=true return_type_absent=true
OK  销售退货  -> HTTP 200 | status=0[num=true] reason_key=true return_reason_absent=true
OK  生产贴标  -> HTTP 200 | status_key_present=true sample_statuses=[1,1,1]
```
> 注：销售退货 `status=0` 为库内既有数据（域名枚举为 1/2/3/9），页面用 `|| tc('unknown')` 兜底显示"未知"，属既有数据问题非本次范围。生产贴标新列默认 1，已打印标签后续走"已贴标"按钮置 3。
> `npx tsc --noEmit` → **EXIT 0**（无类型错误）。

### 7.8 第五轮修复执行记录（2026-08-25，§3.2 字段映射）

> 原则：先**运行时抓包比对接口返回 key 与页面读取 key**，再决定改动，避免重复第四轮的"误报"。验证：`npm run dev`（清 `.next`）启动后用 `.env` 的 `JWT_SECRET` 现场签发 admin JWT 跑 `scripts/_audit/verify_s32.cjs` 抓 2 端点。

**关键结论**
- **质量来料检 `/api/quality/incoming` — 误报（无缺陷）**：接口返回 `materialName`(camelCase)、`specification`、`inspectionResult`，且 `items[]` 内返回 `itemName`/`standard`/`actualValue`/`result`；页面 `mapApiToInternal` 读取的正是 `item.materialName` / `item.items[].itemName` 等，完全匹配。原报告"物料名称列空白"与第四轮"销售退货 status 错位"同属误报。无需改动。
- **质量追溯 `/api/dcprint/trace` GET — 真缺陷已修**：SQL `SELECT` 已取 `c.product_name`、`l.material_code as main_material_code`、`l.material_name as main_material_name`、`l.batch_no as main_batch_no`、`t.remark`，但 `dbResult.list.map()` 只映射了 `traceNo/cardNo/workOrderNo/productCode/traceType/operatorName/traceTime`，**丢弃** 上述 5 个字段 → 页面 `fetchRecords` 映射出的 `product_name`/`main_material_*`/`remark` 全为 `undefined`。

**修改文件**
| 文件 | 改动 | 对应问题 |
|---|---|---|
| `src/app/api/dcprint/trace/route.ts` | GET `dbResult.list.map()` 补全 `productName`/`mainMaterialCode`/`mainMaterialName`/`mainBatchNo`/`remark` 5 字段（对齐已 SELECT 的列） | §3.2.5 根因 |
| `src/app/[locale]/quality/trace/page.tsx` | 追溯列表表格新增「产品名称」(`t('productName')`) 与「主物料」(`t('mainMaterial')`) 两列 + 导出工具栏同步两列；空态 `colSpan` 10→12 | §3.2.5 使数据可见 |

> 说明：仅路由 GET 映射 + 列表展示层改动，**无 DB 迁移**（列本就存在于 `prd_process_card`/`inv_material_label`，SQL 已 SELECT，纯前端/路由层字段透传问题）。`t('mainMaterialName')` 在 locale 中不存在，故主物料名列表头复用既有 `t('mainMaterial')`(主物料)。

**验证（verify_s32.cjs，修复前后对比）**
```
修复前  质量追溯 list[0] keys = [id,traceNo,cardNo,workOrderNo,productCode,traceType,operatorName,traceTime]
                              productName=undefined  mainMaterialName=undefined  remark=undefined
修复后  质量追溯 list[0] keys = [... ,productName,mainMaterialCode,mainMaterialName,mainBatchNo,remark]
                              productName="导电银浆"  mainMaterialName=null  remark="开始生产"   (HTTP 200)
        质量来料检 list[0].materialName="不干胶PET银色"  items[0].itemName="外观"  (HTTP 200，确认无误报)
```
> `npx tsc --noEmit` → **EXIT 0**（无类型错误）。
> 注：示例数据中 `mainMaterialName=null` 是因为该条追溯记录的 `main_label_id` 未关联 `inv_material_label`（数据层 NULL），非代码缺陷；页面以 `-` 兜底显示。

### 7.9 第六轮运行时复核（2026-08-25，§3.3/§3.4 字段映射结案）

> 原则：**先运行时抓包比对"页面实际读取字段"与"接口实际返回 key"，再判定**，不以审计脚本的静态字段差异为准。背景：前两轮已连续出现 2 次误报（销售退货 status、来料检 materialName），而 §3.3/§3.4 在报告中被标为"低风险/优雅降级"，须用事实闭合。验证：`npm run dev`（清 `.next`）启动后 forge admin JWT 跑 `scripts/_audit/verify_s33.cjs`，抓 7 个候选端点，逐项比对页面读取字段与接口返回 key。

**结论：§3.3 / §3.4 全部为误报或优雅降级，零代码改动。** 明细（见 §7.6 表格）：

| 原报告项 | 接口实际返回 | 页面实际读取 | 裁定 |
|---|---|---|---|
| §3.3.6 财务应收 currency | 无 currency 列 | 页面**不读** currency | 误报 |
| §3.3.7 设置→用户 department_id | 返回 `department_id`(+`dept_name`) | `department_id` | 正常 |
| §3.4 物料请购 req.type/issue_type | 返回 `request_type`/`requester_name` | 对应 camelCase | 误报（审计用错源名） |
| §3.4 销售订单 currency/base_total_amount | **返回** 这些字段 | 对应字段 | 正常（已对齐） |
| §3.4 销售发货 currency | 无 currency（发货单无币种概念）| 只读 `total_amount`/`total_qty` | 正常 |
| §3.4 销售对账 currency/has_mismatch | 无这些列 | 带 `|| 'CNY'`/`|| '-'` 兜底 | 优雅降级（不崩溃） |
| §3.4 委外订单 issued/received/qualified_qty | 不返回（数量在 issue/receive 子表）| 带 `|| 0` 兜底 | 优雅降级（不崩溃） |

**未改动任何代码/DB**。理由：
- 误报项（§3.3.6、§3.3.7、§3.4 物料请购、§3.4 销售订单）：页面与接口本就对齐，改则破坏正常功能。
- 优雅降级项（§3.4 销售对账、§3.4 委外订单）：前端已用 `|| 'CNY'`/`|| 0`/`|| '-'` 兜底，无空白/崩溃；其缺失的 `currency`/`has_mismatch`/`issued_qty` 等属**后端数据增强需求**（需给 `fin_receivable`/`sales_reconciliation`/`outsource_order` 等表补列并在路由返回），不是前端字段映射 bug，不应在本审计范围内"修"。

> **字段映射审计至此全部结案**：§2（500 集群）、§3.0（财务仪表盘）、§3.1（采购/销售退货/贴标）、§3.2（追溯字段映射）的真实缺陷已修复并运行时验证；§3.2 来料检、§3.3、§3.4 经运行时复核确认为误报/降级，无需改动。后续若用户感知"某列表币种/对账/收发数量显示不对"，应作为**后端数据增强**需求单独立项，而非前端 bug。

**验证脚本**：`scripts/_audit/verify_s33.cjs`（7 端点全 HTTP 200，字段存在性对照见上表）。

