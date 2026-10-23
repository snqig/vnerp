import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { execute } from '@/lib/db';
import { isUniqueViolation, mapUniqueErrorToMessage } from './db/errors';
import { API_MESSAGE_TO_CODE } from './api-error-i18n';

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Date → 本地钟面串 'YYYY-MM-DDTHH:mm:ss'（无时区语义，钟面即 DB 存储的业务时间）。
 *
 * 背景（全局治理）：原实现 toISOString().slice(0, 10) 把所有 Date 截断成 UTC 纯日期串：
 * ① DATETIME 时间部分在出参即丢失，前端 datetime-local 编辑回显拿不到时间；
 * ② 北京 0–8 点的记录 UTC 日期已是前一天（错日）。
 * 改为按服务器本地时区取钟面 —— mysql2 的 timezone 默认 'local'，本地钟面往返恰好
 * 还原 DB 存储串（与 dateStrings:['DATE'] 返回的 DATE 串同口径）。
 * 该格式为 ES 规范的本地时间解析（无偏移即本地），new Date()/formatDate/toDateInput/
 * toDateTimeLocal/slice(0,10)/slice(0,16) 全部兼容，且无 Safari 空格分隔解析问题。
 */
function dateToClockString(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') return sanitizeInput(obj) as T;
  if (obj instanceof Date) return dateToClockString(obj as Date) as T;
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
  errorCode?: string;
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
  const escaped = sanitizeInput(message);
  // P1-2 中枢：按中文消息查映射得 errorCode（AE####），供前端译员翻译；
  // 命中返回码，未命中（如开发环境原始异常文案）返回 undefined，前端回退 message。
  const errorCode = API_MESSAGE_TO_CODE[message] ?? API_MESSAGE_TO_CODE[escaped] ?? undefined;
  return NextResponse.json(
    {
      code,
      success: false,
      message: escaped,
      errorCode,
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
      // 唯一约束冲突：转为业务冲突提示（409），不抛 500
      if (error instanceof Error && isUniqueViolation(error)) {
        return commonErrors.conflict(mapUniqueErrorToMessage(error));
      }
      // 生产环境不向客户端泄露底层异常信息（可能含 SQL/表结构等敏感细节）
      const message =
        process.env.NODE_ENV === 'production'
          ? errorMessage
          : error instanceof Error
            ? error.message
            : errorMessage;
      if (error instanceof Error) {
        logger.error('[withErrorHandler]', error);
      }
      return errorResponse(message, 500, 500);
    }
  }) as T;
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
