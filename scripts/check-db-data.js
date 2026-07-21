const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({ 
    host: 'localhost', 
    user: 'root', 
    password: process.env.DB_PASSWORD, 
    database: 'vnerpdacahng' 
  });
  
  console.log('=== 数据库表列表 ===');
  const [tables] = await conn.execute('SHOW TABLES');
  tables.forEach((t, i) => {
    const key = Object.keys(t)[0];
    console.log(`${i + 1}. ${t[key]}`);
  });

  console.log('\n=== 销售订单 ===');
  try {
    let [rows] = await conn.execute('SELECT COUNT(*) as count FROM sal_order WHERE deleted = 0');
    console.log('销售订单总数:', rows[0].count);
  } catch(e) {
    console.log('错误:', e.message);
  }

  console.log('\n=== 生产工单 ===');
  try {
    let [rows] = await conn.execute('SELECT COUNT(*) as count FROM prod_work_order WHERE deleted = 0');
    console.log('生产工单总数:', rows[0].count);
    [rows] = await conn.execute('SELECT work_order_no, product_name, customer_name, status, priority FROM prod_work_order WHERE deleted = 0 LIMIT 5');
    console.log('最近5条工单:', JSON.stringify(rows, null, 2));
  } catch(e) {
    console.log('错误:', e.message);
  }

  console.log('\n=== 工艺卡 ===');
  try {
    let [rows] = await conn.execute('SELECT COUNT(*) as count FROM prd_process_card WHERE deleted = 0');
    console.log('工艺卡总数:', rows[0].count);
  } catch(e) {
    console.log('错误:', e.message);
  }

  console.log('\n=== 物料库存 ===');
  try {
    let [rows] = await conn.execute('SELECT COUNT(*) as count FROM inv_material WHERE deleted = 0');
    console.log('物料总数:', rows[0].count);
  } catch(e) {
    console.log('错误:', e.message);
  }

  console.log('\n=== 设备 ===');
  try {
    let [rows] = await conn.execute('SELECT COUNT(*) as count FROM eqp_equipment WHERE deleted = 0');
    console.log('设备总数:', rows[0].count);
  } catch(e) {
    console.log('错误:', e.message);
  }

  console.log('\n=== 质检记录 ===');
  try {
    let [rows] = await conn.execute('SELECT COUNT(*) as count FROM qc_inspection WHERE deleted = 0');
    console.log('质检记录总数:', rows[0].count);
  } catch(e) {
    console.log('错误:', e.message);
  }

  console.log('\n=== 应收应付 ===');
  try {
    let [rows] = await conn.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM fin_receivable WHERE deleted = 0');
    console.log('应收:', rows[0]);
    [rows] = await conn.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM fin_payable WHERE deleted = 0');
    console.log('应付:', rows[0]);
  } catch(e) {
    console.log('错误:', e.message);
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });