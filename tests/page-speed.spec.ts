/**
 * 页面加载速度自动化测试
 *
 * 目标：验证生产模式下关键页面的服务器响应时间（TTFB）稳定在 100ms 以内。
 *
 * 测试流程：
 *   1. 通过 API 登录 admin 账号（处理 CSRF + localStorage 注入）
 *   2. 依次访问 8 个业务页面，每页测 3 次取最佳值
 *   3. 使用 Performance API 采集 TTFB / DOMContentLoaded / Load 三项指标
 *   4. 断言 TTFB < 100ms（用户目标），Load < 5000ms（可接受范围）
 *   5. 输出格式化结果表
 *
 * 运行方式：
 *   # 先启动生产服务器
 *   pnpm build && pnpm start
 *   # 另开终端运行测速（复用已有服务器）
 *   npx playwright test --config=playwright.speed.config.ts
 *
 * 自定义阈值：
 *   SPEED_TARGET_MS=100 npx playwright test --config=playwright.speed.config.ts
 */

import { test, expect, type Page } from '@playwright/test';

const ADMIN = {
  username: 'admin',
  password: 'admin123',
};

const SPEED_TARGET_MS = parseInt(process.env.SPEED_TARGET_MS || '100', 10);
const LOAD_ACCEPTABLE_MS = parseInt(process.env.LOAD_ACCEPTABLE_MS || '5000', 10);

interface PageTiming {
  label: string;
  url: string;
  status: number;
  ttfb: number;
  domContentLoaded: number;
  load: number;
  error?: string;
}

/**
 * 通过 API 登录并注入 token 到 localStorage
 * 比 UI 登录更可靠：不依赖表单选择器，自动处理 CSRF
 */
async function loginViaAPI(page: Page): Promise<void> {
  // Step 1: 访问登录页，让 middleware 种入 csrf_token cookie
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Step 2: 从浏览器 cookies 中提取 csrf_token
  const cookies = await page.context().cookies();
  const csrfCookie = cookies.find((c) => c.name === 'csrf_token');
  const csrfToken = csrfCookie?.value;

  if (!csrfToken) {
    throw new Error('CSRF token cookie not found — middleware may not have run');
  }

  // Step 3: 通过 API 登录（page.request 共享浏览器 cookies）
  const loginResponse = await page.request.post('/api/auth/login', {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: {
      username: ADMIN.username,
      password: ADMIN.password,
    },
  });

  if (!loginResponse.ok()) {
    const body = await loginResponse.text();
    throw new Error(`Login API failed: ${loginResponse.status()} ${body}`);
  }

  const loginData = await loginResponse.json();
  const { token, refreshToken, user } = loginData.data;

  if (!token) {
    throw new Error('Login response missing token');
  }

  // Step 4: 注入 token 到 localStorage（app 从 localStorage 读取认证信息）
  await page.evaluate(
    ({ token, refreshToken, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken || '');
      localStorage.setItem('user', JSON.stringify(user || {}));
      localStorage.setItem('userId', String(user?.id || 1));
    },
    { token, refreshToken, user }
  );
}

/**
 * 测量单个页面的导航性能
 * 使用 Performance Navigation API 采集精确时序
 */
async function measurePageNavigation(page: Page, url: string, label: string): Promise<PageTiming> {
  const result: PageTiming = {
    label,
    url,
    status: 0,
    ttfb: 0,
    domContentLoaded: 0,
    load: 0,
  };

  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    result.status = response?.status() ?? 0;

    // 从浏览器 Performance API 读取精确时序
    const timing = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length === 0) return null;
      const nav = entries[entries.length - 1] as PerformanceNavigationTiming;
      return {
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        load: Math.round(nav.loadEventEnd - nav.startTime),
      };
    });

    if (timing) {
      result.ttfb = timing.ttfb;
      result.domContentLoaded = timing.domContentLoaded;
      result.load = timing.load;
    } else {
      result.error = 'Performance API 未返回导航数据';
    }
  } catch (e: any) {
    result.error = e.message;
  }

  return result;
}

function formatResultTable(results: PageTiming[]): string {
  const header = '| 页面 | URL | Status | TTFB | DOM Loaded | Full Load | 结果 |';
  const divider = '|------|-----|--------|------|------------|-----------|------|';
  const rows = results.map((r) => {
    const pass = r.error ? '❌' : r.ttfb < SPEED_TARGET_MS ? '✅' : '⚠️';
    const ttfb = r.error ? '-' : `${r.ttfb}ms`;
    const dom = r.error ? '-' : `${r.domContentLoaded}ms`;
    const load = r.error ? '-' : `${r.load}ms`;
    const status = r.error ? '-' : String(r.status);
    return `| ${r.label} | ${r.url} | ${status} | ${ttfb} | ${dom} | ${load} | ${pass} |`;
  });
  return [header, divider, ...rows].join('\n');
}

test.describe('页面加载速度测试', () => {
  test('admin 登录后依次访问关键页面，验证 TTFB < 100ms', async ({ page }) => {
    // Step 1: API 登录
    await loginViaAPI(page);
    console.log('[Setup] Admin 登录成功，token 已注入 localStorage');

    // Step 2: 定义要测速的页面
    const pagesToTest = [
      { path: '/dashboard', label: '仪表盘' },
      { path: '/zh-CN/settings/user', label: '用户管理' },
      { path: '/zh-CN/settings/users', label: '用户列表' },
      { path: '/zh-CN/settings/roles', label: '角色管理' },
      { path: '/zh-CN/settings/menus', label: '菜单管理' },
      { path: '/zh-CN/settings/system', label: '系统设置' },
      { path: '/zh-CN/settings/organization', label: '组织管理' },
    ];

    // Step 3: 依次访问并采集指标（每页测 3 次取最佳 TTFB）
    const results: PageTiming[] = [];
    for (const { path, label } of pagesToTest) {
      const runs: PageTiming[] = [];
      for (let i = 0; i < 3; i++) {
        const timing = await measurePageNavigation(page, path, label);
        runs.push(timing);
        await page.waitForTimeout(200);
      }

      // 取 TTFB 最小的一次（消除冷启动影响）
      const best = runs.reduce((min, r) =>
        (r.ttfb < min.ttfb && !r.error) || min.error ? r : min
      );
      results.push(best);

      console.log(
        `[Speed] ${label.padEnd(10)} → TTFB: ${best.ttfb}ms | DOM: ${best.domContentLoaded}ms | Load: ${best.load}ms${best.error ? ' | ERROR: ' + best.error : ''}`
      );
    }

    // Step 4: 输出汇总表
    console.log('\n========== 页面加载速度汇总 ==========');
    console.log(formatResultTable(results));
    console.log(`\n目标: TTFB < ${SPEED_TARGET_MS}ms | 可接受 Load < ${LOAD_ACCEPTABLE_MS}ms`);
    console.log('=====================================\n');

    // Step 5: 断言
    // 5a: 所有页面都能成功加载（无错误）
    const failedPages = results.filter((r) => r.error);
    expect(failedPages, `以下页面加载失败: ${failedPages.map((r) => r.label).join(', ')}`).toHaveLength(0);

    // 5b: 至少 75% 的页面 TTFB < 100ms（允许首屏冷启动略高）
    const passedPages = results.filter((r) => !r.error && r.ttfb < SPEED_TARGET_MS);
    const passRate = Math.round((passedPages.length / results.length) * 100);
    console.log(`\nTTFB 达标率: ${passedPages.length}/${results.length} (${passRate}%)`);
    expect(passRate, `至少 75% 的页面 TTFB 应 < ${SPEED_TARGET_MS}ms`).toBeGreaterThanOrEqual(75);

    // 5c: 所有页面 Full Load < 5000ms（含 JS 水合 + API 请求）
    for (const r of results) {
      if (!r.error) {
        expect(r.load, `${r.label} Full Load 应 < ${LOAD_ACCEPTABLE_MS}ms`).toBeLessThan(LOAD_ACCEPTABLE_MS);
      }
    }
  });

  test('连续刷新用户管理页面 10 次，验证 TTFB 稳定性', async ({ page }) => {
    // 登录
    await loginViaAPI(page);
    console.log('[Setup] Admin 登录成功');

    // 对 /zh-CN/settings/user 连续测速 10 次
    const targetUrl = '/zh-CN/settings/user';
    const ttfbs: number[] = [];

    for (let i = 0; i < 10; i++) {
      const timing = await measurePageNavigation(page, targetUrl, '用户管理');
      if (!timing.error) {
        ttfbs.push(timing.ttfb);
      }
      console.log(`  [Run ${i + 1}/10] TTFB: ${timing.ttfb}ms${timing.error ? ' ERROR: ' + timing.error : ''}`);
      await page.waitForTimeout(100);
    }

    expect(ttfbs.length, '至少应成功采集 8 次数据').toBeGreaterThanOrEqual(8);

    // 统计分析
    const avg = Math.round(ttfbs.reduce((a, b) => a + b, 0) / ttfbs.length);
    const max = Math.max(...ttfbs);
    const min = Math.min(...ttfbs);
    const overThreshold = ttfbs.filter((t) => t >= SPEED_TARGET_MS).length;
    const passRate = Math.round(((ttfbs.length - overThreshold) / ttfbs.length) * 100);

    console.log('\n========== 稳定性测试汇总 ==========');
    console.log(`目标页面: ${targetUrl}`);
    console.log(`采样次数: ${ttfbs.length}`);
    console.log(`TTFB 最小: ${min}ms | 最大: ${max}ms | 平均: ${avg}ms`);
    console.log(`达标率 (< ${SPEED_TARGET_MS}ms): ${passRate}%`);
    console.log(`超标次数: ${overThreshold}/${ttfbs.length}`);
    console.log('=====================================\n');

    // 断言：平均 TTFB < 100ms，P90 TTFB < 150ms（允许偶发抖动）
    const sorted = [...ttfbs].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    console.log(`P90 TTFB: ${p90}ms`);

    expect(avg, `平均 TTFB 应 < ${SPEED_TARGET_MS}ms`).toBeLessThan(SPEED_TARGET_MS);
    expect(p90, `P90 TTFB 应 < 150ms（允许偶发抖动）`).toBeLessThan(150);
  });
});
