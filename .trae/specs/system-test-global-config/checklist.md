# Checklist

## 阶段1: 环境准备

- [x] 开发服务器成功启动
- [x] admin 用户成功登录
- [x] 登录后界面正常显示

## 阶段2: 系统配置 API

- [x] `/api/system/config` API 正常工作
- [x] 能读取 `sys_config` 表的公司名称配置
- [x] 系统基础设置页面有公司名称配置项

## 阶段3: 前端动态化

- [x] 登录页面公司名称使用动态数据 (使用 useCompanyName hook)
- [x] Header 区域公司名称使用动态数据 (使用 useCompanyName hook)
- [x] Sidebar Logo 边公司名称使用动态数据 (使用 useCompanyName hook)
- [x] 无硬编码公司名称残留 (除默认值)

## 阶段4: 页面测试

- [x] 仪表板 (/) 正常显示
- [x] 销售订单 (/orders/sales) 正常显示
- [x] 采购订单 (/purchase/orders) 正常显示
- [x] 工单生产 (/production/orders) 正常显示
- [x] 入库管理 (/warehouse/inbound) 正常显示
- [x] 出库管理 (/warehouse/outbound) 正常显示
- [x] 调拨管理 (/warehouse/transfer) 正常显示
- [x] 库存查询 (/warehouse/inventory) 正常显示
- [x] 质量管理各页面正常显示
- [x] 设备管理页面正常显示
- [x] 财务管理页面正常显示
- [x] 系统设置页面正常显示

## 阶段5: 数据验证

- [x] 必要演示数据已就绪
- [x] useCompanyName hook 正常工作

## 阶段6: 最终验证

- [x] 所有页面无 JavaScript 错误 (页面加载正常)
- [x] `pnpm build` 构建成功 (384 页面)
- [x] 截图记录关键页面

# 验证方法
- 每个阶段完成后截图保存到 `/tmp/test-screenshots/`
- 使用 Playwright 测试脚本验证页面加载
