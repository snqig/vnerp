# VNERP 生产环境部署文档

## 1. 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18.x | 20.x LTS |
| pnpm | 9.0+ | 9.x |
| MySQL | 8.0+ | 8.0 |
| Redis | 7.0+ | 7-alpine |
| 内存 | 2GB | 4GB+ |
| 磁盘 | 10GB | 50GB+ |

## 2. 环境变量配置

在项目根目录创建 `.env.production`：

```env
# 数据库
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<your-secure-password>
DB_NAME=vnerp

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# JWT
JWT_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=24h

# 应用
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
PORT=5000
```

生成 JWT_SECRET：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 3. 数据库初始化

### 3.1 创建数据库

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS vnerp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3.2 导入Schema

```bash
mysql -u root -p vnerp < database/vnerpdacahng_schema.sql
```

### 3.3 导入种子数据（首次部署）

```bash
mysql -u root -p vnerp < database/seeds/vnerp-seed-data.sql
```

### 3.4 导入模拟数据（测试环境）

```bash
mysql -u root -p vnerp < scripts/seed-mock-data.sql
```

## 4. 构建与部署

### 4.1 方式一：直接部署（推荐小型项目）

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 类型检查
pnpm ts-check

# 运行单元测试
pnpm test:unit:run

# 构建
pnpm build

# 启动（生产模式）
pnpm start
```

### 4.2 方式二：Docker Compose 部署（推荐生产环境）

#### 4.2.1 创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 5000
ENV PORT=5000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

> 注意：如需使用 `standalone` 输出模式，需在 `next.config.ts` 中添加 `output: 'standalone'`。

#### 4.2.2 更新 docker-compose.yml

在现有 `docker-compose.yml` 中添加应用服务：

```yaml
  app:
    build: .
    container_name: vnerp-app
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD:-vnerp2026}
      - DB_NAME=${DB_NAME:-vnerp}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - vnerp-network
```

#### 4.2.3 启动服务

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f app

# 停止服务
docker compose down
```

### 4.3 方式三：Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # HTTP -> HTTPS 重定向
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 静态资源缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:5000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # API 请求
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # 其他请求
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 5. 进程管理（非Docker部署）

推荐使用 PM2：

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start pnpm --name "vnerp" -- start

# 设置开机自启
pm2 startup
pm2 save

# 常用命令
pm2 logs vnerp       # 查看日志
pm2 restart vnerp    # 重启
pm2 status           # 状态
pm2 monit            # 监控
```

PM2 生态配置文件 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'vnerp',
    script: 'pnpm',
    args: 'start',
    cwd: '/opt/vnerp',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

## 6. 数据库备份

### 6.1 手动备份

```bash
mysqldump -u root -p vnerp > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 6.2 定时备份（crontab）

```bash
# 每天凌晨2点备份
0 2 * * * mysqldump -u root -pYOUR_PASSWORD vnerp | gzip > /backup/vnerp_$(date +\%Y\%m\%d).sql.gz

# 保留最近30天备份
0 3 * * * find /backup -name "vnerp_*.sql.gz" -mtime +30 -delete
```

## 7. 监控与日志

### 7.1 应用日志

生产环境日志通过 `src/lib/logger.ts` 输出，包含：
- 结构化格式：`[时间戳] [级别] [模块:操作] [用户ID] [追踪ID] 消息`
- 关键业务流程节点（stepStart/stepEnd）
- 分支决策记录（branch）
- 数据库操作记录（db）
- 权限检查记录（permission）

### 7.2 健康检查

```bash
# 应用健康
curl -f http://localhost:5000/api/health || echo "App down"

# 数据库连接
mysql -u root -p -e "SELECT 1" vnerp

# Redis连接
redis-cli ping
```

### 7.3 Docker 健康检查

在 Dockerfile 中添加：

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1
```

## 8. 更新部署

### 8.1 常规更新

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install --frozen-lockfile

# 构建
pnpm build

# 重启（PM2）
pm2 restart vnerp

# 重启（Docker）
docker compose up -d --build app
```

### 8.2 数据库迁移

如有 Schema 变更：

```bash
# 备份数据库
mysqldump -u root -p vnerp > pre_migration_backup.sql

# 执行迁移脚本
mysql -u root -p vnerp < database/migrations/latest.sql
```

## 9. 安全清单

- [ ] 修改默认数据库密码
- [ ] 生成强随机 JWT_SECRET
- [ ] 启用 HTTPS（Nginx SSL）
- [ ] 配置防火墙（仅开放 80/443 端口）
- [ ] 禁用数据库远程 root 登录
- [ ] 设置 Redis 密码认证
- [ ] 配置 CORS 允许域名
- [ ] 定期更新依赖：`pnpm update --interactive`
- [ ] 启用数据库定时备份
- [ ] 配置日志轮转（logrotate）

## 10. 故障排查

| 问题 | 排查命令 |
|------|---------|
| 应用无法启动 | `pm2 logs vnerp --lines 100` |
| 数据库连接失败 | `mysql -u root -p -h 127.0.0.1 -e "SELECT 1"` |
| Redis连接失败 | `redis-cli ping` |
| 端口被占用 | `lsof -i :5000` 或 `netstat -tlnp \| grep 5000` |
| 内存不足 | `free -h` 和 `pm2 monit` |
| 构建失败 | `pnpm build 2>&1 \| tee build.log` |
| Hydration错误 | 检查服务端/客户端locale一致性 |
