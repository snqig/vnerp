# 规则体系总索引

> 核心原则：所有规则必须可执行、可验证、可自动化检查

## 规则清单

| 规则 | 文档 | 说明 | 自动化检查 |
|------|------|------|-----------|
| 编码规范 | [coding-standards.md](./coding-standards.md) | 代码风格、命名规则、文件结构 | ESLint + Prettier + tsc |
| 数据库规则 | [database-rules.md](./database-rules.md) | 表命名、字段命名、索引、事务规范 | SQL Lint + 迁移脚本检查 |
| API 设计规范 | [api-design-rules.md](./api-design-rules.md) | RESTful规范、状态码、请求响应格式 | API 测试 + Schema 校验 |
| 业务规则 | [business-rules/](./business-rules/) | 各模块核心业务逻辑规则 | 单元测试 + 集成测试 |
| 安全规则 | [security-rules.md](./security-rules.md) | 认证、权限、加密、注入防护 | 安全扫描 + 渗透测试 |

## 业务规则子目录

| 模块 | 文档 | 核心规则 |
|------|------|---------|
| 生产管理 | [production.md](./business-rules/production.md) | 工单状态流转、报工逻辑、成本计算 |
| 仓库管理 | [warehouse.md](./business-rules/warehouse.md) | FIFO原则、库存预警、盘点流程 |
| 采购管理 | [purchase.md](./business-rules/purchase.md) | 采购审批流、入库验收、应付核算 |
| 品质管理 | [quality.md](./business-rules/quality.md) | 检验标准、不合格处理、追溯规则 |
| 财务核算 | [finance.md](./business-rules/finance.md) | 应收应付、成本归集、利润计算 |

## 规则执行流程

```
编写规则 → 代码实现 → 自动化检查 → 人工Review → 合规确认
     ↑                                              ↓
     └────────── 发现问题，更新规则 ←──────────────┘
```

## 规则变更流程

1. 提出规则变更申请（含变更原因、影响范围）
2. 技术评审会议确认
3. 更新规则文档并标注版本号
4. 更新对应的自动化检查配置
5. 通知所有相关人员
