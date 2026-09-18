/**
 * Next.js Instrumentation Hook
 *
 * 在 Next.js 服务启动时执行一次。此处仅做轻量日志与**启动任务**，
 * 实际的 OutboxPoller / StreamConsumer 启动逻辑已移至
 * registerEventHandlers()（EventRegistry.ts），由首个 API 请求触发。
 *
 * 原因：instrumentation.ts 会被 webpack 打包到 Edge runtime，
 * 若在此处静态 import AppInitializer → EventRegistry → QrCodeGenerationHandler → crypto，
 * 会导致 "Module not found: Can't resolve 'crypto'" 构建错误。
 * 因此所有 Node.js 专用逻辑都必须是「NEXT_RUNTIME 判断内的动态 import」
 * （Next.js 官方推荐写法），静态 import 一律禁止。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  const { logger } = await import('@/lib/logger');
  logger.info('[instrumentation] Server started. OutboxPoller will auto-start on first API request.');

  // ── 启动任务：系统配置种子（BUG-SET-002）──────────────────────────────
  // 原先这个种子挂在 `GET /api/settings/system` 上，让读接口每次都做
  // 「SHOW COLUMNS + ALTER 尝试 + 10 条旧键 UPDATE + 127 键 upsert」并要求 DDL 权限。
  // 现在改为进程启动时执行一次；bootstrapSystemConfig() 内部已 try/catch，
  // DB 未就绪或权限不足只会告警，绝不阻塞服务启动。
  const { bootstrapSystemConfig } = await import('@/lib/system-config-seed');
  await bootstrapSystemConfig();
}
