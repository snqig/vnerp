import mysql from 'mysql2/promise';
const c = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:'Snqig521223',database:'vnerpdacahng'});
// 主对账：inv_inventory vs SUM(inv_inventory_batch) by material+warehouse
const [diff] = await c.execute(`
  SELECT i.material_id, i.warehouse_id, i.quantity AS sum_qty, i.available_qty AS sum_avail,
         b.q AS batch_qty, b.a AS batch_avail
  FROM inv_inventory i
  LEFT JOIN (
    SELECT material_id, warehouse_id, SUM(quantity) q, SUM(available_qty) a
    FROM inv_inventory_batch WHERE deleted=0 GROUP BY material_id, warehouse_id
  ) b ON b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id
  WHERE i.deleted=0 AND (b.q IS NULL OR ABS(i.quantity-b.q)>0.001 OR ABS(i.available_qty-b.a)>0.001)
`);
console.log('主对账差异行数:', diff.length);
// 行内矛盾
const [inner] = await c.execute(`SELECT COUNT(*) cnt FROM inv_inventory WHERE deleted=0 AND available_qty>quantity`);
console.log('行内矛盾(avail>qty)行数:', inner[0].cnt);
// 流水账行数
const [txn] = await c.execute(`SELECT COUNT(*) cnt FROM inv_inventory_transaction`);
console.log('当前 inv_inventory_transaction 行数:', txn[0].cnt);
await c.end();
