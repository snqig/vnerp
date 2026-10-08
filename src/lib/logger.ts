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

export type LooseLogFn = (...args: unknown[]) => void;

export interface AppLogger {
  trace: LooseLogFn;
  debug: LooseLogFn;
  info: LooseLogFn;
  warn: LooseLogFn;
  error: LooseLogFn;
  fatal: LooseLogFn;
  stepStart: (ctx: Record<string, unknown>, stepName: string, data?: Record<string, unknown>) => void;
  stepEnd: (ctx: Record<string, unknown>, stepName: string, data?: Record<string, unknown>) => void;
  db: (ctx: Record<string, unknown>, operation: string, table: string, data?: Record<string, unknown>) => void;
  branch: (
    ctx: Record<string, unknown>,
    branchName: string,
    condition: string,
    result: boolean,
    data?: Record<string, unknown>
  ) => void;
  child: (...args: unknown[]) => AppLogger;
  level: string | number;
  [key: string]: unknown;
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
  // pino 的 log(level, obj, msg) 只认前两个参数：调用点普遍写成
  // logger.error(ctx, message, details) —— 第三个 details 参数会被静默丢弃，
  // 结果就是控制台只剩「{} 「获取品质过程检验数据失败」 {}」，
  // error message / stack 全看不到，等于把排障线索自己销毁了。
  // 这里用 logMethod hook 把第三个及之后的参数合并进 extra 字段。
  hooks: {
    logMethod(args, method) {
      // args = [obj, msg?, ...rest]
      if (args.length <= 2) {
        return method.apply(this, args as unknown as Parameters<typeof method>);
      }
      const [obj, msg, ...rest] = args;
      const extras = rest.filter((a) => a !== undefined && a !== null);
      const merged =
        extras.length === 0
          ? (obj as Record<string, unknown>)
          : { ...(obj as Record<string, unknown>), extra: extras.length === 1 ? extras[0] : extras };
      const next = msg === undefined ? [merged] : [merged, msg];
      return method.apply(this, next as unknown as Parameters<typeof method>);
    },
  },
}) as unknown as AppLogger;

export function secureLog(level: string, message: string, data?: Record<string, unknown>) {
  (logger as unknown as Record<string, (obj: unknown, msg?: string) => void>)[level](
    data || {},
    message
  );
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
