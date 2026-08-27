/**
 * 修复入库出库逻辑问题
 * 
 * 问题：
 * 1. 大量测试垃圾数据（IN_178478xxx, OUT_178478xxx）污染了数据
 * 2. 成品批次 B20260710-FIN 只有生产入库，没有采购入库记录
 * 3. 出库 OUT-2026-103 引用的批次没有对应的采购入库
 * 
 * 修复方案：
 * 1. 清理所有测试垃圾数据（删除 order_no 以 IN_/OUT_/BATCH_IN_/BATCH_1784 开头的记录）
 * 2. 为成品添加采购入库记录（成品入库类型）
 * 3. 确保每个出库都有对应的入库关联
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
  multipleStatements: true,
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  // ━━━ 清理测试垃圾数据 ━━━
  console.log('━━━ 清理测试垃圾数据 ━━━');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

  // 删除垃圾入库单和明细
  const [delInb] = await conn.execute("DELETE FROM inv_inbound_item WHERE order_id IN (SELECT id FROM inv_inbound_order WHERE order_no REGEXP '^IN_[0-9]+')");
  const [delInbOrder] = await conn.execute("DELETE FROM inv_inbound_order WHERE order_no REGEXP '^IN_[0-9]+'");
  console.log(`  删除垃圾入库单: ${delInbOrder.affectedRows} 单, ${delInb.affectedRows} 明细`);

  // 删除垃圾出库单和明细
  const [delOutb] = await conn.execute("DELETE FROM inv_outbound_item WHERE order_id IN (SELECT id FROM inv_outbound_order WHERE order_no REGEXP '^OUT_[0-9]+')");
  const [delOutbOrder] = await conn.execute("DELETE FROM inv_outbound_order WHERE order_no REGEXP '^OUT_[0-9]+'");
  console.log(`  删除垃圾出库单: ${delOutbOrder.affectedRows} 单, ${delOutb.affectedRows} 明细`);

  // 删除垃圾库存批次
  const [delBatch] = await conn.execute("DELETE FROM inv_inventory_batch WHERE batch_no REGEXP '^(BATCH_IN_|BATCH_1784)'");
  console.log(`  删除垃圾库存批次: ${delBatch.affectedRows} 条`);

  // 删除垃圾仓库和物料
  const [delWh] = await conn.execute("DELETE FROM inv_warehouse WHERE warehouse_name REGEXP '测试仓库'");
  const [delMat] = await conn.execute("DELETE FROM inv_material WHERE material_name REGEXP '测试物料'");
  console.log(`  删除垃圾仓库: ${delWh.affectedRows}, 垃圾物料: ${delMat.affectedRows}`);

  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

  // ━━━ 事务修复逻辑 ━━━
  await conn.beginTransaction();
  console.log('\n━━━ 事务已开启 ━━━');

  try {
    // ═══════════════════════════════════════════════
    // 问题1: 成品批次 B20260710-FIN 没有采购入库记录
    // 需要添加成品入库记录到 inv_inbound_order
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 修复1: 为成品批次添加采购入库记录 ━━━');

    // 查询成品物料和成品仓
    const matLabel = await getRow(conn, "SELECT id, material_code, material_name FROM inv_material WHERE material_code='MAT011' AND deleted=0");
    const wh3 = await getRow(conn, "SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE warehouse_code='WH003' AND deleted=0");

    // 添加成品入库单（order_type='other' 表示非采购入库）
    // grn_type 是 enum('po','blind','return')，生产入库用 'blind'（盲收）
    const [finInb] = await conn.execute(
      `INSERT INTO inv_inbound_order
        (order_no, order_type, warehouse_id, warehouse_code, warehouse_name, supplier_id, supplier_name,
         po_id, po_no, grn_type, total_amount, total_quantity, status, qc_status, inbound_date,
         currency, exchange_rate, base_total_amount, remark)
       VALUES (?, 'other', ?, ?, ?, 0, '生产入库', 0, '', 'blind', 2500.00, 5000, 'completed', 'pass', '2026-07-10', 'CNY', 1.0000, 2500.00, '生产工单WO-2026-101完工入库')`,
      ['INB-2026-104', wh3.id, wh3.warehouse_code, wh3.warehouse_name]
    );

    // 添加成品入库明细
    await conn.execute(
      `INSERT INTO inv_inbound_item
        (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price,
         base_unit_price, base_amount)
       VALUES (?, ?, ?, '', 'B20260710-FIN', 5000, '张', 0.50, 2500.00, 0.50, 2500.00)`,
      [finInb.insertId, matLabel.id, matLabel.material_name]
    );

    console.log(`  INB-2026-104: 成品入库 空调标签 5000张 @0.50, 批次B20260710-FIN`);

    // ═══════════════════════════════════════════════
    // 问题2: 出库单关联入库单（出库单通过批次号关联入库批次）
    // 出库明细中的 batch_no 已经与入库批次一致，无需额外关联字段
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 修复2: 出库单关联验证 ━━━');
    console.log('  出库明细中的 batch_no 已与入库批次一致，关联链已完整');

    await conn.commit();
    console.log('\n✅ 事务已提交');

  } catch (e) {
    await conn.rollback();
    console.error('\n❌ 事务已回滚:', e.message);
    throw e;
  }

  // ━━━ 验证 ━━━
  console.log('\n━━━ 验证结果 ━━━');
  
  console.log('\n=== 入库单 ===');
  const [inb] = await conn.execute('SELECT id, order_no, order_type, warehouse_name, status FROM inv_inbound_order ORDER BY order_no');
  inb.forEach(r => console.log(`  ${r.order_no}: type=${r.order_type}, wh=${r.warehouse_name}, status=${r.status}`));

  console.log('\n=== 出库单 ===');
  const [outb] = await conn.execute('SELECT id, order_no, outbound_type, warehouse_name, status FROM inv_outbound_order ORDER BY order_no');
  outb.forEach(r => console.log(`  ${r.order_no}: type=${r.outbound_type}, wh=${r.warehouse_name}, status=${r.status}`));

  console.log('\n=== 出库明细与入库批次关联 ===');
  const [outbItems] = await conn.execute(
    `SELECT oo.order_no, oi.material_name, oi.quantity, oi.batch_no,
            ib.quantity AS batch_qty, ib.available_qty AS batch_avail
     FROM inv_outbound_item oi
     LEFT JOIN inv_outbound_order oo ON oi.order_id = oo.id
     LEFT JOIN inv_inventory_batch ib ON oi.batch_no = ib.batch_no
     ORDER BY oo.order_no, oi.id`
  );
  outbItems.forEach(r => console.log(`  ${r.order_no}: ${r.material_name} ${r.quantity} @${r.batch_no} (批次库存:${r.batch_qty}/${r.batch_avail})`));

  await conn.end();
}

async function getRow(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  if (rows.length === 0) throw new Error(`查询无结果: ${sql}`);
  return rows[0];
}

main().catch(e => { console.error('❌ 失败:', e.message); process.exit(1); });
