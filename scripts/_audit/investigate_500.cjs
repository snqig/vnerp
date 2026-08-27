const mysql = require('mysql2/promise');

const TABLES = [
  'qrcode_record', 'qrcode_scan_log', 'inv_inventory_batch',
  'sales_order', 'sal_order', 'prd_work_order', 'inv_inventory',
  'purchase_order', 'pur_purchase_order', 'finance_flow',
  'sys_operation_log', 'sys_employee',
];

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng',
  });

  // 1) existence
  console.log('=== TABLE EXISTENCE ===');
  for (const t of TABLES) {
    const [r] = await conn.query(`SHOW TABLES LIKE '${t}'`);
    console.log(`${r.length ? 'EXISTS ' : 'MISSING'}  ${t}`);
  }

  // 2) columns for tables that exist (and sal_order/pur variants)
  console.log('\n=== COLUMNS (existing tables) ===');
  const want = {
    qrcode_record: ['qr_code','qr_type','ref_id','ref_no','batch_no','material_id','material_code','material_name','specification','quantity','unit','warehouse_id','warehouse_name','location','supplier_id','supplier_name','customer_id','customer_name','work_order_id','work_order_no','production_date','expiry_date','extra_data','status','remark','create_time','print_count','last_print_time','scan_count','last_scan_time','deleted'],
    qrcode_scan_log: ['qr_code','qr_type','scan_type','ref_id','ref_no','operator_id','operator_name','scan_result','scan_message','scan_data','device_info'],
    inv_inventory_batch: ['batch_no','available_qty','quantity','status','deleted'],
    sal_order: ['deleted','order_date','status','total_amount'],
    prd_work_order: ['work_order_date','plan_qty','completed_qty','status','deleted'],
    inv_inventory: ['material_id','quantity','locked_qty','available_qty','deleted'],
    pur_purchase_order: ['deleted','order_date','status','total_amount'],
    finance_flow: ['deleted','type','status','amount'],
    sys_operation_log: ['operation','request_url','username','business_id','business_type','create_time','method','ip','status','request_params','response_result'],
    sys_employee: ['status','deleted','entry_date','dept_id','dept_name'],
  };
  for (const [t, cols] of Object.entries(want)) {
    const [chk] = await conn.query(`SHOW TABLES LIKE '${t}'`);
    if (!chk.length) { console.log(`\n[${t}] MISSING`); continue; }
    const [rows] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema='vnerpdacahng' AND table_name='${t}'`);
    const have = new Set(rows.map(r => r.COLUMN_NAME));
    const missing = cols.filter(c => !have.has(c));
    console.log(`\n[${t}] total_cols=${rows.length} missing_of_wanted=${missing.length ? missing.join(',') : 'NONE'}`);
  }

  // 3) collation of batch_no in both tables (qrcode JOIN)
  console.log('\n=== COLLATION: batch_no ===');
  for (const t of ['qrcode_record','inv_inventory_batch']) {
    const [chk] = await conn.query(`SHOW TABLES LIKE '${t}'`);
    if (!chk.length) { console.log(`${t} MISSING`); continue; }
    const [r] = await conn.query(`SELECT COLUMN_NAME, COLLATION_NAME FROM information_schema.columns WHERE table_schema='vnerpdacahng' AND table_name='${t}' AND COLUMN_NAME='batch_no'`);
    console.log(`${t}.batch_no collation = ${r[0] ? r[0].COLLATION_NAME : 'NO SUCH COLUMN'}`);
  }

  await conn.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
