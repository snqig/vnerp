# Docker 部署指南

## 目录

- [开发环境快速启动](#开发环境快速启动)
- [生产环境部署](#生产环境部署)
- [健康检查说明](#健康检查说明)
- [数据持久化](#数据持久化)
- [安全加固](#安全加固)
- [日志管理](#日志管理)
- [备份与恢复](#备份与恢复)
- [常见问题](#常见问题)

---

## 开发环境快速启动

### 前置要求

- Docker 20.10+
- Docker Compose v2+
- 至少 4GB 可用内存

### 一键启动

```bash
# 启动全部服务（MySQL + Redis + App）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f app

# 停止服务
docker compose down

# ⚠️ 危险：停止并清理数据卷，会永久删除数据
# 生产环境 MySQL 已改用 bind mount（./data/mysql），down -v 不会删除业务数据，
# 但会清除 redis_data 等 named volume。仅在确需重置时使用。
# docker compose down -v
```

### 访问地址

- 应用: http://localhost:5000
- MySQL: localhost:3306
- Redis: localhost:6379
- 健康检查: http://localhost:5000/api/health

### 默认账号

- 用户名: `admin`
- 密码: `admin123`

---

## 生产环境部署

### 1. 准备环境变量

```bash
# 复制示例配置
cp .env.production.example .env.production

# 编辑配置（务必修改所有密码！）
vim .env.production
```

**必须配置的变量：**

| 变量 | 说明 | 示例 |
|------|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | 强密码 |
| `DB_USER` | 应用数据库用户 | vnerp |
| `DB_PASSWORD` | 应用数据库密码 | 强密码 |
| `DB_NAME` | 数据库名 | vnerp |
| `JWT_SECRET` | JWT 签名密钥 | 至少 32 位随机字符串 |
| `CORS_ALLOW_ORIGIN` | 允许的前端域名 | https://erp.example.com |

**生成强密码：**
```bash
openssl rand -hex 32
```

### 2. 构建并启动

```bash
# 构建镜像
docker compose -f docker-compose.prod.yml build

# 启动服务
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 查看启动状态
docker compose -f docker-compose.prod.yml ps
```

### 3. 验证部署

```bash
# 健康检查
curl http://localhost:5000/api/health

# 预期输出
# {"status":"healthy","timestamp":"...","version":"1.0.0",...}
```

### 4. 滚动更新

```bash
# 重新构建 app 镜像
docker compose -f docker-compose.prod.yml build app

# 无停机更新（仅重启 app 服务）
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate app
```

---

## 健康检查说明

所有服务都配置了健康检查，Docker 会自动检测服务状态。

### 检查列表

| 服务 | 检查方式 | 间隔 | 超时 | 重试 | 启动宽限 |
|------|----------|------|------|------|----------|
| MySQL | mysqladmin ping | 10s | 5s | 5次 | 30s |
| Redis | redis-cli ping | 10s | 5s | 5次 | 10s |
| App | /api/health | 30s | 5s | 3次 | 60s |

### 查看健康状态

```bash
# 查看所有容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 查看某个容器的健康检查详情
docker inspect --format='{{json .State.Health}}' vnerp-app-prod | python3 -m json.tool
```

### 健康检查 API 详情

`/api/health` 返回内容：

```json
{
  "status": "healthy",
  "timestamp": "2026-01-01T00:00:00.000Z",
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

- `status: healthy` - HTTP 200
- `status: degraded` - HTTP 503（部分检查失败）

---

## 数据持久化

### 数据卷列表

| 数据卷名 | 挂载路径 | 内容说明 | 备份策略 |
|----------|----------|----------|----------|
| `mysql_data` | `/var/lib/mysql` | MySQL 数据文件 | 每日全量备份 |
| `redis_data` | `/data` | Redis RDB/AOF 文件 | 每小时快照 |
| `app_logs` | `/app/logs` | 应用日志 | 按天轮转，保留 30 天 |
| `app_uploads` | `/app/uploads` | 用户上传文件 | 每日增量备份 |

### 查看数据卷

```bash
# 列出所有数据卷
docker volume ls | grep vnerp

# 查看数据卷详情
docker volume inspect vnerp_mysql_data
```

### 数据卷位置

本地数据卷默认存储位置：
- Linux: `/var/lib/docker/volumes/`
- Windows (WSL): `\\wsl$\docker-desktop-data\data\docker\volumes\`

---

## 安全加固

### 已实施的安全措施

#### 1. 非 root 用户运行
- Dockerfile 中创建 `nextjs` 用户（UID 1001）
- 应用进程以非 root 权限运行
- 最小化攻击面

#### 2. 权限限制
```yaml
security_opt:
  - no-new-privileges:true    # 禁止提升权限
cap_drop:
  - ALL                       # 移除所有 Linux capabilities
cap_add:
  - NET_BIND_SERVICE          # 仅保留绑定端口权限
```

#### 3. 资源限制
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'       # CPU 上限
      memory: 2G        # 内存上限
    reservations:
      cpus: '0.25'      # 预留 CPU
      memory: 256M      # 预留内存
```

#### 4. 环境变量安全
- 使用 `${VAR:?required}` 语法强制必填变量
- 敏感信息不写入镜像，仅通过环境变量注入
- `.env.*` 文件已加入 `.dockerignore`

#### 5. 镜像安全
- 使用 Alpine 基础镜像（更小的攻击面）
- 多阶段构建（最终镜像不含构建工具）
- `.dockerignore` 排除敏感文件

### 推荐额外加固

#### 使用 Docker Secrets（Swarm 模式）
```bash
docker secret create db_password ./password.txt
```

#### 启用内容信任
```bash
export DOCKER_CONTENT_TRUST=1
```

#### 定期扫描镜像漏洞
```bash
docker scan vnerp-app:latest
# 或使用 trivy
trivy image vnerp-app:latest
```

---

## 日志管理

### 日志驱动配置

生产环境使用 json-file 驱动，带轮转限制：
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

# 查看最近 100 行
docker compose -f docker-compose.prod.yml logs --tail=100 app

# 查看 MySQL 慢查询日志
docker exec vnerp-mysql-prod tail -f /var/lib/mysql/slow.log

# 查看所有服务日志
docker compose -f docker-compose.prod.yml logs -f
```

### 日志文件位置

应用日志通过数据卷持久化：
- 数据卷: `vnerp_app_logs`
- 容器内路径: `/app/logs`

### 推荐：集中式日志

如果需要更完善的日志管理，建议接入：
- **ELK Stack** (Elasticsearch + Logstash + Kibana)
- **Loki + Grafana**
- **Datadog / Sentry** 等 SaaS 服务

---

## 备份与恢复

### 数据库备份

#### 手动备份 MySQL
```bash
# 创建备份目录
mkdir -p ./backups/mysql

# 使用 mysqldump 备份
docker exec vnerp-mysql-prod sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases vnerp --single-transaction --routines --triggers' > ./backups/mysql/vnerp-$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
gzip ./backups/mysql/vnerp-$(date +%Y%m%d_%H%M%S).sql
```

#### 自动备份脚本

项目已提供备份脚本：
```bash
# 全量备份
pnpm backup

# 查看备份列表
pnpm backup:list

# 恢复备份
pnpm backup:restore backups/vnerp-20260101_000000.sql.gz
```

详细使用说明请参考 [scripts/README.md](../scripts/README.md)。

### Redis 备份

```bash
# 手动触发一次 BGSAVE
docker exec vnerp-redis-prod redis-cli BGSAVE

# 备份文件在数据卷中
docker cp vnerp-redis-prod:/data/dump.rdb ./backups/redis/dump-$(date +%Y%m%d_%H%M%S).rdb
```

### 上传文件备份

```bash
# 备份上传目录
docker run --rm -v vnerp_app_uploads:/data -v ./backups/uploads:/backup alpine tar czf /backup/uploads-$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### 恢复数据

#### 恢复 MySQL
```bash
# 停止 app 服务
docker compose -f docker-compose.prod.yml stop app

# 恢复数据库
docker exec -i vnerp-mysql-prod sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" vnerp' < backup.sql

# 重启服务
docker compose -f docker-compose.prod.yml restart app
```

---

## 常见问题

### Q1: 容器启动后立即退出？

查看日志定位问题：
```bash
docker compose logs app
docker inspect vnerp-app-prod --format='{{.State.ExitCode}}'
```

### Q2: 健康检查一直 unhealthy？

1. 检查服务是否正常启动：
```bash
docker compose logs app --tail=50
```

2. 手动测试健康检查接口：
```bash
docker exec vnerp-app-prod wget -qO- http://127.0.0.1:5000/api/health
```

3. 检查数据库连接：
```bash
docker exec vnerp-app-prod ping mysql
```

### Q3: 数据卷占用空间太大？

```bash
# 查看各数据卷占用
docker system df -v

# 清理未使用的镜像/容器
docker system prune

# ⚠️ 危险：清理未使用的数据卷
# 生产环境 MySQL 已改用 bind mount（./data/mysql），不受 volume prune 影响，
# 但 redis_data 等 named volume 会被清除。执行前请确认无重要数据。
# docker volume prune
```

### Q4: 如何修改 MySQL 配置？

修改 `docker-compose.prod.yml` 中 mysql 服务的 `command` 部分，然后重启：
```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate mysql
```

### Q5: 端口冲突怎么办？

修改 `.env.production` 中的端口配置：
```env
DB_PORT=3307
APP_PORT=5001
```

### Q6: 如何进入容器调试？

```bash
# 进入 app 容器
docker exec -it vnerp-app-prod sh

# 进入 MySQL
docker exec -it vnerp-mysql-prod mysql -uroot -p

# 进入 Redis
docker exec -it vnerp-redis-prod redis-cli
```

---

## 生产环境检查清单

部署前请确认：

- [ ] 所有密码已修改为强密码
- [ ] JWT_SECRET 已设置为随机字符串
- [ ] CORS_ALLOW_ORIGIN 已配置为正确域名
- [ ] 数据库已设置定期备份
- [ ] 防火墙已仅开放必要端口
- [ ] HTTPS/SSL 证书已配置（建议使用 Nginx 反向代理）
- [ ] 监控告警已配置（可选）
- [ ] 日志收集已配置（可选）

---

## 推荐架构（进阶）

对于生产环境高可用部署，建议：

```
用户 → Nginx/负载均衡 → App 容器集群 → MySQL 主从
                                         → Redis 哨兵/集群
```

- **反向代理**: Nginx / Traefik（SSL 终止、限流）
- **容器编排**: Docker Swarm / Kubernetes
- **监控**: Prometheus + Grafana
- **CI/CD**: GitHub Actions / GitLab CI
