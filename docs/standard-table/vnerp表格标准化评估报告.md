# vnerp 项目列表组件标准化 — 评估报告

> 扫描范围：本地 `src/` 全量源码；生成时间：2026-09-27

## 1. 业务列表总量

- **业务列表页面：152 处**（`src/app/**/page.tsx`，排除组件内部件 18 处）
- 改造等级分布：

| 等级 | 数量 | 含义 |
| --- | --: | --- |
| ❌ 完全重写 | 11 | 页面手写原生 `<table>`，无公共组件，必须替换为 StandardTable |
| 🔧 需要改造 | 125 | 已用 ui/table，但勾选/分页/排序/样式/i18n 存在缺口 |
| ✅ 少量调整 | 15 | 已满足全部标准项，仅需对接 StandardTable |

## 2. 现存问题汇总

### 2.1 表格视觉样式不统一

- 11 个页面手写原生 `<table>`，与 `@/components/ui/table` 的边框、hover、表头高度、空态样式各不相同；
- 表头写法有 `TableHead` / 裸 `<th>` 两套；行 hover、斑马纹、单元格内边距按页面各自实现；
- 空数据状态：部分页面 `colSpan` 手写一行文案，部分页面无空态，`colSpan` 数值随列数硬编码易漏改。

### 2.2 列表选择交互不统一

- **77 / 152** 个列表顶部**无全局总选**；
- 已有总选的页面多基于 `useRowSelection` 实现，语义为「仅控制当前页」（符合新标准），但实现方式分散：
  - 表头复选框混用原生 `<input type="checkbox">` 与 `<Checkbox>` 组件；
  - **80 / 152** 个页面未处理「部分选中」的半选（indeterminate）态；
  - 选中集合有的存 `Set<string>`、有的存 `number[]`，跨页行为不一致（部分页面翻页后残留选中）。

### 2.3 分页能力缺失

- 多数页面 `pageSize` 写死字符串 `'20'`，无「20 / 25 / 30」每页条数下拉；
- **134 / 152** 个页面无法手动输入页码跳转；
- **128 / 152** 个页面未同时展示「共 XX 条，共 XX 页」；
- 分页 UI 由各页面手写「上一页 / 下一页」按钮组，禁用逻辑、文案、位置（左/右/居中）均不一致。

### 2.4 表头排序逻辑不统一

- **115 / 152** 个页面完全无排序功能；
- 公共 `SortableTableHeader` 仅 9 处使用，其余页面各自实现或不实现；
- 排序循环规则不统一（部分只有升序/降序，无「取消排序」第三态），排序图标缺失。

### 2.5 国际化

- 150 / 152 个页面已接入 `useTranslations`；**2 个未接入**：
  - `/sample/standard-card/input-v2` (`src/app/[locale]/sample/standard-card/input-v2/page.tsx`)
  - `/sample/standard-card/input` (`src/app/[locale]/sample/standard-card/input/page.tsx`)
- 分页栏文案（上一页/下一页/共 X 条）散落在各页面自己的命名空间下，key 命名不一致；
- 公共分页组件 `src/components/ui/pagination.tsx` 内置英文硬编码（`Previous` / `Next` / `More pages`）。

## 3. 工作量评估与优先级

### 3.1 优先级排序（先主链路、后边缘）

| 优先级 | 模块 | 列表数 | 说明 |
| --- | --- | --: | --- |
| P1 | warehouse、orders、production、quality | 37 | 核心生产/仓储/质量/订单主链路 |
| P2 | finance、purchase、(dashboard)、dcprint、equipment、sales | 47 | 采购、销售、财务、设备、dcprint |
| P3 | sample、hr、crm、engineering、outsource | 36 | 打样、人事、客户、外协、工程 |
| P4 | base-data、delivery、material-requisitions、plm、business、srm、prepress | 8 | 商务、印前、PLM、SRM、配送、主数据 |
| P5 | dashboard、analysis、reports、settings、tools、monitoring、qrcode、advanced | 23 | 配置、报表、分析、监控、工具 |
| P9 | [locale] | 1 | 其他 |

### 3.2 单页工作量

| 页面规模 | 行数区间 | 预估改造 |
| --- | --- | --- |
| 小型 | < 300 行 | 0.5h（表格 JSX 直接换 StandardTable + columns） |
| 中型 | 300 ~ 800 行 | 1 ~ 1.5h（需拆分 render 函数、保留操作列） |
| 大型 | > 800 行 | 2h+（多表格/内嵌编辑，需逐表拆） |

分布：小型 25 页 / 中型 89 页 / 大型 38 页。

粗估总工时：约 195 人时（不含回归测试）。

## 4. 改造方案要点

1. 新增 `StandardTable`（`src/components/common/standard-table.tsx`），统一勾选/分页/排序/状态/样式；
2. 组件内置文本全部走 `StandardTable` i18n 命名空间，四语补齐，禁止硬编码；
3. 表头总选仅作用于**当前页**，单行独立勾选，自动联动半选；预留跨页选中扩展；
4. **每行末尾的编辑 / 更新 / 修正等业务操作列原样保留**，仅迁移为 `columns[].render`，不改业务逻辑；
5. 按 P1→P5 分批替换，每批完成后 tsc + lint + 页面自测。## 5. 扫描口径修正说明（重要）

首轮按「文件中出现 `<table`」判定手写表格，存在**误报**：不少页面的 `<table>` 只出现在
打印模板（`document.write`）或 `dangerouslySetInnerHTML` 的 HTML 字符串里，页面本身并没有真实表格。

按「剔除反引号模板字符串后再判定」修正后：

| 口径 | 数量 | 说明 |
| --- | --- | --- |
| JSX 中真实手写 `<table>`（❌ 完全重写） | 11 | 必须替换为 StandardTable |
| 字符串内 `<table>`（误报） | 11 | 其中 9 个页面同时用了 `@/components/ui/table`，实为 🔧 需改造 |
| 非真实列表页（⚪ 排除） | 1 | 如 `/hr/salary/payslips` 只有打印模板，无列表 |
| **真实需迁移列表页** | **150** | |

## 6. 本轮改造结果

| 页面 | 路由 | 改造内容 | 验证 |
| --- | --- | --- | --- |
| 班次管理 | `/hr/shifts` | 手写 Table → StandardTable（columns 模式）；勾选由组件托管；补客户端分页 + 排序；**编辑 / 删除操作列原样保留** | tsc 0 新增报错、eslint 0 error |
| 成本记录 | `/finance/cost` | 同上；另为 `/api/finance/cost` 增加 `sortField` / `sortDirection` **白名单**排序参数 | tsc 0 新增报错、eslint 0 error |
| 应付账款 | `/finance/payables` | 服务端分页；原无勾选 → `rowSelectable={false}`；付款操作列原样保留 | tsc 0 报错、eslint 0 error |
| 成本分析 | `/advanced/cost-analysis` | 手写 `<table>` → StandardTable；客户端分页 + 6 列排序 | tsc 0 报错、eslint 0 error |

### 6.1 组件自测（vitest，17 用例全通过）

| 场景 | 结果 |
| --- | --- |
| `rowSelectable=false` 勾选列隐藏 | ✅ |
| 表头总选一键选中当前页全部 | ✅ |
| 单行独立勾选 / 取消 | ✅ |
| 部分选中 → 表头半选（indeterminate） | ✅ |
| 全选 → checked；取消 → unchecked | ✅ |
| 分页文案「共 100 条，共 5 页」走 i18n | ✅ |
| 每页条数下拉 20 / 25 / 30 | ✅ |
| 页码跳转：合法跳转 / 越界提示且不跳转 | ✅ |
| 上一页 / 下一页 | ✅ |
| 表头点击 升序 → 降序 → 取消，并重置第 1 页 | ✅ |
| 当前排序列 aria-sort 高亮 | ✅ |
| loading / 空数据 / 异常 + 重试 | ✅ |
| 操作列（编辑按钮）保留且可点击 | ✅ |
| 自定义样式生效 | ✅ |

### 6.2 保留规则与既有缺陷

- **原有每行编辑 / 更新 / 修正按钮一律原样迁移**，未改动任何业务 handler；
- 迁移中发现的既有缺陷**只记录不修复**，例如 `/finance/payables` 的付款按钮未调用
  `setSelectedPay(row)`，导致 `selectedPay` 恒为 null（改造前即存在，已在代码注释中标注）；
- 服务端分页列表若后端不支持 `sortField` / `sortDirection`，**不开 `sortable`**，避免出现点了没反应的排序控件。

### 6.3 验证方式说明

- 沙箱内 `next dev` 无法启动（受 safe-delete 守卫限制），交互验证以 **vitest 组件测试 + tsc + eslint** 为准；
- 浏览器端回归（多语言切换、真实翻页、勾选联动）需在本机 `next dev -p 5000` 执行。

## 7. 分批替换计划

| 批次 | 范围 | 页量 | 状态 |
| --- | --- | --- | --- |
| 试点 | `/hr/shifts`、`/finance/cost`、`/finance/payables`、`/advanced/cost-analysis` | 4 | ✅ 完成 |
| 第 1 批 | finance 小额页 + warehouse/orders/production 中等页 | 30 | 🔄 进行中（并行） |
| 第 2 批 | dcprint / equipment / purchase 中等页 | 15 | 🔄 进行中 |
| 第 3 批 | P1 大页（workorder / outbound / sales 等 1000+ 行） | 8 | ⏳ 待启动 |
| 第 4 批 | 其余 sample / hr / srm 等 | ~50 | ⏳ 待启动 |
| 收尾 | 剩余边缘页 + settings / reports / analysis | ~45 | ⏳ 待启动 |

每批执行：`tsc --noEmit` 同轮对测（新增报错必须为 0）+ `eslint` 0 error + vitest 组件用例 + 本机浏览器回归。
进度可用 `node .workbuddy/tmp/progress-tables.mjs` 实时查看。

---

## 8. 最新进度（2026-09-28 上午）

### 8.1 当前状态

- **已迁移并验证（tsc 0 错误 + eslint 0 error）：40 页**
  - 试点 4 页：`/hr/shifts`、`/finance/cost`、`/finance/payables`、`/advanced/cost-analysis`
  - worker 落盘且干净的 ~29 页（finance 6 + 其余模块，明细见 `progress-tables.mjs`）
  - 手动补迁 7 个小页：
    `hr/salary/piece-rate`、`hr/salary/piece-work`、`hr/reports/turnover`、
    `hr/reports/salary-structure`、`hr/salary/bank-report`、`settings/login-log`、`settings/oper-log`
  - 4 个「半迁移」页合规：列表已用 StandardTable，残留 `<Table>` 是**可编辑明细表**（按规范保留，
    不计入待办）：`orders/bom/create`、`warehouse/cost`、`warehouse/split-order`、`warehouse/transfer`
- **已还原待重迁：3 页**（worker 半残，删 import 未迁 JSX，已 `git checkout`）：
  `equipment/scrap`、`quality/incoming`、`warehouse/stock-adjust`
- **未触及：~109 页**（含上面 3 页待重迁 + 其余未分配的中大页）
- **全仓 `tsc` 仅剩 9 个基线错误，构建全绿**（基线：`warehouse/batch/route.ts` 1 个 + `production-report.spec.ts` 8 个）

### 8.2 并行 Worker 中断事故

- 派 7 个并发 worker 替换批次 4/5/6/8/9/10/11 → **全部 429 频率限制失败**（限流重置点 08:00 UTC+8）。
- 教训：**7 并发必然触发限流 → 后续必须用 ≤2~3 并发的小波次**；且每改完一个文件必须自验 tsc，
  否则失败后文件停在「删 import 未迁 JSX」的半残态（本次 3 个文件中招，已还原）。
- 3 个 finance 页（`payments`/`receipts`/`receivables`）仅漏 `formatDate` import → 已补 `@/lib/date-utils`。

### 8.3 后续

- **08:00 限流重置后**，用 ≤3 并发小波次重跑剩余批次（先重迁 3 个还原页，再推进 ~106 未触及页）。
- 复用脚本：`.workbuddy/tmp/gen-batches.mjs`（分批）、`progress-tables.mjs`（进度）、`modified-pages.txt`（已改清单）。
- 提交策略：用户要求暂不提交，留待本机 `next dev -p 5000` 浏览器回归后再定。
