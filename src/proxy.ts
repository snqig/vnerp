import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n/locales';
import {
  CSRF_COOKIE_NAME,
  requiresCsrfValidation,
  validateCsrfToken,
  ensureCsrfCookie,
} from './lib/csrf';

// 生产环境禁止访问的调试路由
const BLOCKED_ROUTES = ['/qrcode', '/api/init', '/api/debug', '/api/diagnose'];

// 受保护路由前缀：未登录用户访问时重定向到 /login
// （与 src/app/[locale] 下的实际页面目录对应）
const PROTECTED_ROUTE_PREFIXES = [
  '/dashboard',
  '/warehouse',
  '/sales',
  '/purchase',
  '/production',
  '/quality',
  '/hr',
  '/finance',
  '/equipment',
  '/engineering',
  '/outsource',
  '/orders',
  '/reports',
  '/settings',
  '/dcprint',
  '/sample',
  '/analysis',
  '/base-data',
  '/business',
  '/srm',
  '/prepress',
  '/plm',
  '/delivery',
  '/crm',
  '/tools',
  '/material-requisitions',
  '/modules',
  '/qrcode',
];

// 已登录用户访问这些路由时重定向到 /dashboard
const AUTH_PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

// 创建 i18n 中间件
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

/**
 * 从 pathname 中剥离 locale 前缀，返回 { locale, cleanPath }。
 * locale 为 null 表示未带前缀（默认 locale 走无前缀路径）。
 */
function stripLocale(pathname: string): { locale: string | null; cleanPath: string } {
  for (const loc of locales) {
    if (pathname === `/${loc}`) {
      return { locale: loc, cleanPath: '/' };
    }
    if (pathname.startsWith(`/${loc}/`)) {
      return { locale: loc, cleanPath: pathname.slice(`/${loc}`.length) || '/' };
    }
  }
  return { locale: null, cleanPath: pathname };
}

/**
 * 根据是否有 locale 前缀构造目标路径。
 * 默认 locale (zh-CN) 不带前缀（localePrefix: 'as-needed'）。
 */
function withLocalePrefix(path: string, locale: string | null): string {
  if (locale && locale !== defaultLocale) {
    return `/${locale}${path === '/' ? '' : path}`;
  }
  return path;
}

function isPathUnder(cleanPath: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => cleanPath === p || cleanPath.startsWith(p + '/') || cleanPath === p + '/'
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 生产环境阻止调试路由
  if (process.env.NODE_ENV === 'production') {
    for (const route of BLOCKED_ROUTES) {
      const localePattern = /^\/(zh-CN|zh-TW|en|vi)/;
      const cleanPath = pathname.replace(localePattern, '') || '/';
      if (cleanPath.startsWith(route)) {
        return new NextResponse('Not Found', { status: 404 });
      }
    }
  }

  // API 路由：access_token 存在性检查 + CSRF 校验 + 放行（不做 i18n 处理）
  if (pathname.startsWith('/api/')) {
    // 跳过公开 API（登录/注册/健康检查等）
    const isPublicApi = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/health',
      '/api/migrations',
    ].some((p) => pathname.startsWith(p));

    if (!isPublicApi) {
      // 所有非公开 API 必须携带 access_token cookie
      const apiToken = request.cookies.get('access_token')?.value;
      if (!apiToken) {
        return NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    if (requiresCsrfValidation(request)) {
      if (!validateCsrfToken(request)) {
        return NextResponse.json(
          { success: false, message: 'CSRF token validation failed' },
          { status: 403 }
        );
      }
    }
    return NextResponse.next();
  }

  // ===== 基于 access_token cookie 的页面级鉴权 =====
  // proxy 只校验 cookie 存在性（Edge runtime，不解析 JWT），
  // JWT 实际有效性由 SSR layout.tsx 和 API 路由的 verifyToken 校验。
  const accessToken = request.cookies.get('access_token')?.value;
  const { locale, cleanPath } = stripLocale(pathname);

  // 受保护路由：无 access_token → 重定向到 /login（保留 locale 前缀）
  if (isPathUnder(cleanPath, PROTECTED_ROUTE_PREFIXES) && !accessToken) {
    const loginUrl = new URL(withLocalePrefix('/login', locale), request.url);
    // 携带原始路径作为 next 参数，便于登录后回跳
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录用户访问登录/注册等公共页 → 重定向到 /dashboard
  if (accessToken && isPathUnder(cleanPath, AUTH_PUBLIC_ROUTES)) {
    const dashboardUrl = new URL(withLocalePrefix('/dashboard', locale), request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // i18n 中间件处理
  const response = intlMiddleware(request);

  // 对页面请求确保 CSRF cookie 存在（首次访问时种入）
  if (!request.cookies.get(CSRF_COOKIE_NAME)) {
    ensureCsrfCookie(response);
  }

  return response;
}

export const config = {
  matcher: [
    // 页面路径（排除 API, _next, _vercel, 静态文件）
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // 所有 API 路由（CSRF 校验 + 生产环境调试路由封堵）
    '/api/:path*',
    '/qrcode/:path*',
  ],
};
