'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

interface AuthContextType extends AuthState {
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (data: any) => Promise<any>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (perms: string[]) => boolean;
  hasRole: (roleCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

let globalAuthState: AuthState = {
  user: null,
  menus: [],
  permissions: [],
  isAuthenticated: false,
  isLoading: true
};

let menusLoaded = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(globalAuthState);

  const fetchMenus = useCallback(async (token: string) => {
    if (menusLoaded && globalAuthState.menus.length > 0) {
      return;
    }
    
    try {
      const response = await fetch('/api/auth/menus', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        globalAuthState = {
          user: null,
          menus: [],
          permissions: [],
          isAuthenticated: false,
          isLoading: false
        };
        setState(globalAuthState);
        return;
      }
      
      const result = await response.json();
      if (result.success) {
        globalAuthState = {
          ...globalAuthState,
          menus: result.data || [],
          permissions: result.permissions || []
        };
        menusLoaded = true;
        setState(globalAuthState);
      }
    } catch (error) {
      console.error('获取菜单失败:', error);
    }
  }, []);

  useEffect(() => {
    if (menusLoaded) {
      setState(globalAuthState);
      return;
    }

    const loadAuth = async () => {
      let token = localStorage.getItem('token') || sessionStorage.getItem('token');
      let userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          globalAuthState = {
            user,
            menus: [],
            permissions: user.permissions || [],
            isAuthenticated: true,
            isLoading: false
          };
          setState(globalAuthState);
          await fetchMenus(token);
        } catch (e) {
          globalAuthState = { ...globalAuthState, isLoading: false };
          setState(globalAuthState);
        }
      } else {
        globalAuthState = { ...globalAuthState, isLoading: false };
        setState(globalAuthState);
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
        
        globalAuthState = {
          user: result.data.user,
          menus: [],
          permissions: result.data.user.permissions || [],
          isAuthenticated: true,
          isLoading: false
        };
        menusLoaded = false;
        setState(globalAuthState);
        await fetchMenus(result.data.token);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: '登录失败' };
    }
  }, [fetchMenus]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    globalAuthState = {
      user: null,
      menus: [],
      permissions: [],
      isAuthenticated: false,
      isLoading: false
    };
    menusLoaded = false;
    setState(globalAuthState);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const register = useCallback(async (data: any) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: '注册失败' };
    }
  }, []);

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

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      register,
      hasPermission,
      hasAnyPermission,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
