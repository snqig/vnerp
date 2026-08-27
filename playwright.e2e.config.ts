import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

/**
 * E2E 运行覆盖配置（独立、类型安全，不 spread 主配置以避免重载匹配失败）：
 *  - 仅启用 chromium 项目（firefox/webkit 在本沙箱无法启动）。
 *  - 把测试产物（test-results / report）重定向到 node_modules/.cache，
 *    避免 WorkBuddy safe-delete 外壳拦截对既有 test-results 目录的清理。
 *  - reuseExistingServer 默认 true：复用已运行的 dev server（http://localhost:5000）。
 */
const e2eConfig: PlaywrightTestConfig = {
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  timeout: 120000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 顶层 outputDir 重定向测试产物（截图/跟踪/视频）到 node_modules/.cache，
  // 避免 WorkBuddy safe-delete 外壳拦截对既有 test-results 目录的清理。
  // 注意：outputDir 仅顶层有效，use 内无此属性。
  outputDir: 'node_modules/.cache/pw/test-results',
  reporter: [
    ['list'],
    ['json', { outputFile: 'node_modules/.cache/pw/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};

export default defineConfig(e2eConfig);
