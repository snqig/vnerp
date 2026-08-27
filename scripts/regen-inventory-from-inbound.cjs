/**
 * regen-inventory-from-inbound.cjs
 * 删除 warehouse/inventory 数据并以「入库Receipts」为权威重新生成：
 *   - 采购入库 inv_inbound_order/inv_inbound_item  → 批次 INB-g-1 (source=purchase_inbound)
 *   - 生产入库 inv_production_inbound/inv_production_inbound_item → 批次 PRD-g (source=prod_finish)
 * 批次(权威) → inv_inventory(汇总派生) → inv_inventory_transaction(台账) + inv_inventory_log
 * 忽略出库/销售出库/盘点 的消耗，使库存 = 入库数量（与 inbound 页面匹配）。
 * 安全：先备份 4 张库存表到 _bak_inv_20260817b，可回滚。
 */
const mysql = require('mysql2/promise');
const db = { host:'127.0.0.1', port:3306, user:'root', password:'Snqig521223', database:'vnerpdacahng', charset:'utf8mb4' };
const BAK = '20260817c';
const rnd = (n) => Math.round(n * 1000) / 1000;

async function main(){
  const conn = await mysql.createConnection(db);
  try {
    const q = async (s,p=[]) => (await conn.execute(s,p))[0];

    // 0) 备份 4 张库存表
    const TABLES = ['inv_inventory_batch','inv_inventory','inv_inventory_transaction','inv_inventory_log'];
    console.log('-> 备份库存表 _bak_inv_' + BAK);
    for (const t of TABLES){
      const bak = t + '_bak_inv_' + BAK;
      await conn.execute('DROP TABLE IF EXISTS `' + bak + '`');
      await conn.execute('CREATE TABLE `' + bak + '` LIKE `' + t + '`');
      await conn.execute('INSERT INTO `' + bak + '` SELECT * FROM `' + t + '`');
    }
    console.log('✓ 备份完成');

    // 1) 清空 4 张库存表
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    for (const t of TABLES) await conn.execute('DELETE FROM `' + t + '`');
    await conn.execute('SET FOREIGN_KEY_CHECKS=1');
    console.log('✓ 库存 4 表已清空');

    // 2) 取仓库名 / 物料价 字典
    const [whs] = await conn.execute('SELECT id, warehouse_name FROM inv_warehouse WHERE deleted=0');
    const whName = Object.fromEntries(whs.map(w=>[w.id, w.warehouse_name]));
    const [mats] = await conn.execute('SELECT id, material_code, material_name, unit, purchase_price, sale_price, cost_price FROM inv_material WHERE deleted=0');
    const matMap = Object.fromEntries(mats.map(m=>[m.id, m]));

    let seq = 0;
    const nextTxn = (p) => 'TXN' + p + (++seq).toString().padStart(5,'0');
    const logs = [];

    // 3) 采购入库 → 批次
    const [pin] = await conn.execute(
      `SELECT ii.id, ii.order_id, ii.material_id, ii.material_name, ii.material_spec,
              ii.batch_no, ii.quantity, ii.unit, ii.unit_price, io.warehouse_id, io.warehouse_name, io.order_no
       FROM inv_inbound_item ii JOIN inv_inbound_order io ON io.id=ii.order_id
       WHERE ii.deleted=0 AND io.deleted=0 AND io.status='completed'`);
    for (const it of pin){
      const mid = it.material_id, wid = it.warehouse_id, bn = it.batch_no, qty = rnd(it.quantity);
      const m = matMap[mid] || {};
      const wname = it.warehouse_name || whName[wid] || '';
      const unit = it.unit || m.unit || '件';
      const up = rnd(it.unit_price || m.purchase_price || 10);
      await conn.execute(
        `INSERT INTO inv_inventory_batch
         (batch_no, material_id, material_name, warehouse_id, warehouse_name,
          quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, version, create_time, deleted)
         VALUES (?,?,?,?,?,?,?,0,?,?,CURDATE(),1,1,NOW(),0)`,
        [bn, mid, it.material_name||m.material_name||'', wid, wname, qty, qty, unit, up]);
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [nextTxn('IN'), 'in', 'purchase_inbound', it.order_id, 1, mid, m.material_code||'', bn, wid, qty, up, rnd(qty*up), it.order_no||'', '采购入库']);
      logs.push([wid, mid, 'in', qty, it.order_no||'']);
    }
    console.log('✓ 采购入库批次生成 ' + pin.length + ' 条');

    // 4) 生产入库 → 批次
    const [prd] = await conn.execute(
      `SELECT pi.id AS order_id, pi.warehouse_id, pi.inbound_no, pii.material_id, pii.material_code,
              pii.material_name, pii.quantity, pii.unit, pii.batch_no
       FROM inv_production_inbound_item pii JOIN inv_production_inbound pi ON pi.id=pii.inbound_id
       WHERE pi.deleted=0`);
    for (const it of prd){
      const mid = it.material_id, wid = it.warehouse_id, bn = it.batch_no, qty = rnd(it.quantity);
      const m = matMap[mid] || {};
      const wname = whName[wid] || '';
      const unit = it.unit || m.unit || '件';
      const up = rnd(m.cost_price || m.purchase_price || 20);
      await conn.execute(
        `INSERT INTO inv_inventory_batch
         (batch_no, material_id, material_name, warehouse_id, warehouse_name,
          quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, version, create_time, deleted)
         VALUES (?,?,?,?,?,?,?,0,?,?,CURDATE(),1,1,NOW(),0)`,
        [bn, mid, it.material_name||m.material_name||'', wid, wname, qty, qty, unit, up]);
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [nextTxn('PF'), 'in', 'prod_finish', it.order_id, 1, mid, it.material_code||m.material_code||'', bn, wid, qty, up, rnd(qty*up), it.inbound_no||'', '生产入库']);
      logs.push([wid, mid, 'in', qty, it.inbound_no||'']);
    }
    console.log('✓ 生产入库批次生成 ' + prd.length + ' 条');

    // 5) 日志
    for (const row of logs){
      const wid = row[0], mid = row[1], ctype = row[2], cqty = row[3], ono = row[4];
      await conn.execute(
        `INSERT INTO inv_inventory_log (warehouse_id, material_id, change_type, change_qty, order_no, remark, create_time)
         VALUES (?,?,?,?,?,'由入库重新生成',NOW())`,
        [wid, mid, ctype, cqty, ono]);
    }
    console.log('✓ inv_inventory_log 生成 ' + logs.length + ' 行');

    // 6) 派生 inv_inventory 汇总
    const [sumRes] = await conn.execute(
      `INSERT INTO inv_inventory
        (material_id, material_code, material_name, warehouse_id, warehouse_name,
         quantity, available_qty, locked_qty, unit, unit_cost, total_cost, version, create_time, update_time, deleted)
       SELECT b.material_id, m.material_code, m.material_name, b.warehouse_id, w.warehouse_name,
              SUM(b.quantity), SUM(b.available_qty), SUM(b.locked_qty),
              MAX(b.unit), AVG(b.unit_price), AVG(b.unit_price)*SUM(b.quantity),
              1, NOW(), NOW(), 0
       FROM inv_inventory_batch b
       JOIN inv_material m ON m.id=b.material_id
       JOIN inv_warehouse w ON w.id=b.warehouse_id
       WHERE b.deleted=0
       GROUP BY b.material_id, b.warehouse_id, m.material_code, m.material_name, w.warehouse_name
       ON DUPLICATE KEY UPDATE
         quantity=VALUES(quantity), available_qty=VALUES(available_qty),
         locked_qty=VALUES(locked_qty), update_time=NOW()`
    );
    console.log('✓ inv_inventory 汇总派生 ' + sumRes.affectedRows + ' 行');

    // 7) 校验
    const [mism] = await conn.execute(
      `SELECT COUNT(*) c FROM (
         SELECT i.material_id, i.warehouse_id FROM inv_inventory i
         LEFT JOIN (SELECT material_id, warehouse_id, SUM(quantity) sq, SUM(available_qty) sa
                    FROM inv_inventory_batch WHERE deleted=0 GROUP BY material_id, warehouse_id) b
           ON b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id
         WHERE i.deleted=0 AND (i.quantity<>b.sq OR i.available_qty<>b.sa OR b.material_id IS NULL)) t`);
    const [ib] = await conn.execute('SELECT COUNT(*) c, COALESCE(SUM(quantity),0) q FROM inv_inventory_batch WHERE deleted=0');
    const [inv] = await conn.execute('SELECT COUNT(*) c, COALESCE(SUM(quantity),0) q FROM inv_inventory WHERE deleted=0');
    const [txn] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory_transaction');
    const [inbQ] = await conn.execute(`SELECT COALESCE(SUM(ii.quantity),0) q FROM inv_inbound_item ii JOIN inv_inbound_order io ON io.id=ii.order_id WHERE ii.deleted=0 AND io.deleted=0 AND io.status='completed'`);
    const [prdQ] = await conn.execute(`SELECT COALESCE(SUM(pii.quantity),0) q FROM inv_production_inbound_item pii JOIN inv_production_inbound pi ON pi.id=pii.inbound_id WHERE pi.deleted=0`);
    console.log('\n=== 校验 ===');
    console.log('批次=' + ib[0].c + '(数量' + ib[0].q + ') | 汇总=' + inv[0].c + '(数量' + inv[0].q + ') | 台账=' + txn[0].c);
    console.log('入库数量合计=' + rnd(inbQ[0].q) + ' + 生产入库数量合计=' + rnd(prdQ[0].q) + ' = ' + rnd(inbQ[0].q+prdQ[0].q));
    console.log('汇总与批次不一致行数: ' + mism[0].c + (mism[0].c===0 ? ' ✅ 完全一致' : ' ❌ 偏差'));
    console.log('\n🎉 库存已按入库Receipts重新生成。回滚表后缀 _bak_inv_' + BAK);
  } finally { await conn.end(); }
}
main().catch(e=>{console.error('❌ 失败:', e.message); if(e.sql)console.error('SQL:',e.sql); if(e.parameters)console.error('PARAMS:',JSON.stringify(e.parameters)); process.exit(1);});
