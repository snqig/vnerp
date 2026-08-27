'use client';

import { authFetch } from '@/lib/auth-fetch';

const API_BASE = '';

/**
 * 统一的API请求客户端，委托 authFetch 处理认证令牌、CSRF 和 401 无感刷新
 */
export class ApiClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async get<T = any>(url: string, params?: Record<string, string | number | boolean | null | undefined>): Promise<T> {
    const queryString = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';

    const response = await authFetch(`${API_BASE}${url}${queryString}`, {
      method: 'GET',
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async post<T = any>(url: string, data?: unknown): Promise<T> {
    const response = await authFetch(`${API_BASE}${url}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async put<T = any>(url: string, data?: unknown): Promise<T> {
    const response = await authFetch(`${API_BASE}${url}`, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async delete<T = any>(url: string, params?: Record<string, string | number | boolean | null | undefined>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
      : '';

    const response = await authFetch(`${API_BASE}${url}${queryString}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        // authFetch 刷新失败已触发 clearAuthAndRedirect，此处仅抛错中断调用方
        throw new Error('未登录或登录已过期');
      }

      let errorMsg = `请求失败: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMsg = errorData.message;
        }
      } catch {
        // 解析失败时用默认消息
      }
      throw new Error(errorMsg);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return null as T;
  }
}

export default ApiClient;
