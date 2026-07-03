# Tasks

## 阶段1: 环境准备与基线测试

- [ ] Task 1.1: 启动开发服务器并验证登录功能
  - 使用 webapp-testing skill 启动 Next.js 开发服务器
  - 使用 admin/admin123 登录
  - 截图记录登录后状态

- [ ] Task 1.2: 识别硬编码公司名称位置
  - 搜索 login/page.tsx 中的硬编码文本
  - 搜索 layout.tsx 中的公司名称
  - 搜索 Header/Sidebar 组件中的硬编码文本

## 阶段2: 系统设置数据接口

- [ ] Task 2.1: 创建/验证系统配置读取 API
  - 检查 `/api/system/config` 或创建新 API
  - 确保能从 `sys_config` 表读取配置
  - 返回公司名称等必要信息

- [ ] Task 2.2: 验证系统基础设置页面
  - 访问 `/settings/basics`
  - 确保公司名称配置项存在
  - 如缺失则添加

## 阶段3: 前端动态化改造

- [ ] Task 3.1: 登录页面公司名称动态化
  - 创建获取配置的 API 调用
  - 替换 login/page.tsx 中的硬编码公司名称
  - 测试登录页面显示

- [ ] Task 3.2: 全局 Header 公司名称动态化
  - 创建全局配置 Context 或 Zustand store
  - 修改 Header 组件使用动态数据
  - 确保页面切换时数据保持

- [ ] Task 3.3: Sidebar Logo 边公司名称动态化
  - 修改 Sidebar 组件
  - 使用系统设置的公司名称

## 阶段4: 全页面功能测试

- [ ] Task 4.1: 测试主要业务页面
  - 仪表板页面 (/)
  - 销售订单 (/orders/sales)
  - 采购订单 (/purchase/orders)
  - 工单生产 (/production/orders)

- [ ] Task 4.2: 测试仓库模块页面
  - 入库管理 (/warehouse/inbound)
  - 出库管理 (/warehouse/outbound)
  - 调拨管理 (/warehouse/transfer)
  - 库存查询 (/warehouse/inventory)

- [ ] Task 4.3: 测试其他功能页面
  - 质量管理页面
  - 设备管理页面
  - 财务管理页面
  - 系统设置页面

## 阶段5: 数据补全与修正

- [ ] Task 5.1: 补全必要演示数据
  - 检查各模块是否有数据
  - 创建必要的演示数据
  - 确保数据关联完整

- [ ] Task 5.2: 验证数据流程
  - 测试订单创建流程
  - 测试入库出库流程
  - 测试报表生成

## 阶段6: 最终验证

- [ ] Task 6.1: 完整流程测试
  - 从登录到所有主要功能
  - 截图记录关键页面
  - 验证无 JavaScript 错误

- [ ] Task 6.2: 构建验证
  - 运行 `pnpm build` 确保无错误

# Task Dependencies
- Task 2.x 依赖 Task 1.x (需要先登录才能测试)
- Task 3.x 依赖 Task 2.x (需要 API 先就绪)
- Task 4.x 可与 Task 3.x 并行
- Task 5.x 依赖 Task 4.x (根据测试结果补数据)
- Task 6.x 依赖所有前面的任务
