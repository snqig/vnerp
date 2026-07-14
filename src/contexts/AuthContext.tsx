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

/**
 * 服务端 SSR 预取的初始认证数据。
 * 由 layout.tsx 在服务端调用 MenuService 获取后，作为 prop 注入 AuthProvider。
 * 存在时跳过客户端首次 fetch（仍可后台静默刷新），从根源上消除菜单 SSR 不同步 / 闪烁。
 */
export interface InitialAuthData {
  menus: Menu[];
  permissions: string[];
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

/** localStorage key for menu cache */
const MENU_CACHE_KEY = 'cached_menus';
const MENU_CACHE_TS_KEY = 'cached_menus_ts';
/** 菜单缓存有效期：30 分钟 */
const MENU_CACHE_TTL = 30 * 60 * 1000;

/** 从 localStorage 读取缓存的菜单数据 */
function loadCachedMenus(): { menus: Menu[]; permissions: string[] } | null {
  try {
    const ts = localStorage.getItem(MENU_CACHE_TS_KEY);
    if (!ts) return null;
    // 缓存过期检查
    if (Date.now() - parseInt(ts, 10) > MENU_CACHE_TTL) {
      localStorage.removeItem(MENU_CACHE_KEY);
      localStorage.removeItem(MENU_CACHE_TS_KEY);
      return null;
    }
    const raw = localStorage.getItem(MENU_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data?.menus)) {
      return {
        menus: data.menus,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      };
    }
  } catch {
    // 缓存数据损坏，清除
    localStorage.removeItem(MENU_CACHE_KEY);
    localStorage.removeItem(MENU_CACHE_TS_KEY);
  }
  return null;
}

/** 将菜单数据缓存到 localStorage */
function saveCachedMenus(menus: Menu[], permissions: string[]) {
  try {
    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({ menus, permissions }));
    localStorage.setItem(MENU_CACHE_TS_KEY, String(Date.now()));
  } catch {
    // localStorage 满了或不可用，静默忽略
  }
}

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth?: InitialAuthData | null;
}) {
  // SSR 注入了 initialAuth 时，初值直接使用服务端菜单：
  //   - menus / permissions 来自服务端预取（SSR 与首帧客户端完全一致，无水合差异）
  //   - isLoading = false（无需等首次 fetch）
  //   - user / isAuthenticated 仍由 useEffect 从 localStorage 恢复（避免 SSR 读取 localStorage）
  // 无 initialAuth 时（未登录 / SSR 预取失败）：保持原有行为，isLoading=true 显示骨架屏。
  const [state, setState] = useState<AuthState>({
    user: null,
    menus: initialAuth?.menus ?? [],
    permissions: initialAuth?.permissions ?? [],
    isAuthenticated: false,
    isLoading: !initialAuth,
  });

  const authChecked = useRef(false);
  const menusLoadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const menusCountRef = useRef(0);
  /** 后台刷新标记：避免重复触发 */
  const _backgroundRefreshDone = useRef(false);
  /** 缓存 initialAuth 引用，供 useEffect 中判断是否跳过首次 fetch */
  const initialAuthRef = useRef<InitialAuthData | null | undefined>(initialAuth);

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
            if (clearOnAuthError) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('userId');
              localStorage.removeItem(MENU_CACHE_KEY);
              localStorage.removeItem(MENU_CACHE_TS_KEY);
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
            setState((prev) => ({ ...prev, isLoading: false }));
          }
          return;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const result = await response.json();
        if (result.success) {
          menusLoadedRef.current = true;
          const menus = Array.isArray(result.data?.menus) ? result.data.menus : [];
          const permissions = Array.isArray(result.data?.permissions)
            ? result.data.permissions
            : [];
          menusCountRef.current = menus.length;

          // 持久化菜单缓存到 localStorage
          saveCachedMenus(menus, permissions);

          setState((prev) => ({
            ...prev,
            menus: menus,
            permissions: permissions,
            isLoading: false,
          }));
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
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

          // SSR 已注入 initialAuth：直接采用服务端菜单，跳过首次 fetch。
          // 仅恢复 user / isAuthenticated（这些字段 SSR 阶段无法从 localStorage 读取），
          // 仍触发后台静默刷新，保证菜单最终与服务端一致；同时持久化到 localStorage 作降级缓存。
          const ssrInitial = initialAuthRef.current;
          if (ssrInitial && ssrInitial.menus.length > 0) {
            setState({
              user,
              menus: ssrInitial.menus,
              permissions: ssrInitial.permissions,
              isAuthenticated: true,
              isLoading: false,
            });
            menusLoadedRef.current = true;
            menusCountRef.current = ssrInitial.menus.length;
            saveCachedMenus(ssrInitial.menus, ssrInitial.permissions);
            // 后台静默刷新，不清除认证状态
            fetchMenus(token, true, false).catch(() => {});
            return;
          }

          // 降级：优先从 localStorage 恢复缓存的菜单，实现 0ms 侧边栏渲染
          const cached = loadCachedMenus();

          setState({
            user,
            menus: cached?.menus ?? [],
            permissions: cached?.permissions ?? [],
            isAuthenticated: true,
            // 有缓存菜单 → 不显示 loading（侧边栏即时展示）
            // 无缓存菜单 → 显示骨架屏
            isLoading: !cached,
          });

          if (cached) {
            // 有缓存：先展示缓存菜单，后台静默刷新最新数据
            menusLoadedRef.current = true;
            menusCountRef.current = cached.menus.length;
            // 静默刷新，不清除认证状态
            fetchMenus(token, true, false).catch(() => {});
          } else {
            // 无缓存：等待 API 返回（首次登录场景）
            await fetchMenus(token);
          }
        } catch {
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
      // React StrictMode 双调用：cleanup 重置标记，使第二次 invoke 能重新初始化。
      // 生产环境 cleanup 仅在卸载时执行，effect 不会再运行，无副作用。
      authChecked.current = false;
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

          fetchMenus(result.data.token, true, false).catch((e) => {});
          return { success: true };
        } else {
          return { success: false, message: result.message };
        }
      } catch {
        return { success: false, message: '登录失败' };
      }
    },
    [fetchMenus]
  );

  const logout = useCallback(async () => {
    // 调用登出 API：清除 httpOnly cookie（access_token + refresh_token）+ 将 token 加入黑名单
    // 必须在清除 localStorage 之前调用，因为 authFetch 需要从 localStorage 读取 token。
    // 使用 authFetch 以携带 Authorization header + CSRF token；API 失败也继续清除本地状态
    // （cookie 会在 24h 后自然过期，不影响安全性）。
    try {
      const { authFetch } = await import('@/lib/auth-fetch');
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore：网络错误等，继续清除本地状态
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem(MENU_CACHE_KEY);
    localStorage.removeItem(MENU_CACHE_TS_KEY);
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
      // 使用整页跳转而非 router.push：确保所有客户端状态被完全重置，
      // 且 SSR layout.tsx 重新执行（此时 access_token cookie 已被清除，prefetchMenus 返回 null）
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
    } catch {
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
