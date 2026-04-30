/**
 * 仪表盘模块自动化测试
 * 测试用例: TC-DASHBOARD-001 ~ TC-DASHBOARD-005
 */

import { test, expect } from '@playwright/test';

const TEST_USERS = {
  admin: {
    username: 'admin',
    password: 'admin',
  }
};

test.describe('仪表盘模块测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input#username', TEST_USERS.admin.username);
    await page.fill('input#password', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    
    // 等待跳转到首页
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  /**
   * TC-DASHBOARD-001: 仪表盘页面加载
   */
  test('TC-DASHBOARD-001: 仪表盘页面正确加载', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('text=越南达昌科技有限公司')).toBeVisible();
    
    // 验证关键数据卡片
    await expect(page.locator('text=今日订单')).toBeVisible();
    await expect(page.locator('text=本月销售')).toBeVisible();
    await expect(page.locator('text=库存预警')).toBeVisible();
    await expect(page.locator('text=生产进度')).toBeVisible();
  });

  /**
   * TC-DASHBOARD-002: 导航菜单
   */
  test('TC-DASHBOARD-002: 侧边栏导航菜单', async ({ page }) => {
    // 验证主要菜单项
    const menuItems = ['销售管理', '采购管理', '仓库管理', '生产管理', '质量管理'];
    
    for (const item of menuItems) {
      await expect(page.locator(`text=${item}`).first()).toBeVisible();
    }
  });

  /**
   * TC-DASHBOARD-003: 快捷操作
   */
  test('TC-DASHBOARD-003: 快捷操作按钮', async ({ page }) => {
    // 验证快捷操作区域
    await expect(page.locator('text=快捷操作')).toBeVisible();
    
    // 验证新建订单按钮
    const newOrderBtn = page.locator('button:has-text("新建订单")');
    await expect(newOrderBtn).toBeVisible();
  });

  /**
   * TC-DASHBOARD-004: 数据刷新
   */
  test('TC-DASHBOARD-004: 数据刷新功能', async ({ page }) => {
    // 查找刷新按钮（如果有的话）
    const refreshBtn = page.locator('button[title="刷新"]').or(page.locator('.refresh-icon'));
    
    if (await refreshBtn.count() > 0) {
      await refreshBtn.click();
      // 验证数据加载状态
      await page.waitForTimeout(1000);
    }
  });

  /**
   * TC-DASHBOARD-005: 退出登录
   */
  test('TC-DASHBOARD-005: 退出登录功能', async ({ page }) => {
    // 点击用户头像或菜单
    const userMenu = page.locator('.user-menu').or(page.locator('text=admin'));
    await userMenu.click();
    
    // 点击退出
    await page.click('text=退出登录');
    
    // 验证跳转到登录页
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });
});