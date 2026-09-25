/**
 * @module route-permission-map
 * @description 路由 -> HTTP 方法 -> 权限码 的合并映射与判定逻辑（**无副作用、可被客户端引用**）。
 *
 * 本文件刻意不引入 `next/server` / `mysql` 等 Node 专属依赖，因此既能在服务端
 * （`api-permissions.ts` 的 `withPermission`）使用，也能在客户端组件里做页面级
 * 权限提示。判定语义以服务端的 fail-closed 为准，客户端仅用于 UI 提示。
 */
import { ROUTE_PERMISSIONS } from './route-permissions-table';
import { NO_PERMISSION_ROUTES, ROUTE_PERMISSIONS_EXTRA } from './route-permission-extra';
import { PUBLIC_ROUTES } from './route-permissions-public';

/** 单个路由前缀支持的 HTTP 方法 -> 权限码 */
export type RoutePermissionMap = Record<
  string,
  { GET?: string; POST?: string; PUT?: string; DELETE?: string; PATCH?: string }
>;

/**
 * 合并后的路由 -> 权限映射表（原始表 + 补齐表）
 *
 * 采用**逐方法合并**而非整键覆盖：同一前缀下，补齐表只补充它声明的方法，
 * 未声明的方法沿用原始表中的登记结果，避免"更长的键整体覆盖短键"造成的新缺口。
 */
export const ROUTE_PERMISSIONS_MERGED: RoutePermissionMap = (() => {
  const base: RoutePermissionMap = { ...ROUTE_PERMISSIONS };
  const merged: RoutePermissionMap = { ...base };
  for (const [pattern, extra] of Object.entries(ROUTE_PERMISSIONS_EXTRA)) {
    merged[pattern] = { ...merged[pattern], ...extra };
  }
  return merged;
})();

/**
 * 最长前缀匹配：返回与 `pathname` 匹配的最长路由前缀
 */
export function matchLongestRoutePrefix(pathname: string): string | undefined {
  let best: string | undefined;
  for (const pattern of Object.keys(ROUTE_PERMISSIONS_MERGED)) {
    if (!pathname.startsWith(pattern)) continue;
    if (best === undefined || pattern.length > best.length) best = pattern;
  }
  return best;
}

/**
 * 根据请求路径和 HTTP 方法获取所需权限码；未登记（或无匹配前缀）时返回 null。
 *
 * 注意：`null` 同时表示「公开路由」与「未登记路由」，是否放行由
 * {@link isRoutePermissionConfigured} 裁定（fail-closed）。
 */
export function resolveRoutePermission(pathname: string, method: string): string | null {
  const matched = matchLongestRoutePrefix(pathname);
  if (!matched) return null;
  const methodPermissions = ROUTE_PERMISSIONS_MERGED[matched];
  return methodPermissions[method as keyof typeof methodPermissions] || null;
}

/**
 * 判断某个接口是否「已完成权限登记」（fail-closed 判定）
 *
 * 未登记的接口一律拒绝，而不是沿用历史上的 fail-open（返回 null 直接放行）。
 * 两类接口除外：`PUBLIC_ROUTES`（公开路由）与 `NO_PERMISSION_ROUTES`
 * （需要登录态但不涉及业务数据的接口）。
 */
export function isRoutePermissionConfigured(pathname: string, method: string): boolean {
  for (const publicRoute of PUBLIC_ROUTES) {
    if (pathname.startsWith(publicRoute)) return true;
  }
  for (const exempt of NO_PERMISSION_ROUTES) {
    if (pathname.startsWith(exempt)) return true;
  }

  const matched = matchLongestRoutePrefix(pathname);
  if (!matched) return false;

  const methodPermissions = ROUTE_PERMISSIONS_MERGED[matched];
  return Boolean(methodPermissions[method as keyof typeof methodPermissions]);
}
