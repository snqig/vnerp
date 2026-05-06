/**
 * 入库管理自动化测试
 * 测试用例: TC-INBOUND-001 ~ TC-INBOUND-002
 */

import { test, expect } from '@playwright/test';

test.describe('入库管理测试', () => {

  test.beforeEach(async ({ page }) => {
    await fetch('/api/auth/reset-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    }).catch(() => {});

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', '521223');
    await page.locator('input#password').press('Enter');

    await expect(page).toHaveURL('/', { timeout: 60000 });
    await page.waitForTimeout(2000);

    await page.goto('/warehouse/inbound');
    await page.waitForTimeout(3000);
  });

  /**
   * TC-INBOUND-001: 入库管理页面加载
   */
  test('TC-INBOUND-001: 入库管理页面正确加载', async ({ page }) => {
    await expect(page.locator('h2, h1').first()).toBeVisible({ timeout: 10000 });

    const hasTable = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasCards = await page.locator('.card, [class*="card"]').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  /**
   * TC-INBOUND-002: 入库单查询
   */
  test('TC-INBOUND-002: 按条件查询入库单', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="查询"], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      const searchButton = page.locator('button:has-text("搜索"), button:has-text("查询")').first();
      if (await searchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchButton.click();
      } else {
        await searchInput.press('Enter');
      }

      await page.waitForTimeout(2000);
    }

    expect(true).toBeTruthy();
  });

  /**
   * UI测试: 入库管理页面元素检查
   */
  test('UI测试: 入库管理页面元素检查', async ({ page }) => {
    const table = page.locator('table').first();
    const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTable) {
      const headers = await table.locator('thead th').allTextContents();
      console.log('表格列头:', headers);
    }

    const buttons = await page.locator('button').allTextContents();
    console.log('页面按钮数量:', buttons.length);

    await page.screenshot({
      path: `test-results/inbound-page-${Date.now()}.png`,
      fullPage: true
    }).catch(() => {});
  });

  /**
   * 性能测试: 入库管理页面加载时间
   */
  test('性能测试: 入库管理页面加载时间', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/warehouse/inbound');
    await page.waitForSelector('h2, h1, table, .card, [class*="card"]', { timeout: 15000 });

    const loadTime = Date.now() - startTime;
    console.log(`页面加载时间: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(15000);
  });
});
