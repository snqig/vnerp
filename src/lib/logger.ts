import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
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

interface LoggerContext {
  module: string;
  action: string;
  traceId: string;
}

logger.stepStart = function (ctx: LoggerContext, stepName: string, data?: Record<string, unknown>) {
  logger.debug({ ctx, step: stepName, data }, `[${ctx.module}.${ctx.action}] ${stepName}`);
};

logger.branch = function (
  ctx: LoggerContext,
  branchName: string,
  condition: string,
  result: boolean,
  data?: Record<string, unknown>
) {
  const level = result ? 'debug' : 'warn';
  const status = result ? 'PASS' : 'FAIL';
  logger[level]({ ctx, branch: branchName, condition, status, data },
    `[${ctx.module}.${ctx.action}] ${branchName}: ${condition} -> ${status}`
  );
};

