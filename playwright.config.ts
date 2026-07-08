import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 测试配置文件
 * 越南达昌科技有限公司系统自动化测试
 */
export default defineConfig({
  testDir: './tests',
  
  globalSetup: './tests/global-setup.ts',
  
  testMatch: '**/*.spec.ts',
  
  /* 完全并行运行测试 */
  fullyParallel: true,

  /* 单个测试超时时间（webpack 冷启动编译较慢） */
  timeout: 120000,
  
  /* 禁止在CI中重复测试 */
  forbidOnly: !!process.env.CI,
  
  /* 重试次数 */
  retries: process.env.CI ? 2 : 0,
  
  /* 并行工作线程数 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 报告器配置 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  /* 共享配置 */
  use: {
    /* 基础URL */
    baseURL: 'http://localhost:5000',
    
    /* 收集所有跟踪信息 */
    trace: 'on-first-retry',
    
    /* 截图配置 */
    screenshot: 'only-on-failure',
    
    /* 视频录制 */
    video: 'on-first-retry',
    
    /* 视口大小 */
    viewport: { width: 1920, height: 1080 },
    
    /* 动作超时 */
    actionTimeout: 30000,
    
    /* 导航超时 */
    navigationTimeout: 60000,
  },

  /* 项目配置 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 移动端测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 本地开发服务器配置
   * 使用 --webpack 模式启动开发服务器，避免 Windows 下 Turbopack
   * 处理 CSS 时读取保留设备名 `nul` 导致的崩溃问题。
   */
  webServer: {
    command: 'pnpm run dev:webpack',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
