import type { NextRequest, NextResponse } from 'next/server';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

// 登录/注册等无需 CSRF 校验的路由（首次请求尚无 token）
const CSRF_EXEMPT_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * 生成 CSRF token（Edge runtime 兼容，使用 Web Crypto API）
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 判断请求是否需要 CSRF 校验
 */
export function requiresCsrfValidation(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.includes(method)) return false;
  if (!request.nextUrl.pathname.startsWith('/api/')) return false;
  return !CSRF_EXEMPT_PATHS.some((p) => request.nextUrl.pathname === p);
}

/**
 * 常量时间字符串比较（防止时序攻击）
 * Edge runtime 兼容（不依赖 Node.js crypto.timingSafeEqual）
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 校验 Double Submit Cookie：X-CSRF-Token header 与 csrf_token cookie 必须一致
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken) return false;
  return timingSafeEqualStr(cookieToken, headerToken);
}

/**
 * 在响应上设置 CSRF cookie（供登录路由调用）
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Number(process.env.CSRF_COOKIE_MAX_AGE || 60 * 60 * 24 * 7), // 7 天 default
  });
}

/**
 * 若请求中无 CSRF cookie，在响应中种入新 token（供 middleware 对 GET 请求调用）
 */
export function ensureCsrfCookie(response: NextResponse): string {
  const token = generateCsrfToken();
  setCsrfCookie(response, token);
  return token;
}
