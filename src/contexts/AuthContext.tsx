'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

interface Role {
  id?: number;
  role_code: string;
  role_name?: string;
}

interface User {
  id: number;
  username: string;
  realName: string;
  avatar?: string;
  email?: string;
  phone?: string;
  departmentId?: number;
  departmentName?: string;
  roles: Role[];
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
  login: (
    username: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (data: Record<string, unknown>) => Promise<unknown>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (perms: string[]) => boolean;
  hasRole: (roleCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    menus: [],
    permissions: [],
    isAuthenticated: false,
    isLoading: true,
  });

  const authChecked = useRef(false);
  const menusLoadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const menusCountRef = useRef(0);

  const fetchMenus = useCallback(
    async (token: string, force: boolean = false, clearOnAuthError: boolean = true) => {
      if (!force && menusLoadedRef.current && menusCountRef.current > 0) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/auth/menus', {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.error('[AuthContext] 菜单API返回401');
            if (clearOnAuthError) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('userId');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              sessionStorage.removeItem('refreshToken');
              sessionStorage.removeItem('userId');
              menusLoadedRef.current = false;
              menusCountRef.current = 0;
              setState({
                user: null,
                menus: [],
                permissions: [],
                isAuthenticated: false,
                isLoading: false,
              });
            } else {
              setState((prev) => ({ ...prev, isLoading: false }));
            }
          } else {
            console.error('[AuthContext] 菜单API返回错误:', response.status);
            setState((prev) => ({ ...prev, isLoading: false }));
          }
          return;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.error('[AuthContext] 菜单API返回非JSON响应');
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const result = await response.json();
        if (result.success) {
          menusLoadedRef.current = true;
          const menus = Array.isArray(result.data?.menus) ? result.data.menus : [];
          menusCountRef.current = menus.length;
          setState((prev) => ({
            ...prev,
            menus: menus,
            permissions: Array.isArray(result.data?.permissions) ? result.data.permissions : [],
            isLoading: false,
          }));
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('获取菜单失败:', error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    []
  );

  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;

    const initAuth = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          setState({
            user,
            menus: [],
            permissions: user.permissions || [],
            isAuthenticated: true,
            isLoading: true,
          });
          await fetchMenus(token);
        } catch (e) {
          console.error('[AuthContext] 解析失败:', e);
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchMenus]);

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean = true) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (result.success) {
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('token', result.data.token);
          storage.setItem('user', JSON.stringify(result.data.user));
          // 存 refreshToken + userId 供 authFetch 无感刷新使用
          storage.setItem('refreshToken', result.data.refreshToken);
          storage.setItem('userId', String(result.data.user.id));

          menusLoadedRef.current = false;
          menusCountRef.current = 0;
          setState({
            user: result.data.user,
            menus: [],
            permissions: result.data.user.permissions || [],
            isAuthenticated: true,
            isLoading: true,
          });

          fetchMenus(result.data.token, true, false).catch((e) => {
            console.error('[AuthContext] 登录后加载菜单失败:', e);
          });
          return { success: true };
        } else {
          return { success: false, message: result.message };
        }
      } catch (error) {
        return { success: false, message: '登录失败' };
      }
    },
    [fetchMenus]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userId');
    menusLoadedRef.current = false;
    menusCountRef.current = 0;
    authChecked.current = false;
    setState({
      user: null,
      menus: [],
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
    });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const register = useCallback(async (data: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: '注册失败' };
    }
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      const { permissions, user } = state;
      if (user?.roles?.some((r) => r.role_code === 'super_admin')) {
        return true;
      }
      return permissions.includes(permission) || permissions.includes('*');
    },
    [state.permissions, state.user]
  );

  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      return perms.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const hasRole = useCallback(
    (roleCode: string): boolean => {
      return state.user?.roles?.some((r) => r.role_code === roleCode) || false;
    },
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        register,
        hasPermission,
        hasAnyPermission,
        hasRole,
      }}
    >
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
