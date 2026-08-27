# ERP 列表页字段映射审计报告（复核版）

- 日期：2026-08-25
- 方法：6 个并行只读 Explore 子代理，对每个列表页逐一比对「页面渲染字段」与「对应 API GET 响应形态」。
  `SELECT *` / `SELECT t.*` 类接口通过 **实时查询 `information_schema.columns`** 或 Drizzle schema / 路由写入逻辑确认列是否真实存在，
  不再像上一轮那样把 `SELECT *` 误判为缺失。
- 结论置信度：高（多数结论已用活库 `information_schema` 二次佐证）。

## 总览

| 分组 | 有问题的页面 | 字段缺口数 | 说明 |
|------|-------------|-----------|------|
| warehouse | 4 | 11 | inbound/outbound/stocktaking/setup |
| purchase/sales/orders/crm | 5 | 18 | purchase/return, sales/delivery, sales/reconciliation, sales/return, orders/sales |
| finance/reports | 4 | 8+ | finance/page, payables, receivable(含详情弹窗崩溃), cost |
| production/outsource | 2 | 4+1 逻辑 | material-requisitions(查错表), mrp |
| quality/equipment/dcprint | 3 | 10 | equipment, screen-plate, labels(NULL) |
| base-data/settings/srm/hr | 6 | 16 | login-log, organization×2, hr/certificates/expiring, hr/reports/turnover；另 6 个 hr 页 NO-API-ROUTE |
| **合计** | **24 页面** | **~67 字段** + 6 无路由页 | 其余 ~50 个页面 [CLEAN] |

> 上一轮（会话摘要）所列结论有多处误报，已更正：
> - `production/product-label`：**CLEAN**（GET `SELECT *`，表含 `status`+`qc_result`）——原误报。
> - `finance/payables` 的 `currency`：**CLEAN**（迁移 `068_finance_multi_currency.sql` 已加列）——原误报。
> - `dcprint/screen-plate` 字段名：`size/life_count/reclaim_count/tension_value` 实为 `size_spec/max_use_count/used_count/remaining_count`。
> - `hr/mes-sync`：原称「字段完全错误」→ 实为 **NO-API-ROUTE**（无路由文件，页面硬编码/模拟）。

---

## 严重等级（建议修复优先级）

### 🔴 P0 — 页面崩溃 / 关键列全空

1. **hr/reports/turnover**（`src/app/[locale]/hr/reports/turnover/page.tsx`）
   - `monthlyTrend`（L138）：接口返回 `monthly`，页面读 `data.monthlyTrend` → `undefined`，`.map` 抛 TypeError → **整页白屏**。
   - `resignedCount`（L99，接口丢弃）、`avgTenureDays`（L108，接口 `avgTenure`）、`turnoverRate`（L117，顶层无此键）、`byDepartment[].dept_name`（L170，接口 `deptName`）、`byDepartment[].rate`（L173，接口 `turnoverRate`）。
   - 接口：`src/app/api/hr/reports/turnover/route.ts`（L54-64）。

2. **equipment**（`src/app/[locale]/equipment/page.tsx`）
   - `eq.brand`(L246)、`eq.rated_capacity`(L249)、`eq.oee`(L252/254)、`eq.current_status`(L259/261) 全部 undefined。
   - 接口 `src/app/api/equipment/route.ts` GET（L72-76）显式列仅含 `e.manufacturer, e.status`，未选这 4 列。
   - 表现：品牌空、OEE 显 0%、容量条 NaN、状态恒「unknown」。

3. **material-requisitions**（`src/app/[locale]/material-requisitions/page.tsx`）
   - `type`(L282)、`total_quantity`(L284)、`applicant_name`(L285) 全空。
   - 根因：GET（`src/app/api/material-requisitions/route.ts` L49-59）查的**是错表 `prd_material_issue`**，应为 `material_requisitions`。
   - 另 [LOGIC-BUG]：`getTypeLabel(req.type)` 期望 `'normal'/'over'/'supplementary'` 字符串，接口返回数值 `issue_type`+字符串 `type_name`。

4. **dcprint/labels**（`src/app/[locale]/dcprint/labels/page.tsx`）
   - `label.warehouseName`(L443)、`label.locationName`(L444) 恒 NULL。
   - 接口 `src/app/api/dcprint/labels/route.ts`(L133-134) 硬编码 `NULL as warehouseName, NULL as locationName`，未关联仓库/库位表。

5. **hr/certificates/expiring**（`src/app/[locale]/hr/certificates/expiring/page.tsx`）
   - 5 字段蛇形/驼峰不一致全 undefined：`employee_name`(L173)、`cert_name`(L175)、`cert_code`(L176)、`expiry_date`(L178)、`days_remaining`(L171/181)。
   - 接口 `src/app/api/hr/certificates/expiring/route.ts`(L20-28) 返回 `employeeName/certName/certCode/expiryDate/daysUntilExpiry`。
   - 副作用：统计 `criticalCount/warningCount` 恒为 0。

### 🟠 P1 — 非关键但明显的数据列缺失（币种徽标 / 差异 / 容量 / 负责人等）

6. **settings/organization**（`department-table.tsx` L134 `leader_name`；page.tsx L951 `role_type`、L953 `sort_order`）
   - 接口 `department/route.ts`(L48) 只返 `leader_id`；`role/route.ts`(`formatRole` L75-80) 无 `role_type`/`sort_order`。

7. **settings/login-log**（`login-log/page.tsx` L28/L122/L109 `os`）
   - 接口 `system/login-log/route.ts` GET 显式 SELECT(L29-34) 无 `os`。

8. **warehouse/inbound**（`inbound/page.tsx` L565 `base_currency`）
   - 接口 GET 仅返 `base_total_amount`，未返 `base_currency` → 编辑表单「本位币」恒空。

9. **warehouse/outbound**（`outbound/page.tsx` L1190 `base_total_amount`、L1191 `base_currency`）
   - 接口 GET 显式列(L32-52)未含这 2 列 → 本位币金额组件异常。

10. **warehouse/stocktaking**（`stocktaking/page.tsx` L375 `type`、L377 `diff_items`、L379 `diff_amount`）
    - `inv_stocktaking` 无这 3 列（实际为 `taking_type`；差异值审批时现算未落库）→ 类型恒「-」、差异件数/金额空白。

11. **warehouse/setup**（`setup/page.tsx` L381 `nature`、L387 `includeInCalculation`、L401+ `usedCapacity`/`capacity`、L423 `manager`）
    - 接口 `warehouse/route.ts` GET 显式列(L53-64)未含这 5 列 → 性质/计入核算/容量进度条(NaN)/负责人全空。

12. **purchase/return**（`purchase/return/page.tsx` L377/L640/L651 `base_currency`）
    - 接口显式列(L66-73)遗漏（活库列真实存在但被丢弃）。

13. **sales/delivery**（`sales/delivery/page.tsx` L573-575 `currency`/`base_total_amount`/`base_currency`）
    - `sal_delivery` 无这 3 列（`SELECT d.*` 无法返回）。

14. **sales/reconciliation**（`sales/reconciliation/page.tsx` L420-448 `currency`、L409 `has_mismatch`）
    - `sal_reconciliation` 无这两列。

15. **sales/return**（`sales/return/page.tsx` L446-464 共 6 字段：`return_type`/`total_qty`/`currency`/`base_total_amount`/`base_currency`/`inspection_status`）
    - `sal_return` 无这 6 列。

16. **orders/sales**（`orders/sales/page.tsx` L1289 `delivery_date`、L1262/L489 `items`）
    - 接口 `orders/sales/route.ts`(L51-71) `.map()` 重塑列表显式遗漏（即便 `so.*` 含 `delivery_date` 也被丢弃）→ 展开明细与生成工单为空/崩溃。

17. **finance/page.tsx**（`finance/page.tsx` L759 列表、L1267 详情弹窗 `supplier_name`）
    - `fin_payable` 无 `supplier_name`（GET 无 JOIN）→ 应付 Tab 显「-」。

18. **finance/payables**（`payables/page.tsx` L165 `supplier_name`、L153/L158 `source_currency`）
    - `fin_payable` 无 `supplier_name`/无 `source_currency`（迁移 068 仅加 `currency`）→ 来源币种徽标分支永不触发。

19. **finance/receivable**（`receivable/page.tsx` L283 `source_currency`/`source_amount`；详情弹窗全空）
    - `fin_receivable` 无这 2 列；**详情弹窗崩溃**：`GET /api/finance/receivables?id=X` 忽略 `id` 返回列表信封 `{list,...}`，页面却 `setDetailItem(result.data)` 当单行 → 所有详情字段 undefined。

20. **finance/cost**（`cost/page.tsx` L89 `cost_summary`）
    - 页面汇总误调 `/api/finance/stats`（该接口不返 `cost_summary`）→ 成本 KPI 卡片恒 ¥0.00。

21. **production/mrp**（`mrp/page.tsx` L363 / 映射 L216 `material_name`）
    - 接口 `/api/production/orders` 重塑仅返 `product_name` → MRP 工单「品名」列空白。

22. **dcprint/screen-plate**（`screen-plate/page.tsx` L304 `size`、L309 `life_count`+`max_use_count`、L315 `reclaim_count`、L317 `tension_value`）
    - 真实列名为 `size_spec`/`max_use_count`/`used_count`/`remaining_count`；页面字段名错误 → 全空。

### 🟡 P2 — 无 API 路由（纯模拟/硬编码页，需补后端或标记为未实现）

- `hr/mes-sync`、`hr/salary/piece-rate`、`hr/salary/piece-work`、`hr/salary/payslips`、`hr/performance`、`hr/salary/bank-report`
  —— 均无 `src/app/api/hr/...` 对应路由文件。

### ⚪ NEEDS-LIVE-CHECK

- `reports/page.tsx` 的 prepress 子 Tab（die/ink/surplus/tool/sample 明细表与趋势图字段）未逐一比对各自路由；
  dashboard 概览已核对 [CLEAN]。

---

## 修复方向（通用）

- 显式 SELECT 遗漏 → 在 API GET 列清单补列，或改 `SELECT t.*`（需确认表列）。
- `SELECT *` 但列真的不存在 → 要么补表列 + 迁移，要么页面改用真实列名（`screen-plate`、`stocktaking` 属此类）。
- 查错表（`material-requisitions`）→ 改 GET 的 FROM 为正确表并补 JOIN/联表字段。
- 键名不一致（snake/camel、`monthly`/`monthlyTrend`、`deptName`/`dept_name`）→ 统一接口与页面，
  或接口返回时做一次映射。
- 硬编码 NULL（`labels`）→ 改为 JOIN `inv_warehouse`/`inv_location` 取真实值。
- 详情弹窗（`finance/receivable`）→ GET 需识别 `?id=` 返回单行而非列表信封。
- NO-API-ROUTE 页 → 与用户确认：补后端接口，或前端明确标注「未实现/演示数据」。

## 验证遗留物

- 子代理在根目录遗留临时脚本 `colcheck.mjs`，及 `scripts/_audit/` 下 `be_fields_live.json`/`t7_*.json`/`t7_*.cjs` 等历史审计文件，
  可按需清理（非本任务产物）。
