import { test, expect, request } from '@playwright/test';

/**
 * Swagger UI 集成验证测试
 *
 * 验证内容：
 * 1. /api/openapi.json 端点返回有效的 OpenAPI 3.0 规范
 * 2. /zh-CN/api-docs 页面正确加载并渲染 Swagger UI
 * 3. Swagger UI 展示 API 端点列表
 *
 * 前置条件：
 * - dev server 已启动（pnpm dev 或 pnpm dev:webpack）
 * - 已执行 pnpm docs:api 生成 openapi.json
 *
 * 运行方式：
 *   npx playwright test tests/swagger-ui.spec.ts --headed
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

// 登录凭据（与 login.spec.ts 一致）
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

/**
 * 通过 UI 登录建立认证会话（cookie + localStorage token）
 * 登录成功后页面会重定向到 /
 */
async function loginViaUI(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input#username', { timeout: 30000 });

  await page.fill('input#username', ADMIN_CREDENTIALS.username);
  await page.fill('input#password', ADMIN_CREDENTIALS.password);
  await page.locator('input#password').press('Enter');

  // 等待登录成功并离开登录页（重定向到 /dashboard 或 /）
  await expect(page).not.toHaveURL(/\/login/, { timeout: 60000 });
}

test.describe('Swagger UI 集成验证', () => {
  test('OpenAPI JSON 端点返回有效规范', async () => {
    const apiContext = await request.newContext();

    const response = await apiContext.get(`${BASE_URL}/api/openapi.json`);

    expect(response.ok(), `openapi.json 应返回 2xx，实际: ${response.status()}`).toBe(
      true
    );

    const contentType = response.headers()['content-type'] || '';
    expect(
      contentType.includes('application/json'),
      `Content-Type 应为 JSON，实际: ${contentType}`
    ).toBe(true);

    const spec = await response.json();

    expect(spec.openapi, '应包含 openapi 版本字段').toBeDefined();
    expect(spec.openapi.startsWith('3.'), 'OpenAPI 版本应为 3.x').toBe(true);
    expect(spec.info, '应包含 info 字段').toBeDefined();
    expect(spec.info.title, '应包含 info.title').toBeTruthy();
    expect(spec.paths, '应包含 paths 字段').toBeDefined();
    expect(
      Object.keys(spec.paths).length,
      'paths 应至少包含一个端点'
    ).toBeGreaterThan(0);

    await apiContext.dispose();
  });

  test('Swagger UI 页面正确加载并渲染', async ({ page }) => {
    await loginViaUI(page);

    // 直接访问 /api-docs（默认 locale 无前缀，避免 307 重定向）
    await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'domcontentloaded' });

    // 等待 Swagger UI 动态加载完成（ssr: false 需要 client-side render）
    await page.waitForSelector('.swagger-ui', { timeout: 60000 });

    // 验证 Swagger UI 容器存在
    const swaggerContainer = page.locator('.swagger-ui');
    await expect(swaggerContainer).toBeVisible();

    // 验证标题区域
    const titleElement = page.locator('.swagger-ui .title');
    await expect(titleElement).toBeVisible();

    // 验证至少有一个 API 端点渲染
    const endpoints = page.locator('.swagger-ui .opblock');
    await expect(endpoints.first()).toBeVisible({ timeout: 15000 });

    const endpointCount = await endpoints.count();
    expect(endpointCount, '应渲染至少 1 个 API 端点').toBeGreaterThan(0);
  });

  test('Swagger UI 可展开端点查看详情', async ({ page }) => {
    await loginViaUI(page);

    await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.swagger-ui', { timeout: 60000 });

    // 点击第一个端点展开
    const firstEndpoint = page.locator('.swagger-ui .opblock').first();
    await firstEndpoint.locator('.opblock-summary').click();

    // 验证展开后显示详细信息
    await expect(firstEndpoint.locator('.opblock-body')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Swagger UI 搜索过滤功能正常', async ({ page }) => {
    await loginViaUI(page);

    await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.swagger-ui', { timeout: 60000 });

    const initialCount = await page.locator('.swagger-ui .opblock').count();
    expect(initialCount, '初始应有多条端点').toBeGreaterThan(1);

    // 在搜索框输入过滤词
    const filterInput = page.locator('.swagger-ui .filter-container input');
    if (await filterInput.isVisible()) {
      await filterInput.fill('nonexistent-endpoint-xyz');
      await page.waitForTimeout(500);

      const filteredCount = await page.locator('.swagger-ui .opblock:visible').count();
      expect(filteredCount, '过滤后应无可见端点').toBe(0);
    }
  });
});
