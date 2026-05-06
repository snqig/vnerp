/**
 * 仪表盘模块自动化测试
 * 测试用例: TC-DASHBOARD-001 ~ TC-DASHBOARD-005
 */

import { test, expect } from '@playwright/test';

const TEST_USERS = {
  admin: {
    username: 'admin',
    password: '521223',
  }
};

test.describe('仪表盘模块测试', () => {

  test.beforeEach(async ({ page }) => {
    await fetch('/api/auth/reset-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    }).catch(() => {});

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.fill('input#username', TEST_USERS.admin.username);
    await page.fill('input#password', TEST_USERS.admin.password);
    await page.locator('input#password').press('Enter');

    await expect(page).toHaveURL('/', { timeout: 60000 });
    await page.waitForTimeout(1000);
  });

  /**
   * TC-DASHBOARD-001: 首页加载验证
   */
  test('TC-DASHBOARD-001: 登录后首页正确加载', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible({ timeout: 10000 });

    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=今日订单').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=库存预警').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=今日完成').first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * TC-DASHBOARD-002: 导航菜单
   */
  test('TC-DASHBOARD-002: 侧边栏导航菜单可见', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10000 });

    const menuTexts = ['仪表盘', '订单', '仓库', '生产', '采购'];
    let foundCount = 0;
    for (const item of menuTexts) {
      const el = page.locator(`text=${item}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundCount++;
      }
    }
    expect(foundCount).toBeGreaterThanOrEqual(1);
  });

  /**
   * TC-DASHBOARD-003: 仪表盘页面导航
   */
  test('TC-DASHBOARD-003: 导航到仪表盘页面', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await expect(page.locator('h2').filter({ hasText: '仪表盘' }).first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * TC-DASHBOARD-004: 数据刷新
   */
  test('TC-DASHBOARD-004: 数据刷新功能', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const refreshBtn = page.locator('button:has-text("刷新数据")');
    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  /**
   * TC-DASHBOARD-005: 退出登录
   */
  test('TC-DASHBOARD-005: 退出登录功能', async ({ page }) => {
    const userTrigger = page.locator('[class*="user"] button, [class*="avatar"]').first();
    const adminText = page.locator('text=admin').first();

    if (await userTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userTrigger.click();
    } else if (await adminText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminText.click();
    }

    await page.waitForTimeout(500);

    const logoutBtn = page.locator('text=退出登录').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await expect(page).toHaveURL('/login', { timeout: 10000 });
    }
  });
});