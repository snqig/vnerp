import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

const checks = [
  ['采购订单', 'SELECT COUNT(*) c FROM pur_purchase_order'],
  ['采购申请', 'SELECT COUNT(*) c FROM pur_request'],
  ['采购退货', 'SELECT COUNT(*) c FROM pur_purchase_return'],
  ['入库单', 'SELECT COUNT(*) c FROM inv_inbound_order'],
  ['出库单', 'SELECT COUNT(*) c FROM inv_outbound_order'],
  ['库存批次', 'SELECT COUNT(*) c FROM inv_inventory_batch'],
  ['调拨单', 'SELECT COUNT(*) c FROM inv_transfer_order'],
  ['盘点单', 'SELECT COUNT(*) c FROM inv_stocktaking'],
  ['分切记录', 'SELECT COUNT(*) c FROM inv_cutting_record'],
  ['生产工单', 'SELECT COUNT(*) c FROM prd_work_order'],
  ['BOM', 'SELECT COUNT(*) c FROM prd_bom'],
  ['领料单', 'SELECT COUNT(*) c FROM prd_material_issue'],
  ['退料单', 'SELECT COUNT(*) c FROM prd_material_return'],
  ['排产', 'SELECT COUNT(*) c FROM prd_schedule'],
  ['完工入库', 'SELECT COUNT(*) c FROM prd_finish_order'],
  ['报工', 'SELECT COUNT(*) c FROM prd_work_report'],
  ['销售订单', 'SELECT COUNT(*) c FROM sal_order'],
  ['发货单', 'SELECT COUNT(*) c FROM sal_delivery'],
  ['退货单', 'SELECT COUNT(*) c FROM sal_return_order'],
  ['对账单', 'SELECT COUNT(*) c FROM sal_reconciliation'],
  ['刀模', 'SELECT COUNT(*) c FROM prd_die'],
  ['油墨', 'SELECT COUNT(*) c FROM prd_ink'],
  ['网版', 'SELECT COUNT(*) c FROM prd_screen_plate'],
  ['工艺卡', 'SELECT COUNT(*) c FROM prd_process_card'],
  ['来料检验', 'SELECT COUNT(*) c FROM qc_incoming_inspection'],
  ['过程成品检验', 'SELECT COUNT(*) c FROM qc_inspection'],
  ['不合格品', 'SELECT COUNT(*) c FROM qc_unqualified'],
  ['设备', 'SELECT COUNT(*) c FROM eqp_equipment'],
  ['校准', 'SELECT COUNT(*) c FROM eqp_calibration'],
  ['维修', 'SELECT COUNT(*) c FROM eqp_maintenance_record'],
  ['应收', 'SELECT COUNT(*) c FROM fin_receivable'],
  ['应付', 'SELECT COUNT(*) c FROM fin_payable'],
  ['成本', 'SELECT COUNT(*) c FROM fin_cost_record'],
  ['样品订单', 'SELECT COUNT(*) c FROM sal_sample_order'],
  ['标准色卡', 'SELECT COUNT(*) c FROM dcprint_ink_color'],
];

async function main() {
  const c = await mysql.createConnection(DB_CONFIG);
  console.log('=== 各表记录数 ===');
  let total = 0;
  for (const [name, sql] of checks) {
    const [r] = await c.execute(sql);
    const cnt = r[0].c;
    total += cnt;
    console.log(`  ${name.padEnd(14)} ${cnt}`);
  }
  console.log(`  ${'─'.repeat(20)}`);
  console.log(`  ${'总计'.padEnd(14)} ${total}`);

  console.log('\n=== 闭环验证 ===');
  // 1. 销售订单(USD) → 工单 → 领料 → 完工 → 发货
  const [so] = await c.execute(
    "SELECT order_no, customer_id, total_amount, currency, base_total_amount, exchange_rate, status FROM sal_order WHERE order_no='SO-2026-101'"
  );
  console.log('  SO-2026-101 (USD多币种):', JSON.stringify(so[0]));

  const [wo] = await c.execute(
    "SELECT work_order_no, sales_order_id, plan_qty, completed_qty, status FROM prd_work_order WHERE work_order_no='WO-2026-101'"
  );
  console.log('  WO-2026-101 (关联销售):', JSON.stringify(wo[0]));

  const [po] = await c.execute(
    "SELECT po_no, supplier_id, total_amount, grand_total, base_grand_total, currency FROM pur_purchase_order WHERE po_no='PO-2026-101'"
  );
  console.log('  PO-2026-101 (CNY):', JSON.stringify(po[0]));

  const [batch] = await c.execute(
    "SELECT batch_no, material_name, quantity, available_qty, unit_price FROM inv_inventory_batch WHERE batch_no='B20260701-PVC'"
  );
  console.log('  批次PVC (库存扣减):', JSON.stringify(batch[0]));

  const [cut] = await c.execute(
    'SELECT record_no, source_label_no, original_width, cut_total_width, remain_width FROM inv_cutting_record'
  );
  console.log(`  分切记录: ${cut.length} 条`);
  cut.forEach(r => console.log(`    ${r.record_no}: 母卷=${r.source_label_no}, 原宽=${r.original_width}, 切宽=${r.cut_total_width}, 剩余=${r.remain_width}`));

  // 2. 外键关联检查
  console.log('\n=== 关键关联检查 ===');
  const [woSo] = await c.execute(
    "SELECT w.work_order_no, s.order_no AS sales_order FROM prd_work_order w LEFT JOIN sal_order s ON w.sales_order_id=s.id WHERE w.work_order_no LIKE 'WO-2026-10_'"
  );
  woSo.forEach(r => console.log(`  工单${r.work_order_no} → 销售订单${r.sales_order || 'NULL'}`));

  const [mrWo] = await c.execute(
    "SELECT i.issue_no, w.work_order_no FROM prd_material_issue i LEFT JOIN prd_work_order w ON i.work_order_id=w.id"
  );
  mrWo.forEach(r => console.log(`  领料${r.issue_no} → 工单${r.work_order_no || 'NULL'}`));

  const [dlSo] = await c.execute(
    "SELECT d.delivery_no, s.order_no FROM sal_delivery d LEFT JOIN sal_order s ON d.order_id=s.id"
  );
  dlSo.forEach(r => console.log(`  发货${r.delivery_no} → 销售订单${r.order_no || 'NULL'}`));

  const [arSo] = await c.execute(
    "SELECT r.receivable_no, r.source_no, r.amount, r.received_amount, r.balance FROM fin_receivable r"
  );
  arSo.forEach(r => console.log(`  应收${r.receivable_no} → ${r.source_no}, 金额=${r.amount}, 已收=${r.received_amount}, 余额=${r.balance}`));

  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
