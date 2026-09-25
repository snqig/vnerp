const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' });

  console.log('=== sal_order 验证 ===');
  const [orders] = await c.query('SELECT order_no, customer_id, status, total_amount, order_date FROM sal_order WHERE deleted=0 ORDER BY id LIMIT 5');
  for (const o of orders) console.log(`  ${o.order_no}  cust=${o.customer_id}  status=${o.status}  amount=${o.total_amount}  date=${o.order_date}`);
  const [oCnt] = await c.query('SELECT COUNT(*) as cnt FROM sal_order WHERE deleted=0');
  console.log(`  总订单数: ${(oCnt[0]).cnt}`);

  const [dCnt] = await c.query('SELECT COUNT(*) as cnt FROM sal_order_detail WHERE deleted=0');
  console.log(`  明细行数: ${(dCnt[0]).cnt}`);

  console.log('\n=== plm_eco 验证 ===');
  const [ecos] = await c.query('SELECT eco_no, eco_type, status, product_name FROM plm_eco WHERE deleted=0 ORDER BY id LIMIT 5');
  for (const e of ecos) console.log(`  ${e.eco_no}  type=${e.eco_type}  status=${e.status}  product=${e.product_name}`);
  const [eCnt] = await c.query('SELECT COUNT(*) as cnt FROM plm_eco WHERE deleted=0');
  console.log(`  总 ECO 数: ${(eCnt[0]).cnt}`);

  console.log('\n=== eco_type 列类型 ===');
  const [cols] = await c.query("SHOW COLUMNS FROM plm_eco WHERE Field='eco_type'");
  console.log(`  ${cols[0].Field} ${cols[0].Type} Null=${cols[0].Null}`);

  await c.end();
  console.log('\n✅ 验证完成');
})();
