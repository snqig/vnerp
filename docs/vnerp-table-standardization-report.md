# vnerp 项目列表组件标准化评估报告

> 生成时间：2026-09-28
> 扫描范围：src/app 全目录（本地源码）

---

## 一、总体统计

| 指标 | 数量 |
|------|------|
| 已使用 StandardTable 页面 | 38 处 |
| 仍使用 useRowSelection + shadcn Table 页面 | 57 处 |
| **业务列表总数** | **95 处** |

---

## 二、现存问题汇总

### 2.1 表格视觉样式不统一

- 约 60% 页面使用原生 `<input type="checkbox">` 作为勾选框（非 shadcn Checkbox 组件）
- 表头字体大小不一致：部分用 `text-xs`，部分无明确样式
- 空数据状态文案不统一：`noRecords` / `noData` / 硬编码「暂无数据」混用
- 分页栏样式不统一：部分手写 div，部分使用 Button 组件，间距不一致

### 2.2 列表选择交互不统一

- **部分列表无全局总选**：仅支持单行独立勾选，无表头全选复选框
- **部分列表总选仅控制当前页**：翻页后未同步清空已勾选状态，存在跨页误勾风险
- **半选（indeterminate）状态缺失**：表头复选框无法表达「部分选中」状态
- 勾选实现方式不一致：原生 `<input>` vs shadcn `<Checkbox>`，API 和样式不统一
- 批量删除工具栏（BatchDeleteBar）接入程度不同，部分页面有但样式各异

### 2.3 分页能力缺失

- 固定每页 20 条，无可调整每页条数下拉
- 缺少「每页条数选择器」（20/25/30 选项）
- 缺少「共 XX 条，共 XX 页」总览文案
- 不支持手动输入页码跳转
- 上一页/下一页按钮 disabled 逻辑不统一（部分用 `page * 20 >= total`，部分用其他判断）

### 2.4 表头排序逻辑不统一

- 约 85% 页面无排序功能
- 少数页面使用 `SortableTableHeader` + `useTableSort`，但 UI 样式与 StandardTable 内置排序不一致
- 无统一的排序箭头图标展示规范

### 2.5 文字硬编码 / 国际化不完整

- 组件内置文案（分页、空数据、全选等）部分硬编码中文，未接入 i18n
- 已有 i18n 的页面使用 `useTranslations` + message JSON，但 key 命名不规范（如 `k_1dfoqke` 等模糊 key）
- 各语言文件（zh-CN / en / vi / zh-TW）覆盖不全

---

## 三、待迁移页面清单（57 处）

### ✅ 少量调整即可适配（已有分页 UI，直接替换为 StandardTable）

| 路由 | 文件路径 | 批量删除 | 排序 |
|------|----------|----------|------|
| [locale]/finance/receivable | `[locale]/finance/receivable/page.tsx` | ✅ | ❌ |
| [locale]/equipment/calibration | `[locale]/equipment/calibration/page.tsx` | ✅ | ❌ |
| [locale]/equipment/repair | `[locale]/equipment/repair/page.tsx` | ✅ | ❌ |
| [locale]/equipment/maintenance | `[locale]/equipment/maintenance/page.tsx` | ✅ | ❌ |
| [locale]/warehouse/production-inbound | `[locale]/warehouse/production-inbound/page.tsx` | ✅ | ❌ |
| [locale]/warehouse/outbound | `[locale]/warehouse/outbound/page.tsx` | ✅ | ❌ |
| [locale]/purchase/orders | `[locale]/purchase/orders/page.tsx` | ✅ | ❌ |
| [locale]/purchase/suppliers | `[locale]/purchase/suppliers/page.tsx` | ✅ | ❌ |
| [locale]/dcprint/ink | `[locale]/dcprint/ink/page.tsx` | ✅ | ❌ |
| [locale]/dcprint/ink-mixed | `[locale]/dcprint/ink-mixed/page.tsx` | ✅ | ❌ |
| [locale]/orders/sales | `[locale]/orders/sales/page.tsx` | ✅ | ❌ |
| [locale]/orders/products | `[locale]/orders/products/page.tsx` | ✅ | ❌ |
| [locale]/orders/customers | `[locale]/orders/customers/page.tsx` | ✅ | ❌ |
| [locale]/hr/salary | `[locale]/hr/salary/page.tsx` | ✅ | ❌ |
| [locale]/hr/employee | `[locale]/hr/employee/page.tsx` | ✅ | ❌ |
| [locale]/hr/training | `[locale]/hr/training/page.tsx` | ✅ | ❌ |
| [locale]/hr/schedules | `[locale]/hr/schedules/page.tsx` | ✅ | ❌ |
| [locale]/hr/performance | `[locale]/hr/performance/page.tsx` | ✅ | ❌ |
| [locale]/hr/certificates | `[locale]/hr/certificates/page.tsx` | ✅ | ❌ |
| [locale]/hr/attendance | `[locale]/hr/attendance/page.tsx` | ✅ | ❌ |
| (dashboard)/equipment/inspection | `(dashboard)/equipment/inspection/page.tsx` | ✅ | ❌ |
| (dashboard)/equipment/document | `(dashboard)/equipment/document/page.tsx` | ✅ | ❌ |
| (dashboard)/equipment/spare-issue | `(dashboard)/equipment/spare-issue/page.tsx` | ✅ | ❌ |
| (dashboard)/equipment/spare-part | `(dashboard)/equipment/spare-part/page.tsx` | ✅ | ❌ |
| [locale]/quality/incoming | `[locale]/quality/incoming/page.tsx` | ✅ | ❌ |
| [locale]/quality/process | `[locale]/quality/process/page.tsx` | ✅ | ❌ |
| [locale]/quality/final | `[locale]/quality/final/page.tsx` | ✅ | ❌ |
| [locale]/quality/sgs | `[locale]/quality/sgs/page.tsx` | ✅ | ❌ |
| [locale]/quality/lab-test | `[locale]/quality/lab-test/page.tsx` | ✅ | ❌ |
| [locale]/equipment/scrap | `[locale]/equipment/scrap/page.tsx` | ✅ | ❌ |

### 🔧 需要改造（样式差异较大，需适配 StandardTable columns 配置）

| 路由 | 文件路径 | 特殊点 |
|------|----------|--------|
| [locale]/crm/follow | `[locale]/crm/follow/page.tsx` | 有 StatsCards，需保留 |
| [locale]/crm/analysis | `[locale]/crm/analysis/page.tsx` | 有 StatsCards，需保留 |
| [locale]/outsource/order | `[locale]/outsource/order/page.tsx` | 需确认 rowSelectable |
| [locale]/outsource/receive | `[locale]/outsource/receive/page.tsx` | 需确认 rowSelectable |
| [locale]/outsource/issue | `[locale]/outsource/issue/page.tsx` | 需确认 rowSelectable |
| [locale]/outsource/settlement | `[locale]/outsource/settlement/page.tsx` | 需确认 rowSelectable |
| [locale]/qrcode | `[locale]/qrcode/page.tsx` | 需确认 rowSelectable |
| [locale]/production/workorder | `[locale]/production/workorder/page.tsx` | 需确认 rowSelectable |
| [locale]/production/schedule | `[locale]/production/schedule/page.tsx` | 需确认 rowSelectable |
| [locale]/production/report | `[locale]/production/report/page.tsx` | 需确认 rowSelectable |
| [locale]/engineering/sample-to-mass | `[locale]/engineering/sample-to-mass/page.tsx` | 需确认 rowSelectable |
| [locale]/engineering/sop | `[locale]/engineering/sop/page.tsx` | 需确认 rowSelectable |
| [locale]/sample/standard-card | `[locale]/sample/standard-card/page.tsx` | ⚠️ 手写 HTML table，需完全重写 |
| [locale]/sample/orders | `[locale]/sample/orders/page.tsx` | ⚠️ 手写 HTML table，需完全重写 |
| [locale]/sample/management | `[locale]/sample/management/page.tsx` | ⚠️ 手写 HTML table，需完全重写 |
| [locale]/prepress/die-template | `[locale]/prepress/die-template/page.tsx` | 需确认 rowSelectable |
| [locale]/sales/return | `[locale]/sales/return/page.tsx` | 需确认 rowSelectable |
| [locale]/sales/reconciliation | `[locale]/sales/reconciliation/page.tsx` | 需确认 rowSelectable |
| [locale]/sales/delivery | `[locale]/sales/delivery/page.tsx` | 需确认 rowSelectable |
| [locale]/business/contract-review | `[locale]/business/contract-review/page.tsx` | 需确认 rowSelectable |
| [locale]/srm/evaluation | `[locale]/srm/evaluation/page.tsx` | 需确认 rowSelectable |
| [locale]/plm/lifecycle | `[locale]/plm/lifecycle/page.tsx` | 需确认 rowSelectable |
| [locale]/purchase/request | `[locale]/purchase/request/page.tsx` | 需确认 rowSelectable |
| [locale]/quality/supplier-audit | `[locale]/quality/supplier-audit/page.tsx` | 已有 SortableTableHeader，需替换 |

---

## 四、改造工作量评估

| 改造等级 | 数量 | 预估工作量 |
|----------|------|-----------|
| ✅ 少量调整 | 30 处 | 每页 15-25 分钟（替换 Table 段，保留业务逻辑） |
| 🔧 需要改造 | 18 处 | 每页 25-40 分钟（需适配 columns 配置） |
| ❌ 完全重写 | 3 处 | 每页 40-60 分钟（手写 HTML → StandardTable） |
| **合计** | **51 处** | 约 18-30 小时 |

> 注：实际改造中 24 个 (dashboard) 和 [locale] 目录页面可同时并行改造。

---

## 五、优先级排序

### 第一批次（最高优先级，业务高频页面）
1. `[locale]/orders/sales` — 销售订单
2. `[locale]/orders/products` — 产品管理
3. `[locale]/orders/customers` — 客户管理
4. `[locale]/purchase/orders` — 采购订单
5. `[locale]/purchase/suppliers` — 供应商管理
6. `[locale]/finance/receivable` — 应收账款
7. `[locale]/warehouse/outbound` — 出库管理
8. `[locale]/warehouse/production-inbound` — 生产入库

### 第二批次（次高优先级，日常管理页面）
9-16. crm/follow, crm/analysis, hr/*, equipment/* 系列

### 第三批次（质量/生产/外协系列）
17-24. quality/*, production/*, outsource/* 系列

### 第四批次（低频/特殊页面）
25-30. sample/*, prepress/*, sales/*, business/*, srm/*, plm/* 系列

---

## 六、StandardTable 组件现状

- **位置**：`src/components/common/standard-table.tsx`
- **状态**：✅ 已完成，功能完整
- **测试**：`standard-table.test.tsx`，21 项测试全部通过
- **i18n**：已接入 `StandardTable` 命名空间，覆盖 zh-CN / en / vi / zh-TW 四语言
- **Props 支持**：rowSelectable / selectedRows / onRowSelectedChange / onPageChange / onSortChange / customStyle / showPagination 等
