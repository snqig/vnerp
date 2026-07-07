'use client';

const API_BASE = '';

/**
 * 统一的API请求客户端，自动添加认证token
 */
export class ApiClient {
  static getToken(): string | null {
    return typeof window !== 'undefined'
      ? localStorage.getItem('token') || sessionStorage.getItem('token')
      : null;
  }

  static getDefaultHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // CSRF token：非安全方法需附带 X-CSRF-Token header
    if (typeof document !== 'undefined') {
      const csrfMatch = document.cookie.match(/(^| )csrf_token=([^;]+)/);
      if (csrfMatch) {
        headers['X-CSRF-Token'] = csrfMatch[2];
      }
    }

    return headers;
  }

  static async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    const queryString = params
      ? '?' +
        new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null) as any).toString()
      : '';

    const response = await fetch(`${API_BASE}${url}${queryString}`, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  static async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: this.getDefaultHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  static async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: this.getDefaultHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  static async delete<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';

    const response = await fetch(`${API_BASE}${url}${queryString}`, {
      method: 'DELETE',
      headers: this.getDefaultHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        // 认证失败，清除token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('user');
        }
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
