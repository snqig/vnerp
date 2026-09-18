/**
 * 认证工具函数测试 —— 直接测试真实 authFetch（src/lib/auth-fetch.ts）
 *
 * 原测试问题：内联复制了一份 authFetch 实现（与被测代码解耦，属"空转测试"），
 * 且 `vi.spyOn(localStorage, 'getItem')` 在 jsdom 的 Storage 代理下不生效，
 * 导致 token 恒为 falsy、断言恒失败。
 * 现改为导入真实实现，写入真实 storage 并 stub 全局 fetch，断言其拼装的请求头。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authFetch } from '@/lib/auth-fetch';

describe('authFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should add Authorization header when token exists in localStorage', async () => {
    localStorage.setItem('token', 'test-token');
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await authFetch('/api/test');

    const options = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('should fall back to sessionStorage token when localStorage has none', async () => {
    sessionStorage.setItem('token', 'session-token');
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await authFetch('/api/test');

    const options = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer session-token');
  });

  it('should not add Authorization header when token does not exist', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await authFetch('/api/test');

    const options = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers).not.toHaveProperty('Authorization');
  });
});
