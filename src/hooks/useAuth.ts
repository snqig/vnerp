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

  // 获取用户菜单
  const fetchMenus = useCallback(async (token: string) => {
    console.log('fetchMenus 被调用，token:', token.substring(0, 20) + '...');
    try {
      const response = await fetch('/api/auth/menus', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('菜单API响应状态:', response.status);
      
      if (response.status === 401) {
        console.log('Token 无效，清除认证状态');
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
      console.log('菜单API返回:', result.success, '数据长度:', result.data?.length);
      if (result.success) {
        setState(prev => ({
          ...prev,
          menus: result.data || [],
          permissions: result.permissions || []
        }));
        console.log('菜单状态已更新，数量:', result.data?.length);
      } else {
        console.error('获取菜单失败:', result.message);
      }
    } catch (error) {
      console.error('获取菜单失败:', error);
    }
  }, []);

  // 从localStorage或sessionStorage加载用户信息
  useEffect(() => {
    console.log('useAuth useEffect 执行');
    const loadAuth = async () => {
      try {
        // 先尝试从 localStorage 加载，如果没有则尝试 sessionStorage
        let token = localStorage.getItem('token');
        let userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
          token = sessionStorage.getItem('token');
          userStr = sessionStorage.getItem('user');
        }
        
        console.log('加载认证信息:', { hasToken: !!token, hasUser: !!userStr });

        if (token && userStr) {
          // 先验证 token 是否有效
          try {
            const response = await fetch('/api/auth/menus', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401) {
              console.log('Token 无效，清除认证状态');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              setState(prev => ({ ...prev, isLoading: false }));
              return;
            }
            
            const user = JSON.parse(userStr);
            console.log('用户已登录:', user.username);
            setState(prev => ({
              ...prev,
              user,
              permissions: user.permissions || [],
              isAuthenticated: true,
              isLoading: false
            }));
            // 加载用户菜单
            await fetchMenus(token);
          } catch (e) {
            console.error('验证 token 失败:', e);
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          console.log('未找到登录信息');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('加载认证信息失败:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuth();
  }, [fetchMenus]);

  // 登录
  const login = useCallback(async (username: string, password: string, rememberMe: boolean = true) => {
    console.log('登录函数被调用:', username, '记住我:', rememberMe);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();
      console.log('登录API返回:', result.success);

      if (result.success) {
        // 根据 rememberMe 选择存储位置
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
        console.log('登录状态已设置，准备获取菜单');
        // 获取菜单
        await fetchMenus(result.data.token);
        console.log('菜单获取完成');
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: '登录失败' };
    }
  }, [fetchMenus]);

  // 注册
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

  // 登出
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

  // 检查权限
  const hasPermission = useCallback((permission: string): boolean => {
    const { permissions, user } = state;
    // 超级管理员拥有所有权限
    if (user?.roles?.some((r: any) => r.role_code === 'super_admin')) {
      return true;
    }
    return permissions.includes(permission) || permissions.includes('*');
  }, [state.permissions, state.user]);

  // 检查是否有任意一个权限
  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    return perms.some(p => hasPermission(p));
  }, [hasPermission]);

  // 检查角色
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
