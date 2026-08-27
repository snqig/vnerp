# 更新日志

## 2026-07-17 - 多币种功能 Phase 2b

### 新增功能

**财务模块**
- 应收/应付支持多币种显示
- 收款/付款 API 支持币种字段
- 财务应用服务层集成多币种逻辑

**销售模块**
- 销售订单页面支持多币种展示
- 配送单页面支持多币种展示
- 退货单页面支持多币种展示
- 对账单页面支持多币种展示

**仓储模块**
- 入库单页面支持多币种展示
- 出库单页面支持多币种展示
- 入库对话框支持采购订单搜索与多币种
- 入库验证规则更新

### 技术更新

**API 路由**
- `/api/orders/sales` - 销售订单 API
- `/api/finance/payment` - 付款 API
- `/api/finance/receipt` - 收款 API
- `/api/warehouse/inbound` - 入库 API
- `/api/warehouse/outbound` - 出库 API

**应用服务**
- `FinanceApplicationService` - 财务应用服务
- `DeliveryApplicationService` - 配送应用服务
- `ReturnOrderApplicationService` - 退货应用服务
- `ReconciliationApplicationService` - 对账应用服务

**数据层**
- 更新 Drizzle schema 支持多币种字段
- 添加数据库迁移脚本 066-068

### Git 配置优化

为解决网络连接问题，建议团队成员配置 Git HTTP 协议版本：

```bash
git config --global http.version HTTP/1.1
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```

或直接使用项目根目录的 `.gitconfig` 文件。

### 提交记录

| Commit | 说明 |
|--------|------|
| `7140afd` | 更新 UI 页面和 API 路由支持多币种显示 |
| `41aab94` | Phase 2b 多币种支持 - 销售/库存/财务模块 |
| `e3baba4` | 合并 feature/multi-currency-phase1 分支 |
| `a7b6d47` | Phase 2a 采购多币种实现 |

### 注意事项

1. 数据库迁移需要在部署前执行
2. 需要配置汇率基础数据后才能正常使用多币种功能
3. 历史数据已通过迁移脚本回填默认币种