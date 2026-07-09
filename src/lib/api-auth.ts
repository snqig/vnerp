/**
 * @module api-auth
 * @description API 路由认证辅助模块，提供 Token 验证、权限检查、资源访问控制等核心认证功能，
 * 以及 `withAuth`、`withAuthAndErrorHandler` 等高阶包装器，用于在 Next.js API 路由中
 * 统一处理认证、权限和错误处理逻辑。
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  extractToken,
  verifyToken,
  getUserInfo,
  hasPermission,
  validateResourceAccess,
  UserInfo,
} from './auth';
import { errorResponse } from './api-response';
import { isTokenRevoked, isUserTokensRevoked } from './token-blacklist';

/** 用户信息类型，从 auth 模块 re-export 以方便外部直接引用 */
export type { UserInfo } from './auth';

/** Next.js 动态路由上下文类型（替代 any） */
export interface RouteContext {
  params: Promise<Record<string, string>>;
}

/**
 * 路由处理器上下文类型
 *
 * 保留 any 以兼容调用方对动态路由参数的解构，例如：
 * `(request, userInfo, { params }: { params: Promise<{ id: string }> }) => ...`
 * 调用方可显式使用 `RouteContext` 替代 any 以获得更严格的类型检查。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteHandlerContext = any;

/**
 * 首次登录强制改密白名单
 *
 * 用户首次登录（firstLogin=true）时，系统会拦截所有 API 请求并返回 403，
 * 仅允许白名单中的路由正常访问。白名单包含修改密码、登出、获取用户信息、刷新令牌等
 * 必须在首次登录状态下可执行的操作。
 */
export const FIRST_LOGIN_WHITELIST = [
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/auth/user-info',
  '/api/auth/refresh',
];

/**
 * 检查首次登录状态并拦截非白名单请求
 *
 * 当用户处于首次登录状态（userInfo.firstLogin=true）时，除白名单路由外
 * 所有 API 请求将被拦截，返回 403 状态码和 `passwordExpired: true` 标记，
 * 强制用户先修改密码后才能正常使用系统。
 *
 * @param request - Next.js 请求对象，用于获取请求路径
 * @param userInfo - 当前用户信息，包含 firstLogin 标记
 * @returns 若需要拦截则返回 403 响应，否则返回 null 表示无需拦截
 */
function checkFirstLogin(request: NextRequest, userInfo: UserInfo): NextResponse | null {
  if (userInfo.firstLogin) {
    const { pathname } = new URL(request.url);
    if (!FIRST_LOGIN_WHITELIST.some((p) => pathname.startsWith(p))) {
      return NextResponse.json(
        {
          code: 403,
          success: false,
          message: '无权限访问',
          data: null,
          passwordExpired: true,
        },
        { status: 403 }
      );
    }
  }
  return null;
}

/**
 * 需要认证的 API 路由包装器
 *
 * 对 Next.js API 路由处理器进行认证包装，依次执行以下流程：
 * 1. 提取并验证 Token → 2. 检查 Token 黑名单 → 3. 检查用户级 Token 撤销 →
 * 4. 获取用户完整信息 → 5. 首次登录改密拦截 → 6. 权限检查（可选）→
 * 7. 资源访问权限检查（可选，防止横向越权）→ 8. 执行业务处理器
 *
 * 不包含 try/catch 错误处理，若业务处理器抛出异常将直接向上传播。
 * 如需自动错误捕获，请使用 `withAuthAndErrorHandler`。
 *
 * @param handler - 业务处理器函数，接收认证后的请求、用户信息和上下文
 * @param options - 可选配置
 * @param options.permission - 需要检查的权限标识，如 `'warehouse:view'`
 * @param options.resourceType - 资源类型，用于资源级访问控制，支持 `'order'`、`'workorder'`、`'inbound'`、`'outbound'`
 * @param options.resourceIdParam - 资源 ID 的 URL 查询参数名，与 resourceType 配合使用防止横向越权
 * @returns 包装后的 Next.js API 路由处理函数
 */
export function withAuth(
  handler: (
    request: NextRequest,
    userInfo: UserInfo,
    context?: RouteHandlerContext
  ) => Promise<NextResponse>,
  options?: {
    permission?: string;
    resourceType?: 'order' | 'workorder' | 'inbound' | 'outbound';
    resourceIdParam?: string;
  }
) {
  return async (request: NextRequest, context?: RouteHandlerContext): Promise<NextResponse> => {
    // 1. 提取Token
    const token = extractToken(request);
    if (!token) {
      return errorResponse('未提供认证令牌', 401);
    }

    // 2. 验证Token
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return errorResponse('认证令牌无效或已过期', 401);
    }

    // 2.5 检查Token是否已被撤销（黑名单）
    const tokenKey = `token:${tokenPayload.userId}:${token.slice(-20)}`;
    if (await isTokenRevoked(tokenKey)) {
      return errorResponse('认证令牌已失效，请重新登录', 401);
    }

    // 2.6 检查用户级 token 撤销（修改密码/账号锁定后旧 token 立即失效）
    if (tokenPayload.iat && (await isUserTokensRevoked(tokenPayload.userId, tokenPayload.iat))) {
      return errorResponse('登录状态已失效（账号已变更），请重新登录', 401);
    }

    // 3. 获取用户完整信息
    const userInfo = await getUserInfo(tokenPayload.userId);
    if (!userInfo) {
      return errorResponse('用户不存在或已被禁用', 401);
    }

    // 3.5 首次登录强制改密检查
    const firstLoginResponse = checkFirstLogin(request, userInfo);
    if (firstLoginResponse) return firstLoginResponse;

    // 4. 检查权限
    if (options?.permission && !hasPermission(userInfo, options.permission)) {
      return errorResponse('没有权限执行此操作', 403);
    }

    // 5. 检查资源访问权限（防止横向越权）
    if (options?.resourceType && options?.resourceIdParam) {
      const { searchParams } = new URL(request.url);
      const resourceId = searchParams.get(options.resourceIdParam);

      if (resourceId) {
        const hasAccess = await validateResourceAccess(userInfo, options.resourceType, resourceId);
        if (!hasAccess) {
          return errorResponse('没有权限访问此资源', 403);
        }
      }
    }

    // 6. 执行处理器
    return handler(request, userInfo, context);
  };
}

/**
 * 带认证和错误处理的 API 路由包装器
 *
 * 在 `withAuth` 的基础上增加了 try/catch 全局错误捕获，是 `withPermission` 的底层依赖。
 * 通过委托 `withAuth` 完成认证流程，避免逻辑重复（DRY）。
 *
 * 适用于需要认证且希望自动处理运行时异常的 API 路由。
 *
 * @param handler - 业务处理器函数，接收认证后的请求、用户信息和上下文
 * @param options - 可选配置
 * @param options.permission - 需要检查的权限标识
 * @param options.resourceType - 资源类型，用于资源级访问控制
 * @param options.resourceIdParam - 资源 ID 的 URL 查询参数名
 * @param options.errorMessage - 自定义的服务端错误提示消息，默认为 `'服务器内部错误'`
 * @returns 包装后的 Next.js API 路由处理函数，内部包含 try/catch 错误捕获
 */
export function withAuthAndErrorHandler(
  handler: (
    request: NextRequest,
    userInfo: UserInfo,
    context?: RouteHandlerContext
  ) => Promise<NextResponse>,
  options?: {
    permission?: string;
    resourceType?: 'order' | 'workorder' | 'inbound' | 'outbound';
    resourceIdParam?: string;
    errorMessage?: string;
  }
) {
  const authedHandler = withAuth(handler, options);
  return async (request: NextRequest, context?: RouteHandlerContext): Promise<NextResponse> => {
    try {
      return await authedHandler(request, context);
    } catch (error) {
      console.error(`[API Error] ${options?.errorMessage || '请求处理失败'}:`, error);
      return errorResponse(options?.errorMessage || '服务器内部错误', 500);
    }
  };
}

/**
 * 中间件形式的认证检查（用于 Next.js Middleware）
 *
 * 在 Next.js 中间件层进行轻量级认证验证，仅提取 Token 并验证后返回用户信息。
 * 不执行权限检查、资源访问控制或首次登录拦截，仅确认请求是否携带有效认证信息。
 * 适用于中间件层的路由守卫和预检查场景。
 *
 * @param request - Next.js 中间件请求对象
 * @returns 用户信息对象（认证有效时）或 null（无 Token 或 Token 无效时）
 */
export async function middlewareAuth(request: NextRequest): Promise<UserInfo | null> {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  const tokenPayload = await verifyToken(token);
  if (!tokenPayload) {
    return null;
  }

  return await getUserInfo(tokenPayload.userId);
}
