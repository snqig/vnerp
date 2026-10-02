# vnerp 项目现有列表清单

> 扫描口径：本地源码 `src/`，检索 `<Table` / `<table` / `pagination` / `pageSize`，
> 仅统计 `src/app/**/page.tsx` 业务页面（组件内部件单独列出）。
> 生成时间：2026-09-27

## 汇总

| 指标 | 数量 |
| --- | --- |
| 含表格的业务页面 | 152 |
| 含表格的文件总数（含组件） | 170 |
| ✅ 少量调整即可 | 15 |
| 🔧 需要改造 | 125 |
| ❌ 完全重写（手写 table） | 11 |

### 按模块分布

| 模块 | 列表数 | ✅ | 🔧 | ❌ |
| --- | --: | --: | --: | --: |
| warehouse | 13 | 5 | 7 | 1 |
| orders | 6 | 2 | 4 | 0 |
| production | 8 | 2 | 6 | 0 |
| quality | 10 | 0 | 10 | 0 |
| finance | 12 | 4 | 7 | 1 |
| purchase | 7 | 0 | 6 | 1 |
| (dashboard) | 5 | 0 | 5 | 0 |
| dcprint | 13 | 0 | 13 | 0 |
| equipment | 6 | 0 | 6 | 0 |
| sales | 4 | 0 | 4 | 0 |
| sample | 9 | 0 | 4 | 5 |
| hr | 19 | 1 | 17 | 0 |
| crm | 2 | 0 | 2 | 0 |
| engineering | 2 | 0 | 2 | 0 |
| outsource | 4 | 0 | 4 | 0 |
| base-data | 1 | 0 | 1 | 0 |
| delivery | 1 | 0 | 1 | 0 |
| material-requisitions | 1 | 0 | 1 | 0 |
| plm | 2 | 0 | 2 | 0 |
| business | 1 | 0 | 1 | 0 |
| srm | 1 | 0 | 1 | 0 |
| prepress | 1 | 0 | 1 | 0 |
| dashboard | 3 | 0 | 1 | 2 |
| analysis | 1 | 0 | 1 | 0 |
| reports | 1 | 0 | 1 | 0 |
| settings | 14 | 0 | 14 | 0 |
| tools | 1 | 0 | 1 | 0 |
| monitoring | 1 | 0 | 1 | 0 |
| qrcode | 1 | 0 | 1 | 0 |
| advanced | 1 | 1 | 0 | 0 |
| [locale] | 1 | 0 | 0 | 1 |

## 明细清单

列说明：`等级` ✅少量调整 / 🔧需改造 / ❌完全重写；`缺口` 列出与 StandardTable 标准的差距。

| # | 路由 | 文件相对路径 | 等级 | 表格形态 | 勾选(顶部总选/单行/半选) | 分页(每页下拉/页码跳转/总条数) | 排序 | i18n | 行数 | 缺口 |
| --: | --- | --- | :--: | --- | --- | --- | --- | --- | --: | --- |
| 1 | `/finance/cost-analysis` | `src/app/[locale]/finance/cost-analysis/page.tsx` | ❌ | 页面手写 `<table>` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(34) | 434 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 2 | `/dashboard/quality` | `src/app/[locale]/dashboard/quality/page.tsx` | ❌ | 页面手写 `<table>` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(19) | 703 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 3 | `/dashboard/sales` | `src/app/[locale]/dashboard/sales/page.tsx` | ❌ | 页面手写 `<table>` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(13) | 525 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 4 | `/purchase/request/form` | `src/app/[locale]/purchase/request/form/page.tsx` | ❌ | 页面手写 `<table>` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 1223 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 5 | `/sample/standard-card/print` | `src/app/[locale]/sample/standard-card/print/page.tsx` | ❌ | 页面手写 `<table>` | **无总选** / 单行勾选✔ / 半选✘ | **无pageSize** / 跳转✔ / 总数✘ | **无** | 已接入(0) | 1106 | 总选、半选态、分页参数、总条数/总页数、排序 |
| 6 | `/[locale]` | `src/app/[locale]/page.tsx` | ❌ | 页面手写 `<table>` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(34) | 600 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 7 | `/sample/standard-card/input-card` | `src/app/[locale]/sample/standard-card/input-card/page.tsx` | ❌ | 页面手写 `<table>` | **无总选** / 单行勾选✔ / 半选✘ | 有pageSize / 跳转✔ / 总数✘ | **无** | 已接入(0) | 1135 | 总选、半选态、总条数/总页数、排序 |
| 8 | `/warehouse/outbound` | `src/app/[locale]/warehouse/outbound/page.tsx` | ❌ | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(119) | 2027 | 页码跳转、总条数/总页数、排序 |
| 9 | `/sample/standard-card` | `src/app/[locale]/sample/standard-card/page.tsx` | ❌ | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✔ | **无** | 已接入(40) | 643 | 页码跳转、排序 |
| 10 | `/sample/management` | `src/app/[locale]/sample/management/page.tsx` | ❌ | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✔ | 有 | 已接入(44) | 792 | 页码跳转 |
| 11 | `/sample/orders` | `src/app/[locale]/sample/orders/page.tsx` | ❌ | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✔ | 有 | 已接入(72) | 879 | 页码跳转 |
| 12 | `/orders/bom/edit/[id]` | `src/app/[locale]/orders/bom/edit/[id]/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✔ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(61) | 699 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 13 | `/production/mrp` | `src/app/[locale]/production/mrp/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✔ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(84) | 1058 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 14 | `/quality/spc` | `src/app/[locale]/quality/spc/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 1254 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 15 | `/warehouse/setup` | `src/app/[locale]/warehouse/setup/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(42) | 665 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 16 | `/(dashboard)/equipment/status` | `src/app/(dashboard)/equipment/status/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 442 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 17 | `/dcprint/process-cards` | `src/app/[locale]/dcprint/process-cards/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(47) | 541 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 18 | `/dcprint/trace` | `src/app/[locale]/dcprint/trace/page.tsx` | 🔧 | 页面手写 `<table>` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 578 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 19 | `/equipment` | `src/app/[locale]/equipment/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 468 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 20 | `/finance/aging-report` | `src/app/[locale]/finance/aging-report/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(11) | 213 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 21 | `/purchase/request/[id]` | `src/app/[locale]/purchase/request/[id]/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 360 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 22 | `/hr/certificates/expiring` | `src/app/[locale]/hr/certificates/expiring/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(16) | 254 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 23 | `/hr/mes-sync` | `src/app/[locale]/hr/mes-sync/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(20) | 217 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 24 | `/hr/reports/labor-cost` | `src/app/[locale]/hr/reports/labor-cost/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(19) | 316 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 25 | `/hr/reports/salary-structure` | `src/app/[locale]/hr/reports/salary-structure/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(7) | 157 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 26 | `/hr/reports/turnover` | `src/app/[locale]/hr/reports/turnover/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(15) | 187 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 27 | `/hr/salary/bank-report` | `src/app/[locale]/hr/salary/bank-report/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(15) | 185 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 28 | `/hr/salary/calculate` | `src/app/[locale]/hr/salary/calculate/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(42) | 233 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 29 | `/hr/salary/piece-rate` | `src/app/[locale]/hr/salary/piece-rate/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(2) | 126 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 30 | `/hr/salary/piece-work` | `src/app/[locale]/hr/salary/piece-work/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(4) | 165 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 31 | `/sample/progress` | `src/app/[locale]/sample/progress/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 247 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 32 | `/sample/standard-card/input-v2` | `src/app/[locale]/sample/standard-card/input-v2/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | **未接入** | 1000 | 总选、半选态、页码跳转、总条数/总页数、排序、i18n |
| 33 | `/analysis/db-relations` | `src/app/[locale]/analysis/db-relations/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 394 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 34 | `/dashboard` | `src/app/[locale]/dashboard/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(47) | 504 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 35 | `/reports` | `src/app/[locale]/reports/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(105) | 628 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 36 | `/settings/currency` | `src/app/[locale]/settings/currency/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 289 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 37 | `/settings/dict` | `src/app/[locale]/settings/dict/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(9) | 429 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 38 | `/settings/label-template` | `src/app/[locale]/settings/label-template/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(23) | 317 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 39 | `/settings/menus` | `src/app/[locale]/settings/menus/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(4) | 440 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 40 | `/warehouse` | `src/app/[locale]/warehouse/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(56) | 629 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 41 | `/dcprint/die` | `src/app/[locale]/dcprint/die/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 357 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 42 | `/dcprint/ink-formula` | `src/app/[locale]/dcprint/ink-formula/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(2) | 491 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 43 | `/dcprint/ink-opening` | `src/app/[locale]/dcprint/ink-opening/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 711 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 44 | `/dcprint/ink-usage` | `src/app/[locale]/dcprint/ink-usage/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 387 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 45 | `/dcprint/labels` | `src/app/[locale]/dcprint/labels/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✔ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(33) | 624 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 46 | `/dcprint/process-card` | `src/app/[locale]/dcprint/process-card/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(2) | 348 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 47 | `/dcprint/screen-plate` | `src/app/[locale]/dcprint/screen-plate/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 615 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 48 | `/dcprint/tool-manage` | `src/app/[locale]/dcprint/tool-manage/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(2) | 488 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 49 | `/dcprint/tool` | `src/app/[locale]/dcprint/tool/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 1201 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 50 | `/finance/cost-detail` | `src/app/[locale]/finance/cost-detail/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(19) | 243 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 51 | `/finance/costs` | `src/app/[locale]/finance/costs/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 209 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 52 | `/finance` | `src/app/[locale]/finance/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(10) | 1362 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 53 | `/finance/receivables` | `src/app/[locale]/finance/receivables/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(8) | 193 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 54 | `/finance/report` | `src/app/[locale]/finance/report/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(11) | 287 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 55 | `/purchase/orders/[id]` | `src/app/[locale]/purchase/orders/[id]/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(19) | 658 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 56 | `/purchase/return` | `src/app/[locale]/purchase/return/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(7) | 678 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 57 | `/sales/orders/[id]` | `src/app/[locale]/sales/orders/[id]/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(15) | 724 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 58 | `/sample/standard-card/input` | `src/app/[locale]/sample/standard-card/input/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✔ / 总数✘ | **无** | **未接入** | 1312 | 总选、半选态、总条数/总页数、排序、i18n |
| 59 | `/base-data/material-category` | `src/app/[locale]/base-data/material-category/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(30) | 577 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 60 | `/delivery/vehicles` | `src/app/[locale]/delivery/vehicles/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(20) | 318 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 61 | `/material-requisitions` | `src/app/[locale]/material-requisitions/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(63) | 462 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 62 | `/plm/eco` | `src/app/[locale]/plm/eco/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(31) | 457 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 63 | `/settings/announcement` | `src/app/[locale]/settings/announcement/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(2) | 423 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 64 | `/settings/config` | `src/app/[locale]/settings/config/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(6) | 952 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 65 | `/settings/exchange-rate` | `src/app/[locale]/settings/exchange-rate/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 274 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 66 | `/settings/login-log` | `src/app/[locale]/settings/login-log/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(1) | 170 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 67 | `/settings/notice` | `src/app/[locale]/settings/notice/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(3) | 279 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 68 | `/settings/oper-log` | `src/app/[locale]/settings/oper-log/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(1) | 172 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 69 | `/settings/organization` | `src/app/[locale]/settings/organization/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 1330 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 70 | `/settings/scheduler` | `src/app/[locale]/settings/scheduler/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(23) | 430 | 总选、半选态、页码跳转、总条数/总页数、排序 |
| 71 | `/tools/uploader` | `src/app/[locale]/tools/uploader/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 380 | 半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 72 | `/warehouse/production-inbound` | `src/app/[locale]/warehouse/production-inbound/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(3) | 380 | 分页参数、页码跳转、总条数/总页数、排序 |
| 73 | `/sales/reconciliation` | `src/app/[locale]/sales/reconciliation/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(49) | 678 | 分页参数、页码跳转、总条数/总页数、排序 |
| 74 | `/sales/return` | `src/app/[locale]/sales/return/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(52) | 830 | 分页参数、页码跳转、总条数/总页数、排序 |
| 75 | `/hr/performance` | `src/app/[locale]/hr/performance/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(14) | 305 | 分页参数、页码跳转、总条数/总页数、排序 |
| 76 | `/hr/schedules` | `src/app/[locale]/hr/schedules/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(19) | 322 | 分页参数、页码跳转、总条数/总页数、排序 |
| 77 | `/sample/standard-card/template` | `src/app/[locale]/sample/standard-card/template/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✔ | **无** | 已接入(0) | 385 | 总选、半选态、页码跳转、排序 |
| 78 | `/monitoring/consistency` | `src/app/[locale]/monitoring/consistency/page.tsx` | 🔧 | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✔ | **无** | 已接入(38) | 552 | 总选、半选态、页码跳转、排序 |
| 79 | `/settings/roles` | `src/app/[locale]/settings/roles/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(1) | 907 | 半选态、页码跳转、总条数/总页数、排序 |
| 80 | `/settings/user` | `src/app/[locale]/settings/user/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(6) | 625 | 半选态、页码跳转、总条数/总页数、排序 |
| 81 | `/production/material-issue` | `src/app/[locale]/production/material-issue/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(23) | 432 | 页码跳转、总条数/总页数、排序 |
| 82 | `/production/material-return` | `src/app/[locale]/production/material-return/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(18) | 363 | 页码跳转、总条数/总页数、排序 |
| 83 | `/production/report` | `src/app/[locale]/production/report/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(88) | 1039 | 页码跳转、总条数/总页数、排序 |
| 84 | `/production/schedule` | `src/app/[locale]/production/schedule/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(134) | 1553 | 页码跳转、总条数/总页数、排序 |
| 85 | `/production/workorder` | `src/app/[locale]/production/workorder/page.tsx` | 🔧 | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | 有 | 已接入(126) | 1118 | 分页参数、页码跳转、总条数/总页数 |
| 86 | `/quality/final` | `src/app/[locale]/quality/final/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | 有 | 已接入(106) | 1132 | 分页参数、页码跳转、总条数/总页数 |
| 87 | `/quality/process` | `src/app/[locale]/quality/process/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | 有 | 已接入(104) | 1270 | 分页参数、页码跳转、总条数/总页数 |
| 88 | `/warehouse/batch` | `src/app/[locale]/warehouse/batch/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✘ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(57) | 670 | 页码跳转、总条数/总页数、排序 |
| 89 | `/warehouse/sales-outbound` | `src/app/[locale]/warehouse/sales-outbound/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(6) | 435 | 页码跳转、总条数/总页数、排序 |
| 90 | `/warehouse/stock-adjust` | `src/app/[locale]/warehouse/stock-adjust/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(42) | 469 | 页码跳转、总条数/总页数、排序 |
| 91 | `/warehouse/stocktaking` | `src/app/[locale]/warehouse/stocktaking/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(69) | 764 | 页码跳转、总条数/总页数、排序 |
| 92 | `/(dashboard)/equipment/document` | `src/app/(dashboard)/equipment/document/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 481 | 页码跳转、总条数/总页数、排序 |
| 93 | `/(dashboard)/equipment/inspection` | `src/app/(dashboard)/equipment/inspection/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 602 | 页码跳转、总条数/总页数、排序 |
| 94 | `/(dashboard)/equipment/spare-issue` | `src/app/(dashboard)/equipment/spare-issue/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 534 | 页码跳转、总条数/总页数、排序 |
| 95 | `/(dashboard)/equipment/spare-part` | `src/app/(dashboard)/equipment/spare-part/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 462 | 页码跳转、总条数/总页数、排序 |
| 96 | `/dcprint/ink-mixed` | `src/app/[locale]/dcprint/ink-mixed/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 628 | 页码跳转、总条数/总页数、排序 |
| 97 | `/equipment/calibration` | `src/app/[locale]/equipment/calibration/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 461 | 页码跳转、总条数/总页数、排序 |
| 98 | `/equipment/inspection` | `src/app/[locale]/equipment/inspection/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 650 | 页码跳转、总条数/总页数、排序 |
| 99 | `/equipment/maintenance` | `src/app/[locale]/equipment/maintenance/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 984 | 页码跳转、总条数/总页数、排序 |
| 100 | `/equipment/repair` | `src/app/[locale]/equipment/repair/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 463 | 页码跳转、总条数/总页数、排序 |
| 101 | `/equipment/scrap` | `src/app/[locale]/equipment/scrap/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 433 | 页码跳转、总条数/总页数、排序 |
| 102 | `/finance/receivable` | `src/app/[locale]/finance/receivable/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(30) | 526 | 页码跳转、总条数/总页数、排序 |
| 103 | `/sales/delivery` | `src/app/[locale]/sales/delivery/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(37) | 979 | 页码跳转、总条数/总页数、排序 |
| 104 | `/crm/analysis` | `src/app/[locale]/crm/analysis/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(45) | 572 | 页码跳转、总条数/总页数、排序 |
| 105 | `/crm/follow` | `src/app/[locale]/crm/follow/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(32) | 513 | 页码跳转、总条数/总页数、排序 |
| 106 | `/engineering/sample-to-mass` | `src/app/[locale]/engineering/sample-to-mass/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(33) | 560 | 页码跳转、总条数/总页数、排序 |
| 107 | `/engineering/sop` | `src/app/[locale]/engineering/sop/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(45) | 573 | 页码跳转、总条数/总页数、排序 |
| 108 | `/hr/employee` | `src/app/[locale]/hr/employee/page.tsx` | 🔧 | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(66) | 1587 | 页码跳转、总条数/总页数、排序 |
| 109 | `/hr/training` | `src/app/[locale]/hr/training/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(12) | 423 | 页码跳转、总条数/总页数、排序 |
| 110 | `/outsource/issue` | `src/app/[locale]/outsource/issue/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(45) | 625 | 页码跳转、总条数/总页数、排序 |
| 111 | `/outsource/order` | `src/app/[locale]/outsource/order/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(45) | 549 | 页码跳转、总条数/总页数、排序 |
| 112 | `/outsource/receive` | `src/app/[locale]/outsource/receive/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(34) | 541 | 页码跳转、总条数/总页数、排序 |
| 113 | `/outsource/settlement` | `src/app/[locale]/outsource/settlement/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(30) | 526 | 页码跳转、总条数/总页数、排序 |
| 114 | `/business/contract-review` | `src/app/[locale]/business/contract-review/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(32) | 791 | 页码跳转、总条数/总页数、排序 |
| 115 | `/plm/lifecycle` | `src/app/[locale]/plm/lifecycle/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(43) | 507 | 页码跳转、总条数/总页数、排序 |
| 116 | `/srm/evaluation` | `src/app/[locale]/srm/evaluation/page.tsx` | 🔧 | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(133) | 1066 | 页码跳转、总条数/总页数、排序 |
| 117 | `/qrcode` | `src/app/[locale]/qrcode/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(104) | 865 | 页码跳转、总条数/总页数、排序 |
| 118 | `/orders/sales` | `src/app/[locale]/orders/sales/page.tsx` | 🔧 | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(126) | 1213 | 页码跳转、总条数/总页数 |
| 119 | `/quality/complaint` | `src/app/[locale]/quality/complaint/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(59) | 872 | 页码跳转、总条数/总页数 |
| 120 | `/quality/incoming` | `src/app/[locale]/quality/incoming/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(58) | 914 | 页码跳转、总条数/总页数 |
| 121 | `/quality/lab-test` | `src/app/[locale]/quality/lab-test/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(24) | 551 | 页码跳转、总条数/总页数 |
| 122 | `/quality/sgs` | `src/app/[locale]/quality/sgs/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(60) | 1089 | 页码跳转、总条数/总页数 |
| 123 | `/quality/supplier-audit` | `src/app/[locale]/quality/supplier-audit/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(30) | 586 | 页码跳转、总条数/总页数 |
| 124 | `/quality/trace` | `src/app/[locale]/quality/trace/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(58) | 688 | 页码跳转、总条数/总页数 |
| 125 | `/quality/unqualified` | `src/app/[locale]/quality/unqualified/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(41) | 829 | 页码跳转、总条数/总页数 |
| 126 | `/dcprint/ink` | `src/app/[locale]/dcprint/ink/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(47) | 649 | 页码跳转、总条数/总页数 |
| 127 | `/purchase/orders` | `src/app/[locale]/purchase/orders/page.tsx` | 🔧 | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(39) | 1104 | 页码跳转、总条数/总页数 |
| 128 | `/purchase/request` | `src/app/[locale]/purchase/request/page.tsx` | 🔧 | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(35) | 903 | 页码跳转、总条数/总页数 |
| 129 | `/purchase/suppliers` | `src/app/[locale]/purchase/suppliers/page.tsx` | 🔧 | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(55) | 870 | 页码跳转、总条数/总页数 |
| 130 | `/hr/attendance` | `src/app/[locale]/hr/attendance/page.tsx` | 🔧 | 页面手写 `<table>` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(68) | 1160 | 页码跳转、总条数/总页数 |
| 131 | `/hr/certificates` | `src/app/[locale]/hr/certificates/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✔ | **无** | 已接入(35) | 625 | 页码跳转、排序 |
| 132 | `/hr/salary` | `src/app/[locale]/hr/salary/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(49) | 1310 | 页码跳转、总条数/总页数 |
| 133 | `/hr/skills` | `src/app/[locale]/hr/skills/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✔ | **无** | 已接入(27) | 492 | 页码跳转、排序 |
| 134 | `/prepress/die-template` | `src/app/[locale]/prepress/die-template/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(21) | 2004 | 页码跳转、总条数/总页数 |
| 135 | `/orders/customers` | `src/app/[locale]/orders/customers/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✔ | 有 | 已接入(88) | 1123 | 页码跳转 |
| 136 | `/orders/products` | `src/app/[locale]/orders/products/page.tsx` | 🔧 | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✔ | 有 | 已接入(109) | 1166 | 页码跳转 |
| 137 | `/orders/bom/create` | `src/app/[locale]/orders/bom/create/page.tsx` | ✅ | 复用 `@/components/ui/table` | **无总选** / 单行勾选✔ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(52) | 615 | — |
| 138 | `/orders/bom` | `src/app/[locale]/orders/bom/page.tsx` | ✅ | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✔ | **无** | 已接入(43) | 591 | — |
| 139 | `/production/process` | `src/app/[locale]/production/process/page.tsx` | ✅ | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(62) | 718 | — |
| 140 | `/production/product-label` | `src/app/[locale]/production/product-label/page.tsx` | ✅ | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(49) | 628 | — |
| 141 | `/warehouse/cost` | `src/app/[locale]/warehouse/cost/page.tsx` | ✅ | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(3) | 388 | — |
| 142 | `/warehouse/inbound/cutting` | `src/app/[locale]/warehouse/inbound/cutting/page.tsx` | ✅ | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(46) | 414 | — |
| 143 | `/warehouse/inventory` | `src/app/[locale]/warehouse/inventory/page.tsx` | ✅ | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | 有 | 已接入(37) | 703 | — |
| 144 | `/warehouse/split-order` | `src/app/[locale]/warehouse/split-order/page.tsx` | ✅ | 复用 `@/components/ui/table` | **无总选** / 单行勾选✔ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 598 | — |
| 145 | `/warehouse/transfer` | `src/app/[locale]/warehouse/transfer/page.tsx` | ✅ | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(36) | 416 | — |
| 146 | `/finance/cost` | `src/app/[locale]/finance/cost/page.tsx` | ✅ | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(14) | 264 | — |
| 147 | `/finance/payables` | `src/app/[locale]/finance/payables/page.tsx` | ✅ | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 291 | — |
| 148 | `/finance/payments` | `src/app/[locale]/finance/payments/page.tsx` | ✅ | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(0) | 174 | — |
| 149 | `/finance/receipts` | `src/app/[locale]/finance/receipts/page.tsx` | ✅ | 复用 `@/components/ui/table` | **无总选** / 单行勾选✘ / 半选✘ | 有pageSize / 跳转✘ / 总数✘ | **无** | 已接入(1) | 174 | — |
| 150 | `/hr/salary/payslips` | `src/app/[locale]/hr/salary/payslips/page.tsx` | ⚪ | 页面手写 `<table>` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(51) | 299 | 总选、半选态、分页参数、页码跳转、总条数/总页数、排序 |
| 151 | `/hr/shifts` | `src/app/[locale]/hr/shifts/page.tsx` | ✅ | 复用 `@/components/ui/table` | 有总选 / 单行勾选✔ / 半选✔ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(30) | 316 | — |
| 152 | `/advanced/cost-analysis` | `src/app/[locale]/advanced/cost-analysis/page.tsx` | ✅ | 页面手写 `<table>` | **无总选** / 单行勾选✘ / 半选✘ | **无pageSize** / 跳转✘ / 总数✘ | **无** | 已接入(0) | 118 | — |

## 组件内表格（非页面，供参考）

| 文件 | 形态 |
| --- | --- |
| `src/app/[locale]/orders/sales/sales-order-form.tsx` | ui/table |
| `src/app/[locale]/purchase/orders/purchase-order-form.tsx` | ui/table |
| `src/app/[locale]/sample/standard-card/InputCardForm.tsx` | 手写 `<table>` |
| `src/app/[locale]/settings/organization/department-table.tsx` | ui/table |
| `src/app/[locale]/settings/warehouse-category/warehouse-category-manager.tsx` | ui/table |
| `src/app/[locale]/warehouse/inbound/components/dialogs/OutboundItemsEditor.tsx` | 手写 `<table>` |
| `src/app/[locale]/warehouse/inbound/components/dialogs/TransferOutDialog.tsx` | 手写 `<table>` |
| `src/app/[locale]/warehouse/inbound/components/InboundRecordViews.tsx` | 手写 `<table>` |
| `src/app/api/orders/export/route.ts` | 手写 `<table>` |
| `src/components/qr-code/QRCodeSearch.tsx` | ui/table |
| `src/components/qr-code/QRCodeTrace.tsx` | ui/table |
| `src/components/reports/PrepressReportsContent.tsx` | ui/table |
| `src/components/ui/global-import-dialog.tsx` | ui/table |
| `src/components/ui/table-export-toolbar.tsx` | 手写 `<table>` |
| `src/components/ui/table.perf.test.tsx` | ui/table |
| `src/components/ui/table.test.tsx` | ui/table |
| `src/components/ui/table.tsx` | 手写 `<table>` |
| `src/lib/global-export-service.ts` | 手写 `<table>` |