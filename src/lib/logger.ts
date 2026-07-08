/**
 * 统一日志工具
 * 用于核心业务逻辑关键分支的详细日志打印
 * 
 * 日志级别：
 * - debug: 开发调试信息（仅开发环境输出）
 * - info: 关键业务流程节点
 * - warn: 异常但可恢复的情况
 * - error: 需要关注的错误
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

interface LogContext {
  module: string;    // 模块名（如 inventory, freeze, cost）
  action: string;    // 操作名（如 freeze_stock, calculate_cost）
  userId?: number;   // 操作用户
  traceId?: string;  // 追踪ID
  [key: string]: unknown;
}

class AppLogger {
  private isDev = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, context: LogContext, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `${LOG_COLORS[level]}[${timestamp}] [${level.toUpperCase()}] [${context.module}:${context.action}]${RESET}`;
    const userStr = context.userId ? ` [user:${context.userId}]` : '';
    const traceStr = context.traceId ? ` [trace:${context.traceId}]` : '';
    const dataStr = data ? `\n  数据: ${JSON.stringify(data, null, 2)}` : '';
    return `${prefix}${userStr}${traceStr} ${message}${dataStr}`;
  }

  debug(context: LogContext, message: string, data?: unknown) {
    if (!this.isDev) return;
    console.debug(this.formatMessage('debug', context, message, data));
  }

  info(context: LogContext, message: string, data?: unknown) {
    console.info(this.formatMessage('info', context, message, data));
  }

  warn(context: LogContext, message: string, data?: unknown) {
    console.warn(this.formatMessage('warn', context, message, data));
  }

  error(context: LogContext, message: string, data?: unknown) {
    console.error(this.formatMessage('error', context, message, data));
  }

  /**
   * 记录业务流程开始
   */
  stepStart(context: LogContext, step: string, params?: unknown) {
    this.info(context, `▶ 开始: ${step}`, params);
  }

  /**
   * 记录业务流程完成
   */
  stepEnd(context: LogContext, step: string, result?: unknown) {
    this.info(context, `✔ 完成: ${step}`, result);
  }

  /**
   * 记录业务流程中的分支决策
   */
  branch(context: LogContext, branchName: string, condition: string, taken: boolean, data?: unknown) {
    this.info(context, `⑂ 分支[${branchName}]: 条件="${condition}" → ${taken ? '✓ 命中' : '✗ 未命中'}`, data);
  }

  /**
   * 记录数据库操作
   */
  db(context: LogContext, operation: string, table: string, data?: unknown) {
    this.debug(context, `💾 DB[${operation}]: ${table}`, data);
  }

  /**
   * 记录权限检查
   */
  permission(context: LogContext, permission: string, granted: boolean) {
    if (granted) {
      this.debug(context, `🔑 权限[${permission}]: ✓ 通过`);
    } else {
      this.warn(context, `🔑 权限[${permission}]: ✗ 拒绝`);
    }
  }
}

export const logger = new AppLogger();

/**
 * 安全日志函数（兼容旧代码）
 * 提供简单的函数式调用接口
 */
export function secureLog(level: LogLevel, message: string, data?: unknown) {
  const ctx: LogContext = { module: 'app', action: 'secure' };
  logger[level](ctx, message, data);
}

/**
 * 生成追踪ID
 */
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 敏感数据脱敏
 */
export function maskSensitiveData<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;

  const sensitiveKeys = ['password', 'pwd', 'token', 'secret', 'apiKey', 'api_key', 'authorization', 'creditCard', 'idCard', 'phone', 'email'];

  const mask = (obj: unknown): unknown => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(mask);

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(k => lowerKey.includes(k))) {
        result[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = mask(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return mask(data) as T;
}
