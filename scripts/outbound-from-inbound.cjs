/**
 * outbound-from-inbound.cjs
 * --------------------------------------------------------------------------
 * 从 warehouse/inbound 取前 5 条入库单，各生成一张 warehouse/outbound 出库单：
 *   - 出库单 inv_outbound_order / inv_outbound_item 引用来源入库单
 *   - FIFO 双扣批次 inv_inventory_batch(quantity + available_qty)
 *   - 写 inv_inventory_transaction 台账（out / outbound）
 *   - 写 inv_inventory_log 操作日志
 *   - 重新派生 inv_inventory 汇总（批次 SUM），保持「批次为权威、汇总派生」
 *
 * 安全：仅新增数据，不删除任何记录；出库量取批次当前可用量（不会扣成负数）。
 * 幂等：再次运行会因批次已为 0 而跳过（shipQty<=0 不生成）。
 * --------------------------------------------------------------------------
 */
const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

const OUTBOUND_DATE = '2026-08-17';
const LIMIT = 5;

const r2 = (n) => Math.round(Number(n) * 1000) / 1000;

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    await conn.beginTransaction();

    // 取前 5 条入库单
    const [inbounds] = await conn.execute(
      `SELECT id, order_no, warehouse_id, warehouse_code, warehouse_name, supplier_name, inbound_date
       FROM inv_inbound_order ORDER BY id LIMIT ${LIMIT}`
    );
    console.log(`✓ 取到 ${inbounds.length} 条入库单`);

    let txnSeq = (await conn.execute('SELECT COUNT(*) c FROM inv_inventory_transaction'))[0][0].c;
    const nextTxn = () => `TXN-OUT-${(++txnSeq).toString().padStart(4, '0')}`;

    const recomputePairs = [];

    for (const ib of inbounds) {
      // 入库明细（1 条）
      const [items] = await conn.execute(
        `SELECT material_id, material_name, material_spec, batch_no, quantity, unit
         FROM inv_inbound_item WHERE order_id=? AND deleted=0 LIMIT 1`,
        [ib.id]
      );
      if (!items.length) { console.log(`⚠ ${ib.order_no} 无明细，跳过`); continue; }
      const it = items[0];

      // 物料编码 / 单价
      const [mats] = await conn.execute(
        `SELECT material_code, purchase_price, sale_price FROM inv_material WHERE id=?`,
        [it.material_id]
      );
      const mat = mats[0] || { material_code: '', purchase_price: 0, sale_price: 0 };

      // 批次当前余量
      const [batches] = await conn.execute(
        `SELECT quantity, available_qty FROM inv_inventory_batch
         WHERE batch_no=? AND material_id=? AND warehouse_id=? AND deleted=0`,
        [it.batch_no, it.material_id, ib.warehouse_id]
      );
      if (!batches.length) { console.log(`⚠ ${ib.order_no} 批次 ${it.batch_no} 不存在，跳过`); continue; }
      const shipQty = r2(batches[0].available_qty);
      if (shipQty <= 0) { console.log(`⚠ ${ib.order_no} 批次可用量为 0，跳过`); continue; }

      const unitPrice = r2(mat.purchase_price || 0);
      const amount = r2(shipQty * unitPrice);
      const outNo = `OUT-${ib.order_no}`;

      // 1) 出库单主表
      const [obRes] = await conn.execute(
        `INSERT INTO inv_outbound_order
         (order_no, order_date, outbound_type, warehouse_id, warehouse_code, warehouse_name,
          total_qty, total_amount, status, audit_status, operator_name, remark, create_time, deleted, version)
         VALUES (?, ?, 'transfer', ?, ?, ?, ?, ?, 'completed', 'approved', '演示出库员', ?, NOW(), 0, 0)`,
        [outNo, OUTBOUND_DATE, ib.warehouse_id, ib.warehouse_code, ib.warehouse_name,
         shipQty, amount, `由采购入库单 ${ib.order_no} 转出库`]
      );
      const outId = obRes.insertId;

      // 2) 出库明细（引用批次）
      await conn.execute(
        `INSERT INTO inv_outbound_item
         (order_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no, create_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [outId, it.material_id, it.material_name, it.material_spec || '标准规格',
         shipQty, it.unit || '件', unitPrice, amount, it.batch_no]
      );

      // 3) FIFO 双扣批次
      await conn.execute(
        `UPDATE inv_inventory_batch
         SET quantity=quantity-?, available_qty=available_qty-?, update_time=NOW()
         WHERE batch_no=? AND material_id=? AND warehouse_id=? AND deleted=0`,
        [shipQty, shipQty, it.batch_no, it.material_id, ib.warehouse_id]
      );

      // 4) 台账
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'out', 'outbound', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [nextTxn(), outId, it.material_id, mat.material_code, it.batch_no, ib.warehouse_id,
         shipQty, unitPrice, amount, outNo, `由采购入库单 ${ib.order_no} 转出库`]
      );

      // 5) 操作日志
      await conn.execute(
        `INSERT INTO inv_inventory_log (warehouse_id, material_id, change_type, change_qty, order_no, remark, create_time)
         VALUES (?, ?, 'out', ?, ?, '由入库转出库', NOW())`,
        [ib.warehouse_id, it.material_id, -shipQty, outNo]
      );

      recomputePairs.push([it.material_id, ib.warehouse_id]);
      console.log(`✓ ${ib.order_no} → 出库单 ${outNo}（物料 ${it.material_id} 出库 ${shipQty}）`);
    }

    // 6) 重新派生汇总（仅受影响 material/warehouse）
    for (const [mid, wid] of recomputePairs) {
      await conn.execute(
        `UPDATE inv_inventory i
         JOIN (
           SELECT material_id, warehouse_id,
                  SUM(quantity) sq, SUM(available_qty) sa, SUM(locked_qty) sl
           FROM inv_inventory_batch WHERE deleted=0 AND material_id=? AND warehouse_id=?
           GROUP BY material_id, warehouse_id
         ) b ON b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id
         SET i.quantity=b.sq, i.available_qty=b.sa, i.locked_qty=b.sl, i.update_time=NOW()
         WHERE i.material_id=? AND i.warehouse_id=? AND i.deleted=0`,
        [mid, wid, mid, wid]
      );
    }
    console.log(`✓ 已重新派生 ${recomputePairs.length} 个 (物料,仓库) 汇总`);

    await conn.commit();
    await conn.execute('SET FOREIGN_KEY_CHECKS=1');
    console.log('\n🎉 5 条入库单已出库并写入 warehouse/outbound。');

    // 7) 校验：汇总 vs 批次
    let mismatch = 0;
    for (const [mid, wid] of recomputePairs) {
      const [r] = await conn.execute(
        `SELECT i.quantity iq, i.available_qty ia, b.sq, b.sa
         FROM inv_inventory i
         JOIN (
           SELECT material_id, warehouse_id, SUM(quantity) sq, SUM(available_qty) sa
           FROM inv_inventory_batch WHERE deleted=0 AND material_id=? AND warehouse_id=?
           GROUP BY material_id, warehouse_id
         ) b ON b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id
         WHERE i.material_id=? AND i.warehouse_id=? AND i.deleted=0`,
        [mid, wid, mid, wid]
      );
      if (r.length && (Math.abs(r[0].iq - r[0].sq) > 1e-6 || Math.abs(r[0].ia - r[0].sa) > 1e-6)) {
        mismatch++; console.log('❌ 不一致', mid, wid, r[0]);
      }
    }
    console.log(mismatch === 0 ? '✅ 汇总与批次完全一致' : `❌ ${mismatch} 个不一致`);
  } catch (e) {
    await conn.rollback().catch(() => {});
    await conn.execute('SET FOREIGN_KEY_CHECKS=1').catch(() => {});
    console.error('❌ 失败:', e.message);
    if (e.sql) console.error('SQL:', e.sql);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error('❌ 失败:', e.message); process.exit(1); });
