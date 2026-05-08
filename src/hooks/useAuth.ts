'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  realName: string;
  avatar?: string;
  email?: string;
  phone?: string;
  departmentId?: number;
  departmentName?: string;
  roles: any[];
  permissions: string[];
}

interface Menu {
  id: number;
  name: string;
  code: string;
  type: number;
  icon?: string;
  path?: string;
  children?: Menu[];
  sort_order?: number;
}

interface AuthState {
  user: User | null;
  menus: Menu[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    menus: [],
    permissions: [],
    isAuthenticated: false,
    isLoading: true
  });

  const fetchMenus = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/auth/menus', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setState(prev => ({
          ...prev,
          user: null,
          menus: [],
          permissions: [],
          isAuthenticated: false,
          isLoading: false
        }));
        return;
      }

      const result = await response.json();
      if (result.success) {
        setState(prev => ({
          ...prev,
          menus: result.data || [],
          permissions: result.permissions || []
        }));
      }
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        let token = localStorage.getItem('token');
        let userStr = localStorage.getItem('user');

        if (!token || !userStr) {
          token = sessionStorage.getItem('token');
          userStr = sessionStorage.getItem('user');
        }

        if (token && userStr) {
          try {
            const response = await fetch('/api/auth/menus', {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              setState(prev => ({ ...prev, isLoading: false }));
              return;
            }

            const user = JSON.parse(userStr);
            setState(prev => ({
              ...prev,
              user,
              permissions: user.permissions || [],
              isAuthenticated: true,
              isLoading: false
            }));
            await fetchMenus(token);
          } catch (e) {
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuth();
  }, [fetchMenus]);

  const login = useCallback(async (username: string, password: string, rememberMe: boolean = true) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('token', result.data.token);
        storage.setItem('user', JSON.stringify(result.data.user));

        setState({
          user: result.data.user,
          menus: [],
          permissions: result.data.user.permissions || [],
          isAuthenticated: true,
          isLoading: false
        });
        await fetchMenus(result.data.token);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: '登录失败' };
    }
  }, [fetchMenus]);

  const register = useCallback(async (data: {
    username: string;
    password: string;
    real_name?: string;
    email?: string;
    phone?: string;
    department_id?: number;
    role_id?: number;
  }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, message: '注册失败' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setState({
      user: null,
      menus: [],
      permissions: [],
      isAuthenticated: false,
      isLoading: false
    });
    router.push('/login');
  }, [router]);

  const hasPermission = useCallback((permission: string): boolean => {
    const { permissions, user } = state;
    if (user?.roles?.some((r: any) => r.role_code === 'super_admin')) {
      return true;
    }
    return permissions.includes(permission) || permissions.includes('*');
  }, [state.permissions, state.user]);

  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    return perms.some(p => hasPermission(p));
  }, [hasPermission]);

  const hasRole = useCallback((roleCode: string): boolean => {
    return state.user?.roles?.some((r: any) => r.role_code === roleCode) || false;
  }, [state.user]);

  return {
    ...state,
    login,
    logout,
    register,
    hasPermission,
    hasAnyPermission,
    hasRole
  };
}
