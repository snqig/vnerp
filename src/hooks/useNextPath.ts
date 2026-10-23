'use client';

import { useCallback } from 'react';

/**
 * 登录成功后回跳目标的解析。
 *
 * 背景：中间件（src/proxy.ts）与 auth-fetch 的 clearAuthAndRedirect 都会把
 * `?next=<原始路径>` 挂在登录页 URL 上，但本页此前**从不读取它**，
 * 三处router.replace('/dashboard') 无条件跳首页 → 用户被踢回首页，
 * 原始页面丢失，且看不出是「登录过期」导致的。
 *
 * 安全约束：只接受站内相对路径。
 * - 必须以单个 `/` 开头（拒绝 `//evil.com`、`/\evil.com` 这类协议相对 URL）
 * - 拒绝带 scheme 的绝对 URL（`https://...`）
 * - 拒绝 `/login`、`/register` 等登录相关路径，避免跳回登录页形成死循环
 * - 拒绝路径中含控制字符（`\0` `\n` `\r`）与反斜杠
 *
 * @param raw searchParams 里的 next 原始值（未解码）
 * @returns 安全的站内路径；非法或缺失时回退 `/dashboard`
 */
export function useNextPath(): () => string {
  return useCallback(() => {
    const fallback = '/dashboard';
    if (typeof window === 'undefined') return fallback;

    let candidate = '';
    try {
      candidate = new URLSearchParams(window.location.search).get('next') || '';
    } catch {
      return fallback;
    }
    if (!candidate) return fallback;

    let decoded = candidate;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      // next 本身是未编码的合法查询串，解码失败就按原值判定
      decoded = candidate;
    }

    // 反斜杠在部分浏览器里会被当作协议分隔符（/\evil.com）
    if (decoded.includes('\\') || /[\u0000-\u001f]/.test(decoded)) return fallback;
    // 必须是站内绝对路径，且不能是协议相对 URL
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback;
    // 显式拒绝带 scheme 的形式
    if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) return fallback;

    // 登录相关路径回跳会造成循环
    const withoutLocale = decoded.replace(/^\/(zh-CN|zh-TW|en|vi)(?=\/|$)/, '');
    if (/^\/(login|register|forgot-password|reset-password)(\/|$)/.test(withoutLocale)) {
      return fallback;
    }

    return decoded;
  }, []);
}