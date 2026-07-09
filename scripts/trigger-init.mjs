/**
 * 触发应用初始化（启动 OutboxPoller），然后等待 pending 事件被处理。
 *
 * 用法：node scripts/trigger-init.mjs
 */
const BASE_URL = 'http://localhost:5000';

function extractCookie(setCookieHeaders, name) {
  if (!setCookieHeaders) return null;
  const lines = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const line of lines) {
    const match = line.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function main() {
  // 1. 登录
  console.log('[1] 登录...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('登录失败:', loginData);
    process.exit(1);
  }
  const jwt = loginData.data.token;
  const csrf = extractCookie(loginRes.headers.getSetCookie?.(), 'csrf_token');
  const accessToken = extractCookie(loginRes.headers.getSetCookie?.(), 'access_token');
  const cookieParts = [];
  if (accessToken) cookieParts.push(`access_token=${accessToken}`);
  if (csrf) cookieParts.push(`csrf_token=${csrf}`);
  const cookie = cookieParts.join('; ');
  console.log('  ✅ 登录成功');

  // 2. 调用 /api/system/init 触发初始化
  console.log('\n[2] 调用 /api/system/init 触发 OutboxPoller 启动...');
  const initRes = await fetch(`${BASE_URL}/api/system/init`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Cookie: cookie,
    },
  });
  const initData = await initRes.json();
  console.log('  状态码:', initRes.status);
  console.log('  响应:', JSON.stringify(initData, null, 2));

  if (initData.success && initData.initialized) {
    console.log('  ✅ 应用已初始化，OutboxPoller 应已启动');
    console.log('  inbound.approved handlers:', initData.eventHandlers?.['inbound.approved']);
  } else {
    console.log('  ❌ 初始化未成功');
  }

  // 3. 等待 OutboxPoller 轮询处理 pending 事件（poll interval = 5s）
  console.log('\n[3] 等待 12 秒供 OutboxPoller 轮询 + 处理 pending 事件...');
  await new Promise((r) => setTimeout(r, 12000));

  console.log('\n✅ 完成。请运行 verify-chain-results.mjs 验证数据。');
}

main().catch((err) => {
  console.error('异常:', err);
  process.exit(1);
});
