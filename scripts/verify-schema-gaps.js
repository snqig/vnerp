// 验证实际DB与TODO清单的关键差异
const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root',
    password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
  });
  const run = async (label, sql) => {
    try {
      const [rows] = await c.execute(sql);
      console.log(`\n===== ${label} (${rows.length} rows) =====`);
      console.log(JSON.stringify(rows, null, 2));
    } catch (e) { console.log(`\n===== ${label} ERROR: ${e.message} =====`); }
  };

  // 1. 所有HR表
  await run('HR tables', `SHOW TABLES LIKE 'hr_%'`);
  // 2. 员工数据 (employee_id 1001-1005 是否存在)
  await run('sys_employee 1001-1010', `SELECT id, employee_no, name, dept_name, position, status FROM sys_employee WHERE id BETWEEN 1001 AND 1010`);
  await run('sys_employee all (first 10)', `SELECT id, employee_no, name, dept_name, position, status FROM sys_employee ORDER BY id LIMIT 10`);
  // 3. 验证 pur_purchase_order 是否有 base_* 列
  await run('pur_purchase_order base columns', `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME LIKE 'base_%'`);
  await run('pur_purchase_order_line columns', `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='pur_purchase_order_line' ORDER BY ORDINAL_POSITION`);
  // 4. sal_order 是否存在 + 列
  await run('sal_order exists?', `SHOW TABLES LIKE 'sal_order'`);
  await run('sal_order columns', `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='sal_order' AND COLUMN_NAME LIKE 'base_%'`);
  // 5. inv_outbound_order 列
  await run('inv_outbound_order columns', `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='inv_outbound_order' ORDER BY ORDINAL_POSITION`);
  // 6. 物料: 找丝印油墨(黑/红)和网版
  await run('materials ink/screen', `SELECT id, material_code, material_name, specification, unit, purchase_price FROM inv_material WHERE material_name LIKE '%油墨%' OR material_name LIKE '%网版%' OR material_name LIKE '%感光胶%' ORDER BY id`);
  // 7. 现有采购订单示例 (看currency/exchange_rate用法)
  await run('po sample', `SELECT id, po_no, supplier_id, currency, exchange_rate, tax_rate, total_amount, tax_amount, grand_total, status FROM pur_purchase_order WHERE deleted=0 ORDER BY id DESC LIMIT 3`);
  // 8. 现有库存批次示例
  await run('batch sample', `SELECT id, batch_no, material_id, material_name, warehouse_id, quantity, available_qty, unit_price, inbound_date, status FROM inv_inventory_batch WHERE deleted=0 ORDER BY id DESC LIMIT 3`);
  // 9. 现有工单示例
  await run('wo sample', `SELECT id, work_order_no, sales_order_id, material_id, plan_qty, status FROM prd_work_order WHERE deleted=0 ORDER BY id DESC LIMIT 3`);
  // 10. 现有领料单示例
  await run('issue sample', `SELECT id, issue_no, work_order_id, work_order_no, warehouse_id, status FROM prd_material_issue LIMIT 3`);

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
