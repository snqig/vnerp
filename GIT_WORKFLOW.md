# Git 工作流规范（vnERPNext）

> 目的：让团队协作有清晰、可回退、可审计的历史；杜绝"仓库里混入与项目无关的目录/文件/密钥"这类混乱。
> 适用范围：`snqig/vnerp` 所有开发者。

---

## 1. 分支策略：Trunk-Based（主干开发）

```
main  ──●────●────●────●────●────●   (始终可部署，受保护，禁止强推)
          \  /      \  /
           ●         ●            (短生命周期 feature/fix/chore 分支)
```

- **`main`**：唯一长期分支，永远可部署。所有合入必须走 PR + CI 检查。
- **功能/修复分支**：从最新 `main` 切出，生命周期尽量短（1–3 天），合入后即删。
- **禁止**长期存在多个并行主干、禁止直接在 `main` 上提交、禁止 `git push --force` 到 `main`。

## 2. 分支命名

| 类型 | 前缀 | 示例 |
|------|------|------|
| 新功能 | `feat/` | `feat/quality-incoming-validation` |
| 缺陷修复 | `fix/` | `fix/stocktaking-diff-amount` |
| 清理/构建 | `chore/` | `chore/clean-repo-unrelated-files` |
| 文档 | `docs/` | `docs/api-contract` |
| 重构 | `refactor/` | `refactor/warehouse-repo` |
| 测试 | `test/` | `test/outbound-flow` |

## 3. 提交规范：Conventional Commits

格式：`类型(作用域): 简述`（仓库已启用 `commitlint` 校验，不符合会被钩子拦截）。

类型：`feat` `fix` `chore` `docs` `refactor` `test` `style` `perf` `ci`。

示例：
```
feat(quality): 进料检验提交前 zod 校验
fix(warehouse): 修复盘点差异金额 toFixed 崩溃
chore(repo): 移除与项目无关的调试产物并补全 .gitignore
```

原则：**一个提交只做一件事**，可独立 revert；标题用中文或英文均可，但同仓库保持一致。

## 4. 日常流程

```bash
git fetch origin
git checkout -b feat/my-work origin/main      # 从最新 main 切出
# ... 编辑代码 ...
git add <具体文件>                              # 只 add 改动文件，禁止 git add -A 一把梭
git commit -m "feat(x): ..."
git push -u origin feat/my-work
# 在 GitHub 打开 PR → main
```

## 5. Pull Request 规范

- **必须**通过 CI 检查（当前含 `i18n-consistency` 等强制项）。
- **至少 1 名**评审通过后方可合入。
- PR 描述说明：改了什么、为什么、如何验证、影响范围。
- 合入方式：默认 **Squash Merge**（保持 main 线性）；需要保留分支上下文时用 `--no-ff`。
- 合入后**删除**功能分支（`git branch -d feat/my-work`）。

## 6. 分支保护（已在 main 上启用，勿关闭）

- ❌ 禁止 force push
- ✅ 必须经 PR 合入
- ✅ 必须通过 required status check（`i18n-consistency` 等）
- ✅ `enforce admins`（管理员也受约束）

> 如确需重写历史（如彻底清理大文件/密钥），**先临时放宽保护 + 与团队同步**，完成后再恢复，且必须通知所有协作者重新 clone。

## 7. .gitignore 纪律（防止"无关文件入库"的核心）

仓库已配置严格的 `.gitignore`，**以下类型永不入库**：

- 调试/一次性脚本：`_*.html` `tmp_*.mjs` `extract_tables*.js` `colcheck.mjs` `devlog_*.txt` 等
- 报告/产物：`i18n-*` `eslint-*` `overview*` `inbound-*` `split_plan.json`
- 监控/基础设施：`prometheus/` `grafana/` `alertmanager/` `nginx/` `docker-compose.monitoring.yml`
- Agent/IDE 目录：`agency-agents/` `agency-agents-zh/` `.cursor/` `.claude/` 等
- 构建/依赖：`node_modules/` `.next/` `dist/`
- **密钥与凭据**：`auth.json` `*.pem` `*.key` `.env` `.env.local` `.env.*.local`

**铁律**：提交前 `git status` 检查，绝不 `git add -A` 把无关文件带进去。

## 8. 密钥与敏感文件

- **绝不**提交任何 JWT / cookie / 密码 / 私钥。已确认 `auth.json`（含 `access_token` cookie）已被忽略。
- 本地配置用 `.env.local`（已忽略），**不要**提交 `.env.*.local`。
- CI 所需的凭证走 **GitHub Secrets / CI 变量**，不落库。
- 若不慎提交了密钥：立即轮换密钥，并用 `git filter-repo` 或强制重写历史清除（见第 6 节流程）。

## 9. 冲突处理

```bash
git fetch origin
git rebase origin/main        # 在功能分支上变基到最新 main
# 解决冲突后
git rebase --continue
git push --force-with-lease   # 仅限自己的功能分支
```

## 10. 常用命令速查

| 场景 | 命令 |
|------|------|
| 看当前状态 | `git status -s` |
| 看提交历史 | `git log --oneline -10` |
| 放弃某文件改动 | `git restore <file>` |
| 暂存指定文件 | `git add <file>` |
| 撤销提交（保留改动） | `git reset --soft HEAD~1` |
| 创建 PR 分支 | `git checkout -b feat/x origin/main` |
| 推送到远端分支 | `git push -u origin feat/x` |

## 11. 本次清理（2026-09-10）

通过 PR `chore/clean-repo-unrelated-files` 从仓库移除 42 个与项目无关的文件（调试产物、i18n/eslint 报告、工作汇总截图、`prometheus/grafana/alertmanager/nginx` 监控配置、`wechat-community-qrcode.jpg` 等），并补全 `.gitignore` 防止回退。业务源码 `src/ scripts/ database/ tests/ public/ messages/ .github/` 等不受影响。

> 注：本规范文件（GIT_WORKFLOW.md）本身纳入版本控制，作为团队协作出门前约定。
