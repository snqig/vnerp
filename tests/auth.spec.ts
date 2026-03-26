/**
 * 权限管理自动化测试
 * 测试用例: TC-AUTH-001 ~ TC-AUTH-002
 */

import { test, expect } from '@playwright/test';

test.describe('权限管理测试', () => {
  
  /**
   * TC-AUTH-001: 超级管理员权限验证
   */
  test('TC-AUTH-001: 超级管理员可以访问所有模块', async ({ page }) => {
    // 1. 登录为超级管理员
    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin');
    await page.click('button[type="submit"]');
    
    // 等待登录完成
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // 2. 验证角色显示为"超级管理员"
    const userInfo = await page.locator('text=超级管理员').first();
    await expect(userInfo).toBeVisible({ timeout: 5000 });
    
    // 3. 验证可以访问入库管理
    await page.goto('/warehouse/inbound');
    await page.waitForTimeout(2000);
    
    // 验证页面没有显示"暂无菜单权限"
    const noPermission = await page.locator('text=暂无菜单权限').count();
    expect(noPermission).toBe(0);
    
    // 验证入库管理页面内容
    await expect(page.locator('text=入库管理').first()).toBeVisible({ timeout: 5000 });
    
    // 4. 验证可以访问系统设置
    await page.goto('/settings/users');
    await page.waitForTimeout(2000);
    
    // 验证没有权限提示
    const noPermission2 = await page.locator('text=暂无菜单权限').count();
    expect(noPermission2).toBe(0);
  });

  /**
   * TC-AUTH-002: 普通用户权限限制
   */
  test('TC-AUTH-002: 普通用户权限受限验证', async ({ page }) => {
    // 注：此测试需要一个普通用户账号
    // 如果没有，可以先跳过或创建一个测试账号
    test.skip(true, '需要普通用户测试账号');
    
    // 1. 登录为普通用户
    await page.goto('/login');
    await page.fill('input#username', 'normaluser');
    await page.fill('input#password', 'password');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // 2. 验证只显示授权的菜单
    // 普通用户不应该看到系统设置
    const settingsMenu = await page.locator('text=系统设置').count();
    expect(settingsMenu).toBe(0);
    
    // 3. 尝试访问未授权页面
    await page.goto('/settings/users');
    await page.waitForTimeout(2000);
    
    // 验证显示"暂无菜单权限"
    await expect(page.locator('text=暂无菜单权限')).toBeVisible();
  });

  /**
   * 权限检查: 未登录访问受保护页面
   */
  test('权限检查: 未登录访问受保护页面应重定向到登录页', async ({ page }) => {
    // 清除所有存储
    await page.context().clearCookies();
    
    // 尝试直接访问受保护页面
    await page.goto('/warehouse/inbound');
    await page.waitForTimeout(2000);
    
    // 验证被重定向到登录页
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });

  /**
   * 权限检查: Token过期处理
   */
  test('权限检查: Token过期后应提示重新登录', async ({ page }) => {
    // 1. 先正常登录
    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // 2. 模拟Token过期（清除localStorage）
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
    
    // 3. 刷新页面或访问API
    await page.reload();
    await page.waitForTimeout(2000);
    
    // 4. 验证被重定向到登录页或显示登录提示
    const currentUrl = page.url();
    const hasLoginRedirect = currentUrl.includes('login') || 
                             await page.locator('text=登录').count() > 0;
    
    expect(hasLoginRedirect).toBeTruthy();
  });
});
