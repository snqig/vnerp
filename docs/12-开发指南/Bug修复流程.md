# Bug 修复流程

本文档说明 印刷生产经营信息管理系统 Print MIS 项目 Bug 修复的标准流程，确保问题可追溯、修复可验证、不引入回归。

## 1. Bug 报告与登记

每个 Bug 应在 issue 跟踪系统中登记，包含：

- **标题**：简洁描述现象（如"入库单审核后状态未变更"）。
- **复现步骤**：明确步骤，含 URL、请求参数、操作顺序。
- **期望行为** vs **实际行为**。
- **环境信息**：开发 / 测试 / 生产，浏览器，账号角色。
- **严重程度**：Blocker / Critical / Major / Minor。
- **关联日志**：服务端日志、`sys_operation_log`、`sys_login_log` 中相关记录。

## 2. 复现与定位

### 2.1 本地复现

```bash
git pull origin develop
pnpm install
pnpm setup:db --seed          # 或连接测试环境数据库
pnpm dev
```

按报告中步骤复现。如无法复现：

- 检查数据是否一致（生产数据 vs 种子数据）。
- 检查环境变量（`DEBUG_DB=true` 打印 SQL 日志）。
- 检查浏览器缓存与 token 是否过期。

### 2.2 日志排查

- 服务端：`src/lib/logger.ts` 输出的结构化日志（含 `traceId`、`userId`、`module`）。
- 数据库：`sys_operation_log`（操作日志）、`sys_login_log`（登录日志）、`audit_logs`（审计日志）。
- 客户端：浏览器 DevTools Network 与 Console。

### 2.3 二分定位

无法快速定位时使用二分：

1. 注释最近改动，确认是否回归。
2. 通过 `git log -p <file>` 查看可疑文件历史。
3. 使用 `console.log` 或 `logger.info` 添加临时日志缩小范围。

## 3. 修复实现

### 3.1 分支

```bash
git checkout -b fix/<scope>-<bug-id> develop
```

### 3.2 最小变更原则

- 仅修改导致 Bug 的代码，不重构、不优化无关逻辑。
- 避免引入新依赖。
- 数据库变更必须生成 Drizzle 迁移并备份。

### 3.3 测试用例

为 Bug 编写回归测试，覆盖原失败场景：

```ts
// src/lib/<module>.test.ts
import { describe, it, expect } from 'vitest';
import { SampleService } from './sample-service';

describe('SampleService (Bug #123)', () => {
  it('应在审核后更新状态为 approved', async () => {
    const result = await SampleService.audit({ id: 1, action: 'approve' });
    expect(result.status).toBe('approved');
  });
});
```

运行：

```bash
pnpm test:unit:run
pnpm test                   # E2E（如涉及 UI）
```

### 3.4 代码审查要点

- 是否使用参数化查询（无 SQL 注入）。
- 是否使用 `withAuthAndErrorHandler`（认证与错误处理）。
- 是否使用 `useTranslations`（无硬编码中文）。
- 是否破坏既有测试。
- 是否需要数据库迁移与备份。

## 4. 提交与合并

### 4.1 提交信息

```
fix(<scope>): <简短描述>

复现：<issue 链接>
原因：<根本原因>
方案：<修复思路>
影响：<影响范围>

Issue: #<bug-id>
```

示例：

```
fix(warehouse): 修复入库单审核后状态未变更

复现：#123
原因：audit 接口缺少 UPDATE 语句
方案：在 transaction 中补充状态更新
影响：warehouse/inbound/audit 路由

Issue: #123
```

### 4.2 PR 模板

PR 描述应包含：

- 问题背景与根因。
- 修复方案与变更文件列表。
- 测试方式（手动 / 自动）。
- 是否需要数据库迁移。
- 是否需要环境变量调整。

参考 `.github/PULL_REQUEST_TEMPLATE.md`。

### 4.3 合并

- 通过 husky 钩子（lint + commitlint）。
- 至少 1 名 reviewer approve。
- CI 通过（lint / ts-check / unit test）。
- 合并到 `develop`，验证后 cherry-pick 或 merge 到 `main`。

## 5. 验证与发布

### 5.1 测试环境验证

```bash
# 部署到测试环境
docker compose -f docker-compose.prod.yml --env-file .env.test up -d --build app
```

按原复现步骤验证，确认现象消失。回归测试关键路径（登录、入库、出库、订单等）。

### 5.2 生产发布

```bash
# 备份（如涉及数据库变更）
mysqldump -h 127.0.0.1 -u root -p vnerp > pre_fix_$(date +%Y%m%d).sql

# 执行迁移（如有）
pnpm db:migrate

# 部署
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build app
```

### 5.3 上线后监控

- 观察 `/api/health` 与容器日志 30 分钟。
- 检查错误率与响应时间。
- 确认无新告警。

## 6. 复盘

如 Bug 严重程度为 Blocker / Critical，组织复盘：

- 根本原因（编码疏忽 / 设计缺陷 / 测试缺失 / 流程问题）。
- 改进措施（增加测试用例 / 加固 lint 规则 / 调整流程）。
- 记录到 `docs/08-变更记录/Bug修复-XXX.md`。

## 7. 紧急修复（Hotfix）

生产紧急 Bug 流程：

1. 从 `main` 切出 `hotfix/<scope>-<bug-id>`。
2. 最小化修复 + 测试。
3. PR 直接到 `main`，加快 review。
4. 发布后 cherry-pick 回 `develop`。
5. 不走完整流程，但事后补文档与测试。

## 8. 常见 Bug 类型与排查方向

| 类型 | 排查方向 |
|------|---------|
| 401 / token 失效 | `src/lib/auth.ts`、`src/lib/token-blacklist.ts`、Redis 连接 |
| 权限不足 | `sys_role_menu` 关联、`api-permissions.ts` 中间件 |
| 数据不一致 | 事务是否正确使用、`soft-delete.ts` 的 deleted 字段 |
| 性能问题 | `src/lib/performance/`、`DEBUG_DB=true` 看 SQL 慢查询 |
| Hydration 错误 | 服务端 / 客户端 locale 一致性、`IntlProvider` 配置 |
| 中文乱码 | MySQL 字符集 `utf8mb4`、collation `utf8mb4_0900_ai_ci` |

> 最后更新：2026-06-30
