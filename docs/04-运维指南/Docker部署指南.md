# Docker 部署指南

VNERP 系统基于 Docker / Docker Compose 容器化部署，采用 Next.js standalone 模式 + Nginx 反向代理架构。

## 目录

- [架构概览](#架构概览)
- [前置要求](#前置要求)
- [一键部署（推荐）](#一键部署推荐)
- [手动部署](#手动部署)
- [本地生产验证（非 Docker）](#本地生产验证非-docker)
- [性能测速验证](#性能测速验证)
- [SSL 证书配置](#ssl-证书配置)
- [环境变量](#环境变量)
- [健康检查](#健康检查)
- [数据持久化](#数据持久化)
- [安全加固](#安全加固)
- [日志管理](#日志管理)
- [备份与恢复](#备份与恢复)
- [滚动更新](#滚动更新)
- [CI/CD 自动化部署](#cicd-自动化部署)
- [常见问题](#常见问题)
- [生产环境检查清单](#生产环境检查清单)

---

## 架构概览

```
Internet
    │
    ▼
┌───────────────────────────────────┐
│  Nginx (80/443)                   │  SSL 终结 + gzip + 限流 + 安全头
│  nginx/nginx.conf                 │
└───────────────┬───────────────────┘
                │ HTTP (内网 5000)
                ▼
┌───────────────────────────────────┐
│  Next.js Standalone Server (:5000)│  node server.js（非 next start）
│  Dockerfile → CMD ["node", "server.js"]
└──────┬───────────────┬────────────┘
       │               │
       ▼               ▼
┌──────────┐    ┌──────────┐
│ MySQL 8  │    │ Redis 7  │
│ (:3306)  │    │ (:6379)  │
└──────────┘    └──────────┘
```

### 服务清单

| 服务 | 镜像 | 容器名 | 端口 | 说明 |
|------|------|--------|------|------|
| `nginx` | `nginx:1.27-alpine` | `vnerp-nginx-prod` | 80, 443 | 反向代理 + SSL 终结 |
| `app` | `vnerp-app:latest`（自构建） | `vnerp-app-prod` | 5000（内部） | Next.js standalone |
| `mysql` | `mysql:8.0` | `vnerp-mysql-prod` | 3306 | 主数据库 |
| `redis` | `redis:7-alpine` | `vnerp-redis-prod` | 6379 | 缓存 + 事件总线 |

### Standalone 模式说明

> **关键**：`next.config.ts` 中 `output: 'standalone'` 时，必须用 `node server.js` 启动，而非 `next start`。
>
> `next start` 与 standalone 不兼容，会触发警告：
> `"next start" does not work with "output: standalone" configuration.`
>
> Dockerfile 已正确使用 `CMD ["node", "server.js"]`，standalone 产物内嵌最小化 `node_modules`，最终镜像约 ~150MB。

---

## 前置要求

- Docker 20.10+（含 BuildKit）
- Docker Compose v2+
- 服务器配置：4GB+ 内存、50GB+ 磁盘
- Node.js 20（本地开发/测试用，已通过 `.nvmrc` 锁定版本）

---

## 一键部署（推荐）

项目提供 `scripts/deploy-docker.sh` 部署脚本，封装了构建、启动、健康检查、日志、滚动更新等操作。

### 1. 准备配置

```bash
# 克隆仓库
git clone <repo-url> && cd erp-project

# 创建生产环境配置
cp .env.production.example .env.production
vim .env.production    # 务必修改所有密码！

# 放置 SSL 证书（参考下方 SSL 证书配置章节）
mkdir -p nginx/ssl
cp /path/to/cert.pem nginx/ssl/cert.pem
cp /path/to/key.pem  nginx/ssl/key.pem
```

### 2. 一键启动

```bash
chmod +x scripts/deploy-docker.sh

./scripts/deploy-docker.sh up        # 构建并启动全部服务
./scripts/deploy-docker.sh health    # 健康检查 + 容器状态
./scripts/deploy-docker.sh logs      # 查看实时日志
```

### 3. 脚本命令一览

| 命令 | 说明 |
|------|------|
| `./scripts/deploy-docker.sh build` | 构建所有 Docker 镜像 |
| `./scripts/deploy-docker.sh up` | 启动全部服务（MySQL + Redis + App + Nginx） |
| `./scripts/deploy-docker.sh down` | 停止全部服务 |
| `./scripts/deploy-docker.sh logs` | 查看实时日志（最近 100 行） |
| `./scripts/deploy-docker.sh health` | 健康检查 + 容器状态 |
| `./scripts/deploy-docker.sh rebuild` | 重新构建并滚动更新 app（不影响数据库） |

---

## 手动部署

如需手动操作（不使用脚本）：

### 1. 构建镜像

```bash
# 构建所有服务镜像（利用 BuildKit 缓存加速）
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml --env-file .env.production build
```

### 2. 启动服务

```bash
# 启动全部服务（-d 后台运行）
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 查看启动状态
docker compose -f docker-compose.prod.yml ps
```

### 3. 验证部署

```bash
# 健康检查（通过 Nginx）
curl https://localhost/api/health

# 或直接检查 App（需进入容器网络）
docker exec vnerp-app-prod node -e \
  "require('http').get('http://127.0.0.1:5000/api/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d))})"
```

### 4. 停止服务

```bash
# 停止全部（数据卷保留）
docker compose -f docker-compose.prod.yml down

# ⚠️ 危险：停止并清理 named volume（redis_data 等）
# MySQL 使用 bind mount（./data/mysql），不受影响
# docker compose -f docker-compose.prod.yml down -v
```

---

## 本地生产验证（非 Docker）

在本地验证生产构建（无需 Docker）：

```bash
# 1. 构建生产产物
pnpm build

# 2. 启动 standalone 服务器（正确方式）
node .next/standalone/server.js

# 或使用 pnpm start（next start 有 standalone 警告，但功能正常）
pnpm start
```

> **注意**：`next start` 会触发 standalone 警告但不影响功能。生产环境（Docker）已使用 `node server.js`，无此问题。

### 开发环境（热重载）

```bash
pnpm install              # 安装依赖
pnpm run dev:webpack      # 启动 dev 服务器（webpack 模式，避免 Windows Turbopack 崩溃）
```

访问 http://localhost:5000

---

## 性能测速验证

项目提供 Playwright 自动化测速脚本，验证生产模式下页面 TTFB < 100ms。

### 运行测速

```bash
# 终端 1：启动生产服务器
pnpm build && pnpm start

# 终端 2：运行测速（复用已有服务器）
npx playwright test --config=playwright.speed.config.ts
```

### 测试内容

| 测试 | 说明 | 断言 |
|------|------|------|
| 多页面测速 | 8 个业务页面，每页测 3 次取最佳 TTFB | ≥75% 页面 TTFB < 100ms |
| 稳定性测速 | 用户管理页面连续刷新 10 次 | 平均 TTFB < 100ms，P90 < 150ms |

### 参考结果（生产模式）

| 页面 | TTFB | Full Load |
|------|------|-----------|
| 仪表盘 | 33ms | 83ms |
| 用户管理 | 34ms | 85ms |
| 角色管理 | 36ms | 87ms |
| 菜单管理 | 32ms | 83ms |
| 系统设置 | 30ms | 78ms |

> 对比 Dev 模式首次访问 2-9 秒（webpack 编译），生产模式提升 **60-280 倍**。

---

## SSL 证书配置

Nginx 反向代理需要 SSL 证书，放置于 `nginx/ssl/` 目录：

```
nginx/ssl/
├── cert.pem   # 证书文件（含中间证书链）
└── key.pem    # 私钥文件
```

### Let's Encrypt（免费，推荐）

```bash
# 安装 certbot
apt install certbot

# 获取证书
certbot certonly --standalone -d erp.your-domain.com

# 复制到项目目录
cp /etc/letsencrypt/live/erp.your-domain.com/fullchain.pem ./nginx/ssl/cert.pem
cp /etc/letsencrypt/live/erp.your-domain.com/privkey.pem   ./nginx/ssl/key.pem
```

### 自动续期

```bash
# 添加 crontab 每月续期
echo "0 3 1 * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/*/fullchain.pem /path/to/nginx/ssl/cert.pem && \
  cp /etc/letsencrypt/live/*/privkey.pem /path/to/nginx/ssl/key.pem && \
  docker compose -f docker-compose.prod.yml restart nginx" | crontab -
```

### 自签名（仅测试）

```bash
openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -days 365 -nodes -subj "/CN=localhost"
```

> 详细说明参考 [nginx/ssl/README.md](../../nginx/ssl/README.md)

---

## 环境变量

### 必须配置的变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | 强密码 |
| `DB_USER` | 应用数据库用户 | vnerp_app |
| `DB_PASSWORD` | 应用数据库密码 | 强密码 |
| `DB_NAME` | 数据库名 | vnerp |
| `JWT_SECRET` | JWT 签名密钥 | 64 字节随机十六进制 |
| `CORS_ALLOW_ORIGIN` | 允许的前端域名 | https://erp.example.com |

### 生成强密码 / 密钥

```bash
# 数据库密码
openssl rand -hex 32

# JWT 密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 可选配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HTTP_PORT` | 80 | Nginx HTTP 端口 |
| `HTTPS_PORT` | 443 | Nginx HTTPS 端口 |
| `APP_PORT` | 5000 | App 内部端口（不对外暴露） |
| `APP_VERSION` | 1.0.0 | 应用版本号（健康检查展示） |
| `LOG_LEVEL` | info | 日志级别 |
| `NEXT_PUBLIC_AUTH_COOKIE_MODE` | header | 认证模式（header/cookie） |
| `EVENT_BUS_TYPE` | db | 事件总线类型（db/memory） |

> 完整变量列表参考 [.env.production.example](../../.env.production.example)

---

## 健康检查

所有服务都配置了 Docker 健康检查，自动检测服务状态。

### 检查列表

| 服务 | 检查方式 | 间隔 | 超时 | 重试 | 启动宽限 |
|------|----------|------|------|------|----------|
| Nginx | `wget --spider` | 30s | 5s | 3次 | 10s |
| App | `/api/health` | 30s | 5s | 3次 | 60s |
| MySQL | `mysqladmin ping` | 10s | 5s | 5次 | 30s |
| Redis | `redis-cli ping` | 10s | 5s | 5次 | 10s |

### 查看健康状态

```bash
# 查看所有容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 查看某个容器的健康检查详情
docker inspect --format='{{json .State.Health}}' vnerp-app-prod | python3 -m json.tool
```

### 健康检查 API

`GET /api/health` 返回内容：

```json
{
  "status": "healthy",
  "timestamp": "2026-07-08T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "latency": 5,
  "checks": {
    "database": { "status": "healthy", "latency": 3 },
    "memory": { "status": "healthy", "message": "堆内存使用: 128MB / 512MB" },
    "uptime": { "status": "healthy", "message": "运行时间: 12小时" }
  }
}
```

- `status: healthy` → HTTP 200
- `status: degraded` → HTTP 503（部分检查失败）

---

## 数据持久化

### 数据卷列表

| 数据卷名 | 挂载路径 | 内容说明 | 备份策略 |
|----------|----------|----------|----------|
| `./data/mysql`（bind mount） | `/var/lib/mysql` | MySQL 数据文件 | 每日全量备份 |
| `redis_data` | `/data` | Redis RDB/AOF 文件 | 每小时快照 |
| `app_logs` | `/app/logs` | 应用日志 | 按天轮转，保留 30 天 |
| `app_uploads` | `/app/uploads` | 用户上传文件 | 每日增量备份 |
| `nginx_cache` | `/var/cache/nginx` | Nginx 缓存 | 无需备份 |
| `nginx_logs` | `/var/log/nginx` | Nginx 访问/错误日志 | 按天轮转 |

> MySQL 使用 bind mount（`./data/mysql`），`docker compose down -v` 不会删除业务数据。

---

## 安全加固

### 已实施的安全措施

#### 1. 非 root 用户运行
- Dockerfile 中创建 `nextjs` 用户（UID 1001）
- 应用进程以非 root 权限运行

#### 2. Linux Capabilities 最小化
```yaml
security_opt:
  - no-new-privileges:true    # 禁止提升权限
cap_drop:
  - ALL                       # 移除所有 capabilities
cap_add:
  - NET_BIND_SERVICE          # 仅保留绑定端口权限
```

#### 3. 资源限制
| 服务 | CPU 上限 | 内存上限 | CPU 预留 | 内存预留 |
|------|---------|---------|---------|---------|
| App | 2.0 | 2G | 0.25 | 256M |
| MySQL | 2.0 | 2G | 0.5 | 512M |
| Redis | 0.5 | 512M | 0.1 | 64M |
| Nginx | 1.0 | 256M | 0.25 | 64M |

#### 4. Nginx 安全头
- `Strict-Transport-Security` — HSTS 强制 HTTPS
- `X-Content-Type-Options: nosniff` — 防 MIME 嗅探
- `X-Frame-Options: DENY` — 防点击劫持
- `Referrer-Policy` — 限制 Referrer 泄露
- `Permissions-Policy` — 禁用摄像头/麦克风/定位

#### 5. 登录限流
Nginx 对 `/api/auth/login` 配置 10 req/s/IP 的限流，防止暴力破解。

#### 6. 镜像安全
- Alpine 基础镜像（更小攻击面）
- 多阶段构建（最终镜像不含构建工具）
- `.dockerignore` 排除 `.env`、`tests/`、`docs/` 等敏感/无用文件

### 推荐额外加固

```bash
# 启用 Docker 内容信任
export DOCKER_CONTENT_TRUST=1

# 定期扫描镜像漏洞
trivy image vnerp-app:latest
```

---

## 日志管理

### 日志驱动

生产环境使用 `json-file` 驱动，带轮转限制：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # 单个日志文件最大 10MB
    max-file: "5"      # 最多保留 5 个文件
```

### 查看日志

```bash
# 查看 app 日志（实时）
docker compose -f docker-compose.prod.yml logs -f app

# 查看 Nginx 日志
docker compose -f docker-compose.prod.yml logs -f nginx

# 查看最近 100 行
docker compose -f docker-compose.prod.yml logs --tail=100 app

# 查看所有服务日志
docker compose -f docker-compose.prod.yml logs -f
```

---

## 备份与恢复

### 数据库备份

```bash
# 创建备份
mkdir -p ./backups/mysql
docker exec vnerp-mysql-prod sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases vnerp --single-transaction --routines --triggers' \
  > ./backups/mysql/vnerp-$(date +%Y%m%d_%H%M%S).sql

# 压缩
gzip ./backups/mysql/vnerp-*.sql
```

### 恢复数据库

```bash
# 停止 app 服务
docker compose -f docker-compose.prod.yml stop app

# 恢复
docker exec -i vnerp-mysql-prod sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" vnerp' < backup.sql

# 重启
docker compose -f docker-compose.prod.yml start app
```

### Redis 备份

```bash
docker exec vnerp-redis-prod redis-cli BGSAVE
docker cp vnerp-redis-prod:/data/dump.rdb ./backups/redis/dump-$(date +%Y%m%d).rdb
```

---

## 滚动更新

### 使用部署脚本（推荐）

```bash
# 重新构建并滚动更新 app（不影响 MySQL/Redis/Nginx）
./scripts/deploy-docker.sh rebuild
```

### 手动滚动更新

```bash
# 重新构建 app 镜像
docker compose -f docker-compose.prod.yml --env-file .env.production build app

# 无停机更新（仅重启 app 服务）
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps --force-recreate app
```

---

## CI/CD 自动化部署

项目已集成 GitHub Actions 自动化流水线，推送到 `main` 分支即自动构建镜像、推送到 GHCR、并通过 SSH 滚动更新生产服务器。

### 流水线总览

```
push to main
    │
    ▼
┌─────────────────────────────┐
│  unit-test                  │  lint + ts-check + vitest 覆盖率卡点
└────────────┬────────────────┘
             ▼
┌─────────────────────────────┐
│  e2e-test                   │  Playwright 全量 E2E（需先 pnpm build + start）
└────────────┬────────────────┘
             ▼
┌─────────────────────────────┐
│  docker-publish             │  构建镜像 → 推送 ghcr.io/snqig/vnerp
│  (仅 main 分支 push)         │  打标签：sha-<git>、latest、YYYYMMDD
└────────────┬────────────────┘
             ▼
┌─────────────────────────────┐
│  deploy                     │  SSH 登录生产服务器
│  (production environment)   │  git pull → docker compose pull → up -d
│                             │  健康检查通过则清理旧镜像
└─────────────────────────────┘
```

### 流水线配置文件

| 文件 | 说明 |
|------|------|
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | 主流水线：unit-test → e2e-test → docker-publish → deploy |
| [.github/workflows/chromatic.yml](../../.github/workflows/chromatic.yml) | Chromatic 视觉回归测试（独立流水线） |

### 触发条件

| 事件 | 分支 | 触发的 Job |
|------|------|-----------|
| `push` | `main`、`develop` | unit-test → e2e-test |
| `pull_request` | `main`、`develop` | unit-test → e2e-test |
| `push` | `main` | unit-test → e2e-test → docker-publish → deploy |

> `docker-publish` 和 `deploy` 仅在 `main` 分支推送时触发，PR 不会发布镜像或部署。

### 镜像标签策略

推送到 GHCR 的镜像会同时打上三个标签：

| 标签 | 用途 | 示例 |
|------|------|------|
| `sha-<git-sha>` | 精确版本追溯，支持回滚 | `sha-a1b2c3d` |
| `latest` | 最新稳定版，生产部署使用 | `latest` |
| `YYYYMMDD` | 按日期归档 | `20260708` |

镜像地址：`ghcr.io/snqig/vnerp:<tag>`

### 配置 GitHub Secrets（必需）

在生产仓库的 `Settings → Secrets and variables → Actions` 中配置以下 Secrets：

| Secret 名 | 必填 | 说明 | 示例 |
|-----------|------|------|------|
| `DEPLOY_HOST` | ✅ | 生产服务器 IP 或域名 | `1.2.3.4` |
| `DEPLOY_USER` | ✅ | SSH 登录用户名 | `deploy` |
| `DEPLOY_SSH_KEY` | ✅ | SSH 私钥（完整内容） | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `DEPLOY_PORT` | ❌ | SSH 端口，默认 22 | `22` |
| `DEPLOY_PATH` | ❌ | 项目部署路径，默认 `/opt/vnerp` | `/opt/vnerp` |

> `GITHUB_TOKEN` 是 GitHub 自动注入的内置 token，无需手动配置，用于推送镜像到 GHCR。

### 配置 GitHub Environment（推荐）

流水线中 `deploy` job 使用了 `environment: production`。建议在仓库 `Settings → Environments` 中创建 `production` 环境，可附加：

- **Required reviewers**：要求人工确认后才执行部署
- **Deployment branches**：限制仅 `main` 分支可部署
- **Wait timer**：部署前等待 N 秒（可选，便于紧急取消）

### 生产服务器一次性准备

#### 1. 创建部署用户

```bash
# 在生产服务器上执行
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy
```

#### 2. 配置 SSH 密钥

```bash
# 在本地生成专用密钥（不使用个人密钥）
ssh-keygen -t ed25519 -C "vnerp-deploy" -f ~/.ssh/vnerp-deploy

# 将公钥追加到生产服务器
ssh-copy-id -i ~/.ssh/vnerp-deploy.pub deploy@<server-ip>

# 测试登录
ssh -i ~/.ssh/vnerp-deploy deploy@<server-ip>
```

#### 3. 克隆仓库并配置环境

```bash
# 以 deploy 用户登录
sudo su - deploy

# 克隆仓库
git clone https://github.com/snqig/vnerp.git /opt/vnerp
cd /opt/vnerp

# 配置生产环境变量
cp .env.production.example .env.production
vim .env.production    # 修改所有密码！

# 放置 SSL 证书
mkdir -p nginx/ssl
cp /path/to/cert.pem nginx/ssl/cert.pem
cp /path/to/key.pem  nginx/ssl/key.pem

# 首次启动（拉取镜像 + 启动全部服务）
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

#### 4. 登录 GHCR（拉取私有镜像）

```bash
# 使用 GitHub Personal Access Token（需 read:packages 权限）
echo "<YOUR_PAT>" | docker login ghcr.io -u <github-username> --password-stdin
```

> 若仓库为公开，可跳过此步骤。

### 部署流程详解

每次推送到 `main` 分支后，自动执行：

1. **单元测试** — lint + tsc + vitest（覆盖率卡点：lines/functions 80、branches 70）
2. **E2E 测试** — Playwright 全量回归（失败则中断流水线）
3. **构建镜像** — 基于 Dockerfile 多阶段构建，利用 GHA 缓存加速
4. **推送 GHCR** — 打 `sha-`、`latest`、`YYYYMMDD` 三个标签
5. **SSH 部署** — 登录生产服务器执行：
   ```bash
   git pull origin main
   docker compose -f docker-compose.prod.yml --env-file .env.production pull app
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps --force-recreate app
   ```
6. **健康检查** — 等待 15 秒后检查 `vnerp-app-prod` 容器健康状态
7. **清理旧镜像** — 健康检查通过后执行 `docker image prune -f`

### 部署状态查看

```bash
# 查看 GitHub Actions 执行状态
gh run list --limit 5

# 查看具体某次运行
gh run view <run-id>

# 实时查看部署日志
gh run watch <run-id>
```

### 手动触发部署

正常情况下推送到 `main` 即自动部署。如需手动重新部署某次提交：

```bash
# 方式 1：在 GitHub 网页端 Actions 页面点击 "Re-run all jobs"
# 方式 2：使用 gh CLI
gh run rerun <run-id>
```

### 回滚到历史版本

```bash
# 在生产服务器上执行
cd /opt/vnerp

# 查看可用的镜像标签
docker images ghcr.io/snqig/vnerp --format "table {{.Tag}}\t{{.CreatedAt}}"

# 修改 docker-compose.prod.yml 中的 image 标签为指定版本
# 例如从 latest 回滚到昨天的版本
sed -i 's|ghcr.io/snqig/vnerp:latest|ghcr.io/snqig/vnerp:20260707|' docker-compose.prod.yml

# 拉取并重启
docker compose -f docker-compose.prod.yml --env-file .env.production pull app
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps --force-recreate app

# 验证健康状态
docker inspect --format='{{.State.Health.Status}}' vnerp-app-prod
```

### CI/CD 故障排查

| 问题 | 排查方法 |
|------|---------|
| `docker-publish` 失败 | 检查 `GITHUB_TOKEN` 是否有 `packages: write` 权限（已在 yml 中声明） |
| `deploy` SSH 连接失败 | 验证 `DEPLOY_SSH_KEY` 私钥格式（需含 `-----BEGIN ... PRIVATE KEY-----` 头尾） |
| `deploy` 拉取镜像失败 | 确认生产服务器已 `docker login ghcr.io`，或仓库设为公开 |
| 健康检查未通过 | SSH 到服务器执行 `docker compose -f docker-compose.prod.yml logs --tail=50 app` 查看日志 |
| 覆盖率不达标 | 本地运行 `pnpm test:coverage` 检查 lines/functions 是否 ≥80% |

### 流水线优化建议

- **并发限制**：在 `deploy` job 中可加 `concurrency: production`，避免重复推送时并发部署
- **通知集成**：可加 Slack/钉钉 Webhook 通知部署结果
- **蓝绿部署**：当前为单实例滚动更新，如需零停机可扩展为蓝绿部署（需双倍资源）
- **镜像签名**：可集成 cosign 对镜像签名，生产服务器配置策略只拉取已签名镜像

---

## 常见问题

### Q1: 容器启动后立即退出？

```bash
# 查看日志定位问题
docker compose -f docker-compose.prod.yml logs app
docker inspect vnerp-app-prod --format='{{.State.ExitCode}}'
```

### Q2: 健康检查一直 unhealthy？

```bash
# 检查服务日志
docker compose -f docker-compose.prod.yml logs app --tail=50

# 手动测试健康检查
docker exec vnerp-app-prod node -e \
  "require('http').get('http://127.0.0.1:5000/api/health',r=>{process.exit(r.statusCode===200?0:1)})"
```

### Q3: Nginx 返回 502 Bad Gateway？

App 服务未就绪或已崩溃：
```bash
# 检查 app 容器状态
docker compose -f docker-compose.prod.yml ps app

# 查看 app 日志
docker compose -f docker-compose.prod.yml logs --tail=50 app
```

### Q4: SSL 证书错误？

```bash
# 检查证书文件是否存在
ls -la nginx/ssl/

# 验证证书
openssl x509 -in nginx/ssl/cert.pem -text -noout | head -20

# 测试 HTTPS
curl -vk https://localhost/api/health
```

### Q5: 端口冲突？

修改 `.env.production`：
```env
HTTP_PORT=8080
HTTPS_PORT=8443
```

### Q6: 如何进入容器调试？

```bash
docker exec -it vnerp-app-prod sh
docker exec -it vnerp-mysql-prod mysql -uroot -p
docker exec -it vnerp-redis-prod redis-cli
docker exec -it vnerp-nginx-prod sh
```

### Q7: `next start` 与 `node server.js` 的区别？

| 方式 | 兼容 standalone | 说明 |
|------|----------------|------|
| `node server.js` | ✅ | standalone 模式正确启动方式，Dockerfile 使用此方式 |
| `next start` | ⚠️ | 会触发警告，功能正常但非最佳实践 |

---

## 生产环境检查清单

部署前请确认：

- [ ] 所有密码已修改为强密码（`MYSQL_ROOT_PASSWORD`、`DB_PASSWORD`、`JWT_SECRET`）
- [ ] `CORS_ALLOW_ORIGIN` 已配置为正确域名（禁止 `*`）
- [ ] SSL 证书已放置到 `nginx/ssl/`（cert.pem + key.pem）
- [ ] 数据库已设置定期备份（cron + mysqldump）
- [ ] 防火墙仅开放 80/443 端口（App 5000 不对外暴露）
- [ ] 默认 admin 密码已修改（`admin/admin123` 仅用于初次登录）
- [ ] `DEBUG_DB=false`（生产环境关闭 SQL 日志）
- [ ] `NODE_ENV=production`
- [ ] `EVENT_BUS_TYPE=db`（生产环境使用 Redis 事件总线）
- [ ] 监控告警已配置（可选）
- [ ] 日志收集已配置（可选）

---

## 相关文件

| 文件 | 说明 |
|------|------|
| [Dockerfile](../../Dockerfile) | 多阶段构建，standalone 模式 |
| [docker-compose.prod.yml](../../docker-compose.prod.yml) | 生产编排（MySQL + Redis + App + Nginx） |
| [docker-compose.yml](../../docker-compose.yml) | 开发编排（MySQL + Redis） |
| [.dockerignore](../../.dockerignore) | Docker 构建排除列表 |
| [.env.production.example](../../.env.production.example) | 生产环境变量模板 |
| [.nvmrc](../../.nvmrc) | Node.js 版本锁定（20） |
| [nginx/nginx.conf](../../nginx/nginx.conf) | Nginx 反向代理配置 |
| [nginx/ssl/README.md](../../nginx/ssl/README.md) | SSL 证书获取指南 |
| [scripts/deploy-docker.sh](../../scripts/deploy-docker.sh) | 一键部署脚本 |
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | CI/CD 流水线（test → build → deploy） |
| [.github/workflows/chromatic.yml](../../.github/workflows/chromatic.yml) | Chromatic 视觉回归测试 |
| [playwright.speed.config.ts](../../playwright.speed.config.ts) | 性能测速 Playwright 配置 |
| [tests/page-speed.spec.ts](../../tests/page-speed.spec.ts) | 页面加载速度测试 |

---

> 最后更新：2026-07-08
