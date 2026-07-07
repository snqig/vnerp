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
const BLOCKED_ROUTES = [
  '/debug',
  '/test-api',
  '/diagnostic',
  '/test',
  '/qrcode',
  '/api/init',
  '/api/debug',
  '/api/diagnose',
];

// 创建 i18n 中间件
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export function middleware(request: NextRequest) {
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

  // API 路由：CSRF 校验 + 放行（不做 i18n 处理）
  if (pathname.startsWith('/api/')) {
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
    // 调试页面路由
    '/debug/:path*',
    '/test-api/:path*',
    '/diagnostic/:path*',
    '/test/:path*',
    '/qrcode/:path*',
  ],
};
