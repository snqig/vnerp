import pino from 'pino';

interface LoggerContext {
  module: string;
  action: string;
  traceId: string;
}

declare module 'pino' {
  interface BaseLogger {
    stepStart(ctx: Record<string, unknown>, stepName: string, data?: Record<string, unknown>): void;
    stepEnd(ctx: Record<string, unknown>, stepName: string, data?: Record<string, unknown>): void;
    db(
      ctx: Record<string, unknown>,
      operation: string,
      table: string,
      data?: Record<string, unknown>
    ): void;
    branch(
      ctx: Record<string, unknown>,
      branchName: string,
      condition: string,
      result: boolean,
      data?: Record<string, unknown>
    ): void;
  }
}

export function maskSensitiveData<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  const clone = (Array.isArray(data) ? [...data] : { ...data }) as unknown as T;
  const sensitiveKeys = /password|secret|token|authorization|key|credential/i;
  for (const key of Object.keys(clone as Record<string, unknown>)) {
    if (sensitiveKeys.test(key)) {
      (clone as Record<string, unknown>)[key] = '***';
    }
  }
  return clone;
}

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
});

export function secureLog(level: string, message: string, data?: Record<string, unknown>) {
  (logger as Loose)[level](data || {}, message);
}

export function generateTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

logger.stepStart = function (
  ctx: Record<string, unknown>,
  stepName: string,
  data?: Record<string, unknown>
) {
  const c = ctx as unknown as LoggerContext;
  logger.debug({ ctx, step: stepName, data }, `[${c.module}.${c.action}] ${stepName}`);
};

logger.stepEnd = function (
  ctx: Record<string, unknown>,
  stepName: string,
  data?: Record<string, unknown>
) {
  const c = ctx as unknown as LoggerContext;
  logger.debug({ ctx, step: stepName, data }, `[${c.module}.${c.action}] ${stepName} DONE`);
};

logger.db = function (
  ctx: Record<string, unknown>,
  operation: string,
  table: string,
  data?: Record<string, unknown>
) {
  const c = ctx as unknown as LoggerContext;
  logger.debug(
    { ctx, db: { operation, table, data } },
    `[${c.module}.${c.action}] DB: ${operation} ${table}`
  );
};

logger.branch = function (
  ctx: Record<string, unknown>,
  branchName: string,
  condition: string,
  result: boolean,
  data?: Record<string, unknown>
) {
  const c = ctx as unknown as LoggerContext;
  const level = result ? 'debug' : 'warn';
  const status = result ? 'PASS' : 'FAIL';
  logger[level](
    { ctx, branch: branchName, condition, status, data },
    `[${c.module}.${c.action}] ${branchName}: ${condition} -> ${status}`
  );
};
