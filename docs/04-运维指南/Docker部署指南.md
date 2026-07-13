# Docker 部署指南

vnerp（印刷生产经营信息管理系统 Print MIS）基于 Docker / Docker Compose 容器化部署，采用 Next.js standalone 模式 + Nginx 反向代理架构。

## 目录

- [架构概览](#架构概览)
- [前置要求](#前置要求)
- [一键部署（推荐）](#一键部署推荐)
- [手动部署](#手动部署)
- [本地生产验证（非 Docker）](#本地生产验证非-docker)
- [SSL 证书配置](#ssl-证书配置)
- [环境变量](#环境变量)
- [健康检查](#健康检查)
- [数据持久化](#数据持久化)
- [安全加固](#安全加固)
- [日志管理](#日志管理)
- [备份与恢复](#备份与恢复)
- [滚动更新](#滚动更新)
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

### 服务清单（docker-compose.prod.yml）

| 服务 | 镜像 | 容器名 | 端口 | 说明 |
|------|------|--------|------|------|
| `nginx` | `nginx:1.27-alpine` | `vnerp-nginx-prod` | 80, 443（对外） | 反向代理 + SSL 终结 |
| `app` | `ghcr.io/snqig/vnerp:latest`（CI 推送） | `vnerp-app-prod` | 5000（仅 expose，由 Nginx 反代） | Next.js standalone |
| `mysql` | `mysql:8.0` | `vnerp-mysql-prod` | 3306（仅 expose） | 主数据库 |
| `redis` | `redis:7-alpine` | `vnerp-redis-prod` | 6379（仅 expose） | 缓存 + 事件总线 |

### Standalone 模式说明

> **关键**：`next.config.ts` 中 `output: 'standalone'` 时，必须用 `node server.js` 启动，而非 `next start`。
>
> `next start` 与 standalone 不兼容，会触发警告：`"next start" does not work with "output: standalone" configuration.`
>
> Dockerfile 已正确使用 `CMD ["node", "server.js"]`，standalone 产物内嵌最小化 `node_modules`，最终镜像约 ~150MB。

---

## 前置要求

- Docker 20.10+（含 BuildKit）
- Docker Compose v2+
- 服务器配置：4GB+ 内存、50GB+ 磁盘
- Node.js 20（本地开发 / 测试用，Docker 镜像已内嵌）

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
| `./scripts/deploy-docker.sh health` | 健康检查 + 容器状态（App / MySQL / Redis / Nginx） |
| `./scripts/deploy-docker.sh rebuild` | 重新构建并滚动更新 app（不影响数据库） |

`health` 子命令会逐一检查 App `/api/health`、MySQL `mysqladmin ping`、Redis `redis-cli ping`、Nginx `wget --spider`，并打印 `docker compose ps` 输出。

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
pnpm dev                  # 启动 dev 服务器（端口 5000，Turbopack）

# Windows 下用 webpack 模式，规避 Turbopack globals.css nul 崩溃
pnpm dev:webpack
```

访问 http://localhost:5000

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

> 详细说明参考 `nginx/ssl/README.md`

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
| `LOG_LEVEL` | info | 日志级别（预留，当前基于 NODE_ENV） |
| `NEXT_PUBLIC_AUTH_COOKIE_MODE` | header | 认证模式（header / cookie） |
| `EVENT_BUS_TYPE` | db | 事件总线类型（db / memory），生产必须 db |
| `GRAFANA_ADMIN_USER` | vnerp_admin | Grafana 管理员用户名（监控栈） |
| `GRAFANA_ADMIN_PASSWORD` | change_me_in_production | Grafana 管理员密码 |
| `GRAFANA_PORT` | 3001 | Grafana 对外端口 |
| `MYSQL_EXPORTER_PASSWORD` | exporterp | mysqld-exporter 密码 |

> 完整变量列表参考 `.env.production.example`

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
  "timestamp": "2026-07-10T00:00:00.000Z",
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
| `./data/mysql`（bind mount） | `/var/lib/mysql` | MySQL 数据文件 | 每日全量备份（`pnpm backup`） |
| `redis_data` | `/data` | Redis RDB/AOF 文件 | 每周 `redis-cli BGSAVE` |
| `app_logs` | `/app/logs` | 应用日志 | 按天轮转，保留 30 天 |
| `app_uploads` | `/app/uploads` | 用户上传文件 | 每日增量备份 |
| `app_cache` | `/app/.next/cache` | Next.js ISR 缓存 | 无需备份 |
| `nginx_cache` | `/var/cache/nginx` | Nginx 缓存 | 无需备份 |
| `nginx_logs` | `/var/log/nginx` | Nginx 访问 / 错误日志 | 按天轮转 |

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

#### 4. App 只读文件系统
```yaml
app:
  read_only: true
  tmpfs:
    - /tmp:noexec,nosuid,size=64m
  volumes:
    - app_logs:/app/logs           # 显式可写挂载
    - app_uploads:/app/uploads     # 显式可写挂载
    - app_cache:/app/.next/cache   # Next.js ISR 缓存
```

#### 5. Nginx 安全头
- `Strict-Transport-Security` — HSTS 强制 HTTPS（max-age=31536000 + includeSubDomains）
- `X-Content-Type-Options: nosniff` — 防 MIME 嗅探
- `X-Frame-Options: DENY` — 防点击劫持
- `Referrer-Policy: strict-origin-when-cross-origin` — 限制 Referrer 泄露
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — 禁用摄像头/麦克风/定位
- `Content-Security-Policy` — 限制脚本/样式/字体/连接源

#### 6. 登录限流
Nginx 对 `/api/auth/login` 配置 10 req/s/IP 的限流（burst 20），防止暴力破解。

#### 7. 镜像安全
- Alpine 基础镜像（更小攻击面）
- 多阶段构建（最终镜像不含构建工具）
- `.dockerignore` 排除 `.env`、`tests/`、`docs/`、`*.pem`、`*.key` 等敏感 / 无用文件

### 推荐额外加固

```bash
# 启用 Docker 内容信任
export DOCKER_CONTENT_TRUST=1

# 定期扫描镜像漏洞
trivy image ghcr.io/snqig/vnerp:latest

# Redis 配置密码（生产建议）
# 在 docker-compose.prod.yml 的 redis 服务 command 中添加 --requirepass ${REDIS_PASSWORD}
```

详细安全扫描结果见 [Docker安全扫描报告.md](./Docker安全扫描报告.md)。

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
# 项目脚本（推荐）
pnpm backup
# → 输出到 ./backups/vnerpdacahng_full_<时间戳>.sql.gz

# 或直接 mysqldump
mkdir -p ./backups/mysql
docker exec vnerp-mysql-prod sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases vnerp --single-transaction --routines --triggers' \
  > ./backups/mysql/vnerp-$(date +%Y%m%d_%H%M%S).sql

# 压缩
gzip ./backups/mysql/vnerp-*.sql
```

### 恢复数据库

```bash
# 列出备份
pnpm backup:list

# 恢复（项目脚本）
npx tsx scripts/backup-database.ts restore backups/<file>.sql.gz

# 或手动：停止 app 服务
docker compose -f docker-compose.prod.yml stop app

# 恢复
gunzip < backups/<file>.sql.gz | \
  docker exec -i vnerp-mysql-prod sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" vnerp'

# 重启
docker compose -f docker-compose.prod.yml start app
```

详细备份恢复策略见 [备份恢复.md](./备份恢复.md)。

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

### 含数据库迁移的更新

```bash
# 1. 备份
pnpm backup

# 2. 执行迁移
pnpm migrate

# 3. 验证
pnpm migrate:status

# 4. 重建并重启 app
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build app

# 5. 健康检查
curl https://localhost/api/health
```

迁移详见 [数据库迁移.md](./数据库迁移.md)。

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
| `node server.js` | 是 | standalone 模式正确启动方式，Dockerfile 使用此方式 |
| `next start` | 警告 | 会触发警告，功能正常但非最佳实践 |

### Q8: 生产环境调试路由 404？

`src/proxy.ts` 在 `NODE_ENV=production` 下封堵 `/qrcode`、`/api/init`、`/api/debug`、`/api/diagnose`，返回 404。这是预期行为，避免调试代码泄露。如需临时访问，改 `NODE_ENV=development` 并重启（不推荐在生产做）。

---

## 生产环境检查清单

部署前请确认：

- [ ] 所有密码已修改为强密码（`MYSQL_ROOT_PASSWORD`、`DB_PASSWORD`、`JWT_SECRET`）
- [ ] `CORS_ALLOW_ORIGIN` 已配置为正确域名（禁止 `*`）
- [ ] SSL 证书已放置到 `nginx/ssl/`（cert.pem + key.pem）
- [ ] 数据库已设置定期备份（cron + `pnpm backup`）
- [ ] 防火墙仅开放 80 / 443 端口（App 5000、MySQL 3306、Redis 6379 不对外暴露）
- [ ] 默认 admin 密码已修改
- [ ] `DEBUG_DB=false`（生产环境关闭 SQL 日志）
- [ ] `NODE_ENV=production`
- [ ] `EVENT_BUS_TYPE=db`（生产环境使用 Redis 事件总线 + Outbox）
- [ ] `ALLOW_SETUP_API=false`（建表接口禁用）
- [ ] 容器以非 root 用户运行（`nextjs` UID 1001）
- [ ] `read_only: true` + tmpfs + 显式可写卷
- [ ] `cap_drop: ALL` + `cap_add: NET_BIND_SERVICE`
- [ ] 资源限制（CPU + 内存 limits）已配置
- [ ] 日志轮转已启用（json-file max-size 10m / max-file 5）
- [ ] 监控告警已配置（Prometheus + Alertmanager，详见 [监控告警接入方案.md](./监控告警接入方案.md)）

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 多阶段构建，standalone 模式 |
| `docker-compose.prod.yml` | 生产编排（MySQL + Redis + App + Nginx） |
| `docker-compose.yml` | 开发编排（MySQL + Redis + App） |
| `docker-compose.monitoring.yml` | 监控栈编排（Prometheus + Grafana + Exporters） |
| `.dockerignore` | Docker 构建排除列表 |
| `.env.production.example` | 生产环境变量模板 |
| `nginx/nginx.conf` | Nginx 反向代理配置 |
| `nginx/ssl/README.md` | SSL 证书获取指南 |
| `scripts/deploy-docker.sh` | 一键部署脚本 |
| `src/proxy.ts` | 中间件（i18n + 鉴权 + 调试路由封堵 + CSRF） |

> 最后更新：2026-07-10
