# localStorage Token → HttpOnly Cookie 迁移方案

> 📌 历史快照（生成于 2026-07-08），内容反映当时状态，未随代码更新。仅作归档参考。

> 状态: 待审批 | 创建日期: 2026-07-08 | 关联: 数据库深度分析报告 P0 安全项

## 一、现状分析

### 当前架构（双轨制）

后端已部分实现 Cookie 下发，前端仍依赖 localStorage，形成双轨并行：

| 组件 | 当前行为 | Cookie 就绪 |
|------|----------|-------------|
| `/api/auth/login` | JSON 返回 `token`+`refreshToken` **并** Set-Cookie | ✅ 已设置 |
| `/api/auth/refresh` | 从 body 读 `refreshToken` **并** Set-Cookie 新 token | ✅ 已设置 |
| `/api/auth/logout` | 清除 Cookie | ✅ 已清除 |
| `middleware.ts` | 读 `access_token` cookie 做页面守卫 | ✅ 已就绪 |
| `extractToken()` (`lib/auth.ts`) | **仅**读 `Authorization` header | ❌ 不读 cookie |
| `authFetch()` (`lib/auth-fetch.ts`) | 读 localStorage `token`，手动拼 `Authorization` header | ❌ 依赖 localStorage |
| `AuthContext.tsx` | localStorage 存取 `token`/`refreshToken`/`userId` | ❌ 依赖 localStorage |
| `ApiClient` (`lib/api-client.ts`) | 已委托 `authFetch`（本轮收敛） | ⚠️ 间接依赖 |

### 安全风险

`localStorage` 中的 JWT 可被页面内任意 JS 读取（含第三方脚本/XSS 注入），导致：
- Token 窃取 → 账号冒用
- Refresh token 窃取 → 持久化后门

HttpOnly Cookie 无法被 JS 读取，从根源上消除 XSS 窃取 token 的攻击面。

## 二、目标架构

```
浏览器                          Next.js 服务端
┌─────────────────────┐         ┌──────────────────────────┐
│  Cookie Jar         │         │                          │
│  - access_token ────────────▶│  extractToken()          │
│    (HttpOnly, Lax)  │         │  读 cookie → verifyToken  │
│  - refresh_token ───┐│         │                          │
│    (HttpOnly, Lax)  ││         │  /api/auth/refresh       │
│  - csrf_token       ││         │  读 cookie → 验证 → Set  │
│    (JS-readable)    ││         │                          │
├─────────────────────┤│         │  /api/auth/login         │
│  authFetch()        ││         │  验证密码 → Set-Cookie    │
│  不再拼 Auth header  ││         │                          │
│  仅附 X-CSRF-Token  ││         │  /api/auth/logout        │
└─────────────────────┘│         │  Set-Cookie: Max-Age=0   │
                       └────────▶│                          │
                                 └──────────────────────────┘
```

### Cookie 配置

| Cookie | HttpOnly | Secure | SameSite | Path | Max-Age | 用途 |
|--------|----------|--------|----------|------|---------|------|
| `access_token` | true | prod=true | lax | `/` | 24h (86400) | API 鉴权 + SSR |
| `refresh_token` | true | prod=true | lax | `/api/auth` | 7d (604800) | 仅刷新端点可见 |
| `csrf_token` | **false** | prod=true | lax | `/` | Session | 双重提交校验（JS 需读取） |

> `refresh_token` 的 Path 限制为 `/api/auth`，减少 cookie 在非认证请求中的暴露面。

## 三、分阶段实施步骤

### Phase 1: 后端兼容读取 Cookie（向后兼容，零破坏）

**目标**: 让 `extractToken` 和 refresh 路由能从 Cookie 读取 token，同时保留现有 header/body 读取逻辑。

**改动文件**:

1. **`src/lib/auth.ts` — `extractToken()`**
   ```ts
   export function extractToken(request: NextRequest): string | null {
     // 优先读 Authorization header（过渡期兼容）
     const authHeader = request.headers.get('authorization');
     if (authHeader && authHeader.startsWith('Bearer ')) {
       return authHeader.substring(7);
     }
     // 回退到 Cookie
     const cookieToken = request.cookies.get('access_token')?.value;
     if (cookieToken) {
       return cookieToken;
     }
     return null;
   }
   ```

2. **`src/app/api/auth/refresh/route.ts`**
   ```ts
   // 优先读 body（过渡期兼容），回退到 Cookie
   let refreshToken: string | undefined;
   let userId: string | undefined;
   try {
     const body = await request.json();
     refreshToken = body.refreshToken;
     userId = body.userId;
   } catch {
     // body 为空（纯 Cookie 模式）
   }
   if (!refreshToken) {
     refreshToken = request.cookies.get('refresh_token')?.value;
   }
   // userId 从旧 token payload 中提取（需 verifyRefreshToken 支持）
   ```

**验证**: 现有前端（localStorage + Authorization header）继续工作；同时 Cookie 也能被读取。无破坏性变更。

**回滚**: 无需回滚 — 纯增量逻辑。

---

### Phase 2: 前端切换到 Cookie 模式（Feature Flag 控制）

**目标**: `authFetch` 不再从 localStorage 读 token、不再拼 Authorization header，依赖浏览器自动发送 Cookie。

**Feature Flag**: `NEXT_PUBLIC_AUTH_COOKIE_MODE=cookie|header`（默认 `header` 保持兼容）

**改动文件**:

3. **`src/lib/auth-fetch.ts`**
   ```ts
   const COOKIE_MODE = process.env.NEXT_PUBLIC_AUTH_COOKIE_MODE === 'cookie';

   export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
     const headers: Record<string, string> = {
       'Content-Type': 'application/json',
       ...(options.headers as Record<string, string>),
     };

     // header 模式：保留 localStorage 读取（过渡期）
     if (!COOKIE_MODE) {
       const token = typeof window !== 'undefined'
         ? localStorage.getItem('token') || sessionStorage.getItem('token')
         : null;
       if (token) {
         headers['Authorization'] = `Bearer ${token}`;
       }
     }
     // cookie 模式：浏览器自动发送 access_token cookie，无需手动拼 header

     // CSRF（两种模式都需要）
     if (typeof document !== 'undefined') {
       const csrfMatch = document.cookie.match(/(^| )csrf_token=([^;]+)/);
       if (csrfMatch) {
         headers['X-CSRF-Token'] = csrfMatch[2];
       }
     }

     const response = await fetch(url, { ...options, headers, credentials: 'include' });

     // 401 无感刷新（cookie 模式下 refresh 不需要 body token）
     if (response.status === 401 && typeof window !== 'undefined' && !url.includes('/api/auth/refresh')) {
       const newToken = await refreshAccessToken();
       if (newToken) {
         // cookie 模式下浏览器已自动更新 cookie，直接重试
         return fetch(url, { ...options, headers, credentials: 'include' });
       }
       clearAuthAndRedirect();
     }

     return response;
   }
   ```

4. **`src/lib/auth-fetch.ts` — `refreshAccessToken()`**
   ```ts
   async function refreshAccessToken(): Promise<string | null> {
     if (refreshPromise) return refreshPromise;

     refreshPromise = (async () => {
       try {
         // cookie 模式：refresh_token 自动随 Cookie 发送，无需 body
         const body = COOKIE_MODE
           ? undefined
           : JSON.stringify({
               refreshToken: localStorage.getItem('refreshToken'),
               userId: localStorage.getItem('userId'),
             });

         const res = await fetch('/api/auth/refresh', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body,
           credentials: 'include', // 确保 cookie 随请求发送
         });
         if (!res.ok) return null;
         const json = await res.json();
         return json.success ? 'refreshed' : null; // cookie 模式下无需返回 token
       } catch {
         return null;
       } finally {
         refreshPromise = null;
       }
     })();

     return refreshPromise;
   }
   ```

5. **`src/lib/auth-fetch.ts` — `clearAuthAndRedirect()`**
   ```ts
   function clearAuthAndRedirect(): void {
     // cookie 模式：调用 logout API 清除 cookie
     if (COOKIE_MODE) {
       fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
     }
     // header 模式：清除 localStorage（过渡期保留）
     if (!COOKIE_MODE) {
       localStorage.removeItem('token');
       localStorage.removeItem('refreshToken');
       localStorage.removeItem('userId');
       sessionStorage.removeItem('token');
       sessionStorage.removeItem('refreshToken');
       sessionStorage.removeItem('userId');
     }
     if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
       window.location.href = '/login';
     }
   }
   ```

**验证**: 设置 `NEXT_PUBLIC_AUTH_COOKIE_MODE=cookie` 后，前端不再读写 localStorage token，全部依赖 Cookie。设置回 `header` 恢复旧行为。

---

### Phase 3: AuthContext 去除 localStorage Token 依赖

**目标**: `AuthContext` 不再管理 token 存储，仅管理用户信息状态。

**改动文件**:

6. **`src/contexts/AuthContext.tsx`**
   - 删除 `localStorage.getItem('token')` / `setItem('token', ...)` 相关逻辑
   - 登录成功后仅存储 `user` 信息（可保留在 localStorage 供 SSR hydration，或改用 `/api/auth/me` 按需获取）
   - 登出调用 `/api/auth/logout` API（服务端清 Cookie），前端仅清除 `user` 状态
   - 刷新 token 逻辑移除（authFetch 内部处理 401 刷新）
   - 初始化时调用 `/api/auth/me` 验证 Cookie 有效性，而非检查 localStorage

**验证**: 登录/登出/刷新/页面刷新 全流程在 Cookie 模式下正常工作。

---

### Phase 4: 后端清理（移除过渡兼容代码）

**目标**: 移除 JSON body 返回 token、body 读取 refreshToken 等过渡逻辑。

**改动文件**:

7. **`src/app/api/auth/login/route.ts`**
   - 响应体移除 `token` 和 `refreshToken`，仅返回 `{ success, message, data: { user } }`
   - 保留 Set-Cookie

8. **`src/app/api/auth/refresh/route.ts`**
   - 移除 body 读取 `refreshToken`/`userId` 逻辑
   - 仅从 Cookie 读取 `refresh_token`
   - `userId` 从 refresh token 的 payload 中提取

9. **`src/lib/auth.ts` — `extractToken()`**
   - 移除 Authorization header 读取（或保留作为 API 客户端兼容，如移动端）

10. **`src/lib/auth-fetch.ts`**
    - 移除 Feature Flag 和 header 模式分支
    - 移除所有 `localStorage` token 引用

11. **`src/tests/utils/auth.test.ts`**
    - 更新测试 mock：不再 mock `localStorage.getItem('token')`，改为 mock Cookie

**验证**: 全量回归测试通过；浏览器 DevTools 确认 Application → Cookies 中有 `access_token`/`refresh_token`（HttpOnly），localStorage 中无 token。

## 四、Cookie 安全属性说明

| 属性 | 值 | 理由 |
|------|-----|------|
| `HttpOnly` | `true` | 阻止 JS 读取（防 XSS 窃取）— **核心目标** |
| `Secure` | `prod: true, dev: false` | 生产环境仅 HTTPS 传输；开发环境 localhost 允许 HTTP |
| `SameSite` | `lax` | 允许顶层导航 GET 携带 Cookie，阻止跨站 POST CSRF；结合 CSRF 双重提交校验 |
| `Path` (`refresh_token`) | `/api/auth` | 限制 refresh token 仅发送到认证端点，减少暴露 |
| `Max-Age` (`access_token`) | `86400` (24h) | 与 JWT exp 一致 |
| `Max-Age` (`refresh_token`) | `604800` (7d) | 与 refresh token TTL 一致 |

> **"记住我"**: 当前 sessionStorage（会话级）vs localStorage（持久）。Cookie 方案用 `Max-Age` 区分：记住=7d，不记住=Session（浏览器关闭即失效）。login 路由根据 `rememberMe` 参数设置不同 `maxAge`。

## 五、CSRF 防护强化

Cookie 模式下浏览器自动发送 Cookie，CSRF 风险升高。现有双重提交校验需确保覆盖：

1. **`csrf_token` cookie**: 非 HttpOnly（JS 需读取），每次登录刷新
2. **`X-CSRF-Token` header**: `authFetch` 从 cookie 读取后附加到非安全方法请求
3. **`middleware.ts`**: 已对 `/api/*` 非安全方法做 `validateCsrfToken` 校验
4. **验证清单**:
   - [ ] 所有 POST/PUT/DELETE/PATCH API 路由经过 middleware CSRF 校验
   - [ ] `authFetch` 始终附加 `X-CSRF-Token` header（Phase 2 已确保）
   - [ ] 文件上传等非 JSON 请求也携带 CSRF header
   - [ ] 登录请求本身豁免 CSRF（未登录无 csrf_token）

## 六、回滚方案

### 回滚触发条件
- Cookie 模式下出现大面积登录失败/频繁掉线
- SSR 页面鉴权异常
- 特定浏览器（如 Safari ITP）Cookie 被拒

### 回滚层级

| 层级 | 操作 | 影响 | 耗时 |
|------|------|------|------|
| L1 | `NEXT_PUBLIC_AUTH_COOKIE_MODE=header` | 前端回退 localStorage，后端 Cookie 仍下发（无害） | 重启即生效 |
| L2 | Phase 4 代码回退（恢复 JSON body 返回 token） | 后端恢复双轨制 | git revert + 部署 |
| L3 | Phase 1 代码回退（extractToken 不读 cookie） | 完全恢复原始 localStorage 架构 | git revert + 部署 |

### 回滚步骤（L1 快速回滚）

1. 修改环境变量: `NEXT_PUBLIC_AUTH_COOKIE_MODE=header`
2. 重启前端服务（`pnpm build && pm2 restart` 或 Docker 重启）
3. 已登录用户的 Cookie 仍有效（后端 extractToken 优先读 header，但 cookie 也能读到），localStorage token 重新生效
4. 用户无需重新登录

### 回滚验证
- [ ] `localStorage.getItem('token')` 返回有效 token
- [ ] `Authorization: Bearer` header 出现在 API 请求中
- [ ] 登录/刷新/登出全流程正常

## 七、测试计划

### 单元测试
- `extractToken()`: header 优先 → cookie 回退 → 无 token 返回 null
- `refreshAccessToken()`: cookie 模式不传 body → 仍能刷新
- `clearAuthAndRedirect()`: cookie 模式调用 logout API

### E2E 测试（Playwright）
1. 登录 → 验证 Cookie 设置（HttpOnly, SameSite=Lax）
2. 登录 → 访问受保护页面 → 验证 SSR 读取 Cookie
3. 登录 → 等待 access_token 过期 → API 请求触发无感刷新 → 验证新 Cookie
4. 登录 → 登出 → 验证 Cookie 清除 → 访问受保护页面重定向登录
5. 跨标签页并发 401 → 验证 refresh 锁（单次刷新）
6. CSRF: 缺少 X-CSRF-Token 的 POST → 403

### 手动验证
- Chrome DevTools → Application → Cookies: 确认 `access_token`/`refresh_token` 的 HttpOnly ✓
- Chrome DevTools → Console: `document.cookie` 不含 access_token/refresh_token
- localStorage: 无 `token`/`refreshToken` 键
- 浏览器关闭重开（非"记住我"）: 需重新登录

## 八、影响范围清单

### 需改动文件

| 文件 | Phase | 改动类型 |
|------|-------|----------|
| `src/lib/auth.ts` | 1, 4 | `extractToken` 增加 cookie 读取 |
| `src/app/api/auth/refresh/route.ts` | 1, 4 | 增加 cookie 读取 |
| `src/lib/auth-fetch.ts` | 2, 4 | Feature Flag + 去 localStorage |
| `src/contexts/AuthContext.tsx` | 3 | 去 localStorage token 管理 |
| `src/app/api/auth/login/route.ts` | 4 | 移除 JSON body token |
| `src/tests/utils/auth.test.ts` | 4 | 更新 mock |

### 需检查文件（确认无 localStorage token 引用）

| 文件 | 当前状态 |
|------|----------|
| `src/lib/api-client.ts` | ✅ 已委托 authFetch（无需改动） |
| `src/app/[locale]/finance/cost/page.tsx` | ✅ 已移除局部 authFetch（无需改动） |

### 不受影响

- `src/lib/api-auth.ts` — 服务端，读 header/cookie，不涉及 localStorage
- `src/lib/menu-service.ts` — 服务端，读 DB，不涉及 localStorage
- `src/middleware.ts` — 已读 cookie，无需改动
- `src/lib/token-blacklist.ts` — 服务端 Redis，不涉及 localStorage

## 九、时间估算

| Phase | 工作量 | 建议时间 |
|-------|--------|----------|
| Phase 1 | 2 文件，小改动 | 0.5 天 |
| Phase 2 | 1 文件，中等改动 + Feature Flag | 1 天 |
| Phase 3 | 1 文件，大改动（AuthContext 重构） | 1.5 天 |
| Phase 4 | 4 文件，清理 + 测试更新 | 1 天 |
| 测试 | 单元 + E2E + 手动 | 1 天 |
| **合计** | | **5 天** |

> 每个 Phase 独立可部署，Phase 1-2 可在 1.5 天内上线灰度验证。
