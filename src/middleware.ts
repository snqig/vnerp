import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n/locales';

// 生产环境禁止访问的调试路由
const BLOCKED_ROUTES = ['/debug', '/test-api', '/diagnostic', '/test', '/qrcode'];

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
      // 需要同时匹配带 locale 前缀和不带前缀的路径
      const localePattern = /^\/(zh-CN|zh-TW|en|vi)/;
      const cleanPath = pathname.replace(localePattern, '') || '/';
      if (cleanPath.startsWith(route)) {
        return new NextResponse('Not Found', { status: 404 });
      }
    }
  }

  // i18n 中间件处理
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // 匹配所有路径，排除 API、_next、静态文件
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // 调试路由
    '/debug/:path*',
    '/test-api/:path*',
    '/diagnostic/:path*',
    '/test/:path*',
    '/qrcode/:path*',
  ],
};
