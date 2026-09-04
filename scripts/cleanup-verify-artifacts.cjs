// 一次性清理 P2 验证脚本遗留的测试数据（精确按唯一标记定位，避免误删真实数据）
const mysql = require('mysql2/promise');
const DB = { host: 'localhost', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };
(async () => {
  const db = await mysql.createConnection(DB);
  const affected = new Set();
  try {
    // 1. 合成母批（唯一标记 TESTVERIFY-）
    const [parents] = await db.query("SELECT id, batch_no, material_id, warehouse_id FROM inv_inventory_batch WHERE batch_no LIKE 'TESTVERIFY-%' AND deleted=0");
    parents.forEach((p) => affected.add(`${p.material_id},${p.warehouse_id}`));
    console.log('synthetic parents:', parents.map((p) => p.batch_no));

    // 2. 子批（parent_batch_id 指向合成母批）
    const childNos = [];
    for (const p of parents) {
      const [ch] = await db.query('SELECT batch_no, material_id, warehouse_id FROM inv_inventory_batch WHERE parent_batch_id=? AND deleted=0', [p.id]);
      ch.forEach((c) => { childNos.push(c.batch_no); affected.add(`${c.material_id},${c.warehouse_id}`); });
    }
    console.log('child batches:', childNos);

    // 3. 测试分切单（remark=VERIFY-P2）
    const [sos] = await db.query("SELECT id, split_no, material_id, warehouse_id FROM split_order WHERE remark='VERIFY-P2' AND deleted=0");
    sos.forEach((s) => affected.add(`${s.material_id},${s.warehouse_id}`));
    console.log('split orders:', sos.map((s) => s.split_no));

    // 4. 软删批次（母批 + 子批）
    for (const p of parents) await db.query('UPDATE inv_inventory_batch SET deleted=1 WHERE id=?', [p.id]);
    for (const no of childNos) await db.query('UPDATE inv_inventory_batch SET deleted=1 WHERE batch_no=?', [no]);

    // 5. 软删分切单 + 明细 + 物理删测试流水（inv_inventory_transaction 无 deleted 列）
    for (const s of sos) {
      await db.query('UPDATE split_order SET deleted=1 WHERE id=?', [s.id]);
      await db.query('UPDATE split_order_detail SET deleted=1 WHERE split_id=?', [s.id]);
      await db.query("DELETE FROM inv_inventory_transaction WHERE source_type='split_order' AND source_id=?", [s.id]);
    }

    // 6. 软删子批对应的追溯二维码（按 batch_no 精确匹配，不误删真实分切单的码）
    for (const no of childNos) await db.query('UPDATE qrcode_record SET deleted=1 WHERE batch_no=? AND deleted=0', [no]);

    // 7. 还原库存汇总（从非删批次重算，剔除测试批次）
    for (const key of affected) {
      const [m, w] = key.split(',').map(Number);
      await db.query(
        `UPDATE inv_inventory SET quantity = (SELECT COALESCE(SUM(available_qty),0) FROM inv_inventory_batch WHERE material_id=? AND warehouse_id=? AND deleted=0), update_time=NOW() WHERE material_id=? AND warehouse_id=? AND deleted=0`,
        [m, w, m, w]
      );
      console.log('recomputed inv_inventory', key);
    }
    console.log('CLEANUP DONE');
  } catch (e) {
    console.log('CLEANUP ERR', e.message);
  } finally {
    await db.end();
  }
})();
