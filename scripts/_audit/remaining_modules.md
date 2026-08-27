# 前端列表页 vs 后端 API 字段一致性审计报告（财务 / 质量 / 基础数据 / 设置 / HR / 印前印中 / 工程 / 仪表盘 / 报表 / 设备 / 二维码 等剩余模块）

- 审计范围：`src/app/[locale]/{finance,quality,base-data,settings,hr,dcprint,prepress,plm,engineering,dashboard,reports,equipment,qrcode,business,srm,tools,advanced,analysis,organization}/**/page.tsx` 列表页 + 对应 `src/app/api/**/route.ts`
- 审计性质：只读（本报告外未修改任何源码）
- 关键前提（已自行复核）：`src/lib/auth-fetch.ts` 与 `src/lib/api-response.ts` 中**不存在全局 snake_case→camelCase 键名转换**。`api-response.ts` 的 `sanitizeObject` 只递归转换**值**（HTML 转义 / Date→字符串），不改动键名。因此前端读 `record.someField` 而后端返回 `some_field`（或反之）即为真实缺陷。
- 重要补充发现（影响判断）：不少路由经**应用层服务 + `toRow` 映射器**（如 `ToolManagementService.toolToRow`、`FinanceApplicationService` 等）在返回前将领域对象重新序列化为 `snake_case`；同时不少页面内置 `item.camel || item.snake` 双写适配器。两者都会让"前后端命名风格不一致"在运行时被掩盖——本报告对每个疑似点均实际读取了路由返回形状与服务/适配器，避免误报。
- 权威 schema：`database/vnerpdacahng_schema.sql`（部分 QMS/业务表不在该文件内，已注明）。

---

## 一、问题汇总表

| 页面 | API | 前端字段（file:line） | 后端实际返回 | 严重度 |
|---|---|---|---|---|
| finance（仪表盘）`page.tsx` | `GET /api/finance/receipt` | 收款 Tab：`fetchReceipts` (page:230) | 该路由**只导出 POST，无 GET**（route.ts:10） | 高 |
| finance（仪表盘）`page.tsx` | `GET /api/finance/payment` | 付款 Tab：`fetchPayments` (page:245) | 该路由**只导出 POST，无 GET**（route.ts:10） | 高 |
| finance（仪表盘）`page.tsx` | `GET /api/finance/receivables`、`/api/finance/payable` | KPI 卡片 `summary.receivable.*` / `summary.payable.*`（page:178-181, 494-546） | 两路由均返回 `{list,total,page,pageSize}`，**无 `summary`**（receivables/route.ts:45、payable/route.ts:45） | 高 |
| finance（仪表盘）`page.tsx` | `GET /api/finance/receivables?id=` / `/api/finance/payable?id=` | 详情弹窗 `detailData.*`（page:459-475, 1197-1337） | 两路由 GET 不处理 `id` 参数，返回的是整个列表对象 `{list,...}`，`detailData.receivable_no` 等均为 undefined | 中 |
| finance/cost `page.tsx` | `GET /api/finance/cost` | `c.source_no`（page:33 接口、204 渲染） | `SELECT * FROM fin_cost_record`（cost/route.ts:33）；该表列名为 `order_no`（schema:473），**无 `source_no`** | 中 |
| finance/payables `page.tsx` | `GET /api/finance/payables` | `pay.currency`/`pay.source_currency`/`pay.source_amount`（page:167-176, 153-158） | `SELECT p.* FROM fin_payable`（payable/route.ts:36）；`fin_payable` 表**无这三个列**（schema:489-512） | 低 |
| finance/receivable `page.tsx` | `GET /api/finance/receivables` | `item.currency`/`item.source_currency`/`item.source_amount`（page:133-135, 283-311） | `SELECT r.* FROM fin_receivable`（receivables/route.ts:36）；`fin_receivable` 表**无这三个列**（schema:567-590） | 低 |

> 共 **7** 个真实问题，其中 finance 仪表盘的 3 项（收款/付款 Tab 无 GET、KPI 汇总缺失）为**高风险**功能性缺陷；cost 来源单号列、详情弹窗为**中风险**；payables/receivable 的多币种列为**低风险**（单行币种系统回退为 CNY，不报错）。

---

## 二、详细发现

### 1. finance（仪表盘）收款 / 付款 Tab 无可用 GET 接口（高）
- `src/app/[locale]/finance/page.tsx`
  - `fetchReceipts`（page:227-240）请求 `authFetch('/api/finance/receipt?pageSize=50')`，并对 `data.success` 判断后 `setReceipts`。
  - `fetchPayments`（page:242-255）请求 `authFetch('/api/finance/payment?pageSize=50')`，同理 `setPayments`。
- `src/app/api/finance/receipt/route.ts`：**仅 `export const POST`**（line:10），无 GET。对 GET 返回 405 / 无处理器 → `data.success=false` → 进入 `catch` → `setReceipts([])`。
- `src/app/api/finance/payment/route.ts`：同样**仅 `export const POST`**（line:10），无 GET。
- **影响**：仪表盘的"收款记录"与"付款记录"两个 Tab **永远显示空列表**，用户无法查看任何收/付款流水。属功能性阻断（高）。
- 备注：真正的收款/付款流水数据来自 `fin_receipt_record` / `fin_payment_record`（见 `finance/stats` 路由的 `recentReceipts`/`recentPayments`，route stats:40-59），但本页并未调用这些端点，也未调用 `/api/finance/receipt-*` 之类的列表接口。

### 2. finance（仪表盘）KPI 汇总卡片始终为 0（高）
- `src/app/[locale]/finance/page.tsx`
  - `summary` 初始值全 0（page:178-181）。
  - `fetchReceivables`（page:183-203）在 `if (data.data?.summary) { setSummary(...) }` 中赋值；`fetchPayables`（page:205-225）同理。
  - 渲染卡片读取 `summary.receivable.total_amount / total_received / total_balance / overdue_balance`、`summary.payable.*`（page:494-546）。
- 后端：
  - `src/app/api/finance/receivables/route.ts` GET 返回 `successResponse({ list: rows, total, page, pageSize })`（line:45）——**不含 `summary`**。
  - `src/app/api/finance/payable/route.ts` GET 返回 `successResponse({ list: rows, total, page, pageSize })`（line:45）——**不含 `summary`**。
  - 虽然存在返回汇总数据的 `/api/finance/stats`（stats/route.ts:8-75，返回 `receivable:{total_amount,total_received,...}`、`payable:{...}`）与 `/api/finance/summary`，但本仪表盘页面**从未调用**这两个端点，只用 receivables/payable 的列表端点。
- **影响**：4 张 KPI 卡片（应收总额/已收/应收余额、应付总额/已付/应付余额）**永远显示 ¥0.00**，顶层经营看板数据全错（高）。

### 3. finance（仪表盘）详情弹窗读到的是列表对象而非单条（中）
- `handleViewDetail`（page:459-475）请求 `/api/finance/receivables?id=${id}`（或 `/api/finance/payable?id=${id}`），`setDetailData(data.data)`。
- 后端两路由的 GET **不处理 `id` 查询参数**（仅 `page/pageSize/status/customerId` 或 `supplierId`），因此返回的是 `{list,total,page,pageSize}` 整个列表。
- 详情弹窗随后读取 `detailData.receivable_no` / `amount` / `received_amount` 等（page:1204 起），而 `detailData` 实际是分页信封对象 → 全部 undefined → **详情弹窗内容空白**。
- 影响：点开应收/应付详情看不到任何字段（中，附属于列表页的交互）。

### 4. finance/cost 来源单号列空白（中）
- `src/app/[locale]/finance/cost/page.tsx`：列标题"来源单号"，渲染 `{c.source_no}`（page:181、204）。
- `src/app/api/finance/cost/route.ts` GET：`SELECT * FROM fin_cost_record ${where}`（line:33）。
- `database/vnerpdacahng_schema.sql` 中 `fin_cost_record`（line:466-486）的关联单号列名为 **`order_no`**（line:473），**不存在 `source_no`**。
- **影响**：成本列表的"来源单号"列恒为空（中）。该列应读取 `c.order_no`。

### 5. finance/payables、finance/receivable 多币种列缺失（低）
- `payables/page.tsx` 读取 `pay.currency`/`pay.source_currency`/`pay.source_amount`（page:42-44 接口、153-176 渲染）；`receivable/page.tsx` 读取 `item.currency`/`item.source_currency`/`item.source_amount`（page:53-55、133-135、283-311）。
- 后端 `fin_payable`（schema:489-512）、`fin_receivable`（schema:567-590）**均无 `currency`/`source_currency`/`source_amount` 列**（多币种迁移仅作用于 `pur_*` 采购域，见既有 commerce 审计结论）。
- 前端用 `pay.currency || 'CNY'` 兜底，故币种列显示 "CNY" / "-" 而非空白，不报错；来源币种图标分支因 `source_currency` 为 undefined 永不触发。
- **影响**：单行币种系统下展示可接受，但严格意义上该字段后端未提供（低，展示层）。

---

## 三、已确认无问题（CLEAN）的页面

以下列表页前端字段与后端返回键名一致（经逐接口读取 GET 返回形状 + schema 核对 / 适配器确认）：

**finance 模块**
- finance/costs `page.tsx` ↔ `/api/finance/costs`：路由 `SELECT c.*, wo.work_order_no, wo.plan_qty, wo.completed_qty FROM work_order_costs c`（costs/route.ts:28-36），`work_order_costs` 表含 `material_cost/labor_cost/manufacturing_cost/total_cost/unit_cost/calculate_time/quantity` 等（schema:4151-），页面读取 `cost.*` 全部命中 ✔
- finance/receivables `page.tsx` ↔ `/api/finance/receivables`：`SELECT r.*` + 页面内置 `item.receivableNo||item.receivable_no` 适配器（page:120-136），所有展示字段（receivable_no/source_*/customer_*/amount/received_amount/balance/due_date/status）均被返回 ✔
- finance/report `page.tsx` ↔ `/api/finance/report`：路由返回 `{list:[period,type,category,revenue,cost,profit,profit_rate], summary:{total_revenue,total_cost,total_profit,profit_rate}}`（report/route.ts），页面读取 `r.period/type/category/revenue/cost/profit/profit_rate` 与 `summary.*` 全部命中 ✔

**quality 模块**（页面普遍双写 `item.camel||item.snake` 适配器 + 路由显式 `AS` 驼峰或 `SELECT *`）
- quality/incoming：路由返回驼峰别名 + `items`（incoming/route.ts:24-108），页面适配器覆盖 ✔
- quality/final：路由 `AS` 驼峰别名（final/route.ts:43-71），页面 `rawList.map` 适配器（page:200-227）双写 ✔
- quality/process：同 final 模式（process/route.ts:65-93）✔
- quality/complaint / sgs / supplier-audit / lab-test / unqualified：`SELECT *` / `SELECT c.*` + `item_count`（各 route GET），页面读取字段与表列一致 ✔
- quality/trace ↔ `/api/dcprint/trace`：路由显式转驼峰（trace/route.ts:115-130），页面读取 `record.cardNo/operatorName/...` 命中 ✔
- quality/spc：聚合计算端点，页面读取聚合字段 ✔

**base-data / settings / hr / dcprint / prepress / plm / engineering / equipment / qrcode / business / srm / dashboard / reports**
- base-data/material-category ↔ `/api/base-data/material-category`：`SELECT * FROM inv_material_category`，页面 `category_code/category_name/category_type/...` 命中 ✔
- settings/system、settings/basics ↔ `/api/settings/system`：返回 `id,config_name,config_key,config_value,config_type,category,display_name,description,sort_order,is_required,approval_required,status`（system/route.ts:859-862），页面所读字段全部返回 ✔
- settings/announcement、config、currency、dict、exchange-rate、label-template、login-log、menus、notice、oper-log、organization、profile、roles、scheduler、seed-data、user ↔ 各自 `/api/system/*`、`/api/organization/*`：返回字段与页面读取一致（多为 `SELECT *` / 实体直出）✔
- hr/salary ↔ `/api/hr/salary`：路由 `SELECT e.*, s.*`（salary/route.ts:21-44，snake），页面双写适配器 `item.basic_salary||item.basicSalary` 等命中 ✔
- hr/attendance、certificates、employee、mes-sync、performance、salary/*（calculate/payslips/piece-rate/piece-work/schedules/shifts/skills/training/reports/*）：路由返回形状（snake 或带 `toRow`）与页面读取一致，salary 系列含双写适配器 ✔
- dcprint/tool、tool-manage ↔ `/api/dcprint/tool`：经 `ToolManagementService.listTools` → `toolToRow` 把领域对象**重新序列化为 snake_case**（ToolManagementService.ts:91-150），页面 `Tool` 接口即 snake_case（tool/page.tsx:67），全部命中（初判为缺陷，经核实 `toRow` 后排除）✔
- dcprint/trace、process-cards、labels、burdening、ink、die、ink-mixed、ink-usage、ink-opening、ink-formula ↔ 各自端点：路由返回驼峰别名或 `SELECT *`（prepress/ink、prepress/die、ink-mixed、ink-usage、ink-opening 均为 `SELECT *`；process-cards/labels 为 `AS` 驼峰），页面读取命中 ✔（注：`dcprint/labels` 路由对 `warehouse_name`/`location_name` 显式返回 `NULL`，若该列期望显示仓库/库位名则为空——属已知回填限制，非字段名不匹配，列为低风险观察点）
- prepress/die-template ↔ `/api/prepress/die-template` 等：返回字段与页面读取一致 ✔
- plm/eco、plm/lifecycle ↔ `SELECT *`（plm_eco / plm_product_lifecycle），页面 snake 读取命中 ✔
- engineering/sample-to-mass（`SELECT stm.*`）、engineering/sop（`SELECT *`）：页面读取命中 ✔
- equipment、equipment/calibration、maintenance、repair、scrap ↔ `/api/equipment*`（`SELECT e.*` + 聚合列）：页面 snake 读取命中 ✔
- qrcode ↔ `/api/qrcode`（`SELECT q.*` + 批次聚合列）：页面读取命中 ✔
- business/contract-review（`SELECT * FROM biz_contract_review`）、srm/evaluation（`SELECT e.*`）：页面读取命中 ✔
- dashboard/{ceo,finance,production,quality,sales,warehouse}、reports、advanced/*、analysis/db-relations、tools/uploader：均为聚合/计算端点，返回对象键名与页面 `DATAFIELDS`（overview/revenueTrend/stat.*/table.* 等）一致 ✔

---

## 四、范围外 / 未审计说明

- **finance/invoice、finance/expense 端点存在但无列表页**：全仓 `src/app/[locale]` 下无任何 `page.tsx` 调用 `/api/finance/invoice` 或 `/api/finance/expense`（grep 验证为空）。其路由（invoice/route.ts 用 `finance_invoice` 表、expense/route.ts 用 `finance_expense` 表）未在前端列表渲染，不在字段一致性审计范围内（建议另行确认这俩功能的前端入口是否缺失）。
- **quality 的 `qms_*` 表不在权威 schema 内**：`qms_complaint` / `qms_sgs_cert` / `qms_supplier_audit` / `qms_lab_test` 未在 `database/vnerpdacahng_schema.sql`（及同目录其他 .sql）中找到建表语句。这些页面走 `SELECT *`，列名由表结构决定；因前端均用双写适配器，单字段缺漏会被静默兜底，目前判为 CLEAN，但**无法用权威 schema 逐列背书**，建议补充这些表定义后再复核。
- **dashboard/reports/advanced/analysis/tools**：属分析/聚合类，无"后端返回字段名 ≠ 前端读取字段名"的逐行映射问题，按 CLEAN 处理。

---

## 五、修复建议（概览，未实施）

1. **补齐 finance 仪表盘的收款/付款列表 GET**：`/api/finance/receipt` 与 `/api/finance/payment` 需新增 GET（参考 `finance/stats` 中 `recentReceipts`/`recentPayments` 的 `SELECT r.*, c.customer_name` / `p.*, s.supplier_name`），并返回 `{list,total,...}`，否则两 Tab 永远空白。
2. **修复 KPI 汇总**：仪表盘 `finance/page.tsx` 应改用 `/api/finance/stats`（已返回 `receivable/payable` 汇总）或 `/api/finance/summary` 填充 `summary` 状态，而非从列表端点读取不存在的 `summary` 字段。
3. **修复详情弹窗**：`handleViewDetail` 应调用支持 `?id=` 的单条查询端点（或后端 GET 增加 `id` 分支返回单条 `{...detail}` 而非列表信封）。
4. **cost 来源单号**：前端改读 `c.order_no`（或后端 `AS source_no`）。
5. **多币种列（低）**：若 `fin_payable`/`fin_receivable` 需展示币种，应在表与路由中补齐 `currency`/`source_currency`/`source_amount`；否则前端应移除该列或明确标注单行币种。
6. 优先处理 **高严重度** 三项（finance 仪表盘：收款/付款 Tab 空、KPI 全 0）。
