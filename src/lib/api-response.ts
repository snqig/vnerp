import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

// 统一API响应结构
export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  message: string;
  data: T | null;
}

// 分页响应结构
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 成功响应
export function successResponse<T>(data: T, message = '操作成功', code = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    code,
    success: true,
    message,
    data,
  });
}

// 分页成功响应
export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; pageSize: number; total: number; totalPages: number },
  message = '查询成功'
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    code: 200,
    success: true,
    message,
    data,
    pagination,
  });
}

// 错误响应
export function errorResponse(message: string, code = 500, statusCode = 500): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      code,
      success: false,
      message,
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
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  errorMessage = '操作失败'
): T {
  return (async (...args: Parameters<T>): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('[API Error]:', error);
      const message = error instanceof Error ? error.message : errorMessage;
      return errorResponse(message, 500, 500);
    }
  }) as T;
}

// 验证请求体
export function validateRequestBody<T extends Record<string, any>>(
  body: T,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(field => {
    const value = body[field];
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
  } catch (e) {
    console.error('记录操作日志失败:', e);
  }
}
