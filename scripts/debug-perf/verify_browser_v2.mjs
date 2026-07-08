// Refined browser verification: precise error detection + screenshots
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://127.0.0.1:5000';
const TIMEOUT = 30000;
const SHOT_DIR = 'D:\\dcprint\\erp-project\\scripts\\debug-perf\\screenshots';
mkdirSync(SHOT_DIR, { recursive: true });

const pages = [
  { path: '/dashboard',           name: '仪表盘',          dataHint: ['今日', '待处理', '生产中', 'stats'] },
  { path: '/orders/sales',        name: '销售订单',        dataHint: ['SO', '订单号', '客户', '订单'] },
  { path: '/production/orders',   name: '生产工单',        dataHint: ['WO', '工单', '生产'] },
  { path: '/warehouse/inbound',   name: '入库管理',        dataHint: ['IN', '入库', '仓库'] },
  { path: '/warehouse/inventory', name: '库存管理',        dataHint: ['批次', '库存', '物料'] },
  { path: '/purchase/orders',     name: '采购订单',        dataHint: ['PO', '采购', '供应商'] },
  { path: '/quality/unqualified', name: '不合格品',        dataHint: ['UQ', '不合格', '检验'] },
  { path: '/finance/receivable',  name: '应收款',          dataHint: ['AR', '应收', '金额'] },
  { path: '/settings/users',      name: '用户管理',        dataHint: ['用户', 'admin', '账号'] },
  { path: '/settings/roles',      name: '角色管理',        dataHint: ['角色', '权限'] },
  { path: '/settings/menus',      name: '菜单管理',        dataHint: ['菜单', '系统'] },
];

function findErrorContext(text) {
  // Look for actual error UI patterns, not just "500" as a number
  const errorPatterns = [
    /服务器内部错误/g,
    /系统异常/g,
    /加载失败/g,
    /请求失败/g,
    /服务异常/g,
    /Error:/g,
    /Cannot read propert/g,
    /undefined is not/g,
  ];
  for (const p of errorPatterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = [];
  const apiErrors = [];
  const apiSuccess = new Set();

  page.on('response', (resp) => {
    if (resp.url().includes('/api/')) {
      if (resp.status() >= 500) {
        apiErrors.push({ url: resp.url(), status: resp.status() });
      } else if (resp.status() >= 200 && resp.status() < 300) {
        apiSuccess.add(resp.url().split('?')[0]);
      }
    }
  });

  // 1. Login
  console.log('=== 1. 登录 ===');
  const loginStart = Date.now();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: TIMEOUT });
  await page.fill('input[placeholder="请输入用户名"]', 'admin');
  await page.fill('input[placeholder="请输入密码"]', 'admin123');
  await Promise.all([
    page.waitForURL('**/dashboard**', { timeout: TIMEOUT }),
    page.click('button[type="submit"]'),
  ]);
  const loginMs = Date.now() - loginStart;
  console.log(`  登录成功 (${loginMs}ms)`);
  results.push({ step: 'login', status: 'PASS', ms: loginMs });

  // 2. Navigate through key pages
  console.log('\n=== 2. 遍历核心页面 ===');
  for (const p of pages) {
    const start = Date.now();
    const apiBefore = apiErrors.length;
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
      try {
        await page.waitForLoadState('networkidle', { timeout: 8000 });
      } catch { /* HMR may keep network busy */ }

      const elapsedMs = Date.now() - start;
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
      const errorCtx = findErrorContext(bodyText);
      const hasData = p.dataHint.some((h) => bodyText.includes(h));
      const newApiErrors = apiErrors.length - apiBefore;

      // Take screenshot
      const shotName = p.path.replace(/\//g, '_');
      await page.screenshot({ path: `${SHOT_DIR}/${shotName}.png`, fullPage: false });

      const status = errorCtx ? 'FAIL' : (hasData ? 'PASS' : 'WARN');
      results.push({ step: p.name, path: p.path, status, ms: elapsedMs, hasData, errorCtx, newApiErrors });
      console.log(`  [${status}] ${p.name} (${p.path}) ${elapsedMs}ms data=${hasData} err=${errorCtx || 'none'} api5xx=${newApiErrors}`);
    } catch (e) {
      const elapsedMs = Date.now() - start;
      results.push({ step: p.name, path: p.path, status: 'ERR', ms: elapsedMs, error: e.message });
      console.log(`  [ERR] ${p.name} (${p.path}) ${elapsedMs}ms :: ${e.message}`);
    }
  }

  // 3. Summary
  console.log('\n=== 3. 汇总 ===');
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const err = results.filter((r) => r.status === 'ERR').length;
  const warn = results.filter((r) => r.status === 'WARN').length;
  console.log(`  PASS=${pass} FAIL=${fail} ERR=${err} WARN=${warn} / 总计 ${results.length}`);

  console.log(`\n  API 成功端点数: ${apiSuccess.size}`);
  console.log(`  API 5xx 错误: ${apiErrors.length} 次`);
  // Dedupe API errors
  const errorUrls = {};
  apiErrors.forEach((e) => { errorUrls[e.url.split('?')[0]] = (errorUrls[e.url.split('?')[0]] || 0) + 1; });
  Object.entries(errorUrls).forEach(([url, count]) => console.log(`    [500] ${url} (x${count})`));

  writeFileSync('D:\\dcprint\\erp-project\\scripts\\debug-perf\\verify_result_v2.json',
    JSON.stringify({ results, apiErrors, apiSuccessCount: apiSuccess.size }, null, 2));

  await browser.close();
  process.exit(fail + err > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(2); });
