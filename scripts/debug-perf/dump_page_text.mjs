// Dump page text for WARN pages to diagnose missing data
import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:5000';
const TIMEOUT = 30000;

const warnPages = [
  { path: '/sales/orders',        name: '销售订单' },
  { path: '/system/user',         name: '用户管理' },
  { path: '/system/role',         name: '角色管理' },
  { path: '/system/menu',         name: '菜单管理' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login first
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await page.waitForSelector('input[placeholder="请输入用户名"]', { timeout: TIMEOUT });
  await page.fill('input[placeholder="请输入用户名"]', 'admin');
  await page.fill('input[placeholder="请输入密码"]', 'admin123');
  await Promise.all([
    page.waitForURL('**/dashboard**', { timeout: TIMEOUT }),
    page.click('button[type="submit"]'),
  ]);

  for (const p of warnPages) {
    console.log(`\n=== ${p.name} (${p.path}) ===`);
    await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}

    const info = await page.evaluate(() => {
      const body = document.body.innerText;
      // Find table rows
      const rows = document.querySelectorAll('table tr, [class*="row"], [class*="Row"]');
      const tables = document.querySelectorAll('table');
      // Find empty states
      const empty = document.querySelectorAll('[class*="empty"], [class*="Empty"], [class*="no-data"], [class*="NoData"]');
      const emptyTexts = Array.from(empty).map(e => e.textContent?.trim()).filter(Boolean);
      return {
        bodyPreview: body.substring(0, 800),
        rowCount: rows.length,
        tableCount: tables.length,
        emptyTexts,
      };
    });
    console.log(`  表格数: ${info.tableCount}, 行数: ${info.rowCount}`);
    if (info.emptyTexts.length > 0) console.log(`  空状态: ${JSON.stringify(info.emptyTexts)}`);
    console.log(`  页面文本前800字: ${info.bodyPreview}`);
  }

  await browser.close();
}

main().catch(console.error);
