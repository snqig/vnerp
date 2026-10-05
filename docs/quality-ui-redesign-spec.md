# 质量模块 UI 重新设计方案（process / final 统一）

> 设计者：UI Designer（像素君）｜日期：2026-10-05
> 范围：过程检验（IPQC）`quality/process` 与终检（FQC）`quality/final` 两页的统一与体验升级

## 1. 现状审计

| # | 问题 | 现状 | 影响 |
|---|---|---|---|
| 1 | 状态字段同字段异标签 | `burdening_status` process 页 = 1待检验/2检验中/3已检；final 页 = 1已排产/2待终检/3终检完成 | 同一数值跨页含义不同，报表/运维易误读 |
| 2 | 表格列不统一 | process 有「质量管理员」列、final 有「包装方式」列；列顺序亦不同 | 双页视觉割裂，切换需重新认列 |
| 3 | Tabs 数不一致 | process 4 个（全部/待检/检验中/已检）、final 3 个（无「检验中」） | 终检无中间态可视 |
| 4 | 统计卡维度差异 | process 待检/检验中/已检/今日/本周；final 维度不同 | 异常趋势不可比 |
| 5 | 不良类型选项不同 | process 6 项、final 7 项 | 缺陷分类口径不统一，BI 无法聚合 |
| 6 | 检验弹窗结构重复 | 两页弹窗 ~90% 相同，未抽共用组件 | 改一处要改两页，技术债 |
| ⚠️ | 功能断点 | 后端 process 白名单支持 pass/fail/concession/rework/scrap 5 项，前端下拉仅 3 项 | 后端 scrap→5 联动前端永远无法触发 |

## 2. 设计原则（符合用户习惯）

- **状态语义统一**：同一 `burdening_status` 数值全局同义；此前缺失的 `5=不合格 / 6=返工` 补 UI 文案，杜绝「写入但不可见」。
- **检验类型合一**：过程检验 / 终检用顶部 tab 切换，共用列表骨架、列、状态色、批量操作——减少重复代码。
- **异常优先**：统计卡加「异常率」，不合格行浅红底色高亮。
- **录入减负**：合格率实时计算 + 不超计划数校验；不良数 > 0 才展开不良类型；检验结果下拉补齐 `返工/报废`。
- **批量操作底栏**：选中即出现「已选 N 项 + 批量打印/导出」。

## 3. 统一状态模型（`src/lib/quality-status.tsx`）

颜色按数值统一，标签按检验类型取上下文文案：

| 值 | 颜色 | process 标签 | final 标签 |
|---|---|---|---|
| 0 | 灰 | 待生产 | 待生产 |
| 1 | 蓝 | 待检验 | 已排产 |
| 2 | 橙 | 检验中 | 待终检 |
| 3 | 绿 | 已检 | 终检完成 |
| 5 | 红 | 不合格 | 不合格 |
| 6 | 琥珀 | 返工 | 返工 |

导出 `getQualityStatusBadge(status, type, t, tc)` 与 `getQualityStatusLabel(...)`，两页统一消费。

## 4. 组件化路线

- **P2 合一路由**：新增 `quality/center` 路由，过程检验 / 终检为内 tab；保留旧路由一段时间或 301 重定向。

## 5. 本次已落地（A + B 基础 + P1 + P2）

- 新增 `src/lib/quality-status.tsx`：统一状态色板 + 5/6 标签。
- `quality/process/page.tsx`、`quality/final/page.tsx`：接入共用模块（getStatusBadge + 详情表 formatter）；检验结果下拉补齐 `返工/报废`（含 RefreshCw / Trash2 图标）。
- 闭环：后端 scrap→5 联动现可由 UI 触发（此前断点修复）。
- 验证：`tsc --noEmit` 净增量 0 错误。

### P1（已完成）
- 抽 `QualityInspectDialog` 共用组件（`src/components/quality/QualityInspectDialog.tsx`），process/final 两页检验弹窗改为渲染之。
- process 补「异常率」统计卡（burdening_status=5/6）；final 补缺失的 `quality_manager` 列。
- 抽 `QualityBatchBar` 共用组件，两页列表下方统一渲染（全选/清空/批量打印）。
- i18n 补齐 `anomalyRate`/`batchPrint` 到 Quality 命名空间（zh-CN/en/vi/zh-TW 四语）。

### P2（已完成）
- 新增 `quality/center` 路由（`src/app/[locale]/quality/center/page.tsx`）：内 tab 切换过程检/终检，复用 `QualityProcessPage`/`QualityFinalPage` 组件。
- 旧路由 301 重定向：`/quality/process`、`/quality/final` → `/quality/center`（`next.config.ts` `redirects()`）。
- 菜单初始化 `src/app/api/init/menus/route.ts` 中 `quality_process`/`quality_final` 两个菜单项的 `path`/`component` 改指 `/quality/center`。
- 旧路由目录删除，组件移至 `src/components/quality/QualityProcessPage.tsx`、`QualityFinalPage.tsx`。
- 验证：`tsc --noEmit` 全量 0 错误。

## 6. 待办（已完成项已划掉）

- ~~抽取 `QualityInspectDialog` 共用组件~~ ✅
- ~~统一列表列 / 统计卡 / 批量底栏~~ ✅
- ~~新增 `quality/center` 合一路由~~ ✅
- ~~跨语言确认 rework/scrap 键在 en/vi/zh-TW 四语齐备~~ ✅

## 7. 依赖关系

- 本方案 UI 入口（rework/scrap）依赖 PR #24 的后端 scrap→5 联动逻辑（`feat/quality-process-final-contract-tests`，commit `afa02bd7`）。两 PR 合入后 scrap 流程端到端可用。
