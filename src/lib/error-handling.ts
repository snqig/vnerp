import { NextRequest, NextResponse } from 'next/server';

export interface ErrorDetails {
  [key: string]: unknown;
}

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

  static badRequest(message: string, details?: ErrorDetails) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = '未授权访问') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = '禁止访问') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = '资源不存在') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string, details?: ErrorDetails) {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  static tooManyRequests(message = '请求过于频繁') {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internal(message = '服务器内部错误', details?: ErrorDetails) {
    return new AppError(message, 500, 'INTERNAL_ERROR', details);
  }

  static serviceUnavailable(message = '服务暂不可用') {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super('数据验证失败', 400, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', { 
      originalMessage: originalError?.message 
    });
    this.name = 'DatabaseError';
  }
}

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

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 30000
  ) {}

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

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures,
    };
  }
}

export const circuitBreakers = {
  database: new CircuitBreaker(5, 30000),
  external: new CircuitBreaker(3, 60000),
  cache: new CircuitBreaker(3, 10000),
};

export class RetryPolicy {
  constructor(
    private readonly maxRetries: number = 3,
    private readonly baseDelay: number = 1000,
    private readonly maxDelay: number = 10000
  ) {}

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

  private shouldRetry(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.statusCode >= 500 || error.statusCode === 429;
    }
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const retryPolicies = {
  database: new RetryPolicy(3, 1000, 5000),
  api: new RetryPolicy(2, 500, 2000),
  external: new RetryPolicy(3, 2000, 10000),
};

export function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = new RetryPolicy()
): Promise<T> {
  return policy.execute(fn);
}
