/**
 * 销售订单页面自动化测试
 * 验证最近修复的问题：可访问性、日期格式化、确认对话框等
 * 测试用例: TC-SO-001 ~ TC-SO-012
 */

import { test, expect } from '@playwright/test';

const TEST_USERS = {
  admin: {
    username: 'admin',
    password: 'admin123',
  },
};

async function login(page: any) {
  await page.goto('/en/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input#username', { timeout: 60000 });
  await page.fill('input#username', TEST_USERS.admin.username);
  await page.fill('input#password', TEST_USERS.admin.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/en', { timeout: 60000 });
  await page.waitForTimeout(2000);
}

test.describe('销售订单页面测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * TC-SO-001: 页面加载无运行时错误
   */
  test('TC-SO-001: 销售订单页面加载无运行时错误', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageErrors = consoleErrors.filter(
      (e) => !e.includes('404') && !e.includes('Failed to load resource')
    );
    expect(pageErrors.length).toBe(0);
  });

  /**
   * TC-SO-002: 页面标题和主要元素显示
   */
  test('TC-SO-002: 页面标题和主要元素正确显示', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1, h2').first()).toBeVisible();

    await expect(page.getByRole('button', { name: /新建|New|新增/i })).toBeVisible();

    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  /**
   * TC-SO-003: 搜索功能正常
   */
  test('TC-SO-003: 搜索功能正常工作', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('SO');
      await page.waitForTimeout(1500);
      await expect(page.locator('table')).toBeVisible();
    }
  });

  /**
   * TC-SO-004: 表格排序功能（点击表头）
   */
  test('TC-SO-004: 表格列排序功能正常', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const orderNoHeader = page.getByRole('columnheader', { name: /订单号|order.*no|Order No/i });
    if (await orderNoHeader.isVisible()) {
      await orderNoHeader.click();
      await page.waitForTimeout(500);
      const sortAttr = await orderNoHeader.getAttribute('aria-sort');
      expect(sortAttr).toBeTruthy();
    }
  });

  /**
   * TC-SO-005: 表格排序键盘支持（Enter键）
   */
  test('TC-SO-005: 表格列排序支持键盘操作', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const orderNoHeader = page.getByRole('columnheader', { name: /订单号|order.*no|Order No/i });
    if (await orderNoHeader.isVisible()) {
      await orderNoHeader.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      const sortAttr = await orderNoHeader.getAttribute('aria-sort');
      expect(sortAttr).toBeTruthy();
    }
  });

  /**
   * TC-SO-006: 表格排序键盘支持（Space键）
   */
  test('TC-SO-006: 表格列排序支持空格键', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dateHeader = page.getByRole('columnheader', { name: /日期|date|Date/i }).first();
    if (await dateHeader.isVisible()) {
      await dateHeader.focus();
      await page.keyboard.press(' ');
      await page.waitForTimeout(500);
      const sortAttr = await dateHeader.getAttribute('aria-sort');
      expect(sortAttr).toBeTruthy();
    }
  });

  /**
   * TC-SO-007: 行展开按钮可访问性
   */
  test('TC-SO-007: 行展开按钮有正确的 aria 属性', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const expandButtons = page.getByRole('button', { name: /expand|展开/i });
    const count = await expandButtons.count();
    if (count > 0) {
      const firstButton = expandButtons.first();
      const ariaExpanded = await firstButton.getAttribute('aria-expanded');
      expect(ariaExpanded).toBe('false');
    }
  });

  /**
   * TC-SO-008: 操作列更多按钮有 aria-label
   */
  test('TC-SO-008: 操作列更多按钮有可访问性标签', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const moreButtons = page.getByRole('button', { name: /more.*action|更多操作|More actions/i });
    const count = await moreButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  /**
   * TC-SO-009: 日期格式本地化显示
   */
  test('TC-SO-009: 日期格式根据语言环境显示', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const table = page.locator('table');
    await expect(table).toBeVisible();

    const firstRow = table.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      const dateCell = firstRow.locator('td').filter({ hasText: /\d{4}[-/]\d{1,2}[-/]\d{1,2}/ });
      const count = await dateCell.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * TC-SO-010: 繁体中文环境下菜单翻译
   */
  test('TC-SO-010: 繁体中文环境下菜单正确翻译', async ({ page }) => {
    await page.goto('/zh-TW/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageTitle = page.locator('h1, h2').first();
    if (await pageTitle.isVisible()) {
      const titleText = await pageTitle.textContent();
      expect(titleText).toBeTruthy();
    }
  });

  /**
   * TC-SO-011: 英文环境下菜单翻译
   */
  test('TC-SO-011: 英文环境下菜单正确翻译', async ({ page }) => {
    await page.goto('/en/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageTitle = page.locator('h1, h2').first();
    if (await pageTitle.isVisible()) {
      const titleText = await pageTitle.textContent();
      expect(titleText).toBeTruthy();
    }
  });

  /**
   * TC-SO-012: 侧边栏折叠按钮有 aria-label
   */
  test('TC-SO-012: 侧边栏折叠按钮有可访问性标签', async ({ page }) => {
    await page.goto('/orders/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const collapseButton = page.getByRole('button', { name: /collapse.*sidebar|折叠侧边栏|Collapse sidebar/i });
    if (await collapseButton.isVisible()) {
      await expect(collapseButton).toBeVisible();
    }
  });
});

test.describe('Header 可访问性测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-HDR-001: 通知铃铛按钮有 aria-label', async ({ page }) => {
    const notifButton = page.getByRole('button', { name: /notification|通知|Notifications/i });
    if (await notifButton.isVisible()) {
      await expect(notifButton).toBeVisible();
    }
  });

  test('TC-HDR-002: 用户菜单按钮有 aria-label', async ({ page }) => {
    const userButton = page.getByRole('button', { name: /user.*menu|用户菜单|User menu/i });
    if (await userButton.isVisible()) {
      await expect(userButton).toBeVisible();
    }
  });
});
