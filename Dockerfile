# =============================================================================
# Next.js 生产镜像 — standalone 模式
# =============================================================================
# 关键点：output: 'standalone' 时，必须用 `node server.js` 启动，
#         而非 `next start`（后者与 standalone 不兼容，会触发警告）。
#         standalone 产物已内嵌最小化 node_modules，镜像体积约 ~150MB。
# =============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat tini
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# --- 依赖安装阶段 ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# BuildKit 缓存挂载：pnpm store 跨构建复用，加速 CI
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- 构建阶段 ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* 环境变量在构建时内联到客户端代码，生产构建需在此传入
# ARG NEXT_PUBLIC_API_BASE_URL
# ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN pnpm build

# --- 运行阶段（最终镜像） ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5000
ENV HOSTNAME=0.0.0.0

# 非 root 用户运行（安全最佳实践）
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone 模式只需复制 server.js + 最小化 node_modules + 静态资源
# server.js 已内嵌路由处理，无需 next start
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages

# 创建可写目录（用于上传文件、日志等）
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nextjs:nodejs /app/uploads /app/logs

USER nextjs

EXPOSE 5000

# 健康检查 — 命中 /api/health 端点，检查 DB + 内存状态
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/api/health', res => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# tini 作为 PID 1：正确传递 SIGTERM/SIGINT 信号，避免僵尸进程
ENTRYPOINT ["/sbin/tini", "--"]
# standalone 启动命令（非 next start）
CMD ["node", "server.js"]
