/**
 * 登录模块自动化测试
 * 测试用例: TC-LOGIN-001 ~ TC-LOGIN-005
 */

import { test, expect } from '@playwright/test';

const TEST_USERS = {
  admin: {
    username: 'admin',
    password: '521223',
    role: '超级管理员'
  },
  invalid: {
    username: 'notexist',
    password: 'wrongpassword'
  }
};

test.describe('登录模块测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1', { timeout: 60000 });
  });

  /**
   * TC-LOGIN-001: 正常登录流程
   */
  test('TC-LOGIN-001: 使用有效凭据正常登录', async ({ page }) => {
    await fetch('/api/auth/reset-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    }).catch(() => {});

    await page.fill('input#username', TEST_USERS.admin.username);
    await page.fill('input#password', TEST_USERS.admin.password);
    await page.locator('input#password').press('Enter');

    await expect(page).toHaveURL('/', { timeout: 60000 });

    await expect(page.locator('nav').first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * TC-LOGIN-002: 无效用户名登录
   */
  test('TC-LOGIN-002: 使用不存在的用户名登录', async ({ page }) => {
    await page.fill('input#username', TEST_USERS.invalid.username);
    await page.fill('input#password', TEST_USERS.invalid.password);
    await page.locator('input#password').press('Enter');

    const errorMessage = page.locator('[data-testid="login-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveURL('/login');
  });

  /**
   * TC-LOGIN-003: 错误密码登录
   */
  test('TC-LOGIN-003: 使用错误的密码登录', async ({ page }) => {
    await page.fill('input#username', TEST_USERS.admin.username);
    await page.fill('input#password', 'wrongpassword');
    await page.locator('input#password').press('Enter');

    const errorMessage = page.locator('[data-testid="login-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveURL('/login');
  });

  /**
   * TC-LOGIN-004: 空值验证
   */
  test('TC-LOGIN-004: 用户名或密码为空', async ({ page }) => {
    await page.locator('input#password').press('Enter');

    const usernameInput = page.locator('input#username');
    await expect(usernameInput).toHaveAttribute('required', '');
  });

  /**
   * TC-LOGIN-005: 记住我功能验证
   */
  test('TC-LOGIN-005: 记住我功能验证', async ({ page }) => {
    await fetch('/api/auth/reset-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    }).catch(() => {});

    await page.fill('input#username', TEST_USERS.admin.username);
    await page.fill('input#password', TEST_USERS.admin.password);

    const rememberCheckbox = page.locator('#remember');
    if (await rememberCheckbox.isVisible().catch(() => false)) {
      const isChecked = await rememberCheckbox.isChecked();
      if (!isChecked) {
        await page.locator('label[for="remember"]').click();
      }
    }

    await page.locator('input#password').press('Enter');

    await expect(page).toHaveURL('/', { timeout: 60000 });

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  /**
   * UI测试: 登录页面元素显示检查
   */
  test('UI测试: 登录页面元素显示检查', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('欢迎回来');

    await expect(page.locator('label', { hasText: '用户名' })).toBeVisible();
    await expect(page.locator('label', { hasText: '密码' })).toBeVisible();

    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toContainText('登');

    await expect(page.locator('text=记住我')).toBeVisible();
  });

  /**
   * 响应式测试: 登录页面在不同分辨率下的显示
   */
  test('响应式测试: 移动端登录页面', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
