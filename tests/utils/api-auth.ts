/**
 * E2E 共享认证助手 —— 解决 QA BUG-004（业务 API 缺 CSRF token）与 BUG-003（登录凭据/跳转断言）
 *
 * 背景：
 *   业务 API 经过 src/proxy.ts 中间件做 CSRF 校验（Double Submit Cookie 模式）：
 *     header `x-csrf-token` 必须与 cookie `csrf_token` 完全一致，否则 403。
 *   而 E2E 用例此前直接用 `page.request.post/put/delete` 驱动业务 API，
 *   既没有把 csrf_token 提到 header，也没有登录后重新同步 ——
 *   导致 4 个重点业务 spec（印前配方/工装/生产工单/打样转大货）全部 403，链路无法自动化验证。
 *
 * 方案：
 *   登录完成后读取浏览器上下文里的 csrf_token cookie，用
 *   `browserContext.setExtraHTTPHeaders()` 注入为 context 级默认 header。
 *   此后该 context 内所有 `page.request.*` 自动携带，无需逐个调用点改造。
 *   （登录 API 会重新种入 csrf_token，因此必须在登录「之后」同步。）
 *
 *   另修复一个隐蔽缺陷：Node 环境的 `fetch()` 不接受相对 URL，
 *   各 spec 里的 `fetch('/api/auth/reset-lock')` 实际抛 TypeError 并被 `.catch(() => {})` 静默吞掉，
 *   reset-lock 从未真正生效。此处统一改用绝对地址。
 *
 * 约定来源：src/lib/csrf.ts（CSRF_COOKIE_NAME / CSRF_HEADER_NAME / CSRF_EXEMPT_PATHS）
 */

import type { Page, BrowserContext } from '@playwright/test';

/** E2E 登录账号（与 tests/global-setup.ts、playwright.config.ts 保持一致） */
export const E2E_USER = { username: 'admin', password: 'admin123' } as const;

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/** E2E 目标基址（与 playwright.config.ts 的 use.baseURL 保持一致） */
export function e2eBaseURL(): string {
  return process.env.E2E_BASE_URL || 'http://localhost:5000';
}

/** 补全为绝对地址：Node 的 fetch 只接受绝对 URL，page.request 则接受相对 baseURL 的路径 */
export function absoluteURL(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${e2eBaseURL()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** 归一化为 BrowserContext（Page 取其所属 context） */
function toContext(target: Page | BrowserContext): BrowserContext {
  const maybePage = target as Page;
  return typeof maybePage.context === 'function' ? maybePage.context() : (target as BrowserContext);
}

/**
 * 重置 admin 登录锁定（与 tests/global-setup.ts 同构）。
 * 先 GET 页面拿到 csrf_token cookie，再以 Double Submit 方式 POST /api/auth/reset-lock。
 * 该路由本身在 CSRF 豁免名单内，带上 token 是为了与 global-setup 行为一致、并在豁免策略变动时保持可用。
 */
export async function resetAdminLock(username: string = E2E_USER.username): Promise<boolean> {
  try {
    const pageResp = await fetch(absoluteURL('/en/login'), { headers: { Accept: 'text/html' } });
    const setCookie = pageResp.headers.get('set-cookie') || '';
    const csrfToken = setCookie.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`))?.[1];

    const res = await fetch(absoluteURL('/api/auth/reset-lock'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken
          ? { [CSRF_HEADER_NAME]: csrfToken, Cookie: `${CSRF_COOKIE_NAME}=${csrfToken}` }
          : {}),
      },
      body: JSON.stringify({ username }),
    });
    return res.ok;
  } catch {
    // reset-lock 是尽力而为的基建：失败不阻断用例（后续登录失败会自然暴露环境问题）
    return false;
  }
}

/** 从上下文 cookie 读取 csrf_token */
export async function readCsrfToken(target: Page | BrowserContext): Promise<string | null> {
  const cookies = await toContext(target).cookies();
  return cookies.find((c) => c.name === CSRF_COOKIE_NAME)?.value ?? null;
}

/**
 * 把 csrf_token 注入为 context 级默认 header。
 * 注入后该 context 内所有 `page.request.*`（含 POST/PUT/DELETE）自动携带 X-CSRF-Token。
 * @returns 同步到的 token；未取到返回 null（调用方可据此判定登录态是否建立）
 */
export async function syncCsrfHeader(target: Page | BrowserContext): Promise<string | null> {
  const ctx = toContext(target);
  const token = await readCsrfToken(ctx);
  if (token) {
    await ctx.setExtraHTTPHeaders({ [CSRF_HEADER_NAME]: token });
  }
  return token;
}

/**
 * 统一 UI 登录流程：
 *   重置锁定 → 打开登录页 → 填表提交 → 等待跳转 dashboard → 同步 CSRF header。
 * @param basePath locale 前缀；默认 '/en'。默认 locale（zh-CN）传 ''。
 */
export async function login(
  page: Page,
  opts: { basePath?: string; submitLabel?: string } = {}
): Promise<void> {
  const basePath = opts.basePath ?? '/en';
  const submitLabel = opts.submitLabel ?? 'Login';

  await resetAdminLock();

  await page.goto(`${basePath}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input#username', { timeout: 60000 });
  await page.fill('input#username', E2E_USER.username);
  await page.fill('input#password', E2E_USER.password);
  await page.getByRole('button', { name: submitLabel }).click();
  await page.waitForURL(`**${basePath}/dashboard`, { timeout: 60000 });
  await page.waitForTimeout(1500);

  // 登录成功后登录 API 重新种入 csrf_token，必须在跳转完成后同步
  await syncCsrfHeader(page);
}
