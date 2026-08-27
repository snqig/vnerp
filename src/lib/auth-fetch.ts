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
    return refreshPromise;
  }

  const refreshToken =
    localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  if (!refreshToken || !userId) {
    return null;
  }

  const _startTime = Date.now();

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, userId }),
      });
      if (!res.ok) {
        return null;
      }
      const json = await res.json();
      if (!json.success || !json.data?.token) {
        return null;
      }

      // Sync write to the storage where token originally lives (localStorage first, fallback sessionStorage)
      const useSession = !localStorage.getItem('token') && !!sessionStorage.getItem('token');
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem('token', json.data.token);
      if (json.data.refreshToken) {
        storage.setItem('refreshToken', json.data.refreshToken);
      }
      return json.data.token as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function clearAuthAndRedirect(): void {
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

  // FormData 上传时不能手动设置 Content-Type，浏览器需自动生成 multipart boundary
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // CSRF token：非安全方法需附带 X-CSRF-Token header（与 cookie 双重提交校验）
  if (typeof document !== 'undefined') {
    const csrfMatch = document.cookie.match(/(^| )csrf_token=([^;]+)/);
    if (csrfMatch) {
      headers['X-CSRF-Token'] = csrfMatch[2];
    }
  }

  // 网络层失败（离线 / DNS / CORS / 服务不可达）fetch 会抛 TypeError。
  // 此处统一记录上下文后原样抛出：既不吞掉错误（即使调用方 catch 为空也能在控制台定位），
  // 又不影响正常处理 HTTP 状态码的调用方。
  const method = (options.method || 'GET').toUpperCase();
  const doRequest = async (reqUrl: string, reqOpts: RequestInit): Promise<Response> => {
    try {
      return await fetch(reqUrl, reqOpts);
    } catch (err) {
      // AbortError 是调用方主动取消（组件卸载/依赖变化），不是网络故障，静默透传
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      console.error(`[authFetch] 网络请求失败: ${method} ${reqUrl}`, err);
      throw err;
    }
  };

  const response = await doRequest(url, { ...options, headers });

  // 401 and not the refresh endpoint itself: try silent refresh once
  if (
    response.status === 401 &&
    typeof window !== 'undefined' &&
    !url.includes('/api/auth/refresh')
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      const retryResponse = await doRequest(url, { ...options, headers: retryHeaders });
      return retryResponse;
    }
    clearAuthAndRedirect();
  }

  return response;
}
