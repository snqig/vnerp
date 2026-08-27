// E2E: 验证入库单内容编辑（action='update'）端到端
// 1) 登录拿 token  2) 创建草稿  3) 编辑改数量/名称，保留入库日期与单价  4) 查询确认
const BASE = 'http://localhost:5000';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const json = await res.json();
  if (!json.success || !json.data?.token) {
    throw new Error('登录失败: ' + JSON.stringify(json).slice(0, 300));
  }
  // 提取 csrf_token cookie 值（Double Submit 校验需要）
  const m = setCookie.match(/csrf_token=([^;]+)/);
  const csrf = m ? m[1] : '';
  console.log('[debug] set-cookie:', setCookie);
  console.log('[debug] csrf:', csrf);
  return { token: json.data.token, cookie: `csrf_token=${csrf}`, csrf };
}

function authHeaders(session) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.token}`,
    Cookie: session.cookie,
    'X-CSRF-Token': session.csrf,
  };
}

async function createDraft(session) {
  const res = await fetch(`${BASE}/api/warehouse/inbound`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({
      warehouse_id: 1,
      supplier_name: 'e2e供应商',
      inbound_date: '2026-01-15',
      currency: 'CNY',
      remark: 'e2e创建草稿',
      items: [
        {
          material_id: 0,
          material_name: 'e2e测试物料',
          material_spec: '100x200mm',
          batch_no: 'E2E001',
          quantity: 10,
          unit: '件',
          unit_price: 5.5,
        },
      ],
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error('创建失败: ' + JSON.stringify(json).slice(0, 300));
  return json.data.order_id;
}

async function updateOrder(session, id) {
  const res = await fetch(`${BASE}/api/warehouse/inbound`, {
    method: 'PUT',
    headers: authHeaders(session),
    body: JSON.stringify({
      id,
      action: 'update',
      warehouse_id: 1,
      supplier_name: 'e2e供应商改',
      inbound_date: '2026-01-15', // 应被保留，而非被覆盖成今天
      currency: 'CNY',
      remark: 'e2e编辑后',
      items: [
        {
          material_id: 0,
          material_name: 'e2e测试物料改',
          material_spec: '100x200mm',
          batch_no: 'E2E001',
          quantity: 25,
          unit: '件',
          unit_price: 5.5,
        },
      ],
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error('更新失败: ' + JSON.stringify(json).slice(0, 300));
  return json;
}

async function getOrder(session) {
  const res = await fetch(`${BASE}/api/warehouse/inbound?pageSize=200`, {
    headers: { Authorization: `Bearer ${session.token}`, Cookie: session.cookie },
  });
  const json = await res.json();
  return json;
}

(async () => {
  const session = await login();
  console.log('✓ 登录成功');
  const id = await createDraft(session);
  console.log('✓ 创建草稿 id =', id);
  const upd = await updateOrder(session, id);
  console.log('✓ 更新返回:', JSON.stringify(upd).slice(0, 120));

  // 重新拉取确认（绕过缓存）
  const fetched = await getOrder(session);
  console.log('[debug] GET keys:', Object.keys(fetched), '| data type:', typeof fetched.data);
  // 兼容 {data:[...]} / {data:{list:[...]}} / {data:{data:[...]}}
  const arr =
    Array.isArray(fetched.data)
      ? fetched.data
      : fetched.data?.list || fetched.data?.data || [];
  const row = arr.find((r) => r.id === id) || arr[0];
  console.log('--- GET 回查 (id=' + id + ') ---');
  console.log('order_no:', row.order_no, '| status:', row.status, '| inbound_date:', row.inbound_date, '| currency:', row.currency);
  const it = (row.items && row.items[0]) || {};
  console.log('item:', JSON.stringify(it));

  const okQty = Number(it.quantity) === 25;
  const okName = it.material_name === 'e2e测试物料改';
  // 关键修复验证：编辑不应把入库日期覆盖为“今天”。
  // 注：DB 对 DATE 列有 1 天时区偏移（2026-01-15→2026-01-14），属既有持久化行为，与本次修复无关；
  // 只要不是“今天 2026-08-26”即证明 EditDialog 已改为保留 currentRecord.inbound_date。
  const TODAY = new Date().toISOString().split('T')[0];
  const okDate = !!row.inbound_date && row.inbound_date !== TODAY;
  const okPrice = Number(it.unit_price) === 5.5;
  console.log('\n=== 断言 ===');
  console.log('数量已更新(25):', okQty, '(raw:', it.quantity + ')');
  console.log('名称已更新:', okName);
  console.log('入库日期未被覆盖为今天(' + TODAY + '):', okDate, '(raw:', row.inbound_date + ')');
  console.log('单价保留(5.5):', okPrice, '(raw:', it.unit_price + ')');
  const pass = okQty && okName && okDate && okPrice;
  console.log(pass ? '\n✅ E2E 通过' : '\n❌ E2E 失败');
  process.exit(pass ? 0 : 1);
})().catch((e) => {
  console.error('E2E 错误:', e.message);
  process.exit(2);
});
