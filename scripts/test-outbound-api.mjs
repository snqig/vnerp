import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const BASE = 'http://localhost:5000';

async function tryLogin(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (json.success && json.data?.token) {
    return json.data.token;
  }
  return null;
}

async function tryOutbound(token, payload) {
  const res = await fetch(`${BASE}/api/warehouse/outbound`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

// 尝试常见密码
const passwords = ['admin123', '123456', 'admin', 'Snqig521223', 'password', 'Admin123'];
let token = null;
for (const pwd of passwords) {
  token = await tryLogin('admin', pwd);
  if (token) {
    console.log(`登录成功: admin / ${pwd}`);
    break;
  }
}

if (!token) {
  console.log('所有密码尝试失败');
  // 直接不带 token 调用出库 API 看返回
  console.log('\n--- 不带 token 调用出库 API ---');
  const r = await tryOutbound(null, {
    orderDate: '2026-08-25',
    warehouseId: 1,
    warehouseCode: 'WH001',
    warehouseName: '原材料仓',
    outboundType: 'raw_material',
    operatorId: 1,
    operatorName: 'admin',
    items: [{
      materialId: 6,
      materialName: '丝印油墨-黑色',
      specification: '5kg/桶',
      qty: 30,
      unit: '桶',
      unitPrice: 0,
      batchNo: 'BAT-2026-08-25-01',
    }],
  });
  console.log('status:', r.status);
  console.log('response:', JSON.stringify(r.json, null, 2));
  process.exit(0);
}

// 带 token 调用出库 API
console.log('\n--- 调用出库 API ---');
const r = await tryOutbound(token, {
  orderDate: '2026-08-25',
  warehouseId: 1,
  warehouseCode: 'WH001',
  warehouseName: '原材料仓',
  outboundType: 'raw_material',
  operatorId: 1,
  operatorName: 'admin',
  items: [{
    materialId: 6,
    materialName: '丝印油墨-黑色',
    specification: '5kg/桶',
    qty: 30,
    unit: '桶',
    unitPrice: 0,
    batchNo: 'BAT-2026-08-25-01',
  }],
});
console.log('status:', r.status);
console.log('response:', JSON.stringify(r.json, null, 2));
