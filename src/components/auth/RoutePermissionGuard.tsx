'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from '@/i18n/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isRoutePermissionConfigured, resolveRoutePermission } from '@/lib/route-permission-map';

/**
 * 页面级权限守卫（单一入口）。
 *
 * 背景：此前 `PermissionGuard` 在全仓零引用，页面打开与否完全取决于菜单是否下发，
 * 与后端实际校验脱节。本守卫挂在 `[locale]/layout` 上，一次覆盖全部页面：
 * 把当前页面路径映射成对应的 API 路径（`/zh/warehouse/inbound` -> `/api/warehouse/inbound`），
 * 复用服务端同一份 `route-permission-map` 得出所需权限码后做 UI 层拦截。
 *
 * 职责边界（重要）：
 * - 本守卫**只影响界面呈现**，不是安全边界。真正的强制校验在服务端 `withPermission`；
 *   即使此处被绕过，接口仍会因为缺少权限码返回 403。
 * - 未登记权限的页面一律**放行**（仅开发环境下告警）。历史上大量页面没有登记权限，
 *   若此处硬拦会造成大面积白屏，属于比越权更严重的可用性事故。
 * - 认证未完成时展示加载态，绝不返回 `null`，避免白屏。
 */
export function RoutePermissionGuard({ children }: { children: ReactNode }) {
  const { authResolved, hasPermission } = useAuth();
  const pathname = usePathname();

  if (!authResolved) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // usePathname()（next-intl, localePrefix:'as-needed'）已返回去掉 locale 前缀的路径，
  // 例如 /orders/bom。直接据此拼 /api 前缀即可，不要再 slice(1)，否则会误删首个真实段
  // （旧逻辑把 /orders/bom 错拼成 /api/bom，导致未登记告警且 UI 权限判定错位）。
  const segments = pathname.split('/').filter(Boolean);
  const apiPath = segments.length ? '/api/' + segments.join('/') : '';
  const required = apiPath ? resolveRoutePermission(apiPath, 'GET') : null;
  const configured = apiPath ? isRoutePermissionConfigured(apiPath, 'GET') : true;

  if (import.meta.env.DEV && apiPath && !configured) {
    console.warn(
      `[PermissionGuard] 页面 ${apiPath} 未登记权限映射，已放行（请登记到 ROUTE_PERMISSIONS / ROUTE_PERMISSIONS_EXTRA）`
    );
  }

  if (required && !hasPermission(required)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-foreground">无权访问</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            当前账号缺少访问该页面所需的权限（{required}），请联系管理员分配权限后重试。
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
