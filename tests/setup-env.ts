/**
 * Vitest 全局 setup — 加载 .env 环境变量
 *
 * Vitest 不自动加载 .env（不同于 Next.js dev server），
 * 集成测试依赖 DB_PASSWORD / REDIS_URL 等环境变量，
 * 缺失时 MySQL 连接报 "Access denied (using password: NO)"。
 */
try {
  process.loadEnvFile();
} catch {
  // .env 不存在时静默跳过（CI 环境可能用 secrets 注入）
}
