/**
 * VNERP API审计中间件
 * 功能：自动拦截所有API请求，记录操作日志
 * 使用方式：在API路由中使用 withAudit 包装处理器
 */

import { NextRequest, NextResponse } from 'next/server';
import { logOperation, setAuditUserContext, clearAuditUserContext } from '@/lib/audit-logger';
import { maskSensitiveData } from '@/lib/logger';

// ============================================================
// 模块映射（根据URL路径自动识别模块）
// ============================================================

const MODULE_MAPPING: Record<string, string> = {
  '/api/purchase': tc('text_iz76ff'),
  '/api/sales': tc('text_j5mp0z'),
  '/api/warehouse': tc('text_cbemwa'),
  '/api/production': tc('text_f3xa0d'),
  '/api/finance': tc('text_i5j98k'),
  '/api/quality': tc('text_iew8do'),
  '/api/dcprint': tc('text_aviioy'),
  '/api/hr': tc('text_a9kn6e'),
  '/api/system': tc('text_gao8uh'),
  '/api/report': tc('text_d09qzd'),
  '/api/dashboard': tc('text_d7qb82'),
};

// ============================================================
// 操作类型映射（根据HTTP方法自动识别）
// ============================================================

const METHOD_TYPE_MAPPING: Record<string, string> = {
  GET: tc('text_iftp'),
  POST: tc('text_hs6m'),
  PUT: tc('text_e5fv'),
  PATCH: tc('text_e5fv'),
  DELETE: tc('text_eslg'),
};

// ============================================================
// 需要记录详细请求/响应的模块（白名单）
// ============================================================

const DETAIL_LOG_MODULES = [
  tc('text_iz76ff'),
  tc('text_j5mp0z'),
  tc('text_cbemwa'),
  tc('text_f3xa0d'),
  tc('text_i5j98k'),
];

// ============================================================
// 辅助函数
// ============================================================

function getModuleFromUrl(url: string): string {
  for (const [prefix, module] of Object.entries(MODULE_MAPPING)) {
    if (url.includes(prefix)) return module;
  }
  return tc('text_gao8uh');
}

function getOperationType(method: string, url: string): string {
  // 根据URL中的action参数判断特殊操作
  if (url.includes('action=audit')) return tc('text_g5o7');
  if (url.includes('action=cancel')) return tc('text_e0n7');
  if (url.includes('action=approve')) return tc('text_g5o7');
  if (url.includes('action=reject')) return tc('text_er90');
  if (url.includes('action=import')) return tc('text_g3c9');
  if (url.includes('action=export')) return tc('text_g3ge');
  if (url.includes('action=print')) return tc('text_h6kd');
  if (url.includes('action=submit')) return tc('text_heqc');

  return METHOD_TYPE_MAPPING[method] || method;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

function truncateString(str: string, maxLength: number = 1000): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '... [truncated]';
}

async function parseRequestBody(request: NextRequest): Promise<unknown> {
  try {
    const clonedRequest = request.clone();
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await clonedRequest.json();
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await clonedRequest.formData();
      const obj: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================
// 核心中间件函数
// ============================================================

export interface AuditOptions {
  module?: string;
  type?: string;
  title?: string;
  skipRequestBody?: boolean;
  skipResponseBody?: boolean;
  customContent?: string;
}

/**
 * 带审计日志的API处理器包装器
 * @param handler 原始API处理器
 * @param options 审计选项
 */
export function withAudit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: AuditOptions
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = request.url;
    const method = request.method;
    const moduleName = options?.module || getModuleFromUrl(url);
    const type = options?.type || getOperationType(method, url);

    // 设置用户上下文（从请求头或token中获取）
    const userId = request.headers.get('x-user-id');
    const username = request.headers.get('x-username');
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    setAuditUserContext(userId ? Number(userId) : undefined, username || undefined, ip, userAgent);

    // 解析请求参数
    let requestParam: unknown = null;
    if (!options?.skipRequestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestParam = await parseRequestBody(request);
    }

    // 从URL查询参数中提取
    const { searchParams } = new URL(url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    if (Object.keys(queryParams).length > 0 && !requestParam) {
      requestParam = queryParams;
    }

    let response: NextResponse;
    let responseData: unknown = null;
    let errorMsg = '';
    let status = 1;

    try {
      // 执行原始处理器
      response = await handler(request);

      // 尝试解析响应数据
      if (!options?.skipResponseBody) {
        try {
          const clonedResponse = response.clone();
          responseData = await clonedResponse.json();
        } catch {
          // 响应不是JSON格式，忽略
        }
      }

      // 判断操作是否成功
      if (responseData && typeof responseData === 'object') {
        const resp = responseData as { code?: number; message?: string; msg?: string };
        if (resp.code !== undefined && resp.code !== 200 && resp.code !== 0) {
          status = 0;
          errorMsg = resp.message || resp.msg || '操作失败';
        }
      }

      if (response.status >= 400) {
        status = 0;
      }
    } catch (error: unknown) {
      status = 0;
      errorMsg = error instanceof Error ? error.message : '服务器内部错误';

      // 重新抛出错误，让上层错误处理器处理
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      // 只对关键操作记录详细日志
      const shouldLogDetail =
        DETAIL_LOG_MODULES.includes(moduleName) ||
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

      if (shouldLogDetail) {
        await logOperation(
          {
            module: moduleName,
            type,
            title: options?.title || `${method} ${url.split('?')[0]}`,
            content: options?.customContent || `${moduleName} - ${type}操作`,
            requestUrl: url.split('?')[0],
            requestMethod: method,
            requestParam: requestParam ? maskSensitiveData(requestParam) : null,
            responseResult: responseData ? maskSensitiveData(responseData) : null,
            status,
            errorMsg,
            durationMs: duration,
          },
          request
        );
      }

      // 清除用户上下文
      clearAuditUserContext();
    }

    return response;
  };
}

/**
 * 简化的审计包装器（只记录关键信息）
 */
export function withAuditSimple(
  handler: (request: NextRequest) => Promise<NextResponse>,
  module: string,
  type: string,
  title?: string
) {
  return withAudit(handler, {
    module,
    type,
    title,
    skipRequestBody: true,
    skipResponseBody: true,
  });
}

// ============================================================
// 装饰器风格（用于类方法）
// ============================================================

/**
 * 审计日志装饰器（用于API路由中的特定方法）
 * 使用示例：
 * export const POST = auditRoute('采购管理', '新增采购单')(async (request) => { ... });
 */
export function auditRoute(module: string, type: string, title?: string) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return withAudit(handler, { module, type, title });
  };
}

// ============================================================
// 便捷方法：记录特定业务操作
// ============================================================

/**
 * 记录业务操作（手动调用）
 */
export async function recordBusinessOperation(
  request: NextRequest,
  module: string,
  type: string,
  content: string,
  data?: {
    beforeData?: Record<string, unknown>;
    afterData?: Record<string, unknown>;
    status?: number;
    errorMsg?: string;
  }
): Promise<void> {
  const { logOperation } = await import('@/lib/audit-logger');

  await logOperation(
    {
      module,
      type,
      content,
      beforeData: data?.beforeData,
      afterData: data?.afterData,
      status: data?.status ?? 1,
      errorMsg: data?.errorMsg,
    },
    request
  );
}
