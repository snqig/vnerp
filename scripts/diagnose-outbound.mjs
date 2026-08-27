import mysql from 'mysql2/promise';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const c = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

console.log('=== 1. 入库单 IB-2026-08-25-SEED-01 ===');
const [inbound] = await c.query(
  `SELECT id, order_no, status, warehouse_id, warehouse_name FROM inv_inbound_order WHERE order_no = 'IB-2026-08-25-SEED-01'`
);
console.table(inbound);

if (inbound.length > 0) {
  console.log('=== 2. 该入库单的明细（批次 BAT-2026-08-25-01）===');
  const [inboundItems] = await c.query(
    `SELECT id, material_id, material_code, material_name, batch_no, quantity, unit FROM inv_inbound_item WHERE order_id = ?`,
    [inbound[0].id]
  );
  console.table(inboundItems);
}

console.log('\n=== 3. 出库单列表（全部）===');
const [outbounds] = await c.query(
  `SELECT id, order_no, status, warehouse_id, warehouse_name, deleted, create_time FROM inv_outbound_order ORDER BY id DESC LIMIT 10`
);
console.table(outbounds);

console.log('\n=== 4. 批次库存 inv_inventory_batch（BAT-2026-08-25-01）===');
try {
  const [batches] = await c.query(
    `SELECT id, batch_no, material_id, warehouse_id, quantity, available_qty, deleted FROM inv_inventory_batch WHERE batch_no = 'BAT-2026-08-25-01' OR material_id = 6`
  );
  console.table(batches);
} catch (e) {
  console.log('表不存在或查询失败:', e.message);
}

console.log('\n=== 5. 汇总库存 inv_inventory（material_id=6, warehouse_id=1）===');
try {
  const [inv] = await c.query(
    `SELECT id, material_id, warehouse_id, quantity, available_quantity FROM inv_inventory WHERE material_id = 6 AND warehouse_id = 1`
  );
  console.table(inv);
} catch (e) {
  console.log('查询失败:', e.message);
  // 尝试其他列名
  try {
    const [inv2] = await c.query(
      `SELECT * FROM inv_inventory WHERE material_id = 6 LIMIT 5`
    );
    console.log('inv_inventory 所有列:');
    console.table(inv2);
  } catch (e2) {
    console.log('表不存在:', e2.message);
  }
}

console.log('\n=== 6. 库存流水 inv_inventory_transaction（material_id=6）===');
try {
  const [txns] = await c.query(
    `SELECT id, trans_type, source_type, source_id, material_id, batch_no, warehouse_id, quantity, create_time FROM inv_inventory_transaction WHERE material_id = 6 ORDER BY id DESC LIMIT 10`
  );
  console.table(txns);
} catch (e) {
  console.log('查询失败:', e.message);
}

await c.end();
