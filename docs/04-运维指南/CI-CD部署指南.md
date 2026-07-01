# CI/CD 部署指南

> 面向运维人员与新成员的可操作性文档。本指南基于仓库 `.github/workflows/` 下的实际配置编写，描述代码从提交到上线的完整流水线、所需密钥配置、手动操作步骤及常见故障排查。

---

## 1. 流水线总览

### 1.1 串联关系

本仓库 CI/CD 由三条独立但串联的 GitHub Actions 工作流组成，通过 `workflow_run` 触发器实现「CI 通过 → 镜像发布 → 自动部署」的链式执行：

```
┌────────────────────┐     workflow_run      ┌────────────────────┐     workflow_run      ┌────────────────────┐
│   CI/CD Pipeline   │  ────(success)────▶   │  Docker Publish    │  ────(success)────▶   │ Deploy to Production│
│   (.github/.../    │                        │  (.github/.../     │                        │ (.github/.../      │
│    ci.yml)         │                        │   docker-publish.yml)│                      │  deploy.yml)       │
└────────────────────┘                        └────────────────────┘                        └────────────────────┘
        │                                              │                                              │
        │ 触发:                                         │ 触发:                                         │ 触发:
        │ - push main/develop                          │ - workflow_run (CI 成功)                      │ - workflow_run (镜像发布成功)
        │ - PR  → main/develop                          │ - push tag v*                                │ - workflow_dispatch (手动)
        │                                              │ - workflow_dispatch (手动)                    │
        ▼                                              ▼                                              ▼
  unit-test → e2e-test → build                  构建 Docker 镜像并推送 GHCR                  SSH 登录服务器，拉镜像、
  (lint/ts-check/coverage/E2E/构建)             (ghcr.io/snqig/vnerp)                         滚动重启、健康检查
```

> **关键点**：每条 workflow 仅在上一条 `conclusion == 'success'` 时才会触发；任意一环失败，后续不会自动执行。

### 1.2 Workflow 清单

| Workflow 文件 | 名称 | 触发条件 | 作用 | 产物 |
| --- | --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI/CD Pipeline | push 到 `main`/`develop`；PR 到 `main`/`develop` | 单元测试、TS 类型检查、覆盖率卡点、E2E 测试、构建 | `coverage-report`、`playwright-report`、`build-output` 构建产物 |
| `.github/workflows/docker-publish.yml` | Docker Publish | CI 成功（main）；push tag `v*`；手动触发 | 构建 Docker 镜像并推送至 GHCR | `ghcr.io/snqig/vnerp:{latest,版本,sha}` 镜像 |
| `.github/workflows/deploy.yml` | Deploy to Production | Docker Publish 成功（main）；手动触发 | SSH 登录服务器，拉取最新镜像，滚动重启 app 容器，执行健康检查 | 生产环境更新到最新版本 |

### 1.3 CI 内部 Job 依赖

```
unit-test ──▶ e2e-test ──▶ build (仅 main 分支)
```

- `unit-test`：lint → ts-check → test:coverage（覆盖率阈值：lines/functions 80、branches 70、statements 80，不达标即失败）
- `e2e-test`：依赖 `unit-test` 通过；安装 Playwright → 构建 → 启动应用 → 跑 E2E
- `build`：仅当 `github.ref == 'refs/heads/main'` 才执行，上传 `.next/` 构建产物

---

## 2. GitHub Secrets 配置

部署流水线通过 SSH 连接生产服务器，需要在 GitHub 仓库中预先配置以下 5 个 Secret。

### 2.1 必需 Secret 清单

| Secret 名称 | 含义 | 示例值 | 获取方式 |
| --- | --- | --- | --- |
| `DEPLOY_HOST` | 部署服务器 IP 或域名 | `1.2.3.4` 或 `vnerp.example.com` | 服务器公网 IP；云厂商控制台查看 |
| `DEPLOY_USER` | SSH 登录用户名 | `deploy` 或 `root` | 在服务器上创建专用部署账号；建议非 root |
| `DEPLOY_SSH_KEY` | SSH 私钥（完整内容，含 `-----BEGIN/END...-----`） | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` | 由 `ssh-keygen` 生成，**私钥**填入 Secret，**公钥**写入服务器 `~/.ssh/authorized_keys` |
| `DEPLOY_PATH` | 服务器上项目路径 | `/opt/vnerp` | 项目代码在服务器上的绝对路径，需包含 `docker-compose.prod.yml` |
| `DEPLOY_PORT` | SSH 端口 | `22`（默认）或 `2222` | 服务器 sshd 配置 `Port`；为空时 deploy.yml 默认使用 22 |

### 2.2 配置步骤

1. 打开 GitHub 仓库页面，点击 **Settings** 选项卡
2. 左侧菜单选择 **Secrets and variables** → **Actions**
3. 点击 **New repository secret** 按钮
4. 在 **Name** 输入框填入 Secret 名称（如 `DEPLOY_HOST`）
5. 在 **Secret** 输入框填入对应值
6. 点击 **Add secret** 保存
7. 重复以上步骤，直至 5 个 Secret 全部配置完成

> **验证**：配置完成后，在 Secrets 列表应能看到 5 条以 `DEPLOY_` 开头的条目（值被掩码显示）。

### 2.3 SSH 密钥生成

在本地或服务器上执行以下命令生成 ed25519 密钥对：

```bash
# 生成密钥对（建议使用专用名称避免覆盖现有密钥）
ssh-keygen -t ed25519 -C "vnerp-deploy" -f ~/.ssh/vnerp-deploy

# 将生成两个文件：
#   ~/.ssh/vnerp-deploy       <- 私钥（完整内容粘贴到 DEPLOY_SSH_KEY）
#   ~/.ssh/vnerp-deploy.pub   <- 公钥（追加到服务器 ~/.ssh/authorized_keys）
```

**服务器侧配置**：

```bash
# 登录部署服务器
ssh <DEPLOY_USER>@<DEPLOY_HOST>

# 追加公钥到 authorized_keys
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<公钥内容>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**权限要求**：

- `~/.ssh` 目录权限 `700`
- `~/.ssh/authorized_keys` 权限 `600`
- 用户家目录不能对 group/other 可写（否则 sshd 拒绝认证）

### 2.4 SSH 连接自检

配置 Secret 前建议在本地验证连接：

```bash
ssh -i ~/.ssh/vnerp-deploy -p <DEPLOY_PORT> <DEPLOY_USER>@<DEPLOY_HOST> "echo ok && pwd"
```

输出 `ok` 及家目录路径则表示密钥与权限配置正确。

---

## 3. 手动触发部署

### 3.1 触发步骤

1. 打开 GitHub 仓库页面，点击 **Actions** 选项卡
2. 在左侧 Workflow 列表中点击 **Deploy to Production**
3. 右上角点击 **Run workflow** 下拉按钮
4. **Branch** 选择 `main`
5. 点击绿色 **Run workflow** 按钮确认
6. 列表中会出现一条新的运行记录，点击进入查看实时日志

### 3.2 前提条件

- **Docker Publish 流水线需先成功**：自动触发场景下，deploy 仅在 Docker Publish 成功后执行。手动触发时也会执行 deploy 脚本，但脚本内会执行 `docker compose pull app`，若镜像不存在将拉取失败。
- **服务器环境就绪**：
  - 已安装 Docker 与 Docker Compose
  - `DEPLOY_PATH` 路径下存在 `docker-compose.prod.yml` 与 `.env.production`
  - 服务器已登录 GHCR（若仓库为 private，需 `echo <PAT> | docker login ghcr.io -u <user> --password-stdin`）
- **GitHub Secrets 已配置**：见第 2 节

### 3.3 审批机制（Environment Protection）

`deploy.yml` 中 job 配置了 `environment: production`，可在 GitHub 仓库中配置审批人：

1. 进入仓库 **Settings** → **Environments**
2. 点击 **production**（若不存在则点击 **New environment** 创建名为 `production` 的环境）
3. 勾选 **Required reviewers**，添加审批人（团队成员用户名）
4. 可选：配置 **Deployment branches** 限制为 `main` 分支
5. 点击 **Save protection rules**

配置后，每次部署（含手动与自动触发）会暂停在审批环节，等待任一审批人点击 **Approve** 后才会执行 SSH 部署脚本。**强烈建议生产环境启用此机制**。

---

## 4. 本地模拟 CI 流水线

推送代码前可在本地复现 CI 的核心检查步骤，避免反复触发远程流水线浪费时间。

### 4.1 依赖安装

```bash
pnpm install --frozen-lockfile
```

### 4.2 检查步骤

| 序号 | 命令 | 作用 | 通过标准 |
| --- | --- | --- | --- |
| 1 | `pnpm lint` | ESLint 检查 `src/` 目录 | 退出码 `0`，无 error/warning |
| 2 | `pnpm ts-check` | TypeScript 类型检查（`tsc --noEmit`） | 退出码 `0`，无类型错误 |
| 3 | `pnpm test:coverage` | 运行 vitest 单元测试并生成覆盖率报告 | 退出码 `0`；覆盖率阈值：lines/functions ≥80%、branches ≥70%、statements ≥80% |
| 4 | `pnpm build` | Next.js 生产构建（`next build`） | 退出码 `0`，`.next/` 目录生成 |

### 4.3 一键本地预检

```bash
pnpm lint && pnpm ts-check && pnpm test:coverage && pnpm build && echo "✅ 本地预检通过，可安全推送"
```

### 4.4 覆盖率报告

执行 `pnpm test:coverage` 后，覆盖率报告生成在 `coverage/` 目录，浏览器打开 `coverage/index.html` 可查看逐文件覆盖率详情。

### 4.5 E2E 测试（可选）

```bash
pnpm test:install        # 安装 Playwright 浏览器
pnpm build               # 先构建
pnpm start &             # 后台启动应用
npx wait-on http://localhost:5000 --timeout 60000
pnpm test                # 运行 E2E
```

---

## 5. Git 钩子说明

本仓库通过 Husky 在本地提交时自动执行检查。钩子脚本位于 `.husky/` 目录。

### 5.1 钩子清单

| 钩子 | 触发时机 | 执行命令 | 作用 |
| --- | --- | --- | --- |
| `pre-commit` | `git commit` 前 | `pnpm exec lint-staged` | 仅对暂存区（staged）文件运行 ESLint/Prettier 等格式化与检查，自动修复后重新暂存 |
| `commit-msg` | `git commit` 提交信息校验 | `pnpm exec commitlint --edit $1` | 校验 commit message 是否符合 Conventional Commits 规范（如 `feat:`、`fix:`、`docs:` 等） |
| `pre-push` | `git push` 前 | `pnpm test:unit:run` | 运行 vitest 单元测试（不带覆盖率），失败则阻止推送 |

### 5.2 commit message 规范示例

```bash
git commit -m "feat(auth): 新增用户登录接口"     # ✅ 合规
git commit -m "fix(db): 修复连接池泄漏问题"      # ✅ 合规
git commit -m "更新了点东西"                    # ❌ 不合规，会被 commit-msg 拒绝
```

### 5.3 跳过钩子（仅限紧急情况）

```bash
git commit --no-verify -m "hotfix: 紧急修复"
git push --no-verify
```

> ⚠️ **风险提示**：
> - 跳过 `pre-commit` 可能将未通过 lint 的代码提交到仓库
> - 跳过 `pre-push` 可能将失败的单元测试推到远程，导致 CI 流水线失败
> - 跳过钩子不会绕过远程 CI，CI 仍会执行完整检查
> - **生产分支禁止使用 `--no-verify`**，仅在紧急 hotfix 且充分本地验证后使用

### 5.4 钩子安装与重装

克隆仓库后执行 `pnpm install` 会自动安装 Husky 钩子。若钩子未生效：

```bash
pnpm exec husky install
```

---

## 6. 镜像管理

### 6.1 镜像地址

所有镜像推送至 GitHub Container Registry：

```
ghcr.io/snqig/vnerp
```

> 仓库路径来源于 `docker-publish.yml` 中 `IMAGE_NAME: ${{ github.repository }}`，实际地址取决于仓库 owner。当前文档基于 `snqig/vnerp` 仓库编写。

### 6.2 标签策略

`docker-publish.yml` 中 `docker/metadata-action` 配置了以下标签生成规则：

| 标签格式 | 触发场景 | 示例 |
| --- | --- | --- |
| `latest` | 默认分支（main）构建 | `ghcr.io/snqig/vnerp:latest` |
| `{version}` | push tag `v*` 时，按语义化版本生成 | `v1.2.3` → `ghcr.io/snqig/vnerp:1.2.3` |
| `{major}.{minor}` | push tag `v*` 时，同时生成大版本号标签 | `v1.2.3` → `ghcr.io/snqig/vnerp:1.2` |
| `sha-xxxxxx` | 每次构建均生成（提交哈希短格式） | `ghcr.io/snqig/vnerp:sha-a1b2c3d` |

### 6.3 常用命令

```bash
# 拉取最新镜像
docker pull ghcr.io/snqig/vnerp:latest

# 拉取指定版本
docker pull ghcr.io/snqig/vnerp:1.2.3

# 查看本地已拉取的镜像
docker images ghcr.io/snqig/vnerp

# 查看镜像详情（包含标签、构建时间、大小）
docker inspect ghcr.io/snqig/vnerp:latest

# 登录 GHCR（私有仓库需登录）
echo <GITHUB_PAT> | docker login ghcr.io -u <github-username> --password-stdin
```

### 6.4 版本发布流程

1. 确认 `main` 分支 CI 已通过
2. 在本地打 tag：`git tag v1.2.3 && git push origin v1.2.3`
3. `docker-publish.yml` 由 `push: tags: ['v*']` 触发，构建并推送 `1.2.3` 与 `1.2` 标签
4. （可选）在 GitHub Releases 创建 Release Notes

### 6.5 镜像清理

部署脚本中已配置 `docker image prune -f --filter "until=24h"`，每次部署后自动清理 24 小时前的悬空镜像。如需手动清理：

```bash
# 清理悬空镜像（dangling）
docker image prune -f

# 清理所有未被使用的镜像
docker image prune -a -f
```

---

## 7. 故障排查

### 7.1 常见问题

| 问题 | 可能原因 | 解决方法 |
| --- | --- | --- |
| **CI 流水线失败** | 1. ESLint 报错<br>2. TypeScript 类型错误<br>3. 单元测试失败或覆盖率不达标<br>4. E2E 测试失败 | 1. 本地执行 `pnpm lint` 修复<br>2. 本地执行 `pnpm ts-check` 修复<br>3. 本地执行 `pnpm test:coverage` 查看覆盖率报告，补充测试用例<br>4. 在 Actions 日志中查看 Playwright 失败截图，下载 `playwright-report` artifact 排查 |
| **镜像推送失败** | 1. `GITHUB_TOKEN` 权限不足<br>2. GHCR 登录失败<br>3. Dockerfile 构建错误 | 1. 确认 `docker-publish.yml` 中 `permissions: packages: write` 已配置（当前已配置）<br>2. 确认仓库 Settings → Actions → General → Workflow permissions 勾选了 "Read and write permissions"<br>3. 本地执行 `docker build -t test .` 验证 Dockerfile |
| **部署健康检查失败** | 1. 应用启动慢，5 秒内未就绪<br>2. 应用启动报错（环境变量缺失、DB 连接失败）<br>3. `/api/health` 接口不存在或返回非 2xx | 1. SSH 登录服务器执行 `docker logs vnerp-app-prod --tail 100` 查看应用日志<br>2. 检查 `.env.production` 中 `DB_*`、`JWT_SECRET`、`CORS_ALLOW_ORIGIN` 是否完整<br>3. 确认 `docker compose -f docker-compose.prod.yml ps` 中 mysql/redis/app 均为 healthy<br>4. 手动验证：`curl -v http://localhost:5000/api/health` |
| **SSH 连接失败** | 1. `DEPLOY_SSH_KEY` 私钥内容不完整或格式错误<br>2. 服务器 `authorized_keys` 未配置公钥<br>3. `DEPLOY_HOST`/`DEPLOY_PORT` 错误<br>4. 服务器防火墙拦截<br>5. 文件权限错误 | 1. 重新复制私钥**完整内容**（含 BEGIN/END 行）到 Secret<br>2. 在服务器执行 `cat ~/.ssh/authorized_keys` 确认公钥存在<br>3. 核对 IP 与端口<br>4. 检查安全组/iptables 是否放行 SSH 端口<br>5. 确认 `~/.ssh` 700、`authorized_keys` 600 |
| **`docker compose pull app` 失败** | 1. 服务器未登录 GHCR（私有镜像）<br>2. 镜像不存在（Docker Publish 未成功） | 1. 服务器执行 `echo <PAT> \| docker login ghcr.io -u <user> --password-stdin`（PAT 需 `read:packages` 权限）<br>2. 在 Actions 页面确认 Docker Publish 已成功执行 |
| **`git pull --ff-only` 失败** | 1. 服务器代码与远程有分叉<br>2. 服务器有未提交的本地修改 | 1. SSH 登录服务器，进入 `DEPLOY_PATH` 执行 `git status` 与 `git log --oneline -5`<br>2. 必要时 `git reset --hard origin/main`（注意会丢失服务器本地修改，谨慎操作） |
| **workflow_run 未触发下游** | 1. 上游 workflow 未在 `main` 分支触发<br>2. 上游 conclusion 不是 `success` | 1. 确认 push 到的是 `main` 分支（develop 分支不会触发镜像发布与部署）<br>2. 在 Actions 页面查看上游运行结果是否为绿色 ✓ |
| **手动部署无反应** | 1. Environment `production` 配置了 Required reviewers，等待审批中 | 1. 在 Actions 运行详情页查看是否显示 "Waiting for review"<br>2. 通知审批人前往 Approve |

### 7.2 日志查看速查

```bash
# 服务器侧查看应用日志
ssh <DEPLOY_USER>@<DEPLOY_HOST>
cd <DEPLOY_PATH>
docker compose -f docker-compose.prod.yml logs --tail 200 app

# 实时跟踪日志
docker compose -f docker-compose.prod.yml logs -f app

# 查看所有服务状态
docker compose -f docker-compose.prod.yml ps

# 查看某个服务详细状态
docker inspect vnerp-app-prod | grep -A 10 "State"
```

### 7.3 回滚操作

部署失败或上线后发现问题需要回滚到上一版本：

```bash
ssh <DEPLOY_USER>@<DEPLOY_HOST>
cd <DEPLOY_PATH>

# 1. 查看最近的镜像标签（通过 git log 找到上一个 commit hash）
git log --oneline -10

# 2. 拉取指定历史版本的镜像（sha 标签）
docker pull ghcr.io/snqig/vnerp:sha-<上一版本 commit hash 短格式>

# 3. 修改 docker-compose.prod.yml 中 app 服务的 image 字段
#    或使用 tag 变量：image: ghcr.io/snqig/vnerp:sha-<hash>

# 4. 重启
docker compose -f docker-compose.prod.yml up -d --no-deps app

# 5. 健康检查
curl -fsS http://localhost:5000/api/health
```

> **建议**：每次发布前记录当前线上 commit hash，便于快速回滚。

---

## 附录：相关文件索引

| 文件 | 说明 |
| --- | --- |
| `.github/workflows/ci.yml` | CI 流水线（lint/test/E2E/build） |
| `.github/workflows/docker-publish.yml` | Docker 镜像构建与发布至 GHCR |
| `.github/workflows/deploy.yml` | 生产环境 SSH 部署 |
| `.github/dependabot.yml` | 依赖自动更新配置（npm/docker/github-actions，每周一检查） |
| `.husky/pre-commit` | 提交前 lint-staged |
| `.husky/commit-msg` | 提交信息 commitlint 校验 |
| `.husky/pre-push` | 推送前单元测试 |
| `docker-compose.prod.yml` | 生产环境 Docker Compose 配置（mysql + redis + app） |
| `Dockerfile` | 应用镜像构建文件 |

---

## 附录：Dependabot 说明

`.github/dependabot.yml` 配置了三类依赖的自动更新，每周一 `09:00 Asia/Shanghai` 检查，最多同时开启 5 个 PR：

| 依赖类型 | commit prefix | 标签 |
| --- | --- | --- |
| npm | `build(deps)` | `dependencies`、`npm` |
| Docker 基础镜像 | `build(docker)` | `dependencies`、`docker` |
| GitHub Actions | `ci(deps)` | `dependencies`、`github-actions` |

Dependabot 创建的 PR 通过 CI 后可合并，**建议合并后观察一次完整流水线再上线**。

---

最后更新：2026-07-01
