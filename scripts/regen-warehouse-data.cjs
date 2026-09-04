/*
 * regen-warehouse-data.cjs
 * 安全范围：删除 /warehouse/* 事务数据，保留主数据，按 plm/orders/sample 1:1 关联重生。
 *
 * 删除（事务表，约30 张）：inbound / outbound / transfer / batch / transaction / log / sales_outbound /
 *   production_inbound / stock_adjust / stocktaking / cutting / trace / material_label / scan_log /
 *   fifo_override_log / split_order 等单据表，以及 inv_inventory（重派生）
 * 保留（主数据，被 30+ 表引用）：inv_material / inv_warehouse / inv_material_category / sys_warehouse_category
 * 保留（跨模块汇总，避免波及）：inv_material_inventory / inv_product_inventory / inv_auxiliary_inventory
 *        / inv_location / inv_unit_conversion / inv_material_std
 *
 * 重生 1:1 关联：
 *   - 11 张 sal_order  → 销售出库 inv_sales_outbound（从成品仓「种子批次」发货）
 *   - 10 张 sal_sample_order → 打样料入库 inv_inbound_order（原材料仓）
 *   - 10 张 plm_eco    → 生产入库 inv_production_inbound（成品仓，MAT00i 1:1:1 对齐）
 * 每单写入：inv_inventory_batch + inv_inventory_transaction(in/out) + inv_inventory_log(in/out)
 * 最后由批次重新派生 inv_inventory 汇总。
 *
 * 安全：先整表备份到 <t>_bak_wh20260828，可回滚。
 */
const fs = require('fs');
const mysql = require('mysql2/promise');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((a, l) => {
  const m = l.match(/^([A-Z_]+)=(.+)$/); if (m) a[m[1]] = m[2]; return a;
}, {});
const DAY = '2026-08-28';
const BAK = 'wh20260828';

// 要清空的事务表（子→父顺序，配合 FK 关闭无所谓）
const DEL = [
  'inv_inbound_item', 'inv_inbound_order', 'inv_inbound_label',
  'inv_outbound_item', 'inv_outbound_order', 'inv_outbound_batch_allocation',
  'inv_transfer_item', 'inv_transfer_order',
  'inv_inventory_batch', 'inv_inventory_transaction', 'inv_inventory_transaction_log', 'inv_inventory_log', 'inv_inventory',
  'inv_sales_outbound_item', 'inv_sales_outbound',
  'inv_production_inbound_item', 'inv_production_inbound',
  'inv_stock_adjust_item', 'inv_stock_adjust',
  'inv_stocktaking_item', 'inv_stocktaking',
  'inv_cutting_detail', 'inv_cutting_record',
  'inv_trace_detail', 'inv_trace_record',
  'inv_material_label', 'inv_scan_log', 'inv_fifo_override_log',
  'split_order_detail', 'split_order'
];

function r3(n) { return Math.round(Number(n) * 1000) / 1000; }
function r2(n) { return Math.round(Number(n) * 100) / 100; }

async function ins1(conn, table, cols, vals) {
  const ph = cols.map(() => '?').join(',');
  const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph})`;
  const [r] = await conn.execute(sql, vals);
  return r.insertId;
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: +env.DB_PORT, user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME, charset: 'utf8mb4'
  });
  const log = [];
  const note = (m) => { log.push(m); console.log(m); };
  try {
    // ---- 0) 备份 ----
    note('== 备份 ' + DEL.length + ' 张事务表到 _bak_' + BAK + ' ==');
    for (const t of DEL) {
      try {
        const bak = t + '_bak_' + BAK;
        await conn.execute('DROP TABLE IF EXISTS `' + bak + '`');
        await conn.execute('CREATE TABLE `' + bak + '` LIKE `' + t + '`');
        await conn.execute('INSERT INTO `' + bak + '` SELECT * FROM `' + t + '`');
        const [[n]] = await conn.execute('SELECT COUNT(*) c FROM `' + t + '`');
        note('  bak ' + t + ' -> ' + bak + ' (rows ' + n.c + ')');
      } catch (e) { note('  bak ' + t + ' SKIP: ' + e.code); }
    }

    // ---- 1) 清空（FK 关闭）----
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    note('== 清空事务表 ==');
    for (const t of DEL) {
      try { await conn.execute('DELETE FROM `' + t + '`'); }
      catch (e) { note('  clear ' + t + ' ERR ' + e.code); }
    }
    note('cleared.');

    // ---- 2) 字典 ----
    const [[rawWh]] = await conn.execute('SELECT id, warehouse_name FROM inv_warehouse WHERE warehouse_code=?', ['WH001']);
    const [[finWh]] = await conn.execute('SELECT id, warehouse_name FROM inv_warehouse WHERE warehouse_code=?', ['WH003']);
    const [mats] = await conn.execute('SELECT id, material_code, material_name, unit, purchase_price, sale_price, cost_price FROM inv_material WHERE deleted=0');
    const byId = Object.fromEntries(mats.map(m => [m.id, m]));
    const byCode = Object.fromEntries(mats.map(m => [m.material_code, m]));

    let seq = 0;
    const nextTxn = () => 'TXN' + String(++seq).padStart(8, '0');
    const cnt = { salesOutbound: 0, salesItem: 0, sampleInbound: 0, sampleItem: 0, plmInbound: 0, plmItem: 0, batch: 0, txn: 0, log: 0 };

    // ---- 3) sal_order -> 销售出库 ----
    note('== 3) sal_order -> 销售出库 ==');
    const [orders] = await conn.execute('SELECT id, order_no, customer_id FROM sal_order WHERE deleted=0 ORDER BY id');
    const [details] = await conn.execute(`SELECT d.order_id, d.material_id, m.material_code, m.material_name, d.quantity, d.unit, d.unit_price
      FROM sal_order_detail d LEFT JOIN inv_material m ON m.id=d.material_id WHERE d.deleted=0`);
    const detByOrder = {};
    for (const d of details) { (detByOrder[d.order_id] = detByOrder[d.order_id] || []).push(d); }
    for (const so of orders) {
      let ds = detByOrder[so.id];
      if (!ds || ds.length === 0) ds = [{ material_id: 1, material_code: 'MAT001', material_name: 'PET薄膜透明125μm', quantity: 1000, unit: '张', unit_price: 2.5 }];
      const outNo = 'OUT-' + so.order_no;
      const sobId = await ins1(conn, 'inv_sales_outbound',
        ['outbound_no', 'order_id', 'order_no', 'customer_id', 'warehouse_id', 'status', 'remark'],
        [outNo, so.id, so.order_no, so.customer_id, finWh.id, 1, '关联销售订单:' + so.order_no]);
      cnt.salesOutbound++;
      for (const d of ds) {
        const mat = byId[d.material_id] || byCode[d.material_code];
        const qty = r3(d.quantity);
        const price = r2(d.unit_price || mat.purchase_price || 1);
        const batchNo = 'SEED-' + (mat.material_code) + '-' + so.id;
        // 种子批次（成品仓），随后整批发货
        const batchId = await ins1(conn, 'inv_inventory_batch',
          ['batch_no', 'material_id', 'material_name', 'warehouse_id', 'warehouse_name', 'quantity', 'available_qty', 'unit', 'unit_price', 'inbound_date', 'status', 'version', 'material_code'],
          [batchNo, mat.id, mat.material_name, finWh.id, finWh.warehouse_name, qty, qty, mat.unit || '件', price, DAY, 1, 1, mat.material_code]);
        cnt.batch++;
        await ins1(conn, 'inv_inventory_transaction',
          ['trans_no', 'trans_type', 'source_type', 'source_id', 'material_id', 'material_code', 'batch_no', 'warehouse_id', 'quantity', 'unit_cost', 'total_cost', 'reference_no', 'remark', 'source_no'],
          [nextTxn(), 'in', 'seed', sobId, mat.id, mat.material_code, batchNo, finWh.id, qty, price, r2(qty * price), outNo, '种子库存', outNo]);
        cnt.txn++;
        await ins1(conn, 'inv_inventory_log',
          ['warehouse_id', 'material_id', 'change_type', 'change_qty', 'order_no', 'remark', 'batch_no', 'trans_type', 'quantity', 'unit', 'source_type', 'source_no', 'business_type', 'business_no'],
          [finWh.id, mat.id, 'in', qty, outNo, '种子库存', batchNo, 'in', qty, mat.unit || '件', 'seed', outNo, 'seed', outNo]);
        cnt.log++;
        // 销售出库明细（发货）
        await ins1(conn, 'inv_sales_outbound_item',
          ['outbound_id', 'material_id', 'material_code', 'material_name', 'quantity', 'unit', 'batch_no'],
          [sobId, mat.id, mat.material_code, mat.material_name, qty, mat.unit || '件', batchNo]);
        cnt.salesItem++;
        await ins1(conn, 'inv_inventory_transaction',
          ['trans_no', 'trans_type', 'source_type', 'source_id', 'material_id', 'material_code', 'batch_no', 'warehouse_id', 'quantity', 'unit_cost', 'total_cost', 'reference_no', 'remark', 'source_no'],
          [nextTxn(), 'out', 'sales_outbound', sobId, mat.id, mat.material_code, batchNo, finWh.id, qty, price, r2(qty * price), outNo, '销售出库', outNo]);
        cnt.txn++;
        await conn.execute('UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-? WHERE id=?', [qty, qty, batchId]);
        await ins1(conn, 'inv_inventory_log',
          ['warehouse_id', 'material_id', 'change_type', 'change_qty', 'order_no', 'remark', 'batch_no', 'trans_type', 'quantity', 'unit', 'source_type', 'source_no', 'business_type', 'business_no'],
          [finWh.id, mat.id, 'out', qty, outNo, '销售出库', batchNo, 'out', qty, mat.unit || '件', 'sales_outbound', outNo, 'sales', outNo]);
        cnt.log++;
      }
    }
    note('  销售出库 ' + cnt.salesOutbound + ' 单 / ' + cnt.salesItem + ' 明细');

    // ---- 4) sal_sample_order -> 打样料入库 ----
    note('== 4) sal_sample_order -> 打样料入库 ==');
    const [samples] = await conn.execute('SELECT id, order_no, customer_id, material_no, product_name, quantity, status FROM sal_sample_order WHERE deleted=0 ORDER BY id');
    for (const smp of samples) {
      const mat = byCode[smp.material_no];
      if (!mat) { note('  sample ' + smp.order_no + ' material_no ' + smp.material_no + ' 未找到 inv_material，跳过'); continue; }
      const qty = r3(smp.quantity);
      const price = r2(mat.purchase_price || 1);
      const inNo = 'SIN-' + smp.order_no;
      const ioId = await ins1(conn, 'inv_inbound_order',
        ['order_no', 'order_type', 'warehouse_id', 'warehouse_code', 'warehouse_name', 'total_quantity', 'status', 'qc_status', 'inbound_date', 'remark', 'source_type', 'source_order_id', 'currency'],
        [inNo, 'other', rawWh.id, 'WH001', rawWh.warehouse_name, qty, 'completed', 'pass', DAY, '关联打样单:' + smp.order_no, 'sample', smp.id, 'CNY']);
      cnt.sampleInbound++;
      const batchNo = 'SMP-' + mat.material_code + '-' + smp.id;
      await ins1(conn, 'inv_inbound_item',
        ['order_id', 'material_id', 'material_code', 'material_name', 'batch_no', 'quantity', 'unit', 'unit_price', 'total_price', 'warehouse_location', 'produce_date', 'deleted', 'base_unit_price', 'base_amount'],
        [ioId, mat.id, mat.material_code, mat.material_name, batchNo, qty, mat.unit || '件', price, r2(qty * price), 'A-01', DAY, 0, price, r2(qty * price)]);
      await ins1(conn, 'inv_inventory_batch',
        ['batch_no', 'material_id', 'material_name', 'warehouse_id', 'warehouse_name', 'quantity', 'available_qty', 'unit', 'unit_price', 'inbound_date', 'status', 'version', 'material_code'],
        [batchNo, mat.id, mat.material_name, rawWh.id, rawWh.warehouse_name, qty, qty, mat.unit || '件', price, DAY, 1, 1, mat.material_code]);
      cnt.batch++;
      await ins1(conn, 'inv_inventory_transaction',
        ['trans_no', 'trans_type', 'source_type', 'source_id', 'material_id', 'material_code', 'batch_no', 'warehouse_id', 'quantity', 'unit_cost', 'total_cost', 'reference_no', 'remark', 'source_no'],
        [nextTxn(), 'in', 'sample', ioId, mat.id, mat.material_code, batchNo, rawWh.id, qty, price, r2(qty * price), inNo, '打样料入库', inNo]);
      cnt.txn++;
      await ins1(conn, 'inv_inventory_log',
        ['warehouse_id', 'material_id', 'change_type', 'change_qty', 'order_no', 'remark', 'batch_no', 'trans_type', 'quantity', 'unit', 'source_type', 'source_no', 'business_type', 'business_no'],
        [rawWh.id, mat.id, 'in', qty, inNo, '打样料入库', batchNo, 'in', qty, mat.unit || '件', 'sample', inNo, 'sample', inNo]);
      cnt.log++;
    }
    note('  打样料入库 ' + cnt.sampleInbound + ' 单');

    // ---- 5) plm_eco -> 生产入库（MAT00i 1:1:1 对齐）----
    note('== 5) plm_eco -> 生产入库 ==');
    const [ecos] = await conn.execute('SELECT id, eco_no, eco_title, product_code FROM plm_eco ORDER BY id');
    for (const eco of ecos) {
      const i = eco.id - 6; // 7->1 .. 16->10
      const mat = byId[i];  // MAT00i
      if (!mat) { note('  eco ' + eco.eco_no + ' 对齐 material id ' + i + ' 不存在，跳过'); continue; }
      const qty = 1000;
      const price = r2(mat.cost_price || mat.purchase_price || 1);
      const inNo = 'PRD-' + eco.eco_no;
      const piId = await ins1(conn, 'inv_production_inbound',
        ['inbound_no', 'warehouse_id', 'inbound_date', 'qc_status', 'status', 'remark', 'create_by'],
        [inNo, finWh.id, DAY, 'pass', 1, '关联PLM:' + eco.eco_no + ' ' + eco.eco_title, 1]);
      cnt.plmInbound++;
      const batchNo = 'PLM-' + mat.material_code + '-' + eco.id;
      await ins1(conn, 'inv_production_inbound_item',
        ['inbound_id', 'material_id', 'material_code', 'material_name', 'quantity', 'unit', 'batch_no'],
        [piId, mat.id, mat.material_code, mat.material_name, qty, mat.unit || '件', batchNo]);
      cnt.plmItem++;
      await ins1(conn, 'inv_inventory_batch',
        ['batch_no', 'material_id', 'material_name', 'warehouse_id', 'warehouse_name', 'quantity', 'available_qty', 'unit', 'unit_price', 'inbound_date', 'status', 'version', 'material_code'],
        [batchNo, mat.id, mat.material_name, finWh.id, finWh.warehouse_name, qty, qty, mat.unit || '件', price, DAY, 1, 1, mat.material_code]);
      cnt.batch++;
      await ins1(conn, 'inv_inventory_transaction',
        ['trans_no', 'trans_type', 'source_type', 'source_id', 'material_id', 'material_code', 'batch_no', 'warehouse_id', 'quantity', 'unit_cost', 'total_cost', 'reference_no', 'remark', 'source_no'],
        [nextTxn(), 'in', 'prod_finish', piId, mat.id, mat.material_code, batchNo, finWh.id, qty, price, r2(qty * price), inNo, 'PLM产品生产入库', inNo]);
      cnt.txn++;
      await ins1(conn, 'inv_inventory_log',
        ['warehouse_id', 'material_id', 'change_type', 'change_qty', 'order_no', 'remark', 'batch_no', 'trans_type', 'quantity', 'unit', 'source_type', 'source_no', 'business_type', 'business_no'],
        [finWh.id, mat.id, 'in', qty, inNo, 'PLM产品生产入库', batchNo, 'in', qty, mat.unit || '件', 'prod_finish', inNo, 'plm', eco.eco_no]);
      cnt.log++;
    }
    note('  生产入库 ' + cnt.plmInbound + ' 单');

    // ---- 6) 由批次派生 inv_inventory ----
    note('== 6) 派生 inv_inventory ==');
    await conn.execute('DELETE FROM inv_inventory');
    const [ins] = await conn.execute(`
      INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_cost, total_cost, version, create_time, update_time, deleted)
      SELECT b.material_id, m.material_code, m.material_name, b.warehouse_id, w.warehouse_name,
             SUM(b.quantity), SUM(b.available_qty), SUM(b.locked_qty), MAX(b.unit), AVG(b.unit_price), AVG(b.unit_price)*SUM(b.quantity), 1, NOW(), NOW(), 0
      FROM inv_inventory_batch b
      JOIN inv_material m ON m.id=b.material_id
      JOIN inv_warehouse w ON w.id=b.warehouse_id
      WHERE b.deleted=0
      GROUP BY b.material_id, b.warehouse_id, m.material_code, m.material_name, w.warehouse_name`);
    note('  inv_inventory 派生 ' + ins.affectedRows + ' 行');

    await conn.execute('SET FOREIGN_KEY_CHECKS=1');

    // ---- 7) 校验 ----
    note('\n== 校验 ==');
    const [[mis]] = await conn.execute(`
      SELECT COUNT(*) c FROM (
        SELECT i.material_id, i.warehouse_id FROM inv_inventory i
        LEFT JOIN (SELECT material_id, warehouse_id, SUM(quantity) sq, SUM(available_qty) sa FROM inv_inventory_batch WHERE deleted=0 GROUP BY material_id, warehouse_id) b
          ON b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id
        WHERE i.deleted=0 AND (i.quantity<>b.sq OR i.available_qty<>b.sa OR b.material_id IS NULL)
      ) t`);
    const [[ib]] = await conn.execute('SELECT COUNT(*) c, COALESCE(SUM(quantity),0) q FROM inv_inventory_batch WHERE deleted=0');
    const [[inv]] = await conn.execute('SELECT COUNT(*) c, COALESCE(SUM(quantity),0) q FROM inv_inventory WHERE deleted=0');
    const [[txn]] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory_transaction');
    const [[lg]] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory_log');
    note('批次=' + ib.c + '(数量' + r3(ib.q) + ') | 汇总=' + inv.c + '(数量' + r3(inv.q) + ') | 台账=' + txn.c + ' | 日志=' + lg.c);
    note('汇总与批次不一致行数: ' + mis.c + (mis.c === 0 ? ' ✅ 一致' : ' ❌ 偏差'));

    const summary = { deleted: DEL.length, backupSuffix: BAK, regen: cnt, verify: { batch: ib.c, inv: inv.c, txn: txn.c, log: lg.c, mismatch: mis.c } };
    fs.writeFileSync('D:/dcprint/erp-project/_wh_regen_result.txt', JSON.stringify(summary, null, 2), 'utf8');
    note('\n🎉 仓库事务数据已按 plm/orders/sample 1:1 关联重生。回滚表后缀 _bak_' + BAK);
    note('汇总写入 _wh_regen_result.txt');
  } finally {
    await conn.end();
  }
}
main().catch(e => { console.error('❌ 失败:', e.message); if (e.sql) console.error('SQL:', e.sql); if (e.parameters) console.error('PARAMS:', JSON.stringify(e.parameters)); process.exit(1); });
