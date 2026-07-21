const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({ 
    host: 'localhost', 
    user: 'root', 
    password: process.env.DB_PASSWORD, 
    database: 'vnerpdacahng' 
  });
  
  console.log('=== 检查 CEO API 查询条件 ===');
  
  console.log('\n1. 今日销售订单');
  let [rows] = await conn.execute('SELECT COUNT(*) as total FROM sal_order WHERE deleted = 0 AND DATE(create_time) = CURDATE()');
  console.log('今日订单:', rows[0].total);
  
  [rows] = await conn.execute('SELECT COUNT(*) as total FROM sal_order WHERE deleted = 0');
  console.log('总订单数:', rows[0].total);
  
  [rows] = await conn.execute('SELECT create_time FROM sal_order WHERE deleted = 0 LIMIT 3');
  console.log('订单日期样例:', JSON.stringify(rows));

  console.log('\n2. 今日工艺卡');
  [rows] = await conn.execute('SELECT COUNT(*) as total FROM prd_process_card WHERE deleted = 0 AND DATE(create_time) = CURDATE()');
  console.log('今日工艺卡:', rows[0].total);
  
  [rows] = await conn.execute('SELECT COUNT(*) as total FROM prd_process_card WHERE deleted = 0');
  console.log('总工艺卡数:', rows[0].total);
  
  [rows] = await conn.execute('SELECT create_time, burdening_status FROM prd_process_card WHERE deleted = 0 LIMIT 5');
  console.log('工艺卡状态:', JSON.stringify(rows));

  console.log('\n3. 生产工单状态');
  [rows] = await conn.execute('SELECT COUNT(*) as total FROM prod_work_order WHERE deleted = 0 AND status IN ("pending","producing")');
  console.log('待生产/生产中工单:', rows[0].total);
  
  [rows] = await conn.execute('SELECT status, COUNT(*) as cnt FROM prod_work_order WHERE deleted = 0 GROUP BY status');
  console.log('工单状态分布:', JSON.stringify(rows));

  console.log('\n4. 设备');
  [rows] = await conn.execute('SELECT COUNT(*) as total FROM eqp_equipment WHERE deleted = 0 AND status = 1');
  console.log('活跃设备:', rows[0].total);
  
  [rows] = await conn.execute('SELECT equipment_code, equipment_name, current_status, oee FROM eqp_equipment WHERE deleted = 0 LIMIT 5');
  console.log('设备数据:', JSON.stringify(rows));

  console.log('\n5. 质检');
  [rows] = await conn.execute('SELECT COUNT(*) as total FROM qc_inspection WHERE deleted = 0');
  console.log('质检总数:', rows[0].total);
  
  [rows] = await conn.execute('SELECT inspection_result, COUNT(*) as cnt FROM qc_inspection WHERE deleted = 0 GROUP BY inspection_result');
  console.log('质检结果分布:', JSON.stringify(rows));

  console.log('\n6. 应收应付');
  [rows] = await conn.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM fin_receivable WHERE deleted = 0 AND status = 1');
  console.log('应收:', rows[0]);
  
  [rows] = await conn.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM fin_payable WHERE deleted = 0 AND status = 1');
  console.log('应付:', rows[0]);

  console.log('\n7. 物料库存');
  [rows] = await conn.execute('SELECT COUNT(*) as total FROM inv_material WHERE deleted = 0 AND status = 1');
  console.log('活跃物料:', rows[0].total);
  
  [rows] = await conn.execute('SELECT material_name, stock_qty, unit_price FROM inv_material WHERE deleted = 0 AND status = 1 LIMIT 3');
  console.log('物料数据:', JSON.stringify(rows));

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });