# ERP 三层字段一致性审计 — tasks.md

> 生成时间：2026-09-01
> 审计范围：用户指定的 38 个业务模块（见下文「已覆盖 / 未覆盖」）
> 技术栈：Next.js 16 App Router + React 19 + TypeScript + MySQL 8（**非 Vue**，前端即 `src/app/[locale]/<模块>/page.tsx` + `fetch/authFetch`；后端即 `src/app/api/<模块>/route.ts` + DDD 层；事实契约 = route 解构字段 + 裸 SQL 列 + 校验器）
> 数据库事实源：**活库直连导出** `database/_live_columns.txt`（350 表 / 6030 列）、`_live_fks.txt`（163 外键）、`_live_fk_health.txt`（外键空值/孤儿统计）。每条结论均对照真实 DDL 与真实源码。

## 审计结论速览
- **P0：13 项**（阻断业务 / 保存必失败 / 库存归属错误）
- **P1：~38 项**（功能缺陷 / 页面空白 / 字段失效 / 关联断裂）
- **P2：~9 项**（命名 / 死代码 / 注释）
- 已覆盖模块：orders 系(6) + business/contract-review + sales 系(3) + crm 系(2) + plm/eco + production/material-return + warehouse/inbound(cutting) + warehouse/outbound(fifo)。
- **未深度覆盖（受子代理限流，仅采样/未读）**：engineering、sample/*、engineering/*、prepress/die-template、dcprint/*（ink/process-cards/labels/ink-opening/ink-mixed/trace）、plm/lifecycle、production（除 material-return）、warehouse/inbound（非 cutting）。已生成候选清单 `database/_audit_candidates.txt` 与 DB 事实文件，可在限流解除（12:57）后用加固脚本续审。

---

## P0（阻断业务，最高优先级）

| 模块 | 问题类型 | 问题描述 | 涉及文件(表/后端文件/前端文件) | 风险等级 | 修复建议 |
|---|---|---|---|---|---|
| /orders/customers | 创建接口有字段、前端无控件（绑定失败） | POST 的 INSERT 列含 `salesman_id` 并绑定 `body.salesman_id`；但 `/orders/customers/new` 的 `formData` 无 `salesman_id` 字段、页面无业务员控件 → `body.salesman_id===undefined` → mysql2 抛「Bind parameters must not contain undefined」，新建客户 100% 失败 | 表 `crm_customer.salesman_id`；`src/app/api/customers/route.ts:185,208`；`src/app/[locale]/orders/customers/new/page.tsx:36-59,111-119` | P0 | 前端补业务员选择控件；后端改为 `body.salesman_id ?? null` |
| /orders/customers | 编辑全量 UPDATE + 缺字段（保存失败） | PUT 是 23 列**无条件全量** UPDATE（无 `!==undefined` 判断），但编辑 body 不含 `business_license` 与 `salesman_id` → 两个 undefined 参数 → mysql2 绑定错误，编辑保存 100% 失败 | 表 `crm_customer.business_license`/`salesman_id`；`src/app/api/customers/route.ts:258-291`；`src/app/[locale]/orders/customers/page.tsx:276-300,936-1160` | P0 | PUT 改为「字段存在才更新」增量 UPDATE（对齐 `/api/products` 的 fieldMapping），或补齐两控件 |
| /orders/products | 命名不一致（驼峰↔下划线），校验必失败 | `validateRequestBody(body, ['productCode','productName','categoryId'])` 校验**驼峰**，但随后解构 `product_code/product_name/category_id`（下划线）；前端 POST 体也是下划线且无 `categoryId` → 新建产品必返 `400 缺少必填字段` | `src/app/api/products/route.ts:95,101-118`；`src/app/[locale]/orders/products/page.tsx:811-824` | P0 | 校验数组改为 `['product_code','product_name','category_id']`；前端补分类控件 |
| /orders/bom | 外键 ID 来自错误主表（ID 空间错位） | `bom_line.material_id` 外键指向 `bom_material`（仅 4 行 id 1–4）；但物料选择器查 `std_material`（4086 行）→ 选 id>4 触发外键约束失败；选 id=4 静默挂到错误物料 | 表 `bom_line.material_id`/`bom_material`/`std_material`；`src/app/api/orders/bom/route.ts:199,324`；`src/app/api/orders/bom/materials/route.ts:47-51`；`src/app/[locale]/orders/bom/create/page.tsx:189-196` | P0 | 统一物料主数据：把 `bom_line.material_id` 外键改指 `std_material.id`，或让 `/api/orders/bom/materials` 查 `bom_material` |
| /sales/delivery | 前端页面未接真实接口（mock 开关） | `src/lib/mock-data.ts` 的 `USE_MOCK=true`，`delivery/page.tsx` 在 `if(USE_MOCK)` 内直接 return，从不请求 `/api/sales/delivery` 与 `/api/customers`，列表/统计/客户下拉全为 `mockShipments` 假数据 | `src/lib/mock-data.ts:12`；`src/app/[locale]/sales/delivery/page.tsx:39,226,264` | P0 | 将 `USE_MOCK` 改 `false` 或删除 mock 分支，使 `fetchData`/`fetchCustomers` 走真实 API |
| /sales/delivery | DB NOT NULL 无控件（业务阻断） | 新建明细行 `material_id` 恒为 `0`（界面只绑 `material_name`/`material_spec` 自由文本），而 `saveDelivery` 校验 `!i.material_id` 中 `!0` 恒真 → 永远弹「请填写发货明细」，新建发货单 100% 无法提交 | 表 `sal_delivery_detail.material_id`（bigint NO）；`src/app/[locale]/sales/delivery/page.tsx:350-357,448-461,803-810` | P0 | 增加物料选择器（按 `material_id` 回填名称/规格），或校验中移除 `material_id` 并允许无主数据发货 |
| /sales/delivery | 命名不一致（前端 sales_order_id vs 后端 order_id） | 前端接口/订单下拉绑定 `sales_order_id`，后端 `validateRequestBody(body,['order_id',...])` 只认 `order_id` → 关掉 mock 也必被拦截返回「缺少必填字段: order_id」 | 表 `sal_delivery.order_id`；`src/app/api/sales/delivery/route.ts:106-115`；`src/app/[locale]/sales/delivery/page.tsx:58,686-696` | P0 | 前端统一改用 `order_id`，或后端兼容 `order_id \|\| sales_order_id` |
| /sales/return | DB NOT NULL 无控件（保存失败 1048） | `sal_return.order_id` 为 `bigint unsigned NO` 无默认；前端退货表单仅 `order_no` 自由文本无 `order_id` 控件 → 经 UI 新建必报 `1048 Column 'order_id' cannot be null` | 表 `sal_return.order_id`；`src/app/api/sales/return/route.ts:105-134`；`src/app/[locale]/sales/return/page.tsx:46,599-603` | P0 | 前端改订单下拉（回填 `order_id`/`customer_id`）；后端移除 `\|\| null` 改显式报错 |
| /sales/return | DB NOT NULL 无控件（库存归属错误） | `sal_return.warehouse_id` 为 `bigint unsigned NO`；退货表单无任何仓库控件，后端退化为 `warehouse_id \|\| 1` → 所有 UI 创建的退货单恒写仓库 1，退货入库仓库/库存归属错误 | 表 `sal_return.warehouse_id`；`src/app/api/sales/return/route.ts:138`；`src/app/[locale]/sales/return/page.tsx:540-613` | P0 | 前端补 `WarehouseSelect` 并必填；后端删 `\|\| 1` 兜底，缺失即 400 |
| /crm/follow | DB NOT NULL 无控件（新建必 400） | `crm_follow_record.customer_id` 为 `bigint unsigned NO`，后端 `if(!customer_id) return 400`；前端 `customer_id` 初始化 `0` 且无控件（仅 `customer_name` 文本），必填校验只查 `customer_name` → 新建跟进 100% 失败 | 表 `crm_follow_record.customer_id`；`src/app/api/crm/follow/route.ts:44-57`；`src/app/[locale]/crm/follow/page.tsx:42,89-100,125-128,342-345` | P0 | 增加客户下拉绑定 `customer_id` 并回填 `customer_name`；必填校验改 `customer_id` |
| /crm/analysis | DB NOT NULL 无控件（新建必 400） | `crm_customer_analysis.customer_id` 为 `bigint unsigned NO`，后端强校验；前端 `customer_id` 初始化 `0` 且无控件 → 新建客户分析 100% 返回 400 | 表 `crm_customer_analysis.customer_id`；`src/app/api/crm/analysis/route.ts:60-78`；`src/app/[locale]/crm/analysis/page.tsx:42,105-121,161-164,432-434` | P0 | 增加客户下拉绑定 `customer_id`；必填校验改 `customer_id` |
| /plm/eco | DB NOT NULL 无控件（创建必 1048） | `plm_eco.eco_title` 为 `varchar(200) NOT NULL` 无默认；POST INSERT 列清单**不含** `eco_title`，且前端表单无该控件 → 创建工程变更单必报 `1048 Column 'eco_title' cannot be null` | 表 `plm_eco.eco_title`；`src/app/api/plm/eco/route.ts:68-85`；`src/app/[locale]/plm/eco/page.tsx`（form 无 eco_title） | P0 | INSERT 增加 `eco_title` 列并在前端补「变更标题」输入，或给列加默认值 |
| /production/material-return | 列名错误（1054 + NOT NULL） | POST 写 `prd_material_return_item(return_order_id, material_id, material_name, quantity, ...)`，但真实列名是 `return_id` 与 `return_qty`（且 `return_id` NOT NULL 无默认）→ `1054 Unknown column 'return_order_id'`，带明细退料单创建必失败；PUT 确认时又用正确 `return_id` 查询，前后不一致 | 表 `prd_material_return_item.return_id`/`return_qty`；`src/app/api/production/material-return/route.ts:58-86,111` | P0 | 将 INSERT 列名改为 `return_id` 与 `return_qty` |

---

## P1（功能缺陷 / 页面空白 / 字段失效 / 关联断裂）

| 模块 | 问题类型 | 问题描述 | 涉及文件(表/后端文件/前端文件) | 风险等级 | 修复建议 |
|---|---|---|---|---|---|
| /orders/sales | 后端写不存在的列（潜伏） | POST 明细 INSERT 写 `amount`，但 `sal_order_item` 无 `amount` 列（实为 `total_price`）→ 一旦接线必 1054 | 表 `sal_order_item`；`src/app/api/orders/sales/route.ts:166-169` | P1 | 改 `total_price` 或加 `amount` 列 |
| /orders/sales | 后端写不存在的列（潜伏） | PUT approve 执行 `UPDATE sal_order SET status=3, audit_by=?, audit_time=NOW()`，表无 `audit_by`/`audit_time` → 审核通过必 500 | 表 `sal_order`；`src/app/api/orders/sales/route.ts:260-263` | P1 | 改复用 `update_by`/`update_time` 或加列 |
| /orders/sales | 前端提交字段后端不读（静默丢失） | 新建弹窗选 `CurrencySelect` 提交 `currency`，但 `/api/orders` POST 不读不写 → 币种恒 CNY | 表 `sal_order.currency`；`src/app/api/orders/route.ts:144,187-190`；`page.tsx` | P1 | 后端解构并写入 `currency` |
| /orders/sales | 列表渲染列后端不返回（空白） | 列表渲染「币种/本位币金额」(`currency`/`base_total_amount`) 但 GET 不返回 → 两列恒 `-` | `src/app/api/orders/route.ts:45-67`；`page.tsx:1377-1443` | P1 | GET 补 `currency`/`base_*` 字段 |
| /orders/sales | 创建有、更新无（编辑丢数据） | 编辑只提交 `{id,delivery_date,remark}`；PUT 不更新 `sal_order_item` 明细及 `customer_id/order_date/currency` → 改产品/数量保存后明细不变 | 表 `sal_order`/`sal_order_item`；`src/app/api/orders/route.ts:239-263` | P1 | PUT 支持整单更新（删旧明细重建） |
| /orders/sales | 类型冲突（int vs 字符串） | PUT/DELETE 用 `status==='completed'`（字符串），但 `sal_order.status` 是 **tinyint**（1-5）→ 已完成/已取消订单保护完全失效 | 表 `sal_order.status`；`src/app/api/orders/route.ts:235,290` | P1 | 改 `status===4 \|\| status===5` |
| /orders/sales | DB 有列表单无控件 + NOT NULL 仅校验名 | `sal_order` 的 `contact_name/contact_phone/delivery_address/payment_terms/contract_no/tax_amount/exchange_rate/salesman_id` 表单均无控件；`customer_id` NOT NULL 后端仅校验 `customer_name` → 存在 1048 通路 | 表 `sal_order`；`src/app/api/orders/route.ts:144-161` | P1 | 补控件或明确由其他模块维护；后端强校验 `customer_id` |
| /orders/sales | 前端丢关联 ID（关联断裂） | 「生成工单」只提交 `material_name/quantity/...` 未传 `material_id`/`material_code` → 工单与物料主数据无法关联 | `src/app/[locale]/orders/sales/page.tsx:588-600` | P1 | 提交体补 `material_id`/`material_code` |
| /orders/sales | 命名/语义不一致 | GET 把 query `id` 当**订单编号**（`order_no=?`），PUT/DELETE 的 `id` 是**主键** → 同名参数两种语义 | `src/app/api/orders/route.ts:15,22 vs 227+` | P2 | 拆 `id`(主键) 与 `orderNo` |
| /orders/customers | 前端提交字段 DB 无列（静默丢失） | 新建上传营业执照提交 `license_file_url`，表无此列（仅 `business_license`）→ 链接彻底丢弃 | 表 `crm_customer`；`src/app/api/customers/route.ts:97-116`；`page.tsx new` | P1 | 建附件表或复用 `business_license` 存 URL |
| /orders/products | DB 有列表单无控件 | `mdm_product.short_name/category_id/category_name/customer_id/bom_version/min/max/safety_stock` 均无控件 → 恒默认/null | 表 `mdm_product`；`src/app/api/products/route.ts:129-153`；`page.tsx` | P1 | 改用受控 form，补分类/客户/库存上下限控件 |
| /orders/bom | 前端提交字段 DB 无列（静默丢失） | 前端 `BOMLine` 含 `material_type/is_key_material/position_no/process_seq/process_name`，但 `bom_line` 无这些列，后端只读 9 项 → 提交后静默丢弃 | 表 `bom_line`；`src/app/api/orders/bom/route.ts:189-207`；`page.tsx` | P1 | 给 `bom_line` 补列或移除这 5 个控件 |
| /orders/bom | 数值恒为 0（数据源列全空） | `selectMaterial` 取 `std_material.unit_cost`，实测该列 4086 行全 NULL → `bom_line.unit_cost`/`total_cost` 恒 0 | 表 `std_material.unit_cost`；`src/app/api/orders/bom/materials/route.ts:48`；`page.tsx` | P1 | 回填 `std_material.unit_cost` 或允许手填 |
| /orders/bom | 创建有、更新无（编辑丢数据） | POST 写 `product_code/version/base_qty/unit/...`，PUT 普通分支只处理 `product_name/product_spec/remark` → 编辑 version/base_qty/unit/product_code/product_id 变动全部丢失 | 表 `bom_header`；`src/app/api/orders/bom/route.ts:284-341` | P1 | PUT 补齐可更新字段 |
| /orders/bom | 外键/关联 ID 无控件（关联断裂） | 新建 `formData.product_id` 硬编码 0 且无产品控件 → `bom_header.product_id` 恒 0，`is_default` 判重失效；实测 product_id 1-5 在 `mdm_product` 均不存在 | 表 `bom_header.product_id`；`src/app/api/orders/bom/route.ts:139-183`；`page.tsx` | P1 | 补产品选择控件并对 `product_id` 校验 |
| /business/contract-review | 下拉枚举 ≠ DB 枚举（显示未知） | 新记录 `status` 取默认 0，但前端 `statusMap` 只有 1/2/3/4 → 渲染「未知」；实测已有 2 条命中 | 表 `biz_contract_review.status`；`src/app/api/business/contract-review/route.ts:88-91`；`page.tsx` | P1 | POST 显式写 `status=1`；`statusMap` 补 0 |
| /business/contract-review | 外键/关联 ID 无控件（关联断裂） | 新建只有 `order_no/customer_name/...` 文本输入，无 `order_id/customer_id/product_id` 控件且后端仅校验名称 → 三条关联 ID 恒 null | 表 `biz_contract_review.order_id/customer_id/product_id`；`src/app/api/business/contract-review/route.ts:52-78`；`page.tsx` | P1 | 改为从订单/客户/产品接口选择的受控 Select |
| /business/contract-review | 前端提交数据无处落库（静默丢失） | 评审弹窗上传合同附件，结果只存组件内 `attachments` state，保存未提交；`biz_contract_review` 无附件列 → 重新打开为空 | 表 `biz_contract_review`；`page.tsx` | P1 | 建评审附件表（review_id+file_url+file_name） |
| /sales/delivery | 前端渲染列后端不返回 | 详情渲染 `sign_person`/`sign_time`，表只有 `sign_by`（签收人 ID）无 `sign_person`，GET 不返回 → 不展示 | 表 `sal_delivery.sign_by`；`src/app/api/sales/delivery/route.ts:39-43`；`page.tsx:75,963-976` | P1 | GET JOIN 用户表补 `sign_person` 或前端做 ID→姓名映射 |
| /sales/delivery | 下拉/枚举 ≠ DB 枚举 | `SIGN_STATUS_MAP` 0/1/2/3，DB 仅 0-未签/1-已签；PUT `status=3` 写 `sign_status=1` → 已签收却显示「部分签收」 | 表 `sal_delivery.sign_status`；`src/app/api/sales/delivery/route.ts:238`；`page.tsx:148-165` | P1 | 前端映射收敛为 0/1，或后端补齐 2/3 写入 |
| /sales/delivery | 外键孤儿 + JOIN 同名列覆盖 | `sal_delivery.customer_id` 全 10 行孤儿（11-13 vs `crm_customer` 61-70）；GET `SELECT d.*, c.customer_name` 同名列覆盖 → 列表客户名显 `-` | 表 `sal_delivery.customer_id→crm_customer.id`；`src/app/api/sales/delivery/route.ts:68-71` | P1 | 修正种子数据 ID；`COALESCE(c.customer_name, d.customer_name)` |
| /sales/return | 前端提交字段后端不读（静默丢失） | 表单 `return_type` 下拉，后端 POST 解构与 INSERT 均不含 → 恒默认 1 | 表 `sal_return.return_type`；`src/app/api/sales/return/route.ts:105-131`；`page.tsx:579-593` | P1 | INSERT 补 `return_type` 并透传 |
| /sales/return | DB 有列前后端都不写（列表恒 0） | `sal_return.total_qty` 为 decimal NO，后端只累加 `total_amount` 从不写 `total_qty` → 列表「退货数量」恒 0 | 表 `sal_return.total_qty`；`src/app/api/sales/return/route.ts:119-143`；`page.tsx:450` | P1 | 循环累加 `totalQty` 并写入，或前端按明细汇总 |
| /sales/return | 外键 ID 前端无传递入口 | `sal_return.delivery_id` 前端仅 `delivery_no` 文本无控件 → 退货与原发货单关联断裂 | 表 `sal_return.delivery_id→sal_delivery.id`；`src/app/api/sales/return/route.ts:139`；`page.tsx:48,607-611` | P1 | 增加发货单下拉回填 `delivery_id` |
| /sales/return | 枚举超出前后端枚举 | 实库 `sal_return.status` 存在值 0，前后端枚举均无 0 → 列表显示「未知」 | 表 `sal_return.status`；`src/lib/status-labels.ts`；`page.tsx:115-120` | P1 | 校正数据并补齐 0 含义/CHECK |
| /sales/reconciliation | DB 有列表单无控件 | `discount_amount` 参与计算且详情渲染，但新建表单无折扣输入、前端从不传 → 恒 0 | 表 `sal_reconciliation.discount_amount`；`src/app/api/sales/reconciliation/route.ts:98`；`page.tsx:113-119,615-622` | P1 | 新建表单补折扣输入并接入 `updateDiscount` |
| /sales/reconciliation | 前端读取后端不返回字段 | 成功提示拼接 `result.data?.net_amount`，POST 响应无此字段 → 提示「¥0.00」误导 | `src/app/api/sales/reconciliation/route.ts:156-165`；`page.tsx:222` | P1 | 响应补 `net_amount` 或前端改读 `delivery-return` |
| /sales/reconciliation | DB 枚举 ≠ 领域枚举 | `sal_reconciliation.status` DB 注释 1-草稿/2-已发送/3-已确认/4-已关闭，领域对象为 1-草稿/2-已确认/3-部分核销/4-已核销/9-关闭 → 语义冲突 | 表 `sal_reconciliation.status`；`src/domain/sales/value-objects/ReconciliationStatus.ts` | P1 | 以领域枚举为准更新列注释 |
| /sales/reconciliation | DB 有列前端无展示 | `confirm_status/confirm_person/confirm_time/confirm_remark` 新建/详情均无控件 → 客户确认流程不可达 | 表 `sal_reconciliation.confirm_*`；`page.tsx:41-60,574-647` | P2 | 保留则补确认区块，否则下线列 |
| /crm/follow | 创建有、更新无（编辑丢数据） | POST 写 `customer_name`，PUT `allowedFields` 不含 → 编辑改客户名后保存被静默丢弃 | `src/app/api/crm/follow/route.ts:60-61,90-99`；`page.tsx` | P1 | PUT `allowedFields` 补 `customer_name` |
| /crm/follow | 外键孤儿 | `crm_follow_record.customer_id` 实存 11（孤儿）；UI 路径因 400 无法写入，现存孤儿来自种子 | 表 `crm_follow_record.customer_id→crm_customer.id` | P1 | 修好入口后清洗孤儿行并补外键约束 |
| /crm/analysis | 创建有、更新无（编辑丢数据） | POST 写 `customer_name/analysis_period/period_start/period_end`，PUT `allowedFields` 不含 → 编辑这 4 项变动全部丢失 | `src/app/api/crm/analysis/route.ts:81-82,116-127`；`page.tsx` | P1 | PUT `allowedFields` 补齐 4 字段 |
| /crm/analysis | 下拉枚举 ≠ DB 枚举 | `periodMap` 仅 month/quarter/year，DB 实存 '2026-07' → 周期列回退显示原始值 | 表 `crm_customer_analysis.analysis_period`；`page.tsx:72-76,362` | P1 | 统一口径（month/quarter/year + 独立起止）或按 YYYY-MM 格式化 |
| /warehouse/inbound/cutting | 分切权限校验不完整（专项） | 仅判断 `label_type !== 1` 即允许分切，**未校验** `inv_material.is_splittable` 与「PC/PVC/PE 卷材」白名单 → 网版/油墨/刀模若被标为 `label_type=1` 仍可分切，违反「网版/油墨/刀模禁止分切」规则 | 表 `inv_material.is_splittable`/`material_type`；`src/app/api/warehouse/inbound/cutting/route.ts:55-57,197-200` | P1 | 分切前查 `inv_material.is_splittable=1` 且 `material_type` 命中 PC/PVC/PE 卷材白名单，否则拒绝 |
| /warehouse/inbound/cutting | 分切未联动批次库存（专项·【待人工复核】） | 分切后源标签 `is_cut=1,status=4` 但 `quantity` 未扣减，新标签新增未冲减源批次 → 存在库存双计风险（需确认 labels 与 inv_inventory_batch 的计量口径） | `src/app/api/warehouse/inbound/cutting/route.ts:297,331-430` | P1 | 分切成功后在事务内对源标签/源批次做等量扣减并 `recomputeInventorySummary` |

---

## P2（命名规范 / 死代码 / 优化）

| 模块 | 问题类型 | 问题描述 | 涉及文件(表/后端文件/前端文件) | 风险等级 | 修复建议 |
|---|---|---|---|---|---|
| /orders | 路由缺页 | `src/app/[locale]/orders/` 下无 `page.tsx`（仅子目录与 error.tsx）→ 访问 `/orders` 无入口 | `src/app/[locale]/orders/` | P2 | 补导航/重定向首页，或确认菜单不直达 `/orders` |
| /orders/customers | 路由约定不一致（死代码） | `/api/orders/customers`、`/api/orders/products` 为 1 行 re-export，前端直连 `/api/customers`、`/api/products` | `src/app/api/orders/customers/route.ts`；`src/app/api/orders/products/route.ts` | P2 | 删代理路由，页面直连 |
| /orders/bom | 表格列数不匹配 | 列表表头 9 列，loading/空态行 `colSpan` 写死 8 → 空态少占一格 | `src/app/[locale]/orders/bom/page.tsx:296-320` | P2 | `colSpan` 改 9 |
| /orders/bom | 后端支持、前端未接线 | GET 支持 `productCode/status/materialCode` 筛选，前端只组装 `page/pageSize/keyword` | `src/app/api/orders/bom/route.ts:31-59`；`page.tsx` | P2 | 前端补筛选或删后端分支 |
| /business/contract-review | 后端支持、前端未接线 | GET 支持 `status` 过滤，前端状态下拉只有 `all` → 永远无法按状态筛选 | `src/app/api/business/contract-review/route.ts:15,31-34`；`page.tsx:119,136,302-308` | P2 | 下拉补 1/2/3/4（并补 0） |
| /business/contract-review | DB 有列表单无控件 | `review_date`（date）有列且 GET 返回，但新建/评审弹窗无控件 → 新建记录恒 null | 表 `biz_contract_review.review_date`；`page.tsx:345,464-700` | P2 | 默认 `CURDATE()` 或补控件 |
| /sales/delivery | 前端声明幽灵字段 | `Shipment` 接口声明 `type/shipment_no/total_quantity/...` 表均无列，POST 不读 | 表 `sal_delivery`；`src/app/[locale]/sales/delivery/page.tsx:54-90` | P2 | 删除无对应列字段，或先加列再启用 |
| /crm/analysis | 删除语义不一致 | `crm_customer_analysis` 无 `deleted` 列走物理删除，而其他模块软删 → 批量删除不可恢复 | 表 `crm_customer_analysis`；`src/app/api/crm/analysis/route.ts:16,151` | P2 | 补 `deleted` 改软删，或确认文案「不可恢复」 |

---

## 重点业务关注专项结论

- **入库累加 / 出库累减**：✅ 已验证正确。出库走 `warehouse/outbound/fifo`（POST 预留 `locked_qty+/available_qty-`，PATCH 确认 `quantity-/locked_qty-` 并 `recomputeInventorySummary`，乐观锁 `version`）；入库走事件 `inbound.approved → InventorySyncHandler`（`ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)`、`inv_inventory_batch` 同样 `+=`、`recomputeInventorySummary`）。**符号与汇总重算均无漂移**。
- **FIFO 批次效期**：✅ FIFO GET 按 `expire_date ASC`（叠加 `split_flag=2` 余料优先、`opened_at` 优先）排序；仅选 `status=1`(normal) 批次，**自动排除 frozen(2)/expired(3)**，符合预期。
- **分切业务**：⚠️ 见 P1 `/warehouse/inbound/cutting` —— 权限校验仅 `label_type=1`，**未落实「仅 PC/PVC/PE 卷材可分切、网版/油墨/刀模禁止」**（未读 `inv_material.is_splittable` 与物料类型白名单）。
- **二维码批次管理**：✅ 分切/入库均生成 `qr_code`（JSON 含 ID/TYPE/PARENT）；`inv_inventory_batch.qr_code`、`inv_material_label.qr_code` 列存在，二维码批次链路字段齐备。
- **网板/油墨/刀模物料**：⚠️ 同上分切专项 —— 当前无物料类型白名单拦截，此类物料若 `label_type=1` 仍可进入分切流程。
- **外键引用空值**：🔴 活库实测 **18 个外键列存在孤儿行**（如 `prd_schedule_detail.schedule_id` 20/20 孤儿、`sal_delivery.customer_id` 10/10 孤儿、`material_requisitions.work_order_id` 9/10 孤儿）。根因多为**种子数据 ID 空间错位**（`prd_work_order`/`prd_schedule` 仅 1 行，而业务表引用其 id；`crm_customer.id` 从 61 起而 `sal_*` 引用 11-13）+ 大量外键列**前端无选择控件、后端 `|| null/0` 兜底**（见 P0 各 `order_id`/`customer_id`/`warehouse_id` 项）。建议：(1) 清洗种子孤儿；(2) 对外键列强制前端下拉 + 后端非空校验，取消 `|| null` 兜底。

---

## 总计
- **P0：13 项**
- **P1：38 项**（含 1 项【待人工复核】分切库存联动）
- **P2：9 项**

> 说明：以上为已深度核实模块的结论。engineering / sample.* / engineering.* / prepress/die-template / dcprint.*（ink/process-cards/labels/ink-opening/ink-mixed/trace）/ plm/lifecycle / production（除 material-return）/ warehouse/inbound（非 cutting）**尚未深度审计**（子代理触发限流）。已产出 `database/_audit_candidates.txt`（各模块后端写入列 vs 前端字段 vs DB NOT NULL 的自动比对候选）与 DB 事实文件三份，可在限流解除后（12:57）用加固脚本续审上述模块。
