import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') return sanitizeInput(obj) as T;
  if (obj instanceof Date) return (obj as Date).toISOString().slice(0, 10) as T;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item)) as T;
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }
  return obj;
}

export interface ApiResponse<T = unknown> {
  code: number;
  success: boolean;
  message: string;
  data: T | null;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<{
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(
  data: T,
  message = '操作成功',
  code = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    code,
    success: true,
    message,
    data: sanitizeObject(data),
  });
}

export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; pageSize: number; total: number; totalPages: number },
  message = '查询成功'
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    code: 200,
    success: true,
    message,
    data: {
      list: sanitizeObject(data),
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    pagination,
  });
}

export function errorResponse(
  message: string,
  code = 500,
  statusCode: number = code
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      code,
      success: false,
      message: sanitizeInput(message),
      data: null,
    },
    { status: statusCode }
  );
}

// 常见错误响应快捷方法
export const commonErrors = {
  unauthorized: (message = '未授权，请先登录') => errorResponse(message, 401, 401),
  forbidden: (message = '无权访问该资源') => errorResponse(message, 403, 403),
  notFound: (message = '资源不存在') => errorResponse(message, 404, 404),
  badRequest: (message = '请求参数错误') => errorResponse(message, 400, 400),
  conflict: (message = '资源冲突') => errorResponse(message, 409, 409),
  validationError: (message = '数据验证失败') => errorResponse(message, 422, 422),
  serverError: (message = '服务器内部错误') => errorResponse(message, 500, 500),
};

// 统一的API错误处理包装器
export function withErrorHandler<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  errorMessage = '操作失败'
): T {
  return (async (...args: Parameters<T>): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage;
      return errorResponse(message, 500, 500);
    }
  }) as T;
}

// 带认证和错误处理的包装器
export function withAuthAndErrorHandler(
  handler: (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse>,
  errorMessage = '操作失败'
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // 从请求中获取认证信息
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return commonErrors.unauthorized('未授权，请先登录');
      }

      return await handler(request, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage;
      return errorResponse(message, 500, 500);
    }
  };
}

// 验证请求体
export function validateRequestBody<T extends object>(
  body: T,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const obj = body as Record<string, unknown>;
  const missing = requiredFields.filter((field) => {
    const value = obj[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

export async function logOperation(params: {
  title: string;
  oper_name?: string;
  oper_type: string;
  oper_method: string;
  oper_url: string;
  oper_ip?: string;
  oper_param?: string;
  oper_result?: string;
  status?: number;
}) {
  try {
    await execute(
      `INSERT INTO sys_operation_log (title, oper_name, oper_type, oper_method, oper_url, oper_ip, oper_param, oper_result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.title,
        params.oper_name || 'system',
        params.oper_type,
        params.oper_method,
        params.oper_url,
        params.oper_ip || '',
        params.oper_param ? params.oper_param.substring(0, 2000) : null,
        params.oper_result ? params.oper_result.substring(0, 2000) : null,
        params.status ?? 1,
      ]
    );
  } catch {}
}
