/**
 * @module error-handling
 * @description API 错误处理框架，提供标准化的错误类型体系（AppError 及其子类）、
 * 错误响应转换、熔断器（CircuitBreaker）和重试策略（RetryPolicy），用于在 API 路由中
 * 统一处理异常、保护系统稳定性并实现优雅降级。
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * 错误详情的动态键值结构
 *
 * 用于在 AppError 中存储附加的错误上下文信息，键名自由定义，
 * 值可以是任意类型（如字段级验证错误列表、原始错误消息等）。
 */
export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * 应用统一错误基类
 *
 * 封装了 HTTP 状态码、错误码和详情信息，所有业务层抛出的错误应使用此类或其子类。
 * 提供了多种静态工厂方法用于快速创建常见 HTTP 错误类型：
 * - `badRequest` (400) - 请求参数错误
 * - `unauthorized` (401) - 未授权访问
 * - `forbidden` (403) - 禁止访问/权限不足
 * - `notFound` (404) - 资源不存在
 * - `conflict` (409) - 资源冲突
 * - `tooManyRequests` (429) - 请求频率超限
 * - `internal` (500) - 服务端内部错误
 * - `serviceUnavailable` (503) - 服务暂不可用（熔断场景）
 *
 * @param message - 错误描述消息
 * @param statusCode - HTTP 状态码，默认为 500
 * @param code - 错误码标识字符串，如 `'BAD_REQUEST'`、`'VALIDATION_ERROR'`
 * @param details - 附加错误详情，如验证字段错误映射
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'AppError';
  }

  /**
   * 创建 400 Bad Request 错误
   *
   * 用于请求参数格式错误、必填字段缺失等场景。
   *
   * @param message - 错误描述消息
   * @param details - 附加详情，如具体的字段错误信息
   * @returns AppError 实例，状态码 400，错误码 `'BAD_REQUEST'`
   */
  static badRequest(message: string, details?: ErrorDetails) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  /**
   * 创建 401 Unauthorized 错误
   *
   * 用于 Token 缺失、Token 无效或过期等认证失败场景。
   *
   * @param message - 错误描述消息，默认为 `'未授权访问'`
   * @returns AppError 实例，状态码 401，错误码 `'UNAUTHORIZED'`
   */
  static unauthorized(message = '未授权访问') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  /**
   * 创建 403 Forbidden 错误
   *
   * 用于权限不足、角色限制、首次登录强制改密拦截等禁止访问场景。
   *
   * @param message - 错误描述消息，默认为 `'禁止访问'`
   * @returns AppError 实例，状态码 403，错误码 `'FORBIDDEN'`
   */
  static forbidden(message = '禁止访问') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  /**
   * 创建 404 Not Found 错误
   *
   * 用于查询的资源不存在（如订单、工单、物料等记录未找到）的场景。
   *
   * @param message - 错误描述消息，默认为 `'资源不存在'`
   * @returns AppError 实例，状态码 404，错误码 `'NOT_FOUND'`
   */
  static notFound(message = '资源不存在') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  /**
   * 创建 409 Conflict 错误
   *
   * 用于资源状态冲突（如重复创建、并发修改冲突、状态流转不合法）等场景。
   *
   * @param message - 错误描述消息，说明冲突原因
   * @param details - 附加详情，如冲突的具体数据
   * @returns AppError 实例，状态码 409，错误码 `'CONFLICT'`
   */
  static conflict(message: string, details?: ErrorDetails) {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  /**
   * 创建 429 Too Many Requests 错误
   *
   * 用于请求频率超限、触发限流策略等场景，提示客户端稍后重试。
   *
   * @param message - 错误描述消息，默认为 `'请求过于频繁'`
   * @returns AppError 实例，状态码 429，错误码 `'TOO_MANY_REQUESTS'`
   */
  static tooManyRequests(message = '请求过于频繁') {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  /**
   * 创建 500 Internal Server Error 错误
   *
   * 用于不可预期的服务端异常（如数据库连接失败、未处理的运行时错误）等场景。
   *
   * @param message - 错误描述消息，默认为 `'服务器内部错误'`
   * @param details - 附加详情，如原始异常信息
   * @returns AppError 实例，状态码 500，错误码 `'INTERNAL_ERROR'`
   */
  static internal(message = '服务器内部错误', details?: ErrorDetails) {
    return new AppError(message, 500, 'INTERNAL_ERROR', details);
  }

  /**
   * 创建 503 Service Unavailable 错误
   *
   * 用于服务熔断、外部依赖不可用等场景，通常由 CircuitBreaker 触发抛出。
   *
   * @param message - 错误描述消息，默认为 `'服务暂不可用'`
   * @returns AppError 实例，状态码 503，错误码 `'SERVICE_UNAVAILABLE'`
   */
  static serviceUnavailable(message = '服务暂不可用') {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * 数据验证错误类
 *
 * 继承自 AppError，用于表单/接口参数验证失败场景。
 * 构造时自动传入状态码 400 和错误码 `'VALIDATION_ERROR'`，
 * details 中包含按字段名组织的错误消息列表（如 `{ username: ['用户名不能为空', '长度至少3位'] }`）。
 *
 * @param errors - 按字段名组织的验证错误列表，键为字段名，值为错误消息数组
 */
export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super('数据验证失败', 400, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

/**
 * 数据库操作错误类
 *
 * 继承自 AppError，用于数据库查询、连接、事务等操作失败场景。
 * 构造时自动传入状态码 500 和错误码 `'DATABASE_ERROR'`，
 * details 中包含原始数据库错误的 message 以便排查。
 *
 * @param message - 错误描述消息，说明数据库操作失败的原因
 * @param originalError - 原始数据库驱动抛出的 Error 对象，用于保留底层错误信息
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', { 
      originalMessage: originalError?.message 
    });
    this.name = 'DatabaseError';
  }
}

/**
 * 业务逻辑错误类
 *
 * 继承自 AppError，用于业务规则校验失败场景（如状态流转不合法、库存不足无法出库等）。
 * 与 ValidationError 的区别在于：ValidationError 是输入格式验证失败，BusinessError 是业务规则违反。
 * 构造时自动传入状态码 400，code 由调用方自定义以区分不同业务错误类型。
 *
 * @param message - 错误描述消息，说明违反的业务规则
 * @param code - 自定义业务错误码标识，如 `'STOCK_INSUFFICIENT'`、`'STATUS_INVALID'`
 * @param details - 附加业务错误详情
 */
export class BusinessError extends AppError {
  constructor(message: string, code: string, details?: ErrorDetails) {
    super(message, 400, code, details);
    this.name = 'BusinessError';
  }
}

interface ErrorResponse {
  success: boolean;
  message: string;
  code?: string;
  details?: ErrorDetails;
  stack?: string;
}

/**
 * 统一错误处理函数
 *
 * 将任意类型的错误（AppError、普通 Error 或未知值）转换为标准化的 NextResponse JSON 响应。
 * AppError 直接使用其属性生成响应；普通 Error 被包装为 500 内部错误；非 Error 类型返回通用错误消息。
 * 开发环境下会在响应中附带错误堆栈信息以便调试。
 *
 * @param error - 待处理的错误对象，可以是 AppError、Error 或任意值
 * @param req - 可选的 Next.js 请求对象，用于错误日志中记录请求 URL 和方法
 * @returns 标准化的 NextResponse JSON 错误响应，状态码与错误类型对应
 */
export function handleError(error: unknown, req?: NextRequest): NextResponse {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = AppError.internal(error.message);
  } else {
    appError = AppError.internal('未知错误');
  }

  const isDev = process.env.NODE_ENV === 'development';

  const response: ErrorResponse = {
    success: false,
    message: appError.message,
    code: appError.code,
  };

  if (appError.details) {
    response.details = appError.details;
  }

  if (isDev && error instanceof Error && error.stack) {
    response.stack = error.stack;
  }

  logError(appError, req);

  return NextResponse.json(response, { status: appError.statusCode });
}

function logError(error: AppError, req?: NextRequest) {
  const logData = {
    timestamp: new Date().toISOString(),
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    url: req?.url,
    method: req?.method,
    stack: error.stack,
  };

  if (error.statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(logData, null, 2));
  } else {
    console.warn('[WARN]', JSON.stringify(logData));
  }
}

/**
 * 带错误处理的 API 路由包装器
 *
 * 对 Next.js API 路由处理器进行 try/catch 包装，自动捕获处理器中抛出的任何异常，
 * 并通过 `handleError` 转换为标准化的错误响应。适用于不需要认证但需要错误兜底的 API 路由。
 *
 * @param handler - Next.js API 路由处理器函数
 * @returns 包装后的 API 路由处理函数，内部包含 try/catch 错误捕获
 */
export function withErrorHandler(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleError(error, req);
    }
  };
}

/**
 * 熔断器 — 保护系统免受级联故障影响
 *
 * 实现了经典的 CLOSED → OPEN → HALF_OPEN 三态熔断模式：
 * - **CLOSED**（正常）：所有请求正常执行，失败次数计数
 * - **OPEN**（熔断）：失败次数达到阈值后，所有请求直接抛出 `AppError.serviceUnavailable`，
 *   拒绝执行以防止故障蔓延
 * - **HALF_OPEN**（半开）：熔断恢复超时后允许一次试探性请求，成功则恢复为 CLOSED，
 *   失败则继续保持 OPEN
 *
 * 适用于数据库连接、外部 API 调用、缓存服务等不稳定依赖的保护。
 *
 * @param failureThreshold - 触发熔断的连续失败次数阈值，默认为 5
 * @param recoveryTimeout - 熔断恢复超时时间（毫秒），OPEN 状态持续时间后进入 HALF_OPEN，默认为 30000
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 30000
  ) {}

  /**
   * 在熔断器保护下执行异步操作
   *
   * 根据熔断器当前状态决定是否执行操作：
   * - CLOSED 状态：正常执行，成功则重置计数器，失败则累加失败次数
   * - OPEN 状态：若已达恢复超时则转为 HALF_OPEN 允许试探执行，否则直接抛出 503 错误
   * - HALF_OPEN 状态：允许执行试探请求，成功则恢复 CLOSED，失败则重新进入 OPEN
   *
   * @param fn - 待执行的异步操作函数
   * @returns 操作的返回值
   * @throws AppError.serviceUnavailable 当熔断器处于 OPEN 状态且未达恢复超时时抛出
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw AppError.serviceUnavailable('服务熔断中，请稍后重试');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功回调 — 重置失败计数器并恢复熔断器为 CLOSED 状态
   */
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  /**
   * 失败回调 — 累加失败计数，达到阈值时将熔断器切换为 OPEN 状态
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * 获取熔断器当前状态信息
   *
   * @returns 包含 `state`（状态名称）和 `failures`（当前失败计数）的对象
   */
  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures,
    };
  }
}

/**
 * 预配置的熔断器实例集合
 *
 * 为系统中不同类型的服务依赖提供了独立的熔断器实例：
 * - `database` — 数据库操作熔断器，阈值 5 次、恢复超时 30 秒
 * - `external` — 外部 API 调用熔断器，阈值 3 次、恢复超时 60 秒
 * - `cache` — 缓存服务熔断器，阈值 3 次、恢复超时 10 秒
 */
export const circuitBreakers = {
  database: new CircuitBreaker(5, 30000),
  external: new CircuitBreaker(3, 60000),
  cache: new CircuitBreaker(3, 10000),
};

/**
 * 重试策略 — 自动重试失败的操作并逐步增加等待间隔
 *
 * 实现了指数退避（Exponential Backoff）重试模式，每次重试的等待时间按 2 的幂次递增：
 * `baseDelay * 2^attempt`，但不超过 maxDelay 上限。
 * 仅对可重试的错误进行重试：服务端错误（状态码 >= 500）和限流错误（429）；
 * 客户端错误（4xx，不含 429）不重试，因为重试不会改变结果。
 *
 * @param maxRetries - 最大重试次数，默认为 3
 * @param baseDelay - 首次重试的基础等待时间（毫秒），默认为 1000
 * @param maxDelay - 单次重试的最大等待时间上限（毫秒），默认为 10000
 */
export class RetryPolicy {
  constructor(
    private readonly maxRetries: number = 3,
    private readonly baseDelay: number = 1000,
    private readonly maxDelay: number = 10000
  ) {}

  /**
   * 在重试策略保护下执行异步操作
   *
   * 最多执行 maxRetries + 1 次（首次 + 重试次数），每次失败后等待指数退避延迟再重试。
   * 仅对判定为可重试的错误执行重试，不可重试的错误立即抛出。
   * 所有重试耗尽后抛出最后一次遇到的错误。
   *
   * @param fn - 待执行的异步操作函数
   * @returns 操作的成功返回值
   * @throws 最后一次失败遇到的错误（所有重试耗尽后）
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries && this.shouldRetry(error)) {
          const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt),
            this.maxDelay
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 判断错误是否可重试
   *
   * 对于 AppError 类型的错误，仅在状态码 >= 500（服务端错误）或 429（限流）时重试，
   * 因为客户端错误（4xx）重试不会改变结果。对于非 AppError 类型的未知错误默认允许重试。
   *
   * @param error - 待判断的错误对象
   * @returns 是否应该对该错误进行重试
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.statusCode >= 500 || error.statusCode === 429;
    }
    return true;
  }

  /**
   * 延迟等待辅助方法
   *
   * @param ms - 等待时间（毫秒）
   * @returns 延迟结束后 resolve 的 Promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 预配置的重试策略实例集合
 *
 * 为系统中不同类型的服务操作提供了独立的重试策略：
 * - `database` — 数据库操作重试，最多 3 次、基础延迟 1 秒、最大延迟 5 秒
 * - `api` — 内部 API 调用重试，最多 2 次、基础延迟 0.5 秒、最大延迟 2 秒
 * - `external` — 外部服务调用重试，最多 3 次、基础延迟 2 秒、最大延迟 10 秒
 */
export const retryPolicies = {
  database: new RetryPolicy(3, 1000, 5000),
  api: new RetryPolicy(2, 500, 2000),
  external: new RetryPolicy(3, 2000, 10000),
};

/**
 * 使用重试策略执行异步操作的便捷函数
 *
 * 对 `RetryPolicy.execute` 的简捷调用方式，默认使用新建的 RetryPolicy 实例，
 * 也可传入自定义策略实例。适用于需要一次性重试保护的简单场景，
 * 如数据库查询重试、外部 API 调用重试等。
 *
 * @param fn - 待执行的异步操作函数
 * @param policy - 自定义的重试策略实例，默认为新建的 RetryPolicy（3 次重试、1 秒基础延迟、10 秒最大延迟）
 * @returns 操作的成功返回值
 * @throws 最后一次失败遇到的错误（所有重试耗尽后）
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = new RetryPolicy()
): Promise<T> {
  return policy.execute(fn);
}
