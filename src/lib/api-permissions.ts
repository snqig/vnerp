/**
 * @module api-permissions
 * @description API 权限检查系统，定义了路由与 HTTP 方法的权限映射关系以及权限校验的核心逻辑。
 * 所有需要权限控制的 API 路由均通过此模块进行访问级别判断。
 *
 * 注意：权限标识常量（`API_PERMISSIONS`）与角色权限勾选分组（`PERMISSION_MODULES`）
 * 已迁移至纯数据模块 `./permissions-catalog`，作为服务端与客户端共享的单一数据源。
 * 本模块从该处 re-export 以保持向后兼容，请勿在此重新定义。
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndErrorHandler, FIRST_LOGIN_WHITELIST, RouteHandlerContext } from './api-auth';
import { logOperation } from './api-response';
import { logger } from '@/lib/logger';
import { UserInfo, hasPermission } from './auth';
import { API_PERMISSIONS, PERMISSION_MODULES } from './permissions-catalog';
import { ROUTE_PERMISSIONS_MERGED, isRoutePermissionConfigured, resolveRoutePermission } from './route-permission-map';
import { PUBLIC_ROUTES } from './route-permissions-public';

// 从单一数据源 re-export，保持既有 import 用法不变
export { API_PERMISSIONS, PERMISSION_MODULES };

/**
 * 路径与 HTTP 方法的权限映射表
 *
 * 将每个 API 路径前缀映射到其各 HTTP 方法（GET/POST/PUT/DELETE/PATCH）所需的权限标识。
 * 路由匹配采用最长前缀匹配策略，路径越长优先级越高。用于 `getRequiredPermission` 函数
 * 查找请求所需的权限。
 */
export { ROUTE_PERMISSIONS } from './route-permissions-table';

/**
 * 无需认证即可访问的公开路由列表
 *
 * 这些路由（如登录、注册、重置锁定等）不需要进行权限检查，
 * 即使未登录或首次登录状态下也可正常访问。
 */
export { PUBLIC_ROUTES } from './route-permissions-public';

export {
  ROUTE_PERMISSIONS_MERGED,
  isRoutePermissionConfigured,
  resolveRoutePermission,
} from './route-permission-map';

/**
 * 首次登录强制改密白名单
 *
 * 定义已移至 api-auth.ts，此处通过 re-export 保持向后兼容。
 * 白名单中的路由在用户首次登录（firstLogin=true）时仍可访问，
 * 主要包括修改密码、登出、获取用户信息等必要操作。
 */
export { FIRST_LOGIN_WHITELIST };


/**
 * 根据请求路径和 HTTP 方法获取所需的权限标识
 *
 * 首先检查路径是否属于公开路由（无需权限），然后采用最长前缀匹配策略
 * 从 `ROUTE_PERMISSIONS_MERGED` 映射表中查找对应的权限标识。匹配越长的路径优先级越高，
 * 例如 `/api/warehouse/outbound` 会优先匹配 `/api/warehouse/outbound` 而非 `/api/warehouse`。
 *
 * @param pathname - 请求的 URL 路径，如 `/api/warehouse/inbound`
 * @param method - HTTP 请求方法，如 `GET`、`POST`、`PUT`、`DELETE`、`PATCH`
 * @returns 所需的权限标识字符串，若为公开路由或未配置权限的路由则返回 null
 *
 * 注意：`null` 在本函数语义下同时表示「公开路由」与「未登记路由」。
 * 是否放行由 `isRoutePermissionConfigured` 统一裁定（fail-closed），请勿单独依赖本函数。
 */
export function getRequiredPermission(pathname: string, method: string): string | null {
  return resolveRoutePermission(pathname, method);
}

/**
 * 带权限检查的 API 路由处理器包装器
 *
 * 在 `withAuthAndErrorHandler` 认证和错误处理的基础上，增加基于路由的自动权限校验。
 * 流程：认证 → 根据请求路径和方法自动查找所需权限 → 检查用户是否拥有该权限或 admin 角色 →
 * 首次登录改密拦截 → 执行业务处理器 → 可选的操作日志记录。
 *
 * admin 角色的用户自动跳过所有权限检查，拥有系统最高访问级别。
 *
 * @param handler - 业务处理器函数，接收请求、用户信息和上下文
 * @param options - 可选配置
 * @param options.errorMessage - 自定义错误提示消息，传递给 withAuthAndErrorHandler
 * @param options.logTitle - 操作日志标题，若提供则在成功响应时记录操作日志
 * @param options.logType - 操作日志类型，默认为 `'api'`
 * @returns 包装后的 Next.js API 路由处理函数
 */
export function withPermission(
  handler: (
    request: NextRequest,
    userInfo: UserInfo,
    context?: RouteHandlerContext
  ) => Promise<NextResponse>,
  options?: {
    errorMessage?: string;
    logTitle?: string;
    logType?: string;
  }
) {
  return withAuthAndErrorHandler(
    async (request, userInfo, context) => {
      const { pathname } = new URL(request.url);
      const method = request.method;
      const requiredPermission = getRequiredPermission(pathname, method);

      if (requiredPermission && !hasPermission(userInfo, requiredPermission)) {
        return NextResponse.json(
          {
            code: 403,
            success: false,
            message: `没有权限执行此操作，需要权限: ${requiredPermission}`,
            data: null,
          },
          { status: 403 }
        );
      }

      // fail-closed：已登记但未命中权限码的接口一律拒绝，不再静默放行。
      // 首次登录用户先走改密拦截，避免把「改密门槛」误报成「无权限」。
      if (!requiredPermission && !isRoutePermissionConfigured(pathname, method)) {
        logger.warn(
          { pathname, method, userId: userInfo.userId },
          '[PERM] API 未登记权限校验，已拒绝（请在 ROUTE_PERMISSIONS / ROUTE_PERMISSIONS_EXTRA 中补齐）'
        );
        return NextResponse.json(
          {
            code: 403,
            success: false,
            message: '该接口尚未配置权限校验，已被安全策略拦截，请联系管理员',
            data: null,
            permissionNotConfigured: true,
          },
          { status: 403 }
        );
      }

      // 首次登录强制改密拦截：除白名单外所有 API 返回 403
      if (userInfo.firstLogin && !FIRST_LOGIN_WHITELIST.some((p) => pathname.startsWith(p))) {
        return NextResponse.json(
          {
            code: 403,
            success: false,
            message: '首次登录需修改密码后才能访问系统功能',
            data: null,
            passwordExpired: true,
          },
          { status: 403 }
        );
      }

      const result = await handler(request, userInfo, context);

      if (options?.logTitle && result.status >= 200 && result.status < 300) {
        await logOperation({
          title: options.logTitle,
          oper_name: userInfo.realName || userInfo.username,
          oper_type: options.logType || 'api',
          oper_method: method,
          oper_url: pathname,
          status: 1,
        });
      }

      return result;
    },
    {
      errorMessage: options?.errorMessage,
    }
  );
}
