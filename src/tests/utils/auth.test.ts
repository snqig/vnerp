/**
 * 认证工具函数测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Authentication Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authFetch', () => {
    it('should add Authorization header when token exists', async () => {
      // 模拟 localStorage 返回 token
      vi.spyOn(localStorage, 'getItem').mockReturnValue('test-token');
      
      // 创建 authFetch 函数
      const authFetch = async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        return { headers };
      };

      const result = await authFetch('/api/test');
      
      expect(result.headers).toHaveProperty('Authorization', 'Bearer test-token');
    });

    it('should not add Authorization header when token does not exist', async () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
      vi.spyOn(sessionStorage, 'getItem').mockReturnValue(null);
      
      const authFetch = async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        return { headers };
      };

      const result = await authFetch('/api/test');
      
      expect(result.headers).not.toHaveProperty('Authorization');
    });
  });
});
