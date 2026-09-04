// P2 端到端验证：拆批 / QR / Pad 扫描
// 必须 --env-file 不需要（直连 DB 用脚本内配置）；但 API 调用需要 dev server 在 5000。
// 所有测试数据在 finally 彻底清理，避免污染真实库存。
const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');
const BASE = process.env.BASE_URL || 'http://localhost:5000';
const DB = { host: 'localhost', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };

async function getDb() { return mysql.createConnection(DB); }
async function login() {
  const res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
  const sc = res.headers.get('set-cookie') || '';
  // 取全部 cookie 的 name=value 对（CSRF 双提交要求 csrf_token cookie 与 x-csrf-token header 一致）
  const cookiePairs = sc.split(',').map((p) => p.split(';')[0].trim()).filter((p) => p.includes('='));
  const cookie = cookiePairs.join('; ');
  const csrf = (sc.match(/csrf_token=([^;]+)/) || [])[1] || '';
  const d = await res.json(); const token = d?.data?.token || '';
  return { csrf, token, cookie };
}
async function api(method, path, body, auth) {
  const res = await fetch(BASE + path, { method, headers: { Authorization: 'Bearer ' + auth.token, 'x-csrf-token': auth.csrf, Cookie: auth.cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  const db = await getDb();
  const auth = await login();
  if (!auth.token) { console.log('LOGIN FAIL'); process.exit(1); }
  const results = [];
  const assert = (name, cond, extra) => { results.push({ name, pass: !!cond }); console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' | ' + extra : '')); };
  const cleanup = { qrCodes: [], scanLogs: [], splitIds: [], batchNos: [], materials: [] };

  try {
    // ========== P2-1: QR 生成 + 扫码 + 离线重试幂等 (P0) ==========
    const gen = await api('POST', '/api/qrcode', { qr_type: 'trace', remark: 'VERIFY-P2' }, auth);
    assert('生成二维码 200', gen.status === 200, 'status=' + gen.status);
    const qrCode = gen.data?.data?.qr_code;
    const qrId = gen.data?.data?.id;
    assert('返回 qr_code', !!qrCode, qrCode);
    if (qrId) cleanup.qrCodes.push(qrId);

    const scan1 = await api('POST', '/api/trace/qr/scan', { qrCode, operator: 'VERIFY', location: 'test-loc' }, auth);
    assert('首次扫码 200', scan1.status === 200, 'status=' + scan1.status);
    let [sl] = await db.query('SELECT COUNT(*) c FROM qrcode_scan_log WHERE qr_code=?', [qrCode]);
    assert('扫码流水仅 1 条', sl[0].c === 1, 'count=' + sl[0].c);
    let [qc] = await db.query('SELECT scan_count FROM qrcode_record WHERE qr_code=?', [qrCode]);
    assert('scan_count=1', qc[0].scan_count === 1, 'scan_count=' + qc[0].scan_count);

    // 模拟 Pad 离线队列网络重试（同一 qr+operator+location 10s 内重复）
    const scan2 = await api('POST', '/api/trace/qr/scan', { qrCode, operator: 'VERIFY', location: 'test-loc' }, auth);
    assert('重试扫码仍 200', scan2.status === 200, 'status=' + scan2.status);
    [sl] = await db.query('SELECT COUNT(*) c FROM qrcode_scan_log WHERE qr_code=?', [qrCode]);
    assert('重试后流水仍仅 1 条 (P0 幂等生效)', sl[0].c === 1, 'count=' + sl[0].c);
    [qc] = await db.query('SELECT scan_count FROM qrcode_record WHERE qr_code=?', [qrCode]);
    assert('重试后 scan_count 仍为 1 (未虚增)', qc[0].scan_count === 1, 'scan_count=' + qc[0].scan_count);
    if (qrCode) cleanup.scanLogs.push(qrCode);

    // ========== P2-2: 拆批审核 → 子批追溯二维码 (P1) ==========
    // 找一个可分切物料（任意，合成母批设为非尺寸类 width=0 → 简单按量扣减）
    const [sm] = await db.query(`SELECT ib.material_id, ib.material_name, ib.warehouse_id, m.material_code
      FROM inv_inventory_batch ib JOIN inv_material m ON ib.material_id=m.id
      WHERE m.is_splittable=1 AND ib.status=1 AND ib.available_qty>0
      LIMIT 1`);
    const mat = sm[0];
    assert('找到可分切物料(非尺寸类)', !!mat, mat ? `mat=${mat.material_id} wh=${mat.warehouse_id}` : '');
    if (mat) {
      cleanup.materials.push({ material_id: mat.material_id, warehouse_id: mat.warehouse_id });
      // 建合成母批（width=0 → 非尺寸，简单扣减），避免污染真实批次
      const parentNo = 'TESTVERIFY-' + randomUUID().replace(/-/g, '').substring(0, 12);
      const [ins] = await db.query(
        `INSERT INTO inv_inventory_batch (batch_no, material_id, material_code, material_name, warehouse_id, quantity, available_qty, locked_qty, unit, unit_price, width, length, area, batch_type, status, inbound_date, produce_date, create_time)
         VALUES (?, ?, ?, ?, ?, 10, 10, 0, '米', 1, 0, 0, 0, 0, 1, CURDATE(), CURDATE(), NOW())`,
        [parentNo, mat.material_id, mat.material_code || '', mat.material_name, mat.warehouse_id]
      );
      const parentBatchId = ins.insertId;
      cleanup.batchNos.push(parentNo);

      const createR = await api('POST', '/api/warehouse/split-order',
        { parentBatchId, warehouseId: mat.warehouse_id, remark: 'VERIFY-P2', operatorId: 1, operatorName: 'VERIFY', details: [{ totalQty: 2, isWaste: false }] }, auth);
      assert('创建分切单 200', createR.status === 200, 'status=' + createR.status + ' ' + (createR.data?.message || ''));
      const splitId = createR.data?.data?.splitId;
      if (splitId) cleanup.splitIds.push(splitId);

      if (splitId) {
        const auditR = await api('PATCH', '/api/warehouse/split-order', { splitId, action: 'audit', operatorId: 1, operatorName: 'VERIFY' }, auth);
        assert('审核分切单 200', auditR.status === 200, 'status=' + auditR.status + ' ' + (auditR.data?.message || ''));

        const [cb] = await db.query('SELECT id, batch_no, parent_batch_id FROM inv_inventory_batch WHERE parent_batch_id=? AND deleted=0', [parentBatchId]);
        assert('生成子批(有 parent_batch_id)', cb.length > 0, 'childCount=' + cb.length);
        if (cb.length > 0) {
          const childNo = cb[0].batch_no;
          cleanup.batchNos.push(childNo);
          const [qr] = await db.query('SELECT id, qr_code, batch_no FROM qrcode_record WHERE batch_no=? AND deleted=0', [childNo]);
          assert('子批生成追溯二维码 (P1 生效)', qr.length > 0, qr[0] ? qr[0].qr_code : '');
          if (qr[0]) cleanup.qrCodes.push(qr[0].id);
          // 账实平衡：audit 内已 recompute，inv_inventory.quantity 应 == 非删批次 SUM(available_qty)
          const [inv] = await db.query('SELECT quantity FROM inv_inventory WHERE material_id=? AND warehouse_id=? AND deleted=0', [mat.material_id, mat.warehouse_id]);
          const [sumR] = await db.query('SELECT COALESCE(SUM(available_qty),0) s FROM inv_inventory_batch WHERE material_id=? AND warehouse_id=? AND deleted=0', [mat.material_id, mat.warehouse_id]);
          const invQty = inv[0] ? Number(inv[0].quantity) : 0;
          const sum = Number(sumR[0].s);
          assert('库存账实平衡 (recompute 后)', Math.abs(invQty - sum) < 0.001, `inv=${invQty} sum=${sum}`);
        }
      }
    }
  } catch (e) {
    console.log('EXCEPTION', e.message);
    results.push({ name: 'exception', pass: false });
  } finally {
    try {
      // 物理删除测试扫码流水（无 deleted 列）
      for (const q of cleanup.scanLogs) { await db.query('DELETE FROM qrcode_scan_log WHERE qr_code=?', [q]); }
      // 软删测试二维码
      for (const id of cleanup.qrCodes) { await db.query('UPDATE qrcode_record SET deleted=1 WHERE id=?', [id]); }
      // 软删测试分切单 + 明细
      for (const id of cleanup.splitIds) {
        await db.query('UPDATE split_order SET deleted=1 WHERE id=?', [id]);
        await db.query('UPDATE split_order_detail SET deleted=1 WHERE split_id=?', [id]);
        await db.query("DELETE FROM inv_inventory_transaction WHERE source_type='split_order' AND source_id=?", [id]);
        await db.query("DELETE FROM inv_inventory_log WHERE business_type='split_order' AND business_no=(SELECT split_no FROM split_order WHERE id=?)", [id]);
      }
      // 软删测试批次（合成母批 + 子批）
      for (const no of cleanup.batchNos) { await db.query('UPDATE inv_inventory_batch SET deleted=1 WHERE batch_no=?', [no]); }
      // 还原库存汇总（仅针对测试涉及的物料/仓库，从非删批次重算）
      for (const m of cleanup.materials) {
        await db.query(
          `UPDATE inv_inventory SET quantity = (SELECT COALESCE(SUM(available_qty),0) FROM inv_inventory_batch WHERE material_id=? AND warehouse_id=? AND deleted=0), update_time=NOW() WHERE material_id=? AND warehouse_id=? AND deleted=0`,
          [m.material_id, m.warehouse_id, m.material_id, m.warehouse_id]
        );
      }
    } catch (e) { console.log('CLEANUP ERR', e.message); }
    await db.end();
  }

  const passed = results.filter(r => r.pass).length;
  console.log(`\n===== P2 结果：${passed} 通过 / ${results.length - passed} 失败 =====`);
  process.exit(results.every(r => r.pass) ? 0 : 1);
})();
