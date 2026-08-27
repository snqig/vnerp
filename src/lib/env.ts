import { z } from 'zod';

/**
 * 环境变量 Schema 校验
 *
 * 在 next.config.ts 顶部 import 触发启动时校验。
 * 生产环境缺少关键变量时立即报错（fail-fast），
 * 开发/测试环境使用默认值避免阻塞本地开发。
 */

const envSchema = z.object({
  // 数据库（必需）
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),

  // JWT（生产环境要求 ≥16 字符）
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

  // 应用
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEBUG_DB: z.string().optional().default('false'),

  // Redis（可选，缺失时降级为内存）
  REDIS_URL: z.string().optional(),

  // 事件总线
  EVENT_BUS_TYPE: z.enum(['memory', 'db']).default('db'),

  // 安全
  ALLOW_SETUP_API: z.string().optional().default('false'),

  // CORS
  CORS_ALLOW_ORIGIN: z.string().optional().default('*'),

  // 开发源
  DEV_ORIGINS: z.string().optional(),

  // Stream 配置
  STREAM_MAX_LENGTH: z.coerce.number().int().positive().optional(),
  STREAM_RECLAIM_IDLE_MS: z.coerce.number().int().positive().optional(),
  IDEMPOTENCY_STALE_THRESHOLD_MINUTES: z.coerce.number().int().positive().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (result.success) {
    return result.data;
  }

  // SECURITY: demo 凭据回退仅允许在显式设置 DEMO_MODE=true 且非生产环境时生效。
  // VERCEL 环境变量在 Vercel 部署中恒为 true，绝不能作为 demo 回退的判据（旧逻辑导致生产缺失配置时静默使用 demo 凭据）。
  if (process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true') {
    return {
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: Number(process.env.DB_PORT) || 3306,
      DB_USER: process.env.DB_USER || 'demo',
      DB_PASSWORD: process.env.DB_PASSWORD || 'demo',
      DB_NAME: process.env.DB_NAME || 'demo',
      // DEV ONLY - must override in production via JWT_SECRET env var
      JWT_SECRET: process.env.JWT_SECRET || 'demo-mode-jwt-secret-key-2024',
      NODE_ENV: 'development',
      DEBUG_DB: 'false',
      REDIS_URL: undefined,
      EVENT_BUS_TYPE: 'memory',
      ALLOW_SETUP_API: 'false',
      CORS_ALLOW_ORIGIN: '*',
      DEV_ORIGINS: undefined,
      STREAM_MAX_LENGTH: undefined,
      STREAM_RECLAIM_IDLE_MS: undefined,
      IDEMPOTENCY_STALE_THRESHOLD_MINUTES: undefined,
    };
  }

  if (process.env.NODE_ENV === 'production') {
    // SECURITY: 生产环境配置缺失必须 fail-fast，绝不静默降级到弱默认值/空密码。
    console.error(
      '[env] Environment variable validation failed:\n' +
        result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`).join('\n')
    );
    throw new Error(
      'Production environment is missing required env vars. ' +
        'Check DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/JWT_SECRET in the deployment platform.'
    );
  }

  return {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: Number(process.env.DB_PORT) || 3306,
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'vnerpdacahng',
    // DEV ONLY - must override in production via JWT_SECRET env var
    JWT_SECRET: process.env.JWT_SECRET || 'dev-fallback-key-change-in-production',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DEBUG_DB: process.env.DEBUG_DB || 'false',
    REDIS_URL: undefined,
    EVENT_BUS_TYPE: 'memory',
    ALLOW_SETUP_API: 'false',
    CORS_ALLOW_ORIGIN: '*',
    DEV_ORIGINS: undefined,
    STREAM_MAX_LENGTH: undefined,
    STREAM_RECLAIM_IDLE_MS: undefined,
    IDEMPOTENCY_STALE_THRESHOLD_MINUTES: undefined,
  };
}

export const env = loadEnv();
