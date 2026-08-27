/**
 * 清理物料4/仓库1 的幽灵库存流水（非采购入库来源、且无对应真实批次的种子脏数据）
 *
 * 背景：
 *  - 物料4/仓库1 真实批次只有 RAW-01..10（110~200，合计 1550），全部来自 purchase_inbound。
 *  - 另有 16 条非采购入库流水（cutting 入775 / material_return 入3 / inbound_order 入3[测试残留] / outbound_order 出1 / prod_pick 出1），
 *    这些流水要么引用不存在的批次、要么引用 0 数量空批次、要么引用孤儿工单，均不对应真实库存。
 *  - cutting 造出的 SM-01..10 批次数量全为 0，是空壳，无外部引用。
 *
 * 删除后：流水账净值 = 1550 = 批次可用量 = inv_inventory 汇总，账实一致。
 *
 * 用法：
 *   node scripts/clean-ghost-inventory.cjs          # REPORT（只报告，不改库）
 *   node scripts/clean-ghost-inventory.cjs --apply  # 先备份到 _ghost_backup_* 再删除
 */
const mysql = require('mysql2/promise');

const APPLY = process.argv.includes('--apply');
const MAT = 4;
const WH = 1;
const DB = { host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };

(async () => {
  const conn = await mysql.createConnection(DB);
  try {
    // 1) 待删流水（非采购入库）
    const [tx] = await conn.execute(
      `SELECT id, trans_type, source_type, source_id, reference_no, quantity, batch_no, create_time
       FROM inv_inventory_transaction
       WHERE material_id = ? AND warehouse_id = ? AND source_type <> 'purchase_inbound'
       ORDER BY id`,
      [MAT, WH]
    );
    // 2) 待删空批次（cutting 造出的 0 数量 SM 批次）
    const [bat] = await conn.execute(
      `SELECT id, batch_no, quantity, available_qty FROM inv_inventory_batch
       WHERE material_id = ? AND warehouse_id = ? AND batch_no LIKE 'B2026-08-17-SM-%'
       ORDER BY batch_no`,
      [MAT, WH]
    );

    const netBefore = tx.reduce((s, r) => s + (r.trans_type === 'in' ? Number(r.quantity) : -Number(r.quantity)), 0);
    const [b] = await conn.execute(
      `SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(available_qty),0) a
       FROM inv_inventory_batch WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
      [MAT, WH]
    );
    const [inv] = await conn.execute(
      `SELECT quantity, available_qty FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
      [MAT, WH]
    );

    console.log('================ REPORT ================');
    console.log(`目标: material_id=${MAT} warehouse_id=${WH}`);
    console.log(`待删流水: ${tx.length} 条 (净值 ${netBefore > 0 ? '+' : ''}${netBefore.toFixed(3)})`);
    console.log(JSON.stringify(tx, null, 1));
    console.log(`待删空批次(SM): ${bat.length} 条`);
    console.log(bat.map((x) => `${x.batch_no}(qty=${x.quantity})`).join(', ') || '(none)');
    console.log('----------------------------------------');
    console.log(`删除前: 批次可用=${b[0].a}  inv_inventory=${inv[0] ? inv[0].available_qty : 0}`);
    const batchAfter = Number(b[0].a) - bat.reduce((s, x) => s + Number(x.available_qty), 0);
    console.log(`删除后(预期): 流水净值=${Number(b[0].a).toFixed(3)}  批次可用=${batchAfter.toFixed(3)}  => 账实一致`);
    console.log('========================================');

    if (!APPLY) {
      console.log('\n[REPORT ONLY] 未做任何修改。加 --apply 执行删除（会先备份）。');
      return;
    }

    // ---- APPLY：先备份 ----
    await conn.execute(`CREATE TABLE IF NOT EXISTS _ghost_backup_inv_inventory_transaction LIKE inv_inventory_transaction`);
    await conn.execute(
      `INSERT INTO _ghost_backup_inv_inventory_transaction
       SELECT * FROM inv_inventory_transaction WHERE material_id = ? AND warehouse_id = ? AND source_type <> 'purchase_inbound'`,
      [MAT, WH]
    );
    await conn.execute(`CREATE TABLE IF NOT EXISTS _ghost_backup_inv_inventory_batch LIKE inv_inventory_batch`);
    await conn.execute(
      `INSERT INTO _ghost_backup_inv_inventory_batch
       SELECT * FROM inv_inventory_batch WHERE material_id = ? AND warehouse_id = ? AND batch_no LIKE 'B2026-08-17-SM-%'`,
      [MAT, WH]
    );

    const [d1] = await conn.execute(
      `DELETE FROM inv_inventory_transaction WHERE material_id = ? AND warehouse_id = ? AND source_type <> 'purchase_inbound'`,
      [MAT, WH]
    );
    const [d2] = await conn.execute(
      `DELETE FROM inv_inventory_batch WHERE material_id = ? AND warehouse_id = ? AND batch_no LIKE 'B2026-08-17-SM-%'`,
      [MAT, WH]
    );

    // 重新核对
    const [led] = await conn.execute(
      `SELECT COALESCE(SUM(CASE WHEN trans_type IN ('in','inbound') THEN quantity ELSE 0 END),0)
              - COALESCE(SUM(CASE WHEN trans_type IN ('out','outbound') THEN quantity ELSE 0 END),0) net
       FROM inv_inventory_transaction WHERE material_id = ? AND warehouse_id = ?`,
      [MAT, WH]
    );
    const [b2] = await conn.execute(
      `SELECT COALESCE(SUM(available_qty),0) a FROM inv_inventory_batch WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
      [MAT, WH]
    );
    const [inv2] = await conn.execute(
      `SELECT available_qty FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
      [MAT, WH]
    );
    console.log(`\n[APPLIED] 删除流水 ${d1.affectedRows} 条, 空批次 ${d2.affectedRows} 条`);
    console.log(`备份表: _ghost_backup_inv_inventory_transaction / _ghost_backup_inv_inventory_batch`);
    console.log(`对账: 流水净值=${Number(led[0].net).toFixed(3)}  批次可用=${Number(b2[0].a).toFixed(3)}  inv_inventory=${inv2[0] ? Number(inv2[0].available_qty).toFixed(3) : '0'}`);
    const ok = Math.abs(Number(led[0].net) - Number(b2[0].a)) < 0.0001;
    console.log(ok ? '✅ 账实已一致' : '⚠️ 仍存在偏差，需人工核查');
  } finally {
    await conn.end();
  }
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
