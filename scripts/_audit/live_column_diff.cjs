// 直连 live 库，对 10 张已建模 inv_* 表做列对齐 diff
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// ---- parse .env ----
const envPath = path.resolve(__dirname, '..', '..', '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

// ---- Drizzle snake_case columns (from warehouse.ts, as-read) ----
const drizzle = {
  inv_material: ['id','material_code','material_name','specification','category_id','material_type','unit','barcode','brand','safety_stock','max_stock','min_stock','width','length','unit_mark','purchase_price','sale_price','cost_price','warehouse_id','shelf_life','warning_days','is_batch_managed','is_serial_managed','status','remark','create_time','update_time','create_by','update_by','deleted'],
  inv_inventory_batch: ['id','batch_no','material_id','material_name','warehouse_id','warehouse_name','quantity','available_qty','locked_qty','unit','unit_price','produce_date','expire_date','inbound_date','batch_type','width','length','parent_batch_id','qrcode_uid','status','version','alert_level','last_alert_time','inspection_status','quarantine_status','create_time','update_time','create_by','update_by','deleted'],
  inv_inbound_order: ['id','order_no','order_type','warehouse_id','warehouse_code','warehouse_name','supplier_id','supplier_name','operator_id','operator_name','po_id','po_no','source_type','source_order_id','grn_type','total_amount','currency','exchange_rate','base_total_amount','total_quantity','status','qc_status','inbound_date','remark','create_by','create_time','update_by','update_time','deleted'],
  inv_inbound_item: ['id','order_id','material_id','material_name','material_spec','batch_no','quantity','unit','unit_price','total_price','base_unit_price','base_amount','warehouse_location','produce_date','expire_date','width','batch_type','purchase_order_item_id','purchase_order_line_no','remark','create_time','deleted'],
  inv_warehouse: ['id','category_id','warehouse_code','warehouse_name','warehouse_type','province','city','address','manager_id','contact_phone','status','remark','deleted','create_by','update_by','create_time','update_time'],
  inv_inventory: ['id','material_id','material_code','material_name','warehouse_id','warehouse_name','quantity','available_qty','batch_no','locked_qty','unit','unit_cost','total_cost','safety_stock','version','deleted','create_by','update_by','create_time','update_time'],
  inv_outbound_order: ['id','order_no','order_date','outbound_type','warehouse_id','warehouse_code','warehouse_name','total_qty','total_amount','currency','exchange_rate','base_total_amount','status','remark','operator_name','operator_id','audit_status','auditor_name','audit_time','create_by','deleted','version','create_time','update_time'],
  inv_outbound_item: ['id','order_id','material_id','material_name','material_spec','quantity','unit','unit_price','amount','base_unit_price','base_amount','batch_no','width','batch_type','remark','deleted','create_time'],
  inv_transfer_order: ['id','transfer_no','type','from_warehouse_id','to_warehouse_id','from_location','to_location','status','applicant_id','applicant_name','approver_id','approver_name','operator_id','operator_name','out_time','in_time','total_qty','total_amount','version','remark','deleted','create_by','update_by','create_time','update_time'],
  inv_stocktaking: ['id','taking_no','taking_type','warehouse_id','status','taking_date','operator_id','operator_name','remark','deleted','create_by','update_by','create_time','update_time'],
};

const tables = Object.keys(drizzle);

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  let totalMissing = 0, totalExtra = 0;
  for (const t of tables) {
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
      [env.DB_NAME, t]
    );
    const liveCols = rows.map(r => r.COLUMN_NAME);
    const d = new Set(drizzle[t]);
    const missing = liveCols.filter(c => !d.has(c));   // in live, absent in Drizzle
    const extra = drizzle[t].filter(c => !liveCols.includes(c)); // in Drizzle, absent in live
    totalMissing += missing.length; totalExtra += extra.length;
    console.log(`\n=== ${t} : live=${liveCols.length} drizzle=${drizzle[t].length} ===`);
    if (missing.length) console.log('  MISSING in Drizzle (live has): ' + missing.join(', '));
    if (extra.length)   console.log('  EXTRA in Drizzle (not in live): ' + extra.join(', '));
    if (!missing.length && !extra.length) console.log('  OK: identical');
  }
  console.log(`\n>>> TOTAL missing=${totalMissing} extra=${totalExtra}`);
  await conn.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
