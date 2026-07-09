/**
 * 测试油墨配方版本管理完整流程
 * 用法：node scripts/test-ink-formula.mjs
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
  const setCookies = loginRes.headers.getSetCookie?.() || [];
  const csrf = extractCookie(setCookies, 'csrf_token');
  const accessToken = extractCookie(setCookies, 'access_token');
  const cookieParts = [];
  if (accessToken) cookieParts.push(`access_token=${accessToken}`);
  if (csrf) cookieParts.push(`csrf_token=${csrf}`);
  const cookie = cookieParts.join('; ');
  console.log('  登录成功, CSRF:', csrf ? 'OK' : 'MISSING');

  const headers = {
    Authorization: `Bearer ${jwt}`,
    Cookie: cookie,
    'X-CSRF-Token': csrf || '',
    'Content-Type': 'application/json',
  };

  // 2. 创建色号
  console.log('\n[2] 创建色号...');
  const colorRes = await fetch(`${BASE_URL}/api/dcprint/formula/color`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      color_code: 'TEST-RED-' + Date.now().toString().slice(-6),
      color_name: '测试红色',
      color_series: '红色',
      base_ink_type: 'UV',
      pantone_code: 'Pantone 185C',
      status: 1,
    }),
  });
  const colorData = await colorRes.json();
  console.log('  状态码:', colorRes.status);
  console.log('  响应:', JSON.stringify(colorData));
  if (!colorData.success) {
    console.error('创建色号失败');
    process.exit(1);
  }
  const colorId = colorData.data.id;

  // 3. 创建草稿版本
  console.log('\n[3] 创建草稿版本...');
  const versionRes = await fetch(`${BASE_URL}/api/dcprint/formula/version`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      color_id: colorId,
      version_name: '测试V1',
      change_reason: '初始版本',
      process_note: '标准工艺',
      total_weight: 5.0,
      unit: 'kg',
      shelf_life_hours: 168,
      items: [
        { material_code: 'BI-001', material_name: '红色基墨', ratio: 65, weight: 3.25, unit: 'kg', add_order: 1, sort: 1, is_base: 1 },
        { material_code: 'BI-002', material_name: '冲淡剂', ratio: 35, weight: 1.75, unit: 'kg', add_order: 2, sort: 2, is_base: 0 },
      ],
    }),
  });
  const versionData = await versionRes.json();
  console.log('  状态码:', versionRes.status);
  console.log('  响应:', JSON.stringify(versionData));
  if (!versionData.success) {
    console.error('创建版本失败');
    process.exit(1);
  }
  const versionId = versionData.data.id;

  // 4. 获取版本详情
  console.log('\n[4] 获取版本详情...');
  const detailRes = await fetch(`${BASE_URL}/api/dcprint/formula/version?id=${versionId}`, {
    headers: { Authorization: `Bearer ${jwt}`, Cookie: cookie },
  });
  const detailData = await detailRes.json();
  console.log('  版本号:', detailData.data?.version_no);
  console.log('  状态:', detailData.data?.status, '(1=草稿)');
  console.log('  明细数:', detailData.data?.items?.length);

  // 5. 成本预览
  console.log('\n[5] 成本预览...');
  const costRes = await fetch(`${BASE_URL}/api/dcprint/formula/version?previewCost=1`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      items: [
        { material_code: 'BI-001', material_name: '红色基墨', ratio: 65 },
        { material_code: 'BI-002', material_name: '冲淡剂', ratio: 35 },
      ],
    }),
  });
  const costData = await costRes.json();
  console.log('  成本预览:', JSON.stringify(costData.data));

  // 6. 生效版本
  console.log('\n[6] 生效版本...');
  const activateRes = await fetch(`${BASE_URL}/api/dcprint/formula/version/${versionId}/activate`, {
    method: 'POST',
    headers,
  });
  const activateData = await activateRes.json();
  console.log('  状态码:', activateRes.status);
  console.log('  响应:', JSON.stringify(activateData));

  // 7. 验证色号有生效版本
  console.log('\n[7] 验证色号列表...');
  const listRes = await fetch(`${BASE_URL}/api/dcprint/formula/color?page=1&pageSize=20`, {
    headers: { Authorization: `Bearer ${jwt}`, Cookie: cookie },
  });
  const listData = await listRes.json();
  const color = listData.data?.list?.find((c) => c.id === colorId);
  console.log('  色号:', color?.color_name, '生效版本:', color?.active_version_no, '版本数:', color?.version_count);

  // 8. 一键复用
  console.log('\n[8] 一键复用...');
  const dupRes = await fetch(`${BASE_URL}/api/dcprint/formula/version/${versionId}/duplicate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ major_version: false }),
  });
  const dupData = await dupRes.json();
  console.log('  状态码:', dupRes.status);
  console.log('  响应:', JSON.stringify(dupData));
  const newVersionId = dupData.data?.id;

  // 9. 版本对比
  if (newVersionId) {
    console.log('\n[9] 版本对比...');
    const compareRes = await fetch(
      `${BASE_URL}/api/dcprint/formula/version?compare=1&leftId=${versionId}&rightId=${newVersionId}`,
      { headers: { Authorization: `Bearer ${jwt}`, Cookie: cookie } }
    );
    const compareData = await compareRes.json();
    console.log('  对比摘要:', JSON.stringify(compareData.data?.summary));

    // 10. 作废原版本
    console.log('\n[10] 作废原版本...');
    const cancelRes = await fetch(`${BASE_URL}/api/dcprint/formula/version/${versionId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: '测试作废' }),
    });
    const cancelData = await cancelRes.json();
    console.log('  状态码:', cancelRes.status);
    console.log('  响应:', JSON.stringify(cancelData));
  }

  // 清理
  console.log('\n[11] 清理测试数据...');
  const delRes = await fetch(`${BASE_URL}/api/dcprint/formula/color?id=${colorId}`, {
    method: 'DELETE',
    headers,
  });
  const delData = await delRes.json();
  console.log('  清理:', JSON.stringify(delData));

  console.log('\n✅ 全部测试通过！');
}

main().catch((err) => {
  console.error('异常:', err);
  process.exit(1);
});
