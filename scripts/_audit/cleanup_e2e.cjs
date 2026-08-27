// 清理 e2e 产生的测试入库单（草稿，物料名含 'e2e'）
const BASE = 'http://localhost:5000';

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const json = await res.json();
  const m = setCookie.match(/csrf_token=([^;]+)/);
  return { token: json.data.token, cookie: `csrf_token=${m ? m[1] : ''}`, csrf: m ? m[1] : '' };
}

(async () => {
  const s = await login();
  const res = await fetch(`${BASE}/api/warehouse/inbound?pageSize=200`, {
    headers: { Authorization: `Bearer ${s.token}`, Cookie: s.cookie },
  });
  const json = await res.json();
  const arr = Array.isArray(json.data) ? json.data : json.data?.list || json.data?.data || [];
  const targets = arr.filter((r) =>
    (r.items || []).some((it) => (it.material_name || '').includes('e2e'))
  );
  console.log('待清理 e2e 入库单数量:', targets.length);
  for (const r of targets) {
    const del = await fetch(`${BASE}/api/warehouse/inbound?id=${r.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${s.token}`, Cookie: s.cookie, 'X-CSRF-Token': s.csrf },
    });
    const d = await del.json();
    console.log(`  删除 id=${r.id} (${r.order_no}):`, d.success ? 'OK' : d.message);
  }
  console.log('清理完成');
})().catch((e) => {
  console.error('清理错误:', e.message);
  process.exit(2);
});
