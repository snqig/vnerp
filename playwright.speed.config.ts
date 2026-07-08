/**
 * 页面测速专用 Playwright 配置
 *
 * 与 playwright.config.ts 的区别：
 *   1. 不使用 globalSetup（生产模式下 reset-lock 返回 403）
 *   2. 始终 reuseExistingServer（复用已启动的生产服务器）
 *   3. 单线程串行执行（避免并发影响测速精度）
 *   4. 仅运行 page-speed.spec.ts
 *
 * 用法：
 *   # 先启动生产服务器
 *   pnpm build && pnpm start
 *   # 另开终端运行测速
 *   npx playwright test --config=playwright.speed.config.ts
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'page-speed.spec.ts',

  // 串行执行：并发会争抢 CPU/网络，导致测速不准
  fullyParallel: false,
  workers: 1,

  timeout: 180000,
  retries: 0,
  forbidOnly: false,

  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:5000',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
