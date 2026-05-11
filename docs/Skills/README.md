# 技能 SOP 总索引

> 核心原则：步骤化、可复制、无歧义，任何人按照 SOP 都能完成操作

## SOP 清单

### 部署相关 SOP

| SOP | 文档 | 说明 |
|-----|------|------|
| 本地开发环境搭建 | [local-dev.md](./deployment/local-dev.md) | 从零搭建本地开发环境 |
| 生产环境部署 | [production-deploy.md](./deployment/production-deploy.md) | 生产环境部署流程 |
| 数据库迁移 | [database-migration.md](./deployment/database-migration.md) | 数据库结构变更执行流程 |
| 数据备份与恢复 | [backup-restore.md](./deployment/backup-restore.md) | 数据库备份与灾难恢复 |

### 开发相关 SOP

| SOP | 文档 | 说明 |
|-----|------|------|
| 新模块创建 | [module-creation.md](./development/module-creation.md) | 创建新业务模块的标准流程 |
| API 开发 | [api-development.md](./development/api-development.md) | 开发新 API 接口的标准流程 |
| 二维码追溯功能开发 | [qrcode-trace.md](./development/qrcode-trace.md) | 二维码追溯相关功能开发指南 |
| Bug 修复流程 | [bug-fix-process.md](./development/bug-fix-process.md) | Bug 定位、修复、验证标准流程 |

### 运维与使用 SOP

| SOP | 文档 | 说明 |
|-----|------|------|
| 用户与权限管理 | [user-management.md](./operation/user-management.md) | 用户创建、角色分配、权限管理 |
| 日常操作 | [daily-operation.md](./operation/daily-operation.md) | 系统日常操作指南 |
| 常见问题排查 | [troubleshooting.md](./operation/troubleshooting.md) | 常见问题诊断与解决 |

## SOP 编写规范

每个 SOP 必须包含以下部分：

1. **前置条件**：执行前需要准备什么
2. **操作步骤**：逐步操作说明（每步不超过 10 个子步骤）
3. **预期结果**：每步操作后应看到的结果
4. **异常处理**：可能遇到的问题及解决方案
5. **验证方法**：如何确认操作成功
