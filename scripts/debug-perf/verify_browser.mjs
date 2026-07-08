// End-to-end browser verification: login + navigate key pages + verify data loads
import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';

const BASE = 'http://127.0.0.1:5000';
const TIMEOUT = 30000;

const pages = [
  { path: '/dashboard',           name: '仪表盘',          dataHint: ['stats', 'todayOrders', '待处理', '今日'] },
  { path: '/sales/orders',        name: '销售订单',        dataHint: ['SO', 'order_no', '订单号'] },
  { path: '/production/orders',   name: '生产工单',        dataHint: ['WO', 'work_order', '工单'] },
  { path: '/warehouse/inbound',   name: '入库管理',        dataHint: ['IN', 'inbound', '入库'] },
  { path: '/warehouse/inventory', name: '库存管理',        dataHint: ['batch_no', '库存', 'material'] },
  { path: '/purchase/orders',     name: '采购订单',        dataHint: ['PO', 'purchase', '采购'] },
  { path: '/quality/unqualified', name: '不合格品',        dataHint: ['UQ', 'unqualified', '不合格'] },
  { path: '/finance/receivable',  name: '应收款',          dataHint: ['AR', 'receivable', '应收'] },
  { path: '/system/user',         name: '用户管理',        dataHint: ['用户', 'user', 'admin'] },
  { path: '/system/role',         name: '角色管理',        dataHint: ['角色', 'role', '权限'] },
  { path: '/system/menu',         name: '菜单管理',        dataHint: ['菜单', 'menu'] },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'zh-CN' });
  const page = await context.newPage();

  const results = [];
  const apiErrors = [];

  // Capture API failures
  page.on('response', (resp) => {
    if (resp.url().includes('/api/') && resp.status() >= 500) {
      apiErrors.push({ url: resp.url(), status: resp.status() });
    }
  });

  // 1. Login
  console.log('=== 1. 登录 ===');
  const loginStart = Date.now();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

  // Wait for login form
  await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: TIMEOUT });
  await page.fill('input[placeholder="请输入用户名"]', 'admin');
  await page.fill('input[placeholder="请输入密码"]', 'admin123');

  // Click login and wait for navigation
  await Promise.all([
    page.waitForURL('**/dashboard**', { timeout: TIMEOUT }),
    page.click('button[type="submit"]'),
  ]);
  const loginMs = Date.now() - loginStart;
  console.log(`  登录成功，跳转到 /dashboard (${loginMs}ms)`);
  results.push({ step: 'login', status: 'PASS', ms: loginMs, detail: 'redirected to /dashboard' });

  // 2. Navigate through key pages
  console.log('\n=== 2. 遍历核心页面 ===');
  for (const p of pages) {
    const start = Date.now();
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

      // Wait for page to settle: either data table appears or networkidle
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch {
        // networkidle may timeout if HMR is active; fall back to waiting for table or text
      }

      // Check for visible error messages
      const errorEl = await page.$('[class*="error"], [class*="Error"]');
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));

      const hasData = p.dataHint.some((h) => bodyText.includes(h));
      const hasError = bodyText.includes('500') || bodyText.includes('服务器错误') ||
                       bodyText.includes('加载失败') || bodyText.includes('系统异常');
      const hasEmpty = bodyText.includes('暂无数据') && !hasData;

      const elapsedMs = Date.now() - start;
      const status = hasError ? 'FAIL' : (hasData ? 'PASS' : (hasEmpty ? 'EMPTY' : 'WARN'));
      results.push({ step: p.name, path: p.path, status, ms: elapsedMs, hasData, hasError, hasEmpty });
      console.log(`  [${status}] ${p.name} (${p.path}) ${elapsedMs}ms data=${hasData} err=${hasError} empty=${hasEmpty}`);
    } catch (e) {
      const ms2 = Date.now() - start;
      results.push({ step: p.name, path: p.path, status: 'ERR', ms: ms2, error: e.message });
      console.log(`  [ERR] ${p.name} (${p.path}) ${ms2}ms :: ${e.message}`);
    }
  }

  // 3. Summary
  console.log('\n=== 3. 汇总 ===');
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const err = results.filter((r) => r.status === 'ERR').length;
  const warn = results.filter((r) => r.status === 'WARN').length;
  const empty = results.filter((r) => r.status === 'EMPTY').length;
  console.log(`  PASS=${pass} FAIL=${fail} ERR=${err} WARN=${warn} EMPTY=${empty} / 总计 ${results.length}`);

  if (apiErrors.length > 0) {
    console.log(`\n  API 5xx 错误: ${apiErrors.length} 次`);
    apiErrors.slice(0, 10).forEach((e) => console.log(`    [${e.status}] ${e.url}`));
  }

  // Save full report
  writeFileSync('D:\\dcprint\\erp-project\\scripts\\debug-perf\\verify_result.json',
    JSON.stringify({ results, apiErrors }, null, 2));

  await browser.close();

  // Exit code: 0 if no FAIL/ERR, 1 otherwise
  process.exit(fail + err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(2);
});
