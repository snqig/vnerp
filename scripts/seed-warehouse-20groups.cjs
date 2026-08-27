/**
 * seed-warehouse-20groups.cjs
 * --------------------------------------------------------------------------
 * 仓库 6 大模块测试数据重新生成（20 组「完整业务链」）。
 *
 * 设计原则（与项目「批次为权威、汇总派生」一致）：
 *   入库 → 生成 inv_inventory_batch 批次
 *   出库 / 销售出库 / 盘点 → 按批次号消耗或调整批次
 *   inv_inventory 汇总 = 批次 SUM（脚本内 SQL 派生）
 *   inv_inventory_transaction 台账 = 镜像每一笔变动
 *
 * 每组的逻辑链路（同一仓库 W[g]、原材料 R[g]、成品 F[g]）：
 *   purchase_inbound(R)  → 批次 INB-g-1
 *   production_inbound(F)→ 批次 PRD-g
 *   outbound(R)          → 消耗 INB-g-1（领料）
 *   sales_outbound(F)    → 消耗 PRD-g（发货）
 *   stock_adjust(R)      → 调整 INB-g-1（盘盈/盘亏）
 *
 * 安全：先建 <表>_bak_20260817 备份表（CREATE LIKE + INSERT SELECT），再删除。
 * 删除用 SET FOREIGN_KEY_CHECKS=0（14 张表构成封闭组件，无跨模块反向 FK）。
 * --------------------------------------------------------------------------
 */
const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

const BAK_TS = '20260817';
const GROUPS = 20;
const BASE_DATE = '2026-08-10';

// 6 模块对应的 14 张表（删除顺序无关，因 FK 校验关闭）
const TABLES = [
  'inv_inbound_order','inv_inbound_item',
  'inv_outbound_order','inv_outbound_item',
  'inv_inventory','inv_inventory_batch','inv_inventory_transaction','inv_inventory_log',
  'inv_stock_adjust','inv_stock_adjust_item',
  'inv_production_inbound','inv_production_inbound_item',
  'inv_sales_outbound','inv_sales_outbound_item',
];

const rnd = (n) => Math.round(n * 1000) / 1000;

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    // 1) 取候选物料 / 仓库（复用真实 lookup 数据）
    const [materials] = await conn.execute(
      `SELECT id, material_code, material_name, unit, purchase_price, sale_price, cost_price
       FROM inv_material WHERE status=1 AND deleted=0 ORDER BY id LIMIT 400`
    );
    // 仓库仅取未软删的（status 均为 1，但多数被软删）；多组轮询复用同一批仓库，
    // 因每组物料各不相同，(material_id, warehouse_id) 唯一键不会冲突。
    const [warehouses] = await conn.execute(
      `SELECT id, warehouse_code, warehouse_name FROM inv_warehouse
       WHERE deleted=0 ORDER BY id LIMIT 80`
    );
    if (materials.length < GROUPS * 2 || warehouses.length < 1) {
      throw new Error(`候选数据不足：物料${materials.length} 仓库${warehouses.length}，需物料≥${GROUPS*2} 仓库≥1`);
    }
    // 每组：原材料 + 成品 + 仓库（仓库轮询复用）
    const mats = materials.slice(0, GROUPS * 2);
    const whs = warehouses.slice(0, Math.max(1, warehouses.length));
    const rawOf = (g) => mats[g * 2];
    const finOf = (g) => mats[g * 2 + 1];
    const whOf = (g) => whs[g % whs.length];

    console.log(`✓ 候选就绪：物料 ${mats.length} 个，仓库 ${whs.length} 个`);

    // 2) 备份（可回滚）
    console.log('→ 创建备份表 _bak_' + BAK_TS + ' ...');
    for (const t of TABLES) {
      const bak = `${t}_bak_${BAK_TS}`;
      await conn.execute(`DROP TABLE IF EXISTS \`${bak}\``);
      await conn.execute(`CREATE TABLE \`${bak}\` LIKE \`${t}\``);
      await conn.execute(`INSERT INTO \`${bak}\` SELECT * FROM \`${t}\``);
    }
    console.log('✓ 备份完成');

    // 3) 整片删除（关闭 FK 校验）
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    for (const t of TABLES) {
      await conn.execute(`DELETE FROM \`${t}\``);
    }
    await conn.execute('SET FOREIGN_KEY_CHECKS=1');
    console.log('✓ 14 张表已清空');

    // 4) 生成 20 组
    let txnSeq = 0;
    const nextTxn = (p) => `TXN${p}${(++txnSeq).toString().padStart(4, '0')}`;
    const logs = [];

    for (let g = 0; g < GROUPS; g++) {
      const R = rawOf(g), F = finOf(g), W = whOf(g);
      const g1 = g + 1;
      const qtyIn = rnd(100 + g * 10);      // 采购入库量
      const qtyOut = rnd(40 + g * 2);        // 领料出库量 (< qtyIn)
      const qtyProd = rnd(50 + g * 5);       // 生产入库量
      const qtySale = rnd(20 + g);           // 销售出库量 (< qtyProd)
      const isLoss = g % 3 === 0;            // 盘点：盘亏/盘盈
      const adjQty = isLoss ? -3 : 5;

      // --- 4.1 采购入库 ---
      const inboundNo = `PIB${BASE_DATE.replace(/-/g, '')}-${g1}`;
      const [ibRes] = await conn.execute(
        `INSERT INTO inv_inbound_order
         (order_no, order_type, warehouse_id, warehouse_code, warehouse_name,
          supplier_name, total_quantity, total_amount, status, qc_status, inbound_date,
          currency, exchange_rate, base_total_amount, grn_type, create_time, deleted)
         VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?, 'completed', 'pass', ?, 'CNY', 1, ?, 'po', NOW(), 0)`,
        [inboundNo, W.id, W.warehouse_code, W.warehouse_name, '演示供应商',
         qtyIn, rnd(qtyIn * (R.purchase_price || 10)), BASE_DATE, rnd(qtyIn * (R.purchase_price || 10))]
      );
      const inboundId = ibRes.insertId;
      const inBatch = `INB-${g1}-1`;
      await conn.execute(
        `INSERT INTO inv_inbound_item
         (order_id, material_id, material_name, material_spec, batch_no, quantity, unit,
          unit_price, total_price, base_unit_price, base_amount, create_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [inboundId, R.id, R.material_name, '标准规格', inBatch, qtyIn, R.unit || '件',
         R.purchase_price || 10, rnd(qtyIn * (R.purchase_price || 10)),
         R.purchase_price || 10, rnd(qtyIn * (R.purchase_price || 10))]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_batch
         (batch_no, material_id, material_name, warehouse_id, warehouse_name,
          quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, version, create_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, 1, NOW(), 0)`,
        [inBatch, R.id, R.material_name, W.id, W.warehouse_name, qtyIn, qtyIn, R.unit || '件', R.purchase_price || 10, BASE_DATE]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'in', 'purchase_inbound', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [nextTxn('IN'), inboundId, R.id, R.material_code, inBatch, W.id,
         qtyIn, R.purchase_price || 10, rnd(qtyIn * (R.purchase_price || 10)), inboundNo, '采购入库']
      );
      logs.push([W.id, R.id, 'in', qtyIn, inboundNo]);

      // --- 4.2 生产入库（成品）---
      const prodNo = `PRD${BASE_DATE.replace(/-/g, '')}-${g1}`;
      const [piRes] = await conn.execute(
        `INSERT INTO inv_production_inbound
         (inbound_no, warehouse_id, inbound_date, qc_status, status, remark, create_time, deleted)
         VALUES (?, ?, ?, 'pass', 3, '演示生产入库', NOW(), 0)`,
        [prodNo, W.id, BASE_DATE]
      );
      const prodId = piRes.insertId;
      const prodBatch = `PRD-${g1}`;
      await conn.execute(
        `INSERT INTO inv_production_inbound_item
         (inbound_id, material_id, material_code, material_name, quantity, unit, batch_no, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [prodId, F.id, F.material_code, F.material_name, qtyProd, F.unit || '件', prodBatch]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_batch
         (batch_no, material_id, material_name, warehouse_id, warehouse_name,
          quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, version, create_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, 1, NOW(), 0)`,
        [prodBatch, F.id, F.material_name, W.id, W.warehouse_name, qtyProd, qtyProd, F.unit || '件', F.cost_price || 20, BASE_DATE]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'in', 'prod_finish', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [nextTxn('PF'), prodId, F.id, F.material_code, prodBatch, W.id,
         qtyProd, F.cost_price || 20, rnd(qtyProd * (F.cost_price || 20)), prodNo, '生产入库']
      );
      logs.push([W.id, F.id, 'in', qtyProd, prodNo]);

      // --- 4.3 领料出库（消耗原材料批次 INB-g-1）---
      const outNo = `POUT${BASE_DATE.replace(/-/g, '')}-${g1}`;
      const [obRes] = await conn.execute(
        `INSERT INTO inv_outbound_order
         (order_no, order_date, outbound_type, warehouse_id, warehouse_code, warehouse_name,
          total_qty, total_amount, status, audit_status, operator_name, create_time, deleted, version)
         VALUES (?, ?, 'production', ?, ?, ?, ?, ?, 'completed', 'approved', '演示领料员', NOW(), 0, 0)`,
        [outNo, BASE_DATE, W.id, W.warehouse_code, W.warehouse_name, qtyOut, rnd(qtyOut * (R.purchase_price || 10))]
      );
      const outId = obRes.insertId;
      await conn.execute(
        `INSERT INTO inv_outbound_item
         (order_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no, create_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [outId, R.id, R.material_name, '标准规格', qtyOut, R.unit || '件', R.purchase_price || 10, rnd(qtyOut * (R.purchase_price || 10)), inBatch]
      );
      await conn.execute(
        `UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-?, update_time=NOW()
         WHERE batch_no=? AND material_id=? AND warehouse_id=? AND deleted=0`,
        [qtyOut, qtyOut, inBatch, R.id, W.id]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'out', 'outbound', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [nextTxn('OB'), outId, R.id, R.material_code, inBatch, W.id,
         qtyOut, R.purchase_price || 10, rnd(qtyOut * (R.purchase_price || 10)), outNo, '领料出库']
      );
      logs.push([W.id, R.id, 'out', -qtyOut, outNo]);

      // --- 4.4 销售出库（消耗成品批次 PRD-g）---
      const soNo = `SOUT${BASE_DATE.replace(/-/g, '')}-${g1}`;
      const [soRes] = await conn.execute(
        `INSERT INTO inv_sales_outbound
         (outbound_no, customer_name, warehouse_id, outbound_date, delivery_person, status, finance_posted, remark, create_time, deleted)
         VALUES (?, '演示客户', ?, ?, '演示发货员', 3, 0, '演示销售出库', NOW(), 0)`,
        [soNo, W.id, BASE_DATE]
      );
      const soId = soRes.insertId;
      await conn.execute(
        `INSERT INTO inv_sales_outbound_item
         (outbound_id, material_id, material_code, material_name, quantity, unit, batch_no, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [soId, F.id, F.material_code, F.material_name, qtySale, F.unit || '件', prodBatch]
      );
      await conn.execute(
        `UPDATE inv_inventory_batch SET quantity=quantity-?, available_qty=available_qty-?, update_time=NOW()
         WHERE batch_no=? AND material_id=? AND warehouse_id=? AND deleted=0`,
        [qtySale, qtySale, prodBatch, F.id, W.id]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'out', 'sales_outbound', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [nextTxn('SO'), soId, F.id, F.material_code, prodBatch, W.id,
         qtySale, F.sale_price || 30, rnd(qtySale * (F.sale_price || 30)), soNo, '销售出库']
      );
      logs.push([W.id, F.id, 'out', -qtySale, soNo]);

      // --- 4.5 盘点调整（调整原材料批次 INB-g-1）---
      const adjNo = `ADJ${BASE_DATE.replace(/-/g, '')}-${g1}`;
      const [adjRes] = await conn.execute(
        `INSERT INTO inv_stock_adjust
         (adjust_no, warehouse_id, adjust_date, adjust_type, operator_name, approver_name,
          approve_time, status, total_qty, total_amount, remark, create_time, deleted, version)
         VALUES (?, ?, ?, ?, '演示盘点员', '演示审批', NOW(), 1, ?, ?, ?, NOW(), 0, 0)`,
        [adjNo, W.id, BASE_DATE, isLoss ? 2 : 1, Math.abs(adjQty), rnd(Math.abs(adjQty) * (R.purchase_price || 10)), '演示盘点']
      );
      const adjId = adjRes.insertId;
      const [bRows] = await conn.execute(
        `SELECT quantity, available_qty FROM inv_inventory_batch
         WHERE batch_no=? AND material_id=? AND warehouse_id=? AND deleted=0`,
        [inBatch, R.id, W.id]
      );
      const beforeQty = bRows.length ? rnd(bRows[0].available_qty) : 0;
      const afterQty = rnd(Math.max(0, beforeQty + adjQty));
      await conn.execute(
        `INSERT INTO inv_stock_adjust_item
         (adjust_id, material_id, material_code, material_name, batch_no, before_qty, adjust_qty, after_qty, unit, unit_price, amount, reason, create_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [adjId, R.id, R.material_code, R.material_name, inBatch, beforeQty, adjQty, afterQty,
         R.unit || '件', R.purchase_price || 10, rnd(Math.abs(adjQty) * (R.purchase_price || 10)), isLoss ? '盘亏调整' : '盘盈调整']
      );
      await conn.execute(
        `UPDATE inv_inventory_batch SET quantity=GREATEST(0, quantity+?), available_qty=GREATEST(0, available_qty+?), update_time=NOW()
         WHERE batch_no=? AND material_id=? AND warehouse_id=? AND deleted=0`,
        [adjQty, adjQty, inBatch, R.id, W.id]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, source_line_id, material_id,
          material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'adjust', 'stock_adjust', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [nextTxn('AD'), adjId, R.id, R.material_code, inBatch, W.id,
         adjQty, R.purchase_price || 10, rnd(Math.abs(adjQty) * (R.purchase_price || 10)), adjNo, '盘点调整']
      );
      logs.push([W.id, R.id, 'adjust', adjQty, adjNo]);
    }
    console.log(`✓ 20 组业务单据 + 批次 + 台账已生成`);

    // 5) 插入 inv_inventory_log（每笔变动一行）
    for (const [wid, mid, ctype, cqty, ono] of logs) {
      await conn.execute(
        `INSERT INTO inv_inventory_log (warehouse_id, material_id, change_type, change_qty, order_no, remark, create_time)
         VALUES (?, ?, ?, ?, ?, '演示日志', NOW())`,
        [wid, mid, ctype, cqty, ono]
      );
    }
    console.log(`✓ inv_inventory_log 生成 ${logs.length} 行`);

    // 6) 从批次派生 inv_inventory 汇总
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
    console.log(`✓ inv_inventory 汇总派生 ${sumRes.affectedRows} 行`);

    // 7) 一致性校验：inv_inventory 应等于批次 SUM
    const [mismatch] = await conn.execute(
      `SELECT COUNT(*) AS c FROM (
         SELECT i.material_id, i.warehouse_id
         FROM inv_inventory i
         LEFT JOIN (
           SELECT material_id, warehouse_id, SUM(quantity) sq, SUM(available_qty) sa
           FROM inv_inventory_batch WHERE deleted=0 GROUP BY material_id, warehouse_id
         ) b ON b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id
         WHERE i.deleted=0 AND (i.quantity<>b.sq OR i.available_qty<>b.sa OR b.material_id IS NULL)
       ) t`
    );
    const [invCount] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory WHERE deleted=0');
    const [batchCount] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory_batch WHERE deleted=0');
    const [txnCount] = await conn.execute('SELECT COUNT(*) c FROM inv_inventory_transaction');
    console.log(`\n=== 校验 ===`);
    console.log(`inv_inventory: ${invCount[0].c} 行 | inv_inventory_batch: ${batchCount[0].c} 行 | inv_inventory_transaction: ${txnCount[0].c} 行`);
    console.log(`汇总与批次不一致的行数：${mismatch[0].c} ${mismatch[0].c === 0 ? '✅ 完全一致' : '❌ 存在偏差'}`);

    console.log('\n🎉 20 组测试数据生成完成。备份表后缀 _bak_' + BAK_TS + ' 可回滚。');
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('❌ 失败:', e.message);
  if (e.sql) console.error('SQL:', e.sql);
  if (e.parameters) console.error('PARAMS:', JSON.stringify(e.parameters));
  process.exit(1);
});
