# SSL 证书目录

生产部署时将 SSL 证书放置于此目录，docker-compose.prod.yml 会挂载到 `/etc/nginx/ssl`。

## 所需文件

```
nginx/ssl/
├── cert.pem   # 证书文件（含中间证书链）
└── key.pem    # 私钥文件
```

## 获取证书

### 方式 1：Let's Encrypt（免费，推荐）

```bash
# 安装 certbot
apt install certbot

# 获取证书（替换 your-domain.com）
certbot certonly --standalone -d your-domain.com

# 复制到项目目录
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem   ./nginx/ssl/key.pem
```

### 方式 2：自签名（仅测试，勿用于生产）

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem \
  -days 365 -nodes -subj "/CN=localhost"
```

## 自动续期（Let's Encrypt）

```bash
# 添加 crontab 每月续期
echo "0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/*/fullchain.pem /path/to/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/*/privkey.pem /path/to/nginx/ssl/key.pem && docker compose -f docker-compose.prod.yml restart nginx" | crontab -
```
