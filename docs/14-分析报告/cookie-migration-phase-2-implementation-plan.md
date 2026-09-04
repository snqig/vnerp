# Cookie 迁移 Phase 2 — 详细实施计划

> 📌 历史快照（生成于 2026-07-08），内容反映当时状态，未随代码更新。仅作归档参考。

> 状态: 待执行 | 创建日期: 2026-07-08 | 最后更新: 2026-07-08
>
> 关联文档:
> - 总体迁移方案: [localStorage-to-httponly-cookie-migration-plan.md](./localStorage-to-httponly-cookie-migration-plan.md)
> - L1 回滚验证 Checklist（可直接执行）: [cookie-migration-l1-rollback-checklist.md](./cookie-migration-l1-rollback-checklist.md)
>
> Phase 1 已完成：`extractToken()` 支持 Cookie 回退读取（[src/lib/auth.ts](../src/lib/auth.ts)）。
> 本文档细化 Phase 2 的具体代码改造，覆盖前端 Feature Flag、authFetch、AuthContext、refresh 路由与 CSRF。

## 目录

1. [Phase 2 目标与边界](#一phase-2-目标与边界)
2. [Feature Flag 设计](#二feature-flag-设计) — 含默认值配置、运行时验证、灰度策略
3. [后端改造：refresh 路由支持 Cookie](#三后端改造refresh-路由支持-cookie)
4. [前端改造：authFetch.ts](#四前端改造authfetchts)
5. [前端改造：AuthContext.tsx](#五前端改造authcontexttsxphase-2-最小改动)
6. [CSRF 链路验证](#六csrf-链路验证)
7. [回滚策略](#七回滚策略) — 含触发条件、L1/L2 回滚、验证矩阵、演练、Runbook
8. [测试计划](#八测试计划)
9. [实施步骤（按顺序）](#九实施步骤按顺序)
10. [风险评估](#十风险评估)
11. [时间估算](#十一时间估算)
12. [Phase 2 完成后的下一步](#十二phase-2-完成后的下一步)

## 一、Phase 2 目标与边界

### 目标
- 前端 `authFetch` 通过 Feature Flag 切换到 Cookie 模式：不再读 localStorage token、不再拼 `Authorization` header
- 后端 `/api/auth/refresh` 支持 Cookie 读取 refreshToken（Phase 1 未覆盖）
- `AuthContext` 在 Cookie 模式下仍能正常初始化登录态（最小改动，完整重构留到 Phase 3）
- Cookie 模式下 CSRF 双重提交校验链路完整
- 一键回滚：`NEXT_PUBLIC_AUTH_COOKIE_MODE=header` 即恢复旧行为

### 非目标（Phase 2 不做）
- **不**移除 login 路由 JSON body 返回 token（Phase 4）
- **不**重构 AuthContext 去 localStorage 化（Phase 3）
- **不**移除 `extractToken` 的 header 读取分支（Phase 4）
- **不**更新单元测试 mock（Phase 4）

### 验收标准
- `NEXT_PUBLIC_AUTH_COOKIE_MODE=cookie` 启动后：
  - 登录成功 → Cookie 设置 `access_token`/`refresh_token`（HttpOnly），localStorage 仅存 `user` 信息
  - API 请求 → 浏览器自动发送 Cookie，无 `Authorization` header
  - access_token 过期 → 401 触发无感刷新 → refresh 走 Cookie → 新 Cookie 下发 → 重试成功
  - 登出 → Cookie 清除，localStorage 清除，跳转登录页
- `NEXT_PUBLIC_AUTH_COOKIE_MODE=header` 启动后：行为与当前完全一致（零回归）

## 二、Feature Flag 设计

### 环境变量
```
NEXT_PUBLIC_AUTH_COOKIE_MODE=cookie|header
```
- **默认值**: `header`（未设置时保持当前行为，零破坏）
- **`NEXT_PUBLIC_` 前缀**: Next.js 将其注入到客户端 bundle，浏览器可读
- **构建时固化**: 该值在 `next build` 时被替换为字面量，**不支持运行时切换**。如需运行时切换，需改为 `/api/auth/config` 端点动态获取（Phase 2 不做）

### 求值位置
在 `src/lib/auth-fetch.ts` 顶部定义常量，模块加载时求值一次：
```ts
export const AUTH_COOKIE_MODE = process.env.NEXT_PUBLIC_AUTH_COOKIE_MODE === 'cookie';
```
- 导出常量供 `AuthContext` 等模块复用，避免多处重复读取 env
- 注意：`NEXT_PUBLIC_` 变量在服务端和客户端都能访问，但客户端只能访问带 `NEXT_PUBLIC_` 前缀的
- **安全降级**: 仅当值**严格等于** `'cookie'` 时才启用 cookie 模式；未设置、空字符串、拼写错误（如 `'cookies'`、`'true'`）均降级为 header 模式，确保配置异常时不破坏现有登录链路

### 默认值配置（env 文件）

三个环境文件的默认值统一为 `header`，确保 Phase 2 代码合并后不改变现有行为：

**1. `.env.example`（开发模板，已更新）**:
```env
# 认证模式 Feature Flag（Cookie 迁移 Phase 2）
# - header: 前端从 localStorage 读 token，拼 Authorization header（默认，向后兼容）
# - cookie: 前端依赖 HttpOnly Cookie，不读 localStorage token（Phase 2 新模式）
# 未设置或设置为其他值时，默认走 header 模式（安全降级）
# 切换需 next build + 重启（构建时固化，不支持运行时切换）
# 回滚：改回 header + 重新构建即可，已登录用户 Cookie 仍有效
NEXT_PUBLIC_AUTH_COOKIE_MODE=header
```

**2. `.env.production.example`（生产模板，已更新）**:
```env
# 认证模式 Feature Flag（Cookie 迁移 Phase 2）
# - header: 前端从 localStorage 读 token，拼 Authorization header（默认，向后兼容）
# - cookie: 前端依赖 HttpOnly Cookie，不读 localStorage token（Phase 2 新模式）
# 生产环境建议先在 Staging 验证 cookie 模式全流程通过后再切换
# 回滚：改回 header + 重新构建部署，已登录用户 Cookie 仍有效（extractToken 兼容两种模式）
NEXT_PUBLIC_AUTH_COOKIE_MODE=header
```

**3. `.env`（开发本地，开发者按需切换）**:
- 默认不添加此行（继承 `header` 模式）
- 需测试 cookie 模式时手动添加：`NEXT_PUBLIC_AUTH_COOKIE_MODE=cookie`
- 测试完成后改回 `header` 或删除该行

### 运行时验证 Feature Flag 值

部署后通过以下方式确认 Flag 已正确固化到 bundle：

**浏览器 Console 验证**:
```js
// 方法 1：直接读取 env（Next.js 12+ 注入到 process.env）
console.log('AUTH_COOKIE_MODE:', process.env.NEXT_PUBLIC_AUTH_COOKIE_MODE)
// 预期: 'cookie' 或 'header'（或 undefined 如果未设置）

// 方法 2：检查 authFetch 行为
// cookie 模式: 发起 API 请求，Network 面板无 Authorization header
// header 模式: 发起 API 请求，Network 面板有 Authorization: Bearer xxx
```

**Node.js 服务端验证**:
```bash
# 检查构建产物中是否包含 cookie 模式字面量
grep -r "AUTH_COOKIE_MODE" .next/static/ 2>/dev/null | head -5
# cookie 模式构建: 能找到 true 分支代码
# header 模式构建: 仅找到 false 分支代码（tree-shaking 移除了 cookie 分支）
```

### 灰度策略
1. **Staging 环境先开**: `NEXT_PUBLIC_AUTH_COOKIE_MODE=cookie`，跑完整 E2E
2. **生产灰度**: 通过构建两个 bundle（header 模式 + cookie 模式），用 Nginx 按用户分流
   - 或更简单：全量切 cookie 模式，但保留 `header` 模式 bundle 作为回滚镜像
3. **回滚**: 改 env → `next build` → 重启。已登录用户 Cookie 仍有效（后端 extractToken 兼容两种模式）

## 三、后端改造：refresh 路由支持 Cookie

### 现状
[src/app/api/auth/refresh/route.ts](../src/app/api/auth/refresh/route.ts) 当前：
- 仅从 `request.json()` body 读取 `refreshToken` 和 `userId`
- 缺少时直接返回 400

### 改造
增加 Cookie 回退读取 + 通过 refreshToken 反查 userId：

**1. 新增 `getUserIdByRefreshToken` 到 [src/lib/token-blacklist.ts](../src/lib/token-blacklist.ts)**:
```ts
/**
 * 通过 refresh token 反查 userId（Cookie 模式下 refresh 路由使用）。
 * token 存储格式：refresh_token:{token} → { userId, expiresAtMs }
 */
export async function getUserIdByRefreshToken(token: string): Promise<number | null> {
  const cm = getCacheManager();
  const v = await cm.get<{ userId: number; expiresAtMs: number }>(
    `${REFRESH_TOKEN_PREFIX}${token}`
  );
  if (!v) return null;
  if (v.expiresAtMs < Date.now()) {
    await cm.delete(`${REFRESH_TOKEN_PREFIX}${token}`);
    return null;
  }
  return v.userId;
}
```

**2. 修改 [src/app/api/auth/refresh/route.ts](../src/app/api/auth/refresh/route.ts)**:
```ts
export const POST = withPermission(async (request: NextRequest) => {
  // 优先读 body（header 模式兼容），回退读 Cookie（cookie 模式）
  let refreshToken: string | undefined;
  let userId: string | undefined;
  try {
    const body = await request.json();
    refreshToken = body.refreshToken;
    userId = body.userId;
  } catch {
    // body 为空（纯 Cookie 模式）— 忽略
  }
  if (!refreshToken) {
    refreshToken = request.cookies.get('refresh_token')?.value;
  }
  if (!refreshToken) {
    return errorResponse('缺少 refreshToken', 401);
  }
  // cookie 模式下 userId 从 refresh token 反查
  if (!userId) {
    const lookedUp = await getUserIdByRefreshToken(refreshToken);
    if (lookedUp === null) {
      return errorResponse('refresh token 无效或已过期', 401);
    }
    userId = String(lookedUp);
  }

  const locked = await acquireRefreshLock(refreshToken);
  if (!locked) {
    return errorResponse('正在刷新，请稍后重试', 429);
  }
  try {
    if (!(await verifyRefreshToken(refreshToken, Number(userId)))) {
      return errorResponse('refresh token 无效或已过期', 401);
    }
    // ... 后续逻辑不变（生成新 token + Set-Cookie）
  } finally {
    await releaseRefreshLock(refreshToken);
  }
});
```

**注意**: refresh 路由已被 [src/lib/csrf.ts](../src/lib/csrf.ts) 的 `CSRF_EXEMPT_PATHS` 豁免，Cookie 模式下无需 CSRF 校验（refresh 本身用 refreshToken 做凭证，且无感刷新场景前端无法附加 CSRF header）。

### 影响范围
- 仅 2 个文件：`token-blacklist.ts`（新增函数）、`refresh/route.ts`（读取逻辑）
- header 模式完全不受影响（body 优先读取的逻辑保留）

## 四、前端改造：authFetch.ts

### 现状
[src/lib/auth-fetch.ts](../src/lib/auth-fetch.ts) 当前：
- 读 `localStorage.getItem('token')` → 拼 `Authorization: Bearer` header
- 401 → `refreshAccessToken()` 读 localStorage 的 refreshToken/userId → POST body 调 refresh
- CSRF: 从 `document.cookie` 读 `csrf_token` → 拼 `X-CSRF-Token` header

### 改造（完整文件重写）

```ts
/**
 * authFetch: 带认证的 fetch 封装
 *
 * 双模式（由 NEXT_PUBLIC_AUTH_COOKIE_MODE 控制）：
 * - header 模式（默认）: localStorage token + Authorization header（向后兼容）
 * - cookie 模式: 依赖浏览器自动发送 HttpOnly Cookie，不读 localStorage token
 *
 * CSRF 双重提交校验：两种模式都从 document.cookie 读 csrf_token 并附加 X-CSRF-Token header
 * 401 无感刷新：两种模式都复用同一 refresh 锁，cookie 模式下 refresh 不传 body
 */

export const AUTH_COOKIE_MODE = process.env.NEXT_PUBLIC_AUTH_COOKIE_MODE === 'cookie';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // header 模式: 从 localStorage 读 refreshToken/userId 放 body
      // cookie 模式: 浏览器自动发 refresh_token cookie，body 为空
      const body = AUTH_COOKIE_MODE
        ? undefined
        : JSON.stringify({
            refreshToken: localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken'),
            userId: localStorage.getItem('userId') || sessionStorage.getItem('userId'),
          });

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include', // 确保 cookie 随请求发送（cookie 模式必需）
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.success) return null;

      // header 模式: 同步写回 localStorage（refresh 路由仍返回 JSON token）
      if (!AUTH_COOKIE_MODE && json.data?.token) {
        const useSession = !localStorage.getItem('token') && !!sessionStorage.getItem('token');
        const storage = useSession ? sessionStorage : localStorage;
        storage.setItem('token', json.data.token);
        if (json.data.refreshToken) {
          storage.setItem('refreshToken', json.data.refreshToken);
        }
      }
      // cookie 模式: 服务端已 Set-Cookie，浏览器自动更新，无需客户端操作
      return json.data?.token ?? 'refreshed';
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function clearAuthAndRedirect(): void {
  // cookie 模式: 调 logout API 清服务端 Cookie + 黑名单当前 token
  if (AUTH_COOKIE_MODE) {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }
  // 两种模式都清 localStorage（cookie 模式下 user 信息也在 localStorage）
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('user');
  if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
    window.location.href = '/login';
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // header 模式: 从 localStorage 读 token 拼 Authorization header
  if (!AUTH_COOKIE_MODE) {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token') || sessionStorage.getItem('token')
      : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  // cookie 模式: 浏览器自动发送 access_token cookie，无需手动拼 header

  // CSRF: 两种模式都需要（非安全方法）
  if (typeof document !== 'undefined') {
    const csrfMatch = document.cookie.match(/(^| )csrf_token=([^;]+)/);
    if (csrfMatch) {
      headers['X-CSRF-Token'] = csrfMatch[2];
    }
  }

  const response = await fetch(url, { ...options, headers, credentials: 'include' });

  // 401 无感刷新（refresh 端点本身不触发）
  if (
    response.status === 401 &&
    typeof window !== 'undefined' &&
    !url.includes('/api/auth/refresh')
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // header 模式: 用新 token 重试
      // cookie 模式: 浏览器已自动更新 cookie，直接重试
      if (!AUTH_COOKIE_MODE) {
        headers['Authorization'] = `Bearer ${refreshed}`;
      }
      return fetch(url, { ...options, headers, credentials: 'include' });
    }
    clearAuthAndRedirect();
  }

  return response;
}
```

### 关键设计点
1. **`credentials: 'include'`**: 同源请求默认发送 Cookie，但显式声明更安全（防 CORS 配置变更导致 Cookie 丢失）
2. **refresh 返回值**: cookie 模式下返回 `'refreshed'` 占位符（不用于拼 header），仅作为"刷新成功"信号
3. **clearAuthAndRedirect**: cookie 模式调 logout API 清服务端 Cookie；两种模式都清 localStorage（user 信息也在 localStorage）
4. **`'user'` key 清理**: header 模式下 AuthContext 把 user 存 localStorage，cookie 模式也保留这个行为（Phase 3 才移除）

## 五、前端改造：AuthContext.tsx（Phase 2 最小改动）

### 现状问题
[src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx) 的 `initAuth()` 检查 `localStorage.getItem('token')` 判断登录态。Cookie 模式下 login 不再存 token 到 localStorage，导致 initAuth 误判为未登录。

### 改造方案（最小化）
引入 `AUTH_COOKIE_MODE`，cookie 模式下：
- `login()`: 不存 token/refreshToken 到 localStorage，仅存 `user` + `userId`（userId 供 fetchMenus 调用）
- `initAuth()`: cookie 模式检查 `localStorage.getItem('user')` 判断登录态（而非 token），并直接调 `/api/auth/menus`（cookie 自动发送）
- `fetchMenus()`: cookie 模式不拼 Authorization header

```tsx
import { AUTH_COOKIE_MODE } from '@/lib/auth-fetch';

// initAuth 改造
const initAuth = async () => {
  // cookie 模式: 用 user 信息判断登录态（token 在 HttpOnly cookie，JS 读不到）
  // header 模式: 用 token 判断登录态（原有逻辑）
  const token = !AUTH_COOKIE_MODE
    ? (localStorage.getItem('token') || sessionStorage.getItem('token'))
    : null;
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

  const isAuthenticated = AUTH_COOKIE_MODE ? !!userStr : (token && userStr);
  if (isAuthenticated && userStr) {
    try {
      const user = JSON.parse(userStr);
      // ... SSR initialAuth / cached menus 逻辑保持不变 ...
      // fetchMenus 调用时 token 参数在 cookie 模式下传空字符串
      fetchMenus(AUTH_COOKIE_MODE ? '' : token, true, false).catch(() => {});
    } catch (e) {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  } else {
    setState((prev) => ({ ...prev, isLoading: false }));
  }
};

// login 改造
const login = useCallback(async (username, password, rememberMe = true) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include', // 确保 Set-Cookie 生效
  });
  const result = await response.json();
  if (result.success) {
    const storage = rememberMe ? localStorage : sessionStorage;
    // cookie 模式: 不存 token/refreshToken（HttpOnly cookie 已由服务端设置）
    if (!AUTH_COOKIE_MODE) {
      storage.setItem('token', result.data.token);
      storage.setItem('refreshToken', result.data.refreshToken);
    }
    storage.setItem('user', JSON.stringify(result.data.user));
    storage.setItem('userId', String(result.data.user.id));
    // ... setState + fetchMenus ...
  }
}, [fetchMenus]);

// fetchMenus 改造
const fetchMenus = useCallback(async (token: string, force = false, clearOnAuthError = true) => {
  // ...
  const headers: Record<string, string> = {};
  if (!AUTH_COOKIE_MODE && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // cookie 模式: 浏览器自动发 cookie
  // 注意：这里不用 authFetch，因为 menus 端点是 GET 且需要 SSR 兼容
  const response = await fetch('/api/auth/menus', {
    headers,
    credentials: 'include',
    signal: abortControllerRef.current.signal,
  });
  // ... 后续逻辑不变 ...
}, []);

// logout 改造
const logout = useCallback(async () => {
  try {
    // cookie 模式: 直接 fetch logout（cookie 自动发送）
    // header 模式: 用 authFetch（需 Authorization header）
    if (AUTH_COOKIE_MODE) {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } else {
      const { authFetch } = await import('@/lib/auth-fetch');
      await authFetch('/api/auth/logout', { method: 'POST' });
    }
  } catch {
    // ignore
  }
  // ... 清除 localStorage + setState + 跳转（原逻辑不变）...
}, []);
```

### 注意事项
- `fetchMenus` 不用 `authFetch` 是因为它是 GET 请求且不需要 401 重试逻辑（401 时 AuthContext 直接清登录态）
- Cookie 模式下 `fetchMenus` 的 token 参数传空字符串，仅作占位
- `rememberMe` 在 cookie 模式下影响 `user` 存 localStorage 还是 sessionStorage；Cookie 的持久性由服务端 maxAge 控制（Phase 2 暂不区分，统一 7d；Phase 3 再细化）

## 六、CSRF 链路验证

### 现状（两种模式通用）
1. **登录成功**: [login/route.ts](../src/app/api/auth/login/route.ts) 调 `setCsrfCookie` 下发 `csrf_token` cookie（HttpOnly=false，JS 可读）
2. **首次访问**: [middleware.ts](../src/middleware.ts) 对 GET 请求调 `ensureCsrfCookie` 种入 cookie
3. **请求发送**: `authFetch` 从 `document.cookie` 读 `csrf_token` → 拼 `X-CSRF-Token` header
4. **请求校验**: middleware `validateCsrfToken` 比较 cookie 与 header

### Cookie 模式下的额外风险
- Cookie 模式浏览器自动发送 `access_token`，CSRF 攻击者可借用户 Cookie 发起 POST 请求
- **缓解**: `SameSite=lax` 已阻止跨站 POST 的 Cookie 发送；CSRF 双重提交校验是第二道防线
- **验证清单**:
  - [ ] 所有 POST/PUT/DELETE/PATCH API 路由经过 middleware CSRF 校验（[csrf.ts](../src/lib/csrf.ts) `requiresCsrfValidation`）
  - [ ] `authFetch` 始终附加 `X-CSRF-Token` header（两种模式）
  - [ ] 文件上传等非 JSON 请求也携带 CSRF header（检查是否有非 authFetch 的 fetch 调用）
  - [ ] 登录/refresh/register 豁免 CSRF（未登录无 csrf_token）

### 需检查的非 authFetch fetch 调用
Cookie 模式下，任何不走 `authFetch` 的 fetch 都不会自动附加 CSRF header，可能被 middleware 403 拦截。需排查：
- `AuthContext.tsx` 中的 `fetch('/api/auth/menus')` — GET 请求，不需 CSRF ✓
- `AuthContext.tsx` 中的 `fetch('/api/auth/login')` — CSRF 豁免 ✓
- `AuthContext.tsx` 中的 `fetch('/api/auth/logout')` — POST，cookie 模式下需手动附加 CSRF header ⚠️
- `AuthContext.tsx` 中的 `fetch('/api/auth/register')` — CSRF 豁免 ✓

**logout 修复**: cookie 模式下的 logout fetch 需附加 CSRF header：
```ts
if (AUTH_COOKIE_MODE) {
  const csrfMatch = document.cookie.match(/(^| )csrf_token=([^;]+)/);
  const csrfHeaders: Record<string, string> = {};
  if (csrfMatch) csrfHeaders['X-CSRF-Token'] = csrfMatch[2];
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders,
  });
}
```

## 七、回滚策略

### 回滚触发条件

出现以下任一情况立即回滚：

| 指标 | 触发阈值 | 监控方式 |
|------|----------|----------|
| 登录失败率 | >5%（5 分钟窗口） | `/api/auth/login` 4xx/5xx 占比 |
| API 401 错误率 | >10%（5 分钟窗口） | 全局 API 401 告警 |
| refresh 端点 401 率 | >20% | `/api/auth/refresh` 401 计数 |
| 用户投诉"频繁掉线" | >3 例/小时 | 客服反馈 |
| Safari/Edge 特定浏览器登录失败 | 任何复现 | 浏览器分布监控 |

### L1 回滚（Feature Flag 切换 — 首选）

**适用场景**: cookie 模式上线后发现异常，需快速恢复 header 模式

**执行步骤**:
```bash
# 1. 修改环境变量
echo 'NEXT_PUBLIC_AUTH_COOKIE_MODE=header' >> .env

# 2. 重新构建（Feature Flag 构建时固化，必须 rebuild）
pnpm build

# 3. 重启服务
pm2 restart all  # 或 docker-compose restart web

# 4. 验证服务启动
curl -s http://localhost:5000/api/health | jq .
```

**预期影响**:
- 已登录用户：Cookie 仍有效（后端 `extractToken` 兼容两种模式），无需重新登录
- localStorage：用户重新登录后 token 再次写入 localStorage
- Cookie：后端仍下发 Cookie（无害，header 模式优先读 header）

### L1 回滚验证矩阵

回滚后按以下清单逐项验证，每项需通过才算回滚成功：

#### 7.1 前端构建产物验证
```bash
# 验证 bundle 已切换到 header 模式（无 cookie 模式代码分支）
grep -c "AUTH_COOKIE_MODE" .next/static/chunks/*.js
# 预期: 0 或仅匹配到 false 分支（tree-shaking 移除了 cookie 分支）

# 验证 env 注入
grep -r "NEXT_PUBLIC_AUTH_COOKIE_MODE" .next/ 2>/dev/null | head -3
# 预期: 匹配到 'header' 字面量
```

#### 7.2 浏览器运行时验证（手动）

| 检查项 | 操作 | 预期结果 | 失败处置 |
|--------|------|----------|----------|
| Flag 值 | Console: `process.env.NEXT_PUBLIC_AUTH_COOKIE_MODE` | `'header'` 或 `undefined` | 重新构建 |
| localStorage token | 登录后 Console: `localStorage.getItem('token')` | 返回 JWT 字符串 | 检查 AuthContext.login() |
| Authorization header | Network 面板查看任意 API 请求 | 有 `Authorization: Bearer xxx` | 检查 authFetch.ts |
| Cookie 仍存在 | DevTools → Application → Cookies | `access_token` 仍存在（无害） | 正常，不需处理 |
| CSRF header | Network 面板查看 POST 请求 | 有 `X-CSRF-Token` header | 检查 authFetch CSRF 逻辑 |

#### 7.3 API 全流程验证（curl）
```bash
# 1. 登录获取 token
LOGIN_RESP=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo $LOGIN_RESP | jq -r '.data.token')
echo "Token: ${TOKEN:0:20}..."

# 2. 使用 token 访问受保护 API（header 模式）
curl -s http://localhost:5000/api/auth/menus \
  -H "Authorization: Bearer $TOKEN" | jq '.success'
# 预期: true

# 3. Refresh token（header 模式 body 传参）
REFRESH_TOKEN=$(echo $LOGIN_RESP | jq -r '.data.refreshToken')
USER_ID=$(echo $LOGIN_RESP | jq -r '.data.user.id')
curl -s -X POST http://localhost:5000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\",\"userId\":\"$USER_ID\"}" | jq '.success'
# 预期: true

# 4. 登出
curl -s -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" | jq '.success'
# 预期: true
```

#### 7.4 E2E 自动化验证
```bash
# 跑完整 Playwright 套件（header 模式下应全绿）
pnpm exec playwright test --project=chromium

# 专项验证 cookie 模式 E2E（回滚后应跳过或标记为 header 模式）
pnpm exec playwright test tests/e2e/cookie-auth.spec.ts --grep "header mode"
```

#### 7.5 监控指标回归验证

回滚后观察 15-30 分钟，确认指标恢复正常：

| 指标 | 回滚前异常 | 回滚后预期 | 确认方式 |
|------|------------|------------|----------|
| 登录失败率 | >5% | <1% | Grafana / 日志统计 |
| API 401 率 | >10% | <2% | APM / nginx 日志 |
| refresh 401 率 | >20% | <5% | `/api/auth/refresh` 日志 |
| 页面白屏/加载失败 | 有投诉 | 无新增 | 客服反馈 |

### L2 回滚（代码层 — L1 无效时）

**适用场景**: L1 回滚后问题仍存在（说明是后端改动引起，非 Feature Flag 控制）

**执行步骤**:
```bash
# 1. 找到 Phase 2 commit（假设为 abc1234）
git log --oneline --grep="cookie" -10

# 2. 创建回滚 commit（不使用 revert，避免冲突）
git revert abc1234 --no-edit

# 3. 推送并部署
git push origin main
# 触发 CI/CD 部署

# 4. Phase 2 改动的 4 个文件已被还原:
#    - src/lib/auth-fetch.ts (恢复纯 header 模式)
#    - src/contexts/AuthContext.tsx (恢复纯 localStorage)
#    - src/app/api/auth/refresh/route.ts (恢复纯 body 读取)
#    - src/lib/token-blacklist.ts (移除 getUserIdByRefreshToken)
```

**L2 回滚验证**:
```bash
# 1. 确认代码已回滚
git log --oneline -3
# 预期: 看到 "Revert Phase 2" commit

# 2. 确认 authFetch 无 Feature Flag
grep "AUTH_COOKIE_MODE" src/lib/auth-fetch.ts
# 预期: 无匹配（代码已还原）

# 3. 确认 refresh 路由无 cookie 读取
grep "cookies.get" src/app/api/auth/refresh/route.ts
# 预期: 无匹配

# 4. 跑 tsc + vitest + playwright 确认无回归
pnpm tsc --noEmit && pnpm vitest run && pnpm exec playwright test
```

### 回滚演练（上线前必做）

在 Staging 环境演练完整回滚流程，确保团队熟练：

**演练步骤**:
1. Staging 环境切换到 cookie 模式（`NEXT_PUBLIC_AUTH_COOKIE_MODE=cookie` + rebuild）
2. 验证 cookie 模式正常工作（登录 → API → 刷新 → 登出）
3. 模拟故障：手动制造 401 异常（如清除 Redis 中的 refresh token）
4. 执行 L1 回滚（改 env + rebuild + restart）
5. 按 7.1-7.5 验证矩阵逐项检查
6. 记录回滚耗时（目标 < 10 分钟）
7. 演练 L2 回滚（git revert + 部署），记录耗时（目标 < 30 分钟）

**演练通过标准**:
- L1 回滚全流程 < 10 分钟
- L1 验证矩阵 5/5 通过
- L2 回滚全流程 < 30 分钟
- L2 验证清单 4/4 通过
- 演练中发现的任何问题记录到 runbook

### 回滚 Runbook 速查

```
┌─────────────────────────────────────────────────────────┐
│  Cookie 模式异常 → 回滚决策树                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  异常发生                                                │
│    │                                                    │
│    ├─ 仅个别用户？                                       │
│    │   └─ 是 → 排查浏览器/网络，暂不回滚                  │
│    │                                                    │
│    ├─ 影响面 >5% 用户？                                  │
│    │   └─ 是 → L1 回滚（改 env + rebuild）              │
│    │            │                                       │
│    │            ├─ 10 分钟内指标恢复？                    │
│    │            │   └─ 是 → 结束，分析根因               │
│    │            │                                       │
│    │            └─ 未恢复 → L2 回滚（git revert）        │
│    │                        │                           │
│    │                        └─ 验证通过 → 结束           │
│    │                                                    │
│    └─ 安全漏洞（token 泄露等）？                          │
│        └─ 是 → 立即 L2 回滚 + 轮换 JWT_SECRET           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 八、测试计划

### 单元测试（Phase 2 新增）
```
src/lib/__tests__/auth-fetch.test.ts
  - header 模式: 读取 localStorage token 拼 Authorization header
  - cookie 模式: 不读 localStorage，不拼 Authorization header
  - 两种模式: CSRF header 附加
  - 401 触发 refresh: header 模式传 body，cookie 模式不传 body
  - refresh 成功: header 模式更新 localStorage，cookie 模式不更新
  - refresh 失败: clearAuthAndRedirect 调用 logout API（cookie 模式）

src/lib/__tests__/token-blacklist.test.ts
  - getUserIdByRefreshToken: 有效 token 返回 userId
  - getUserIdByRefreshToken: 过期 token 返回 null 并删除
  - getUserIdByRefreshToken: 不存在 token 返回 null
```

### E2E 测试（Playwright，cookie 模式专属）
```
tests/e2e/cookie-auth.spec.ts
  1. 登录 → 验证 Cookie 设置（HttpOnly, SameSite=Lax）
  2. 登录 → 访问受保护页面 → 验证 SSR 读取 Cookie
  3. 登录 → 等待 access_token 过期 → API 请求触发无感刷新 → 验证新 Cookie
  4. 登录 → 登出 → 验证 Cookie 清除 → 访问受保护页面重定向登录
  5. 跨标签页并发 401 → 验证 refresh 锁（单次刷新）
  6. CSRF: 缺少 X-CSRF-Token 的 POST → 403
  7. localStorage 无 token/refreshToken 键（仅有 user/userId）
```

### 手动验证
- Chrome DevTools → Application → Cookies: 确认 `access_token`/`refresh_token` 的 HttpOnly ✓
- Chrome DevTools → Console: `document.cookie` 不含 access_token/refresh_token
- localStorage: 无 `token`/`refreshToken` 键，仅有 `user`/`userId`/`cached_menus`
- 浏览器关闭重开: Cookie 仍有效（maxAge=24h/7d）

### 回归验证
- `NEXT_PUBLIC_AUTH_COOKIE_MODE=header` 启动 → 跑完整 E2E，确认零回归
- `NEXT_PUBLIC_AUTH_COOKIE_MODE=cookie` 启动 → 跑 cookie-auth.spec.ts + 现有 E2E

## 九、实施步骤（按顺序）

| 步骤 | 文件 | 改动 | 验证 |
|------|------|------|------|
| 1 | `src/lib/token-blacklist.ts` | 新增 `getUserIdByRefreshToken` 函数 | 单元测试 |
| 2 | `src/app/api/auth/refresh/route.ts` | Cookie 回退读取 + 反查 userId | 手动 curl 测试 |
| 3 | `src/lib/auth-fetch.ts` | Feature Flag + 双模式 + credentials:include | 单元测试 |
| 4 | `src/contexts/AuthContext.tsx` | 最小改动支持 cookie 模式 | 手动登录测试 |
| 5 | `.env.example` + `.env.production.example` | 新增 `NEXT_PUBLIC_AUTH_COOKIE_MODE=header` 配置与注释（已完成） | env 加载验证 |
| 6 | `src/lib/__tests__/auth-fetch.test.ts` | 新增/更新单元测试 | vitest |
| 7 | `tests/e2e/cookie-auth.spec.ts` | 新增 cookie 模式 E2E | playwright |
| 8 | Staging 回滚演练 | L1+L2 回滚流程演练 | 验证矩阵 9/9 通过 |
| 9 | 全量回归 | tsc + vitest + playwright | 所有测试通过 |

## 十、风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Safari ITP 拦截 SameSite=lax Cookie | 中 | 登录失败 | 监控登录成功率；回滚到 header 模式 |
| refresh 路由 cookie 读取失败 | 低 | 用户被登出 | verifyRefreshToken 兜底；refresh 路由返回 401 触发 clearAuthAndRedirect |
| CSRF header 缺失导致 403 | 中 | 写操作失败 | logout 等非 authFetch 调用手动附加 CSRF header |
| localStorage user 信息与 Cookie 状态不一致 | 中 | UI 显示已登录但 API 401 | AuthContext 401 时清登录态；Phase 3 改用 /api/auth/me |
| 跨域部署 Cookie 不发送 | 低 | API 401 | 确保 frontend 和 API 同源；或配置 Cookie domain |

## 十一、时间估算

| 步骤 | 工作量 |
|------|--------|
| 步骤 1-2（后端 refresh 改造） | 2h |
| 步骤 3（authFetch 改造） | 2h |
| 步骤 4（AuthContext 改造） | 2h |
| 步骤 5（env 配置 — 已完成） | 0.5h |
| 步骤 6（单元测试编写） | 2h |
| 步骤 7（E2E 编写） | 2h |
| 步骤 8（Staging 回滚演练） | 2h |
| 步骤 9（全量回归验证） | 1h |
| **合计** | **13.5h（约 2 天）** |

## 十二、Phase 2 完成后的下一步

- **Phase 3**: AuthContext 去除 localStorage token 依赖，改用 `/api/auth/me` 验证 Cookie 有效性
- **Phase 4**: 后端清理（login 路由移除 JSON body token，extractToken 移除 header 读取，authFetch 移除 Feature Flag 和 header 模式分支）
- **监控**: 上线后监控登录成功率、401 错误率、refresh 调用频率，确认 Cookie 模式稳定后再进入 Phase 3
