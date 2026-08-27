#!/usr/bin/env bash
# =============================================================================
# ERP 系统 Docker 生产部署脚本
# =============================================================================
# 用法：
#   chmod +x scripts/deploy-docker.sh
#   ./scripts/deploy-docker.sh [build|up|down|logs|health|rebuild]
#
# 前置条件：
#   1. 已安装 Docker 和 Docker Compose
#   2. 已创建 .env.production 文件（参考 .env.production.example）
#   3. 已放置 SSL 证书到 nginx/ssl/（参考 nginx/ssl/README.md）
# =============================================================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 检查前置条件
check_prerequisites() {
    command -v docker >/dev/null 2>&1 || error "Docker 未安装"
    docker compose version >/dev/null 2>&1 || error "Docker Compose 未安装"

    if [ ! -f "$ENV_FILE" ]; then
        warn "$ENV_FILE 不存在，使用 .env 作为后备"
        ENV_FILE=".env"
    fi

    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        warn "SSL 证书未找到（nginx/ssl/cert.pem, nginx/ssl/key.pem）"
        warn "如需 HTTP-only 模式，请修改 nginx/nginx.conf 移除 SSL 配置"
    fi
}

# 构建镜像
build() {
    info "构建 Docker 镜像..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel
    info "构建完成"
}

# 启动全部服务（MySQL + Redis + App + Nginx）
up() {
    info "启动生产环境..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    info "等待服务就绪..."
    sleep 10
    health
}

# 停止全部服务
down() {
    info "停止生产环境..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    info "已停止"
}

# 查看日志
logs() {
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=100
}

# 健康检查
health() {
    info "健康检查..."
    echo ""

    # App 健康检查
    echo -n "App  (/api/health):     "
    APP_STATUS=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T app \
        node -e "require('http').get('http://127.0.0.1:5000/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))" 2>/dev/null \
        && echo "HEALTHY" || echo "UNHEALTHY")
    echo "$APP_STATUS"

    # MySQL 健康检查
    echo -n "MySQL (mysqladmin):    "
    MYSQL_STATUS=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mysql \
        mysqladmin ping -h localhost -uroot -p"${DB_PASSWORD:-vnerp2026}" 2>/dev/null \
        | grep -q "mysqld is alive" && echo "HEALTHY" || echo "UNHEALTHY")
    echo "$MYSQL_STATUS"

    # Redis 健康检查
    echo -n "Redis (redis-cli):     "
    REDIS_STATUS=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis \
        redis-cli ping 2>/dev/null | grep -q PONG && echo "HEALTHY" || echo "UNHEALTHY")
    echo "$REDIS_STATUS"

    # Nginx 健康检查
    echo -n "Nginx (wget):          "
    NGINX_STATUS=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T nginx \
        wget --spider -q http://127.0.0.1/ 2>/dev/null && echo "HEALTHY" || echo "UNHEALTHY")
    echo "$NGINX_STATUS"

    echo ""

    # 容器状态
    info "容器状态:"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

# 重新构建并滚动更新 app
rebuild() {
    info "重新构建 app 镜像..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build app
    info "滚动更新 app（不重启 MySQL/Redis/Nginx）..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps app
    info "等待 app 就绪..."
    sleep 5
    health
}

# =============================================================================
# 主入口
# =============================================================================

case "${1:-up}" in
    build)    check_prerequisites; build ;;
    up)       check_prerequisites; up ;;
    down)     down ;;
    logs)     logs ;;
    health)   health ;;
    rebuild)  check_prerequisites; rebuild ;;
    *)
        echo "用法: $0 {build|up|down|logs|health|rebuild}"
        echo ""
        echo "命令说明:"
        echo "  build    构建所有 Docker 镜像"
        echo "  up       启动全部服务（MySQL + Redis + App + Nginx）"
        echo "  down     停止全部服务"
        echo "  logs     查看实时日志"
        echo "  health   健康检查 + 容器状态"
        echo "  rebuild  重新构建并滚动更新 app（不影响数据库）"
        exit 1
        ;;
esac
