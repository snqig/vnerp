# 贡献指南

感谢您对 vnERP 项目的关注！本文档描述了参与项目开发的流程与规范。

## 开发环境准备

1. Node.js 20+（建议使用 [.nvmrc](.nvmrc) 锁定版本）
2. pnpm 9+（`corepack enable && corepack prepare pnpm@latest --activate`）
3. MySQL 8.0+（utf8mb4 字符集）
4. Redis（可选，缺失时自动降级为内存模式）

```bash
pnpm install
cp .env.example .env
# 编辑 .env 配置数据库连接等
pnpm setup:db
pnpm dev
```

## 开发流程

### 分支策略

- `main`：生产分支，仅通过 PR 合入
- `develop`：开发集成分支
- 功能分支：`feat/<module>-<description>`（如 `feat/standard-card-i18n`）
- 修复分支：`fix/<module>-<description>`

### 提交规范（Conventional Commits）

```
<type>[scope]: <description>

[optional body]
```

| Type | 用途 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| refactor | 重构 |
| docs | 文档 |
| test | 测试 |
| chore | 构建/工具 |
| perf | 性能优化 |

### 质量门禁

提交前自动运行（husky pre-commit + lint-staged）：

1. ESLint（`pnpm lint`）
2. Prettier 格式化
3. TypeScript 类型检查（`pnpm ts-check`）

提交前手动运行：

```bash
pnpm test:coverage   # 单元测试 + 覆盖率
pnpm build           # 生产构建验证
```

### PR 要求

1. PR 标题遵循 Conventional Commits 格式
2. 描述包含：变更摘要、测试方案
3. CI 所有检查通过（lint + type-check + unit-test + e2e）
4. 至少一名 Reviewer 批准

## 架构规范

项目采用 DDD 分层架构，依赖方向：app → application → domain ← infrastructure

- **domain**：领域模型，不依赖任何外部层
- **application**：应用服务/事件处理器，依赖 domain 接口
- **infrastructure**：基础设施实现，实现 domain 接口
- **app**：Next.js 页面和 API 路由（Thin Controller）

详见 [docs/07-决策记录/](docs/07-决策记录/) 中的架构决策记录。

## 国际化（i18n）

- 所有用户可见文本必须使用 next-intl 翻译函数
- 4 语言文件保持同步：en / zh-CN / zh-TW / vi
- 禁止硬编码中文（ESLint 规则会检测）

## 数据库迁移

- 迁移文件位于 `database/migrations/`，按序号命名
- Drizzle schema 定义在 `src/lib/db/schema.ts`
- 使用 `pnpm setup:db` 执行迁移
- 禁止 SQL 与 Drizzle 双轨维护

## 问题反馈

- Bug 报告：使用 GitHub Issue，附复现步骤和错误日志
- 功能建议：先开 Issue 讨论，确认后再实现
