/**
 * 全链路种子数据生成脚本
 *
 * 4 条全链路 × 10 组数据 = 40 条完整业务链路
 *   1. 采购→入库→库存→应付
 *   2. 销售→出库→库存→应收
 *   3. 生产领料/退料联动库存
 *   4. 生产排产调度接入
 *
 * 用法: node --env-file=.env scripts/seed-fullchain-data.mjs
 * 清理: node --env-file=.env scripts/seed-fullchain-data.mjs --clean
 */
import mysql from 'mysql2/promise';

const POOL = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
  waitForConnections: true,
  multipleStatements: true,
});

const PREFIX = 'SEED';
const TODAY = new Date().toISOString().slice(0, 10);
const PERIOD_CODE = TODAY.slice(0, 7).replace('-', '');
const DUE = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

// ===== helpers =====
async function exec(sql, params = []) {
  try {
    const [r] = await POOL.execute(sql, params);
    return r;
  } catch (e) {
    console.error(`SQL ERROR: ${e.message}\n  SQL: ${sql}\n  Params: ${JSON.stringify(params)}`);
    throw e;
  }
}
async function insertId(sql, params) {
  try {
    const [r] = await POOL.execute(sql, params);
    return r.insertId;
  } catch (e) {
    console.error(`SQL ERROR: ${e.message}\n  SQL: ${sql}\n  Params: ${JSON.stringify(params)}`);
    throw e;
  }
}
function pad(n, len = 3) {
  return String(n).padStart(len, '0');
}

// ===== clean previous seed data =====
async function cleanSeedData() {
  console.log('🧹 Cleaning previous SEED- prefixed data...');
  const tables = [
    'fin_voucher_line', 'fin_voucher', 'fin_payable', 'fin_receivable',
    'inv_inventory_transaction', 'inv_inventory_batch', 'inv_inventory',
    'inv_inbound_item', 'inv_inbound_order',
    'inv_outbound_item', 'inv_outbound_order',
    'material_return_items', 'material_returns',
    'material_requisition_items', 'material_requisitions',
    'prd_work_report', 'prd_schedule_detail', 'prd_schedule',
    'prd_work_order',
    'pur_purchase_order_line', 'pur_purchase_order',
    'sal_order_detail', 'sal_order',
  ];
  // Map table → column used to identify SEED data
  const colMap = {
    fin_voucher_line: 'voucher_no', fin_voucher: 'voucher_no',
    fin_payable: 'payable_no', fin_receivable: 'receivable_no',
    inv_inventory_transaction: 'trans_no',
    inv_inventory_batch: 'batch_no',
    inv_inventory: 'material_code',
    inv_inbound_item: 'order_id', inv_inbound_order: 'order_no',
    inv_outbound_item: 'order_id', inv_outbound_order: 'order_no',
    material_return_items: 'return_id', material_returns: 'return_no',
    material_requisition_items: 'requisition_id', material_requisitions: 'requisition_no',
    prd_work_report: 'report_no', prd_schedule_detail: 'schedule_id',
    prd_schedule: 'schedule_no', prd_work_order: 'work_order_no',
    pur_purchase_order_line: 'po_id', pur_purchase_order: 'po_no',
    sal_order_detail: 'order_id', sal_order: 'order_no',
  };
  // Delete child tables first via subquery (they have integer FK columns, can't LIKE match)
  const childDeletes = [
    `DELETE FROM sal_order_detail WHERE order_id IN (SELECT id FROM sal_order WHERE order_no LIKE '${PREFIX}-%')`,
    `DELETE FROM pur_purchase_order_line WHERE po_id IN (SELECT id FROM pur_purchase_order WHERE po_no LIKE '${PREFIX}-%')`,
    `DELETE FROM inv_inbound_item WHERE order_id IN (SELECT id FROM inv_inbound_order WHERE order_no LIKE '${PREFIX}-%')`,
    `DELETE FROM inv_outbound_item WHERE order_id IN (SELECT id FROM inv_outbound_order WHERE order_no LIKE '${PREFIX}-%')`,
    `DELETE FROM material_requisition_items WHERE requisition_id IN (SELECT id FROM material_requisitions WHERE requisition_no LIKE '${PREFIX}-%')`,
    `DELETE FROM material_return_items WHERE return_id IN (SELECT id FROM material_returns WHERE return_no LIKE '${PREFIX}-%')`,
    `DELETE FROM prd_schedule_detail WHERE schedule_id IN (SELECT id FROM prd_schedule WHERE schedule_no LIKE '${PREFIX}-%')`,
    `DELETE FROM fin_voucher_line WHERE voucher_no LIKE '${PREFIX}-%'`,
  ];
  for (const sql of childDeletes) {
    try {
      const [r] = await POOL.query(sql);
      if (r.affectedRows > 0) console.log(`  child cleanup: ${r.affectedRows} rows`);
    } catch (e) { /* skip */ }
  }
  for (const t of tables) {
    try {
      const col = colMap[t] || 'order_no';
      // Skip child tables (already cleaned via subquery above)
      if (['inv_inbound_item', 'inv_outbound_item', 'material_return_items',
           'material_requisition_items', 'prd_schedule_detail',
           'sal_order_detail', 'pur_purchase_order_line', 'fin_voucher_line'].includes(t)) {
        continue;
      }
      const [r] = await POOL.execute(
        `DELETE FROM \`${t}\` WHERE \`${col}\` LIKE ? OR \`${col}\` LIKE ?`,
        [`${PREFIX}-%`, `${PREFIX}%`]
      );
      if (r.affectedRows > 0) console.log(`  ${t}: ${r.affectedRows} rows deleted`);
    } catch (e) {
      // table might not have the column; skip
    }
  }
  console.log('✅ Cleanup done\n');
}

// ===== ensure fin_period exists (FK for fin_voucher) =====
async function ensureFinPeriod() {
  const existing = await exec('SELECT period_code FROM fin_period WHERE period_code = ? AND deleted = 0', [PERIOD_CODE]);
  if (existing.length === 0) {
    const monthStart = TODAY.slice(0, 8) + '01';
    const monthEnd = TODAY.slice(0, 8) + '31';
    await insertId(
      `INSERT INTO fin_period (period_code, period_name, start_date, end_date, is_closed, status, create_time, deleted)
       VALUES (?, ?, ?, ?, 0, 1, NOW(), 0)`,
      [PERIOD_CODE, `${TODAY.slice(0, 4)}年${TODAY.slice(5, 7)}月`, monthStart, monthEnd]
    );
    console.log(`📅 Created fin_period: ${PERIOD_CODE}`);
  }
}

// ===== get master data =====
async function getMasterData() {
  const suppliers = await exec('SELECT id, supplier_name FROM pur_supplier WHERE deleted = 0 LIMIT 5');
  const customers = await exec('SELECT id, customer_name FROM crm_customer WHERE deleted = 0 LIMIT 10');
  const materials = await exec('SELECT id, material_code, material_name, unit, cost_price FROM inv_material WHERE deleted = 0 ORDER BY id LIMIT 20');
  const warehouses = await exec('SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE deleted = 0 LIMIT 5');
  return { suppliers, customers, materials, warehouses };
}

// ===== Scenario 1: 采购→入库→库存→应付 =====
async function seedPurchaseChain(master, startIdx) {
  console.log(`\n📦 Scenario 1: 采购→入库→库存→应付 (10 chains)`);
  for (let i = 0; i < 10; i++) {
    const idx = startIdx + i;
    const supplier = master.suppliers[i % master.suppliers.length];
    const mat1 = master.materials[i * 2 % master.materials.length];
    const mat2 = master.materials[(i * 2 + 1) % master.materials.length];
    const wh = master.warehouses[0];
    const poNo = `${PREFIX}-PO-${pad(idx)}`;
    const inbNo = `${PREFIX}-INB-${pad(idx)}`;
    const qty1 = 100 + i * 10;
    const qty2 = 200 + i * 10;
    const price1 = Number(mat1.cost_price) || 10;
    const price2 = Number(mat2.cost_price) || 15;
    const amt1 = qty1 * price1;
    const amt2 = qty2 * price2;
    const totalAmt = amt1 + amt2;

    // 1. 采购订单
    const poId = await insertId(
      `INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total, status, payment_terms, create_by, create_time, deleted)
       VALUES (?, ?, ?, 'SUP', ?, ?, 'CNY', 1, ?, ?, 13, ?, ?, 50, '月结30天', 1, NOW(), 0)`,
      [poNo, supplier.id, supplier.supplier_name, TODAY, TODAY, totalAmt, qty1 + qty2, totalAmt * 0.13, totalAmt * 1.13]
    );
    // 采购订单行
    await exec(
      `INSERT INTO pur_purchase_order_line (po_id, line_no, material_id, material_code, material_name, unit, order_qty, received_qty, unit_price, amount, tax_rate, tax_amount, line_total, create_time)
       VALUES (?, 1, ?, ?, ?, ?, ?, 0, ?, ?, 13, ?, ?, NOW())`,
      [poId, mat1.id, mat1.material_code, mat1.material_name, mat1.unit, qty1, price1, amt1, amt1 * 0.13, amt1 * 1.13]
    );
    await exec(
      `INSERT INTO pur_purchase_order_line (po_id, line_no, material_id, material_code, material_name, unit, order_qty, received_qty, unit_price, amount, tax_rate, tax_amount, line_total, create_time)
       VALUES (?, 2, ?, ?, ?, ?, ?, 0, ?, ?, 13, ?, ?, NOW())`,
      [poId, mat2.id, mat2.material_code, mat2.material_name, mat2.unit, qty2, price2, amt2, amt2 * 0.13, amt2 * 1.13]
    );

    // 2. 入库单
    const inbId = await insertId(
      `INSERT INTO inv_inbound_order (order_no, order_type, warehouse_id, warehouse_code, warehouse_name, supplier_id, supplier_name, po_id, po_no, inbound_date, total_quantity, total_amount, status, qc_status, create_time, deleted)
       VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'pass', NOW(), 0)`,
      [inbNo, wh.id, wh.warehouse_code, wh.warehouse_name, supplier.id, supplier.supplier_name, poId, poNo, TODAY, qty1 + qty2, totalAmt]
    );
    await exec(
      `INSERT INTO inv_inbound_item (order_id, material_id, material_name, batch_no, quantity, unit, unit_price, total_price, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [inbId, mat1.id, mat1.material_name, `${PREFIX}-BAT-${pad(idx)}A`, qty1, mat1.unit, price1, amt1]
    );
    await exec(
      `INSERT INTO inv_inbound_item (order_id, material_id, material_name, batch_no, quantity, unit, unit_price, total_price, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [inbId, mat2.id, mat2.material_name, `${PREFIX}-BAT-${pad(idx)}B`, qty2, mat2.unit, price2, amt2]
    );

    // 3. 库存更新 (upsert)
    for (const [mat, qty, price, batchNo] of [[mat1, qty1, price1, `${PREFIX}-BAT-${pad(idx)}A`], [mat2, qty2, price2, `${PREFIX}-BAT-${pad(idx)}B`]]) {
      const existing = await exec('SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0', [mat.id, wh.id]);
      if (existing.length > 0) {
        await exec(
          `UPDATE inv_inventory SET quantity = quantity + ?, available_qty = available_qty + ?, total_cost = total_cost + ?, update_time = NOW() WHERE id = ?`,
          [qty, qty, qty * price, existing[0].id]
        );
      } else {
        await insertId(
          `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, warehouse_name, quantity, available_qty, unit, unit_cost, total_cost, version, deleted, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW(), NOW())`,
          [mat.id, mat.material_code, mat.material_name, wh.id, wh.warehouse_name, qty, qty, mat.unit, price, qty * price]
        );
      }
      // 库存批次
      await insertId(
        `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, unit, unit_price, inbound_date, status, version, deleted, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, NOW(), NOW())`,
        [batchNo, mat.id, mat.material_name, wh.id, wh.warehouse_name, qty, qty, mat.unit, price, TODAY]
      );
      // 库存流水
      await insertId(
        `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_cost, total_cost, create_time)
         VALUES (?, 'in', 'purchase', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [`${PREFIX}-TRX-IN-${pad(idx)}-${mat.id}`, poId, mat.id, mat.material_code, batchNo, wh.id, qty, price, qty * price]
      );
    }

    // 4. 应付凭证 + 应付账款
    const voucherNo = `${PREFIX}-FV-${pad(idx)}`;
    await insertId(
      `INSERT INTO fin_voucher (voucher_no, period_code, voucher_date, voucher_type, source_type, source_id, source_no, total_debit, total_credit, total_amount, status, summary, create_time)
       VALUES (?, ?, ?, 2, 'purchase', ?, ?, ?, ?, ?, 0, ?, NOW())`,
      [voucherNo, PERIOD_CODE, TODAY, poId, poNo, totalAmt, totalAmt, totalAmt, `采购入库 ${poNo} 自动生成`]
    );
    const payableNo = `${PREFIX}-AP-${pad(idx)}`;
    await insertId(
      `INSERT INTO fin_payable (payable_no, supplier_id, source_type, source_no, amount, paid_amount, balance, status, due_date, remark, create_time)
       VALUES (?, ?, 1, ?, ?, 0, ?, 1, ?, ?, NOW())`,
      [payableNo, supplier.id, poNo, totalAmt, totalAmt, DUE, `采购订单 ${poNo} 入库自动生成`]
    );

    console.log(`  ✅ Chain ${i + 1}: PO=${poNo} → INB=${inbNo} → INV+${qty1 + qty2} → AP=${payableNo} (¥${totalAmt.toFixed(2)})`);
  }
}

// ===== Scenario 2: 销售→出库→库存→应收 =====
async function seedSalesChain(master, startIdx) {
  console.log(`\n🚚 Scenario 2: 销售→出库→库存→应收 (10 chains)`);
  for (let i = 0; i < 10; i++) {
    const idx = startIdx + i;
    const customer = master.customers[i % master.customers.length];
    const mat1 = master.materials[(i * 3) % master.materials.length];
    const mat2 = master.materials[(i * 3 + 1) % master.materials.length];
    const wh = master.warehouses[0];
    const soNo = `${PREFIX}-SO-${pad(idx)}`;
    const outNo = `${PREFIX}-OUT-${pad(idx)}`;
    const qty1 = 50 + i * 5;
    const qty2 = 80 + i * 5;
    const price1 = Number(mat1.cost_price) * 1.3 || 13;
    const price2 = Number(mat2.cost_price) * 1.3 || 19.5;
    const amt1 = qty1 * price1;
    const amt2 = qty2 * price2;
    const totalAmt = amt1 + amt2;

    // 1. 销售订单
    const soId = await insertId(
      `INSERT INTO sal_order (order_no, order_date, customer_id, total_amount, tax_amount, total_with_tax, currency, status, create_by, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, 'CNY', 3, 1, NOW(), 0)`,
      [soNo, TODAY, customer.id, totalAmt, totalAmt * 0.13, totalAmt * 1.13]
    );
    await exec(
      `INSERT INTO sal_order_detail (order_id, material_id, material_name, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 13, ?, ?, ?, NOW())`,
      [soId, mat1.id, mat1.material_name, qty1, mat1.unit, price1, amt1, amt1 * 0.13, amt1 * 1.13]
    );
    await exec(
      `INSERT INTO sal_order_detail (order_id, material_id, material_name, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 13, ?, ?, ?, NOW())`,
      [soId, mat2.id, mat2.material_name, qty2, mat2.unit, price2, amt2, amt2 * 0.13, amt2 * 1.13]
    );

    // 2. 出库单
    const outId = await insertId(
      `INSERT INTO inv_outbound_order (order_no, order_date, outbound_type, warehouse_id, warehouse_code, warehouse_name, total_qty, total_amount, currency, status, audit_status, create_by, deleted, create_time)
       VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, 'CNY', 'approved', 'approved', 1, 0, NOW())`,
      [outNo, TODAY, wh.id, wh.warehouse_code, wh.warehouse_name, qty1 + qty2, totalAmt]
    );
    await exec(
      `INSERT INTO inv_outbound_item (order_id, material_id, material_name, quantity, unit, unit_price, amount, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [outId, mat1.id, mat1.material_name, qty1, mat1.unit, price1, amt1]
    );
    await exec(
      `INSERT INTO inv_outbound_item (order_id, material_id, material_name, quantity, unit, unit_price, amount, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [outId, mat2.id, mat2.material_name, qty2, mat2.unit, price2, amt2]
    );

    // 3. 库存扣减
    for (const [mat, qty, price] of [[mat1, qty1, price1], [mat2, qty2, price2]]) {
      const existing = await exec('SELECT id, quantity, available_qty FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0', [mat.id, wh.id]);
      if (existing.length > 0) {
        await exec(
          `UPDATE inv_inventory SET quantity = GREATEST(quantity - ?, 0), available_qty = GREATEST(available_qty - ?, 0), update_time = NOW() WHERE id = ?`,
          [qty, qty, existing[0].id]
        );
      }
      // 出库流水
      await insertId(
        `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, warehouse_id, quantity, unit_cost, total_cost, create_time)
         VALUES (?, 'out', 'sale', ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [`${PREFIX}-TRX-OUT-${pad(idx)}-${mat.id}`, soId, mat.id, mat.material_code, wh.id, -qty, price, qty * price]
      );
    }

    // 4. 应收账款
    const arNo = `${PREFIX}-AR-${pad(idx)}`;
    await insertId(
      `INSERT INTO fin_receivable (receivable_no, customer_id, source_type, source_no, amount, received_amount, balance, status, due_date, remark, create_time)
       VALUES (?, ?, 1, ?, ?, 0, ?, 1, ?, ?, NOW())`,
      [arNo, customer.id, outNo, totalAmt, totalAmt, DUE, `销售出库 ${outNo} 自动生成`]
    );

    console.log(`  ✅ Chain ${i + 1}: SO=${soNo} → OUT=${outNo} → INV-${qty1 + qty2} → AR=${arNo} (¥${totalAmt.toFixed(2)})`);
  }
}

// ===== Scenario 3: 生产领料/退料联动库存 =====
async function seedMaterialIssueChain(master, startIdx) {
  console.log(`\n🏭 Scenario 3: 生产领料/退料联动库存 (10 chains)`);
  for (let i = 0; i < 10; i++) {
    const idx = startIdx + i;
    const mat1 = master.materials[(i * 5) % master.materials.length];
    const mat2 = master.materials[(i * 5 + 1) % master.materials.length];
    const wh = master.warehouses[0];
    const woNo = `${PREFIX}-WO-${pad(idx)}`;
    const reqNo = `${PREFIX}-REQ-${pad(idx)}`;
    const retNo = `${PREFIX}-RET-${pad(idx)}`;
    const qty1 = 20 + i * 2;
    const qty2 = 30 + i * 2;
    const retQty = 5 + i; // 退料数量

    // 1. 生产工单
    const woId = await insertId(
      `INSERT INTO prd_work_order (work_order_no, work_order_date, material_id, plan_qty, completed_qty, unit, status, create_by, create_time, deleted)
       VALUES (?, ?, ?, ?, 0, 'pcs', 3, 1, NOW(), 0)`,
      [woNo, TODAY, mat1.id, 1000 + i * 100]
    );

    // 2. 领料单
    const reqId = await insertId(
      `INSERT INTO material_requisitions (requisition_no, work_order_id, work_order_no, type, status, applicant_id, applicant_name, total_quantity, issued_quantity, warehouse_id, create_by, create_time, deleted)
       VALUES (?, ?, ?, 'production', 2, 1, '张三', ?, ?, ?, 1, NOW(), 0)`,
      [reqNo, woId, woNo, qty1 + qty2, qty1 + qty2, wh.id]
    );
    await exec(
      `INSERT INTO material_requisition_items (requisition_id, material_id, material_code, material_name, planned_quantity, actual_quantity, issued_quantity, unit, batch_no, unit_cost, total_cost, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [reqId, mat1.id, mat1.material_code, mat1.material_name, qty1, qty1, qty1, mat1.unit, `${PREFIX}-BAT-${pad(idx)}A`, Number(mat1.cost_price) || 10, qty1 * (Number(mat1.cost_price) || 10)]
    );
    await exec(
      `INSERT INTO material_requisition_items (requisition_id, material_id, material_code, material_name, planned_quantity, actual_quantity, issued_quantity, unit, batch_no, unit_cost, total_cost, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [reqId, mat2.id, mat2.material_code, mat2.material_name, qty2, qty2, qty2, mat2.unit, `${PREFIX}-BAT-${pad(idx)}B`, Number(mat2.cost_price) || 15, qty2 * (Number(mat2.cost_price) || 15)]
    );

    // 3. 库存扣减 (领料)
    for (const [mat, qty] of [[mat1, qty1], [mat2, qty2]]) {
      const existing = await exec('SELECT id, quantity, available_qty FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0', [mat.id, wh.id]);
      if (existing.length > 0) {
        await exec(
          `UPDATE inv_inventory SET quantity = GREATEST(quantity - ?, 0), available_qty = GREATEST(available_qty - ?, 0), update_time = NOW() WHERE id = ?`,
          [qty, qty, existing[0].id]
        );
      }
      // 领料出库流水
      await insertId(
        `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, warehouse_id, quantity, create_time)
         VALUES (?, 'out', 'material_issue', ?, ?, ?, ?, ?, NOW())`,
        [`${PREFIX}-TRX-ISS-${pad(idx)}-${mat.id}`, woId, mat.id, mat.material_code, wh.id, -qty]
      );
    }

    // 4. 退料单 (退回 mat1 的部分数量)
    const retId = await insertId(
      `INSERT INTO material_returns (return_no, work_order_id, requisition_id, status, applicant_id, applicant_name, total_quantity, warehouse_id, create_by, create_time, deleted)
       VALUES (?, ?, ?, 2, 1, '张三', ?, ?, 1, NOW(), 0)`,
      [retNo, woId, reqId, retQty, wh.id]
    );
    await exec(
      `INSERT INTO material_return_items (return_id, material_id, material_code, material_name, quantity, unit, batch_no, unit_cost, total_cost, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [retId, mat1.id, mat1.material_code, mat1.material_name, retQty, mat1.unit, `${PREFIX}-BAT-${pad(idx)}A`, Number(mat1.cost_price) || 10, retQty * (Number(mat1.cost_price) || 10)]
    );

    // 库存回加 (退料入库)
    const existingInv = await exec('SELECT id FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0', [mat1.id, wh.id]);
    if (existingInv.length > 0) {
      await exec(
        `UPDATE inv_inventory SET quantity = quantity + ?, available_qty = available_qty + ?, update_time = NOW() WHERE id = ?`,
        [retQty, retQty, existingInv[0].id]
      );
    }
    // 退料入库流水
    await insertId(
      `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, warehouse_id, quantity, create_time)
       VALUES (?, 'return', 'material_return', ?, ?, ?, ?, ?, NOW())`,
      [`${PREFIX}-TRX-RET-${pad(idx)}`, woId, mat1.id, mat1.material_code, wh.id, retQty]
    );

    console.log(`  ✅ Chain ${i + 1}: WO=${woNo} → REQ=${reqNo} (领${qty1 + qty2}) → RET=${retNo} (退${retQty}) → INV adjusted`);
  }
}

// ===== Scenario 4: 生产排产调度接入 =====
async function seedScheduleChain(master, startIdx) {
  console.log(`\n📅 Scenario 4: 生产排产调度接入 (10 chains)`);
  for (let i = 0; i < 10; i++) {
    const idx = startIdx + i;
    const mat = master.materials[i % master.materials.length];
    const woNo = `${PREFIX}-SWO-${pad(idx)}`;
    const schedNo = `${PREFIX}-SCH-${pad(idx)}`;
    const reportNo = `${PREFIX}-RPT-${pad(idx)}`;
    const planQty = 500 + i * 100;
    const completedQty = Math.floor(planQty * (0.5 + i * 0.04));

    // 1. 生产工单
    const woId = await insertId(
      `INSERT INTO prd_work_order (work_order_no, work_order_date, material_id, plan_qty, completed_qty, unit, status, priority, plan_start_date, plan_end_date, create_by, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, 'pcs', 3, 2, ?, ?, 1, NOW(), 0)`,
      [woNo, TODAY, mat.id, planQty, completedQty, TODAY, TODAY]
    );

    // 2. 排产计划
    const schedId = await insertId(
      `INSERT INTO prd_schedule (schedule_no, work_order_id, work_order_no, product_id, product_code, product_name, workshop, planned_qty, completed_qty, planned_start, planned_end, priority, status, scheduler, create_time, deleted, create_by)
       VALUES (?, ?, ?, ?, ?, ?, 'A车间', ?, ?, ?, ?, 2, 2, '调度员', NOW(), 0, 1)`,
      [schedNo, woId, woNo, mat.id, mat.material_code, mat.material_name, planQty, completedQty, TODAY + ' 08:00:00', TODAY + ' 17:00:00']
    );

    // 3. 排产明细 (2 道工序)
    await exec(
      `INSERT INTO prd_schedule_detail (schedule_id, work_order_id, color_seq_no, color_name, planned_start, planned_end, duration_hours, status, create_time, deleted)
       VALUES (?, ?, 1, '底色', ?, ?, 4, 2, NOW(), 0)`,
      [schedId, woId, TODAY + ' 08:00:00', TODAY + ' 12:00:00']
    );
    await exec(
      `INSERT INTO prd_schedule_detail (schedule_id, work_order_id, color_seq_no, color_name, planned_start, planned_end, duration_hours, status, create_time, deleted)
       VALUES (?, ?, 2, '面漆', ?, ?, 5, 2, NOW(), 0)`,
      [schedId, woId, TODAY + ' 13:00:00', TODAY + ' 18:00:00']
    );

    // 4. 报工记录
    await insertId(
      `INSERT INTO prd_work_report (report_no, work_order_id, work_order_no, process_name, process_seq, operator_id, operator_name, plan_qty, completed_qty, qualified_qty, defective_qty, scrap_qty, start_time, end_time, work_hours, create_time, deleted)
       VALUES (?, ?, ?, '印刷', 1, 1, '操作工', ?, ?, ?, ?, 0, ?, ?, 4, NOW(), 0)`,
      [reportNo, woId, woNo, planQty, completedQty, Math.floor(completedQty * 0.95), Math.floor(completedQty * 0.05), TODAY + ' 08:00:00', TODAY + ' 12:00:00']
    );

    console.log(`  ✅ Chain ${i + 1}: SCH=${schedNo} → WO=${woNo} (计划${planQty}/完成${completedQty}) → RPT=${reportNo}`);
  }
}

// ===== main =====
async function main() {
  const isClean = process.argv.includes('--clean');
  if (isClean) {
    await cleanSeedData();
    process.exit(0);
  }

  console.log('🚀 Starting full-chain seed data generation...\n');
  const master = await getMasterData();
  console.log(`Master data: ${master.suppliers.length} suppliers, ${master.customers.length} customers, ${master.materials.length} materials, ${master.warehouses.length} warehouses`);

  // Clean previous seed data first
  await cleanSeedData();

  // Ensure fin_period exists (FK for fin_voucher)
  await ensureFinPeriod();

  // Generate 4 scenarios × 10 chains
  await seedPurchaseChain(master, 1);
  await seedSalesChain(master, 101);
  await seedMaterialIssueChain(master, 201);
  await seedScheduleChain(master, 301);

  console.log('\n✅ All 40 full-chain records generated successfully!');
  console.log('\n📊 Summary:');
  const [counts] = await POOL.query(`
    SELECT
      (SELECT COUNT(*) FROM pur_purchase_order WHERE po_no LIKE '${PREFIX}-PO-%') as purchase_orders,
      (SELECT COUNT(*) FROM inv_inbound_order WHERE order_no LIKE '${PREFIX}-INB-%') as inbound_orders,
      (SELECT COUNT(*) FROM sal_order WHERE order_no LIKE '${PREFIX}-SO-%') as sales_orders,
      (SELECT COUNT(*) FROM inv_outbound_order WHERE order_no LIKE '${PREFIX}-OUT-%') as outbound_orders,
      (SELECT COUNT(*) FROM fin_payable WHERE payable_no LIKE '${PREFIX}-AP-%') as payables,
      (SELECT COUNT(*) FROM fin_receivable WHERE receivable_no LIKE '${PREFIX}-AR-%') as receivables,
      (SELECT COUNT(*) FROM fin_voucher WHERE voucher_no LIKE '${PREFIX}-FV-%') as vouchers,
      (SELECT COUNT(*) FROM prd_work_order WHERE work_order_no LIKE '${PREFIX}-WO-%' OR work_order_no LIKE '${PREFIX}-SWO-%') as work_orders,
      (SELECT COUNT(*) FROM material_requisitions WHERE requisition_no LIKE '${PREFIX}-REQ-%') as requisitions,
      (SELECT COUNT(*) FROM material_returns WHERE return_no LIKE '${PREFIX}-RET-%') as returns,
      (SELECT COUNT(*) FROM prd_schedule WHERE schedule_no LIKE '${PREFIX}-SCH-%') as schedules,
      (SELECT COUNT(*) FROM prd_work_report WHERE report_no LIKE '${PREFIX}-RPT-%') as work_reports,
      (SELECT COUNT(*) FROM inv_inventory_transaction WHERE trans_no LIKE '${PREFIX}-TRX-%') as inv_transactions
  `);
  console.table(counts[0]);

  await POOL.end();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
