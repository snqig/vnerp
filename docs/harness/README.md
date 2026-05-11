# 测试框架总览

> 核心原则：自动化优先、覆盖全面、可重复执行

## 测试架构

```
harness/
├── unit/                    # 单元测试（Vitest）
│   ├── models/              # 数据模型测试
│   ├── controllers/         # 控制器/API测试
│   └── services/            # 服务层/工具函数测试
├── integration/             # 集成测试
│   ├── api/                 # API集成测试
│   ├── database/            # 数据库集成测试
│   └── modules/             # 模块间集成测试
├── e2e/                     # 端到端测试（Playwright）
│   ├── production/          # 生产流程E2E测试
│   ├── warehouse/           # 仓库流程E2E测试
│   └── purchase/            # 采购流程E2E测试
├── fixtures/                # 测试数据夹具
│   ├── base-data.sql        # 基础测试数据
│   ├── production-data.sql  # 生产测试数据
│   └── warehouse-data.sql   # 仓库测试数据
└── scripts/                 # 测试辅助脚本
    ├── test-runner.sh       # 测试执行脚本
    ├── data-generator.py    # 测试数据生成器
    └── report-generator.sh  # 测试报告生成脚本
```

## 测试工具

| 工具 | 用途 | 配置文件 |
|------|------|---------|
| Vitest | 单元测试 | `vitest.config.ts` |
| Playwright | E2E 测试 | `playwright.config.ts` |
| MySQL | 测试数据库 | `.env.test` |

## 测试命令

```bash
# 单元测试
pnpm test:unit              # 运行所有单元测试
pnpm test:unit:run          # 运行一次（不监听）
pnpm test:coverage          # 生成覆盖率报告

# E2E 测试
pnpm test                   # 运行所有 E2E 测试
pnpm test:headed            # 有头模式运行
pnpm test:ui                # Playwright UI 模式
pnpm test:report            # 查看测试报告

# 类型检查
pnpm ts-check               # TypeScript 类型检查

# 代码质量
pnpm lint                   # ESLint 检查
pnpm format:check           # Prettier 格式检查
```

## 覆盖率目标

| 层级 | 目标覆盖率 | 当前 |
|------|-----------|------|
| 工具函数 (lib/) | >= 80% | - |
| API 路由 (api/) | >= 60% | - |
| 组件 (components/) | >= 50% | - |
| 页面 (app/) | E2E 覆盖 | - |

## 测试数据管理

- 使用独立测试数据库 `vnerp_test`
- 每次测试前自动重置数据
- 测试数据通过 fixtures 目录管理
- 禁止在生产数据库上运行测试
