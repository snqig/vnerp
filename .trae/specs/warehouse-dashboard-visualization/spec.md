# 仓库仪表板可视化优化规范

## Why
当前仓库仪表板页面缺少专业的图表可视化组件，无法直观展示库存数据、分类分布、入出库趋势等信息。需要集成图表可视化技能，优化仓库数据的展示方式。

## What Changes
- 为仓库仪表板添加专业的图表可视化组件
- 使用图表可视化技能生成库存统计图表
- 优化物料分类分布展示（饼图/柱状图）
- 优化仓库利用率展示（仪表盘/液位图）
- 优化出入库趋势展示（折线图/面积图）
- 保持现有的3D可视化组件和UI风格

## Impact
- Affected specs: 系统UI优化、图表可视化
- Affected code: `/dashboard/warehouse/page.tsx`

## ADDED Requirements

### Requirement: 物料分类分布图表
系统应使用饼图或柱状图展示物料分类分布数据。

#### Scenario: 物料分类数据展示
- **WHEN** 仓库仪表板加载完成且有物料分类数据
- **THEN** 显示物料分类的分布图表（饼图或柱状图）

### Requirement: 仓库利用率仪表盘
系统应使用液位图或仪表盘展示各仓库的利用率。

#### Scenario: 仓库利用率展示
- **WHEN** 仓库仪表板加载完成且有仓库数据
- **THEN** 显示仓库利用率的仪表盘图表

### Requirement: 出入库趋势图
系统应使用折线图或面积图展示出入库趋势。

#### Scenario: 趋势数据展示
- **WHEN** 仓库仪表板加载完成且有历史数据
- **THEN** 显示出入库趋势的折线图或面积图

### Requirement: 库存预警可视化
系统应使用醒目的图表组件展示库存预警信息。

#### Scenario: 预警数据展示
- **WHEN** 仓库仪表板加载完成且有低库存预警
- **THEN** 显示库存预警的可视化图表

## MODIFIED Requirements

### Requirement: 现有仓库数据展示
保持现有的数据获取逻辑和API调用不变，仅优化前端可视化展示方式。

## REMOVED Requirements

### Requirement: 简单的列表展示
移除现有的简单列表展示方式，改用图表可视化组件。

**Reason**: 图表可视化能更直观地展示数据，提高用户体验

**Migration**: 将现有列表数据转换为图表所需的数据格式

## Technical Approach
1. 使用chart-visualization技能生成图表
2. 将图表URL集成到React组件中
3. 保持现有的深色主题和科技风格UI
4. 使用iframe或img标签嵌入生成的图表
5. 添加图表加载状态和错误处理
