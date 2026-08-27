import mysql from 'mysql2/promise';
const c = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:'Snqig521223',database:'vnerpdacahng'});
const [txn] = await c.execute(`SELECT trans_type, source_type, COUNT(*) cnt, SUM(quantity) q FROM inv_inventory_transaction GROUP BY trans_type, source_type ORDER BY trans_type`);
console.log('=== 流水账 inv_inventory_transaction ===');
txn.forEach(r=>console.log(`  ${r.trans_type}\t${r.source_type}\t笔数=${r.cnt}\t数量=${r.q}`));
const [sum] = await c.execute(`SELECT i.material_name, i.quantity, i.available_qty, (SELECT SUM(quantity) FROM inv_inventory_batch b WHERE b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id AND b.deleted=0) batch_qty, (SELECT SUM(available_qty) FROM inv_inventory_batch b WHERE b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id AND b.deleted=0) batch_avail FROM inv_inventory i WHERE i.deleted=0 AND i.warehouse_id=1`);
console.log('\n=== 汇总表 inv_inventory (WH001) vs 批次 SUM ===');
sum.forEach(r=>console.log(`  ${r.material_name}\t汇总(${r.quantity}/${r.available_qty})\t批次(${r.batch_qty}/${r.batch_avail})`));
// 对账
const [diff] = await c.execute(`SELECT COUNT(*) cnt FROM inv_inventory i LEFT JOIN (SELECT material_id,warehouse_id,SUM(quantity) q,SUM(available_qty) a FROM inv_inventory_batch WHERE deleted=0 GROUP BY material_id,warehouse_id) b ON b.material_id=i.material_id AND b.warehouse_id=i.warehouse_id WHERE i.deleted=0 AND (b.q IS NULL OR ABS(i.quantity-b.q)>0.001 OR ABS(i.available_qty-b.a)>0.001)`);
console.log('\n主对账差异行数:', diff[0].cnt);
await c.end();
