import { logger } from '@/lib/logger';
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

  // 「记住我」会话语义：rememberMe=false 时 token 存 sessionStorage。
  // 透传给 refresh 路由，让其下发的 cookie 同样保持浏览器会话级，
  // 否则一次无感刷新会把 session 登录「升级」成 24h 持久 cookie（免登复活）。
  const rememberMe = !(typeof window !== 'undefined' && !localStorage.getItem('token') && !!sessionStorage.getItem('token'));

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, userId, rememberMe }),
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
    // 必须透传当前完整路径作为 next，并保留 locale 前缀跳登录页：
    // 直接跳裸 /login 会丢掉 locale（登录后回落默认语言）。
    // next 用完整 pathname（中间件会自己识别 locale 段），
    // 不能用剥掉 locale 的 cleanPath，否则登录后回跳缺语言前缀。
    const { pathname } = window.location;
    const localeMatch = /^\/(zh-CN|zh-TW|en|vi)(?=\/|$)/.exec(pathname);
    const loginUrl = localeMatch ? `/${localeMatch[1]}/login` : '/login';
    window.location.href = `${loginUrl}?next=${encodeURIComponent(pathname)}`;
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
      logger.error(`[authFetch] 网络请求失败: ${method} ${reqUrl}`, err);
      throw err;
    }
  };

  const response = await doRequest(url, { ...options, headers });

  // 200 但不是 JSON：Next 对不存在的 API 路径会 fallthrough 到页面渲染，
  // 返回 200 + text/html。此时 res.ok 是 true，能骗过所有 `if (!res.ok)` 检查，
  // 错误一直拖到 res.json() 才爆成 `Unexpected token '<'` ——
  // 看到这条报错根本猜不到真实原因是「请求的 API 路由不存在」。
  // 这里提前拦下来，把真实 URL 和 content-type 摆到台面上。
  // 注意：204/205/304 无响应体，以及 FormData 上传后的二进制响应（图片/导出）不适用，
  // 故只在「明确是 HTML」时拦截，不做泛化的 JSON 断言。
  if (
    typeof window !== 'undefined' &&
    response.status === 200 &&
    /^text\/html/i.test(response.headers.get('content-type') || '')
  ) {
    const htmlSnippet = await response.text().catch(() => '');
    throw new Error(
      `请求 ${url} 返回了 HTML 而非 JSON（content-type=${response.headers.get('content-type')}）` +
        `｜该 API 路由很可能不存在，Next 已回退到页面渲染｜body 前 120 字节=${htmlSnippet.slice(0, 120)}`
    );
  }

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
    // 无感刷新失败：登录态已失效，必须把 401 明确交给调用方并结束本次请求。
    // 原实现只调clearAuthAndRedirect() 就继续往下走，最终 `return response`
    // 把 401 原样交回——调用方看到的是「数据加载失败」，而真实原因是登录过期，
    // 两者混在一起极难定位。这里显式抛出，语义上与网络层失败一致。
    clearAuthAndRedirect();
    throw new Error('HTTP 401 Unauthorized | 登录态已失效，已跳转登录页');
  }

  return response;
}
