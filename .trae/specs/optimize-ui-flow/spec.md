# UI优化与业务流转关系梳理 Spec

## Why
库存调拨页面表头使用硬编码 `bg-gray-100` 样式，在深色模式下看不清文字；项目整体UI/UX需要进一步优化以符合Web界面规范；核心业务数据流转链路、表间关联关系、系统架构层次需要重新梳理并以可视化图表呈现。

## What Changes
- 修复 `warehouse/transfer` 页面表头样式，替换硬编码 `bg-gray-100` 为全局 `.table-dashboard` 深色主题样式
- 审查并统一所有仓库模块页面的表头样式，确保深色模式兼容
- 基于 web-design-guidelines 审查项目UI合规性
- 基于 ui-ux-pro-max 优化项目交互体验
- 基于 chart-visualization 创建核心业务数据流转关系图、表间关联详细关系图、系统架构层次图
- 梳理完整业务流转链路文档，包含过程字段贯穿说明

## Impact
- Affected code: `src/app/warehouse/transfer/page.tsx`, `src/app/warehouse/*/page.tsx`, `src/app/globals.css`, `src/components/ui/table.tsx`
- Affected pages: 所有仓库模块页面（9个页面）
- 新增可视化图表组件：业务流转图、表关系图、架构层次图

## ADDED Requirements

### Requirement: 表头深色主题统一
系统 SHALL 在所有仓库模块表格中使用全局深色主题样式，而非硬编码颜色值。

#### Scenario: 深色模式下表头可读
- **WHEN** 用户在深色模式下访问 `/warehouse/transfer` 页面
- **THEN** 表头文字清晰可读，背景色与深色主题协调

#### Scenario: 亮色模式下表头一致
- **WHEN** 用户在亮色模式下访问 `/warehouse/transfer` 页面
- **THEN** 表头样式与全局 `.table-dashboard` 样式一致

### Requirement: UI/UX合规性审查
系统 SHALL 通过 web-design-guidelines 审查，确保所有页面符合Web界面规范。

#### Scenario: 可访问性合规
- **WHEN** 对项目进行UI审查
- **THEN** 所有交互元素具有适当的ARIA标签、焦点状态和键盘导航支持

### Requirement: 核心业务数据流转关系图
系统 SHALL 提供可视化页面展示完整业务流转链路，包含以下图表：

#### Scenario: 业务流转链路图
- **WHEN** 用户访问业务流转可视化页面
- **THEN** 能看到完整的 采购入库 → 分切管理 → 工单生产 → 工艺流程 → 扫码配料 → 扫码发料 → 生产报工 → 成品入库 → 质量追溯 链路图
- **AND** 每个节点显示关联的数据库表名和关键字段

#### Scenario: 表间关联详细关系图
- **WHEN** 用户查看表关系图
- **THEN** 能看到所有48张业务表之间的外键关联关系
- **AND** 关联线上标注FK字段名称

#### Scenario: 系统架构层次图
- **WHEN** 用户查看架构图
- **THEN** 能看到系统分层架构：表现层 → API层 → 业务逻辑层 → 数据访问层 → 数据库层
- **AND** 每层显示对应的模块和组件

### Requirement: 业务流转过程字段贯穿说明
系统 SHALL 在流转图中标注关键字段如何贯穿整个业务流程。

#### Scenario: 字段追踪
- **WHEN** 用户查看流转链路
- **THEN** 能看到 `material_id`、`order_id`、`batch_no`、`warehouse_id` 等关键字段在各环节的传递路径

## MODIFIED Requirements

### Requirement: 仓库模块表格样式
原实现使用硬编码 `bg-gray-100` + `border-gray-300` 样式，现修改为使用全局 `.table-dashboard` CSS类，支持亮色/深色模式自动切换。

具体变更：
- `SortableHeader` 组件：`bg-gray-100` → `bg-muted/50 text-muted-foreground`（亮色）/ `bg-muted/30`（深色）
- `TableRow` 表头行：`bg-gray-100` → 使用 `table-dashboard` 类
- `TableHead` 单元格：`border-gray-300 bg-gray-100` → `border-border bg-muted/50`
- `TableCell` 数据行：`border-gray-300` → `border-border/50`
- `hover:bg-gray-200` → `hover:bg-muted/70`
- `even:bg-gray-50/50` → `even:bg-muted/20`
