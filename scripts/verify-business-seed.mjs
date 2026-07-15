import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
});

const tables = [
  'crm_customer', 'sal_order', 'sal_order_item', 'fin_receivable',
  'prod_work_order', 'prd_standard_card', 'prd_process_card',
  'qc_final_inspection', 'inv_inbound_order', 'inv_inbound_item',
  'inv_material_label', 'inv_inventory', 'qc_inspection',
  'prd_bom', 'prd_bom_detail', 'pur_supplier', 'pur_order',
  'sys_user', 'sys_role', 'sys_menu', 'sys_role_menu',
];

console.log('Table | Rows');
console.log('------ | ----');
for (const t of tables) {
  try {
    const [rows] = await db.execute(`SELECT COUNT(*) AS c FROM ${t}`);
    console.log(`${t} | ${rows[0].c}`);
  } catch (e) {
    console.log(`${t} | ERROR: ${e.message}`);
  }
}

// sample customer and order
console.log('\n-- crm_customer sample --');
const [c] = await db.execute('SELECT id, customer_code, customer_name, contact_name FROM crm_customer LIMIT 3');
console.table(c);

console.log('\n-- sal_order sample --');
const [o] = await db.execute('SELECT id, order_no, customer_id, total_amount, status FROM sal_order LIMIT 3');
console.table(o);

console.log('\n-- sal_order_item sample --');
const [oi] = await db.execute('SELECT id, order_id, material_name, quantity, unit_price FROM sal_order_item LIMIT 3');
console.table(oi);

await db.end();
