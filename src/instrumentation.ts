/**
 * Next.js Instrumentation Hook
 *
 * 在 Next.js 服务启动时执行一次。此处仅做轻量日志，
 * 实际的 OutboxPoller / StreamConsumer 启动逻辑已移至
 * registerEventHandlers()（EventRegistry.ts），由首个 API 请求触发。
 *
 * 原因：instrumentation.ts 会被 webpack 打包到 Edge runtime，
 * 若在此处 import AppInitializer → EventRegistry → QrCodeGenerationHandler → crypto，
 * 会导致 "Module not found: Can't resolve 'crypto'" 构建错误。
 * registerEventHandlers() 仅在 API 路由（Node.js runtime）中调用，不受此限制。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log(
    '[instrumentation] Server started. OutboxPoller will auto-start on first API request.'
  );
}
