/**
 * seed-transfers.cjs
 * 在「全量 20 组 seed」之后，生成 10 张仓库调拨单(warehouse/transfer)，
 * 并与全局库存保持一致：
 *   - inv_transfer_order(type=2 仓库调拨, status=3 已入库)
 *   - inv_transfer_item(out_quantity=in_quantity=quantity)
 *   - 调出仓库批次扣减 + 调入仓库新建批次
 *   - inv_inventory_transaction / inv_inventory_log 镜像变动（列对齐真实库）
 *   - 最后从批次重新派生 inv_inventory 汇总，保证 汇总=批次SUM
 * 安全：先备份 inv_transfer_order / inv_transfer_item 到 _bak_20260817e。
 *
 * 说明：transfer 的 [id]/outbound、[id]/inbound、[id]/items 路由引用了不存在的表
 * (transfers/transfer_items/inv_transfer_order_item) 与错误的 inv_inventory_log 列，
 * 故此处用正确 SQL 直接落地「已执行」的调拨，使数据与全局库存一致（绕开坏路由）。
 */
const mysql = require('mysql2/promise');
const db = { host:'127.0.0.1', port:3306, user:'root', password:'Snqig521223', database:'vnerpdacahng', charset:'utf8mb4' };
const BAK = '20260817e';
const BASE = '20260817';
const rnd = (n) => Math.round(n * 1000) / 1000;

// [fromWhCode, toWhCode, materialCode, qty] —— 均用真实 MAT*** 物料，qty 远小于可用量
const PLAN = [
  ['WH001','WH002','MAT001',20],
  ['WH001','WH003','MAT002',10],
  ['WH002','WH004','MAT003',25],
  ['WH002','WH005','MAT004',15],
  ['WH003','WH001','MAT005',30],
  ['WH003','WH004','MAT006',12],
  ['WH004','WH003','MAT007',25],
  ['WH004','WH005','MAT008',15],
  ['WH005','WH001','MAT009',30],
  ['WH005','WH002','MAT010',20],
];

async function main(){
  const conn = await mysql.createConnection(db);
  try {
    const q = async (s,p=[]) => (await conn.execute(s,p))[0];

    // 0) 备份并清空现有 transfer（保留原数据可回滚）
    for (const t of ['inv_transfer_order','inv_transfer_item']){
      const bak = `${t}_bak_${BAK}`;
      await conn.execute(`DROP TABLE IF EXISTS \`${bak}\``);
      await conn.execute(`CREATE TABLE \`${bak}\` LIKE \`${t}\``);
      await conn.execute(`INSERT INTO \`${bak}\` SELECT * FROM \`${t}\``);
    }
    const [oldCnt] = await conn.execute('SELECT COUNT(*) c FROM inv_transfer_order');
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    await conn.execute('DELETE FROM inv_transfer_item');
    await conn.execute('DELETE FROM inv_transfer_order');
    await conn.execute('SET FOREIGN_KEY_CHECKS=1');
    console.log(`✓ 备份并清空 transfer（原 ${oldCnt[0].c} 张）`);

    // 字典
    const [whs] = await conn.execute('SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE deleted=0');
    const whByCode = Object.fromEntries(whs.map(w=>[w.warehouse_code, w]));
    const [mats] = await conn.execute('SELECT id, material_code, material_name, unit, purchase_price, cost_price FROM inv_material WHERE deleted=0');
    const matByCode = Object.fromEntries(mats.map(m=>[m.material_code, m]));

    let txnSeq = 0;
    const nextTxn = (p) => `TXN${p}${(++txnSeq).toString().padStart(4,'0')}`;
    const logs = [];
    let done = 0;

    for (let i=0; i<PLAN.length; i++){
      const [fromCode, toCode, matCode, qty] = PLAN[i];
      const fromWh = whByCode[fromCode], toWh = whByCode[toCode], m = matByCode[matCode];
      if (!fromWh || !toWh || !m){ console.log(`⚠ 跳过无效计划 ${fromCode}->${toCode} ${matCode}`); continue; }

      // 源批次（该仓库该物料应有且仅有一批）
      const [src] = await conn.execute(
        `SELECT id, batch_no, quantity, available_qty, unit_price
         FROM inv_inventory_batch WHERE material_id=? AND warehouse_id=? AND deleted=0
         ORDER BY id LIMIT 1`,
        [m.id, fromWh.id]);
      if (!src.length){ console.log(`⚠ ${fromCode} 无物料 ${matCode} 库存，跳过`); continue; }
      const sb = src[0];
      if (Number(sb.available_qty) < qty){ console.log(`⚠ ${matCode} 可用 ${sb.available_qty}<${qty}，跳过`); continue; }

      const transferNo = `TRF${BASE}-${(i+1).toString().padStart(2,'0')}`;
      const up = rnd(sb.unit_price || m.purchase_price || 10);
      const unit = m.unit || '件';

      // 1) 调出仓扣减
      await conn.execute(
        `UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-?, update_time=NOW()
         WHERE id=?`, [qty, qty, sb.id]);

      // 2) 调入仓新建批次
      const destBatch = `TRF-${transferNo}-${matCode}`;
      await conn.execute(
        `INSERT INTO inv_inventory_batch
         (batch_no, material_id, material_name, warehouse_id, warehouse_name,
          quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, version, create_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURDATE(), 1, 1, NOW(), 0)`,
        [destBatch, m.id, m.material_name, toWh.id, toWh.warehouse_name, qty, qty, unit, up]);

      // 3) 调拨单（已执行：status=3）
      const [toRes] = await conn.execute(
        `INSERT INTO inv_transfer_order
         (transfer_no, type, from_warehouse_id, to_warehouse_id, from_location, to_location,
          status, applicant_name, approver_name, operator_name, total_qty, total_amount,
          out_time, in_time, version, remark, create_time, update_time, deleted)
         VALUES (?, 2, ?, ?, 'A-01', 'B-01', 3, '演示申请人', '演示审批', '演示调拨员',
                 ?, ?, NOW(), NOW(), 1, '演示调拨', NOW(), NOW(), 0)`,
        [transferNo, fromWh.id, toWh.id, qty, rnd(qty*up)]);
      const transferId = toRes.insertId;

      // 4) 调拨明细
      await conn.execute(
        `INSERT INTO inv_transfer_item
         (transfer_id, material_id, material_code, material_name, quantity,
          out_quantity, in_quantity, unit, unit_price, amount, batch_no, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '演示调拨明细', NOW())`,
        [transferId, m.id, m.material_code, m.material_name, qty, qty, qty, unit, up, rnd(qty*up), sb.batch_no]);

      // 5) 台账（出/入）
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'out','transfer',?,1,?,?,?,?,?,?,?,?,?,NOW())`,
        [nextTxn('TO'), transferId, m.id, m.material_code, sb.batch_no, fromWh.id,
         qty, up, rnd(qty*up), transferNo, '调拨出库']);
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'in','transfer',?,1,?,?,?,?,?,?,?,?,?,NOW())`,
        [nextTxn('TI'), transferId, m.id, m.material_code, destBatch, toWh.id,
         qty, up, rnd(qty*up), transferNo, '调拨入库']);

      // 6) 库存日志（列对齐真实库：warehouse_id,material_id,change_type,change_qty,order_no,remark,create_time）
      await conn.execute(
        `INSERT INTO inv_inventory_log (warehouse_id, material_id, change_type, change_qty, order_no, remark, create_time)
         VALUES (?, ?, 'TRANSFER_OUT', ?, ?, '调拨出库', NOW())`,
        [fromWh.id, m.id, -qty, transferNo]);
      await conn.execute(
        `INSERT INTO inv_inventory_log (warehouse_id, material_id, change_type, change_qty, order_no, remark, create_time)
         VALUES (?, ?, 'TRANSFER_IN', ?, ?, '调拨入库', NOW())`,
        [toWh.id, m.id, qty, transferNo]);

      logs.push(transferNo);
      done++;
      console.log(`✓ ${transferNo}: ${fromCode}→${toCode} ${matCode} x${qty}`);
    }
    console.log(`\n生成调拨单 ${done} 张`);

    // 7) 重新派生 inv_inventory 汇总（保证 汇总=批次SUM，含调入仓新行）
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
    console.log(`✓ inv_inventory 重新派生 ${sumRes.affectedRows} 行`);

    // 8) 一致性校验
    const [mism] = await conn.execute(
      `SELECT COUNT(*) c FROM (
         SELECT i.material_id, i.warehouse_id FROM inv_inventory i
         LEFT JOIN (SELECT material_id, warehouse_id, SUM(quantity) sq, SUM(available_qty) sa
                    FROM inv_inventory_batch WHERE deleted=0 GROUP BY material_id, warehouse_id) b
           ON b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id
         WHERE i.deleted=0 AND (i.quantity<>b.sq OR i.available_qty<>b.sa OR b.material_id IS NULL)) t`);
    const [invC] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory WHERE deleted=0');
    const [batchC] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory_batch WHERE deleted=0');
    const [txnC] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory_transaction');
    const [toC] = await conn.execute('SELECT COUNT(*) c FROM inv_transfer_order WHERE deleted=0');
    const [tiC] = await conn.execute('SELECT COUNT(*) c FROM inv_transfer_item WHERE deleted=0');
    console.log('\n=== 校验 ===');
    console.log(`批次=${batchC[0].c} | 汇总=${invC[0].c} | 台账=${txnC[0].c} | 调拨单=${toC[0].c} | 调拨明细=${tiC[0].c}`);
    console.log(`汇总与批次不一致行数: ${mism[0].c} ${mism[0].c===0?'✅ 完全一致':'❌ 偏差'}`);
    console.log('\n🎉 调拨单已生成并与全局库存一致。回滚表后缀 _bak_'+BAK);
  } finally { await conn.end(); }
}
main().catch(e=>{console.error('❌ 失败:', e.message); if(e.sql)console.error('SQL:',e.sql); if(e.parameters)console.error('PARAMS:',JSON.stringify(e.parameters)); process.exit(1);});
