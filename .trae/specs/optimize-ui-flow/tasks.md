# Tasks

- [x] Task 1: 修复仓库调拨页面表头深色样式
  - [x] SubTask 1.1: 修改 `SortableHeader` 组件样式，替换 `bg-gray-100` 为 `bg-muted/50 text-muted-foreground`，`hover:bg-gray-200` 为 `hover:bg-muted/70`
  - [x] SubTask 1.2: 修改 `TableRow` 表头行样式，替换 `bg-gray-100` 为全局主题样式
  - [x] SubTask 1.3: 修改所有 `TableHead` 的 `border-gray-300 bg-gray-100` 为 `border-border bg-muted/50`
  - [x] SubTask 1.4: 修改所有 `TableCell` 的 `border-gray-300` 为 `border-border/50`
  - [x] SubTask 1.5: 修改数据行 `hover:bg-blue-50 even:bg-gray-50/50` 为 `hover:bg-muted/30 even:bg-muted/20`
  - [x] SubTask 1.6: 验证深色模式下表头可读性

- [x] Task 2: 统一其他仓库模块页面表头样式
  - [x] SubTask 2.1: 检查 `warehouse/inventory/page.tsx` 表头样式并修复
  - [x] SubTask 2.2: 检查 `warehouse/inbound/page.tsx` 表头样式并修复
  - [x] SubTask 2.3: 检查 `warehouse/outbound/page.tsx` 表头样式并修复
  - [x] SubTask 2.4: 检查 `warehouse/stocktaking/page.tsx` 表头样式并修复
  - [x] SubTask 2.5: 检查 `warehouse/stock-adjust/page.tsx` 表头样式并修复
  - [x] SubTask 2.6: 检查 `warehouse/production-inbound/page.tsx` 表头样式并修复
  - [x] SubTask 2.7: 检查 `warehouse/sales-outbound/page.tsx` 表头样式并修复
  - [x] SubTask 2.8: 检查 `warehouse/setup/page.tsx` 表头样式并修复

- [x] Task 3: 基于web-design-guidelines审查项目UI合规性并修复问题
  - [x] SubTask 3.1: 获取最新Web界面规范
  - [x] SubTask 3.2: 审查关键页面的可访问性（ARIA标签、焦点状态、键盘导航）
  - [x] SubTask 3.3: 修复审查中发现的高优先级问题

- [ ] Task 4: 创建核心业务数据流转关系可视化页面
  - [ ] SubTask 4.1: 创建 `/dashboard/flow` 页面路由和布局
  - [ ] SubTask 4.2: 实现业务流转链路图组件（采购入库 → 分切管理 → 工单生产 → 工艺流程 → 扫码配料 → 扫码发料 → 生产报工 → 成品入库 → 质量追溯）
  - [ ] SubTask 4.3: 在流转节点中标注关联数据库表名和关键字段
  - [ ] SubTask 4.4: 标注关键字段贯穿路径（material_id、order_id、batch_no、warehouse_id）

- [ ] Task 5: 创建表间关联详细关系图
  - [ ] SubTask 5.1: 在可视化页面中添加表关系图Tab
  - [ ] SubTask 5.2: 实现48张业务表的节点和FK关联线
  - [ ] SubTask 5.3: 在关联线上标注FK字段名称
  - [ ] SubTask 5.4: 支持按模块分组显示（系统管理、客户管理、供应商、物料、采购、销售、生产、仓库、质量、财务、人事、设备）

- [ ] Task 6: 创建系统架构层次图
  - [ ] SubTask 6.1: 在可视化页面中添加架构图Tab
  - [ ] SubTask 6.2: 实现分层架构展示（表现层 → API层 → 业务逻辑层 → 数据访问层 → 数据库层）
  - [ ] SubTask 6.3: 每层显示对应模块和组件名称

# Task Dependencies
- [Task 2] depends on [Task 1] (先在transfer页面验证样式方案，再推广到其他页面)
- [Task 4] depends on [Task 1] (UI样式统一后再创建可视化页面)
- [Task 5] depends on [Task 4] (复用可视化页面框架)
- [Task 6] depends on [Task 4] (复用可视化页面框架)
- [Task 3] 可与 [Task 1] 并行
