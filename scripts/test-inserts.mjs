import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
});

console.log('-- inv_warehouse --');
const [w] = await db.execute('SELECT id, warehouse_code, warehouse_name FROM inv_warehouse LIMIT 5');
console.table(w);

console.log('\n-- inv_material --');
const [m] = await db.execute('SELECT id, material_code, material_name FROM inv_material LIMIT 5');
console.table(m);

console.log('\n-- fin_receivable columns check --');
try {
  // try the new INSERT
  await db.execute(`INSERT INTO fin_receivable (receivable_no, source_type, source_no, customer_id, amount, received_amount, balance, due_date, status, create_time, update_time, deleted) VALUES ('RC_TEST_001', 1, 'TEST', NULL, 100, 0, 100, '2025-02-15', 1, NOW(), NOW(), 0)`);
  console.log('fin_receivable insert OK');
  await db.execute(`DELETE FROM fin_receivable WHERE receivable_no='RC_TEST_001'`);
} catch (e) {
  console.log('fin_receivable ERROR:', e.message);
}

console.log('\n-- inv_inbound_order test insert --');
try {
  await db.execute(`INSERT INTO inv_inbound_order (order_no, supplier_name, warehouse_id, inbound_date, status, total_quantity, total_amount, create_time, update_time, deleted) VALUES ('IN_TEST_001', 'test supplier', 1, CURDATE(), 'pending', 100, 1000, NOW(), NOW(), 0)`);
  console.log('inv_inbound_order insert OK');
  await db.execute(`DELETE FROM inv_inbound_order WHERE order_no='IN_TEST_001'`);
} catch (e) {
  console.log('inv_inbound_order ERROR:', e.message);
}

console.log('\n-- inv_inventory test insert --');
try {
  await db.execute(`INSERT IGNORE INTO inv_inventory (material_id, material_name, quantity, available_qty, safety_stock, warehouse_id, unit, create_time, update_time, deleted) VALUES (1, 'test', 100, 100, 50, 1, '卷', NOW(), NOW(), 0)`);
  console.log('inv_inventory insert OK');
  await db.execute(`DELETE FROM inv_inventory WHERE material_name='test'`);
} catch (e) {
  console.log('inv_inventory ERROR:', e.message);
}

await db.end();
