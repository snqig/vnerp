/**
 * authFetch: 带认证令牌的 fetch 封装
 *
 * 401 无感刷新机制：
 * - 首个 401 触发 refresh，并发 401 复用同一 Promise（避免多次 refresh 互相覆盖）
 * - 刷新成功：更新本地 token 并重试原请求一次
 * - 刷新失败/无 refreshToken：清除登录态并跳转登录页
 *
 * 注意：refresh 请求本身不走 authFetch（避免死循环），直接用裸 fetch
 */

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    console.debug('[authFetch] refresh in progress, reusing current Promise');
    return refreshPromise;
  }

  const refreshToken =
    localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  if (!refreshToken || !userId) {
    console.warn('[authFetch] refresh failed: missing refreshToken or userId', {
      hasRefreshToken: !!refreshToken,
      hasUserId: !!userId,
    });
    return null;
  }

  console.debug('[authFetch] start refresh token', { userId });
  const startTime = Date.now();

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, userId }),
      });
      if (!res.ok) {
        console.warn('[authFetch] refresh returned non-200', { status: res.status });
        return null;
      }
      const json = await res.json();
      if (!json.success || !json.data?.token) {
        console.warn('[authFetch] refresh returned failure', {
          success: json.success,
          hasToken: !!json.data?.token,
        });
        return null;
      }

      // Sync write to the storage where token originally lives (localStorage first, fallback sessionStorage)
      const useSession = !localStorage.getItem('token') && !!sessionStorage.getItem('token');
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem('token', json.data.token);
      if (json.data.refreshToken) {
        storage.setItem('refreshToken', json.data.refreshToken);
      }
      console.debug('[authFetch] refresh success', {
        userId,
        durationMs: Date.now() - startTime,
        storageType: useSession ? 'sessionStorage' : 'localStorage',
      });
      return json.data.token as string;
    } catch (err) {
      console.error('[authFetch] refresh error', err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function clearAuthAndRedirect(): void {
  console.warn('[authFetch] clear auth state and redirect to login');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('userId');
  if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
    window.location.href = '/login';
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || sessionStorage.getItem('token')
      : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // 401 and not the refresh endpoint itself: try silent refresh once
  if (
    response.status === 401 &&
    typeof window !== 'undefined' &&
    !url.includes('/api/auth/refresh')
  ) {
    console.debug('[authFetch] received 401, attempting refresh', {
      url,
      hasToken: !!token,
    });
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      console.debug('[authFetch] refresh success, retrying original request', { url });
      const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
      console.debug('[authFetch] retry result', {
        url,
        status: retryResponse.status,
      });
      return retryResponse;
    }
    console.warn('[authFetch] refresh failed, clearing auth state', { url });
    clearAuthAndRedirect();
  }

  return response;
}
