'use client';

import { ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 不需要认证的公开路由前缀。登录页等公开入口直接放行，不被守卫拦截。
 * 注意：仅放“页面”级公开路由；API 公开路由在 api-permissions.ts 的 PUBLIC_ROUTES 单独管理。
 */
const PUBLIC_PATH_PREFIXES = ['/login'];

/**
 * 客户端认证守卫。
 *
 * 背景：应用此前完全没有认证守卫——middleware 缺失、[locale]/layout 不校验
 * isAuthenticated、PermissionGuard 只验权限不验登录，且没有任何页面在
 * isAuthenticated===false 时跳 /login。唯一的 /login 跳转在 auth-fetch 的 401
 * 处理里，且仅在 API 报错后触发，不是页面加载时的校验。
 * 后果：只要 localStorage 残留有效 token（rememberMe，JWT 24h 内），或直接访问
 * /dashboard 等地址，应用外壳即可渲染，表现为“不输入账号密码就能进入系统”。
 *
 * 本守卫在每个被包裹页面渲染前检查登录态：
 * - 公开路由（/login）直接放行；
 * - 认证未完成（authResolved=false）时展示加载态，避免未授权页面闪烁；
 * - 认证完成但仍未登录 → 跳转 /login。
 *
 * 与 auth-fetch 的 401 跳转形成纵深防御：即使前端守卫被绕过，后端 withAuth 仍会 401。
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, authResolved } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  const guarded = !isPublic;
  const resolving = guarded && !authResolved;
  const denied = guarded && authResolved && !isAuthenticated;

  useEffect(() => {
    if (denied) {
      router.replace('/login');
    }
  }, [denied, router]);

  if (resolving || denied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
