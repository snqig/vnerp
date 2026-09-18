/**
 * 权限管理自动化测试
 * 测试用例: TC-AUTH-001 ~ TC-AUTH-002
 */

import { test, expect } from '@playwright/test';

test.describe('权限管理测试', () => {

  /**
   * TC-AUTH-001: 超级管理员权限验证
   */
  test('TC-AUTH-001: 超级管理员可以访问受保护页面', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.locator('input#password').press('Enter');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60000 });
    await page.waitForTimeout(2000);

    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const noPermission = await page.locator('text=暂无菜单权限').count();
    expect(noPermission).toBe(0);

    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * TC-AUTH-002: 普通用户权限限制
   */
  test('TC-AUTH-002: 普通用户权限受限验证', async ({ page }) => {
    test.skip(true, '需要普通用户测试账号');
  });

  /**
   * 权限检查: 未登录访问受保护页面
   *
   * 历史缺陷：本用例曾以「未登录重定向功能尚未实现」为由 test.skip(true, …)，
   * 但 2026-09-14 运行时核实：src/proxy.ts 对无 token 的页面请求返回
   * 307 → /login?next=<原路径>，该功能**已实现**。过时的 skip 平白丢掉了覆盖。
   */
  test('权限检查: 未登录访问受保护页面应重定向到登录页', async ({ page, context }) => {
    await context.clearCookies();

    for (const path of ['/dashboard', '/orders/sales', '/production/work-orders']) {
      const resp = await page.request.get(path, { maxRedirects: 0 });
      expect(resp.status(), `${path} 未登录时应重定向而非直接放行`).toBe(307);
      expect(resp.headers()['location'] || '', `${path} 应重定向到 /login`).toContain('/login');
    }

    // 跟随一次重定向，确认最终落在登录页
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
  });

  /**
   * 权限检查: Token 过期处理
   *
   * 2026-09-14 运行时核实到的缺口（`proxy.ts` 只校验 `access_token` cookie 的**存在性**、
   * 不校验签名/有效期 → 无效 token 仍能拿到 200 仪表盘外壳），已于 2026-09-18 补齐：
   *   - 页面路径：`proxy.ts` 用 `verifyJwtSignature`（jose，Edge 安全）做签名 + 过期校验；
   *   - API 路径：同一函数做同口径校验，伪造 / 过期 token 在边缘即 401，不再穿透到路由层。
   * 黑名单 / 用户级撤销（改密 / 锁号）仍由 API 层 `withAuth` 负责，中间件只做粗粒度放行。
   *
   * 本用例原为「自动收紧」形式（缺口在则 skip、补齐后 307 自动生效）。中间件已补齐，
   * 这里收敛为**直接断言**，避免留下永不触发的死 skip 分支。
   */
  test('权限检查: Token过期后应提示重新登录', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([
      { name: 'access_token', value: 'garbage.token.value', url: 'http://localhost:5000' },
    ]);

    // API 路径：无效 token 在边缘层即被拒绝（与路由层 withAuth 的 401 语义一致）
    const apiResp = await page.request.get('/api/customers?page=1&pageSize=1');
    expect(apiResp.status(), '持无效 token 调业务 API 应被拒绝').toBe(401);

    // 页面路径：无效 token 按未登录处理，重定向到 /login 而非渲染仪表盘外壳
    const pageResp = await page.request.get('/dashboard', { maxRedirects: 0 });
    expect(pageResp.status(), '持无效 token 访问受保护页面应重定向到登录页').toBe(307);
    expect(pageResp.headers()['location'] || '', '重定向目标应包含 /login').toContain('/login');
  });
});
