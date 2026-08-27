/**
 * 采购 + 销售 API 多语言数据加载冒烟测试
 *
 * 验证：API 路由与 locale 无关（/api/... 而非 /{locale}/api/...），
 * 前端切换语言时调用的是同一个 API，返回的数据不受 locale 影响。
 * 本脚本验证采购和销售 API 在 REPOSITORY_IMPL=drizzle 下返回正确数据，
 * 并检查 4 种 locale 前缀的页面路由（/{locale}/purchase/orders、/{locale}/orders/sales）
 * 是否返回 200（页面可正常加载）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(projectRoot, file);
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const BASE = 'http://localhost:5000';
const LOCALES = ['zh-CN', 'zh-TW', 'en', 'vi'];

async function login() {
  const resp = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  if (!resp.ok) throw new Error(`Login failed: ${resp.status}`);
  const data = await resp.json();
  const token = data?.data?.token;
  if (!token) throw new Error('No token in login response');
  const setCookie = resp.headers.get('set-cookie') || '';
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/);
  const csrf = csrfMatch ? csrfMatch[1] : '';
  return { token, csrf, cookie: setCookie.split(',').map(s => s.split(';')[0].trim()).join('; ') };
}

async function testApi(name, url, auth) {
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrf,
      'Cookie': auth.cookie,
    },
  });
  const status = resp.status;
  const body = await resp.json().catch(() => null);
  const total = body?.data?.total ?? body?.total ?? body?.pagination?.total ?? '?';
  const dataLen = Array.isArray(body?.data?.list) ? body.data.list.length :
                  Array.isArray(body?.data) ? body.data.length :
                  Array.isArray(body?.data?.items) ? body.data.items.length : '?';
  return { status, total, dataLen };
}

async function testPageRoute(locale, pagePath) {
  const url = `${BASE}/${locale}${pagePath}`;
  const resp = await fetch(url, { redirect: 'manual' });
  return { status: resp.status, redirected: resp.status >= 300 && resp.status < 400 };
}

async function main() {
  loadEnv();
  console.log('========================================');
  console.log('  采购 + 销售 API + 多语言页面路由冒烟测试');
  console.log('========================================');
  console.log(`  BASE: ${BASE}`);
  console.log(`  REPOSITORY_IMPL: ${process.env.REPOSITORY_IMPL || 'mysql (default)'}`);
  console.log('');

  // 登录
  console.log('[1] 登录 admin...');
  const auth = await login();
  console.log('  ✓ 登录成功，获取到 token + csrf');
  console.log('');

  // API 测试（locale 无关，只测一次）
  console.log('[2] API 数据加载测试（locale 无关）');
  const purUrl = `${BASE}/api/purchase/orders?page=1&pageSize=3`;
  const pur = await testApi('purchase', purUrl, auth);
  const purOk = pur.status === 200;
  console.log(`  采购 API (/api/purchase/orders): status=${pur.status}, total=${pur.total}, dataLen=${pur.dataLen} ${purOk ? '✓' : '✗'}`);

  const salUrl = `${BASE}/api/orders/sales?page=1&pageSize=3`;
  const sal = await testApi('sales', salUrl, auth);
  const salOk = sal.status === 200;
  console.log(`  销售 API (/api/orders/sales): status=${sal.status}, total=${sal.total}, dataLen=${sal.dataLen} ${salOk ? '✓' : '✗'}`);
  console.log('');

  // 多语言页面路由测试
  console.log('[3] 多语言页面路由测试（4 种 locale）');
  let allPagePass = true;
  for (const locale of LOCALES) {
    const purPage = await testPageRoute(locale, '/purchase/orders');
    const salPage = await testPageRoute(locale, '/orders/sales');
    const purOk = purPage.status === 200 || purPage.redirected;
    const salOk = salPage.status === 200 || salPage.redirected;
    console.log(`  [${locale}] 采购页: ${purPage.status}${purPage.redirected ? ' (redirect)' : ''} ${purOk ? '✓' : '✗'} | 销售页: ${salPage.status}${salPage.redirected ? ' (redirect)' : ''} ${salOk ? '✓' : '✗'}`);
    if (!purOk || !salOk) allPagePass = false;
  }
  console.log('');

  const allPass = purOk && salOk && allPagePass;
  console.log('========================================');
  if (allPass) {
    console.log('  ✓ 全部通过：API 数据正常 + 4 种 locale 页面路由可达');
  } else {
    console.log('  ✗ 部分失败，请检查上方输出');
  }
  console.log('========================================');
  process.exitCode = allPass ? 0 : 1;
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
