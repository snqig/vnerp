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
    // 生产环境额外校验 JWT_SECRET 强度
    if (result.data.NODE_ENV === 'production' && result.data.JWT_SECRET.length < 16) {
      throw new Error('JWT_SECRET must be at least 16 characters in production');
    }
    return result.data;
  }

  // 校验失败
  const errors = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  console.error('[env] Environment variable validation failed:\n' + errors);
  throw new Error('Environment variable validation failed. See logs above.');
}

export const env = loadEnv();
