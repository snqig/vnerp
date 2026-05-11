# 生产环境部署 SOP

> SOP 编号：VNERP-SKILL-002 | 版本：V1.0 | 更新日期：2026-05-10

## 前置条件

- 服务器：Linux (Ubuntu 22.04+)
- Node.js 18.x LTS 已安装
- MySQL 8.0 已安装并运行
- Nginx 已安装
- 项目代码已推送到 Git 仓库
- SSL 证书已配置

## 操作步骤

### 步骤 1：服务器环境准备

```bash
# 安装 pnpm
npm install -g pnpm

# 安装 PM2（进程管理器）
npm install -g pm2

# 创建应用目录
mkdir -p /opt/vnerp
cd /opt/vnerp
```

### 步骤 2：获取代码

```bash
git clone <repo-url> .
git checkout main  # 或指定版本 tag
```

### 步骤 3：安装依赖与构建

```bash
pnpm install --frozen-lockfile
pnpm build
```

预期结果：构建成功，`.next` 目录生成

### 步骤 4：配置环境变量

```bash
cp .env.example .env.production
vi .env.production
```

配置生产环境变量（注意修改 JWT_SECRET 为强密码）。

### 步骤 5：数据库迁移

```bash
# 备份数据库（必须！）
mysqldump -u root -p vnerp > backup_$(date +%Y%m%d_%H%M%S).sql

# 执行迁移脚本
mysql -u root -p vnerp < migrations/0005_consolidate_redundant_tables.sql
```

### 步骤 6：启动应用

```bash
# 使用 PM2 启动
pm2 start pnpm --name vnerp -- start
pm2 save
pm2 startup
```

预期结果：应用启动成功，`pm2 status` 显示 online

### 步骤 7：配置 Nginx 反向代理

```nginx
server {
    listen 443 ssl http2;
    server_name erp.yourcompany.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

### 步骤 8：验证部署

1. 访问 https://erp.yourcompany.com
2. 登录系统验证功能正常
3. 检查 PM2 日志：`pm2 logs vnerp`

## 异常处理

| 问题 | 解决方案 |
|------|---------|
| 构建失败 | 检查 Node.js 版本，清除 `.next` 后重新构建 |
| 数据库迁移失败 | 使用备份恢复，排查 SQL 错误后重试 |
| 502 Bad Gateway | 检查 PM2 进程状态，确认端口 5000 正在监听 |
| SSL 证书错误 | 检查证书路径和有效期 |

## 回滚方案

```bash
# 回滚到上一版本
cd /opt/vnerp
git checkout <previous-tag>
pnpm install --frozen-lockfile
pnpm build
pm2 restart vnerp

# 数据库回滚（如有迁移）
mysql -u root -p vnerp < backup_YYYYMMDD_HHMMSS.sql
```
