const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({ 
    host: 'localhost', 
    user: 'root', 
    password: process.env.DB_PASSWORD, 
    database: 'vnerpdacahng' 
  });
  
  console.log('=== 开始插入测试数据 ===');

  console.log('\n1. 插入设备数据...');
  const equipmentData = [
    { equipment_code: 'EQ001', equipment_name: '丝网印刷机A', equipment_type: 'printing', current_status: 1, oee: 85.5, total_run_hours: 1250 },
    { equipment_code: 'EQ002', equipment_name: '丝网印刷机B', equipment_type: 'printing', current_status: 1, oee: 82.3, total_run_hours: 1180 },
    { equipment_code: 'EQ003', equipment_name: '烘干设备A', equipment_type: 'drying', current_status: 2, oee: 78.9, total_run_hours: 980 },
    { equipment_code: 'EQ004', equipment_name: '检测设备A', equipment_type: 'testing', current_status: 1, oee: 92.1, total_run_hours: 750 },
    { equipment_code: 'EQ005', equipment_name: '切割机A', equipment_type: 'cutting', current_status: 3, oee: 0, total_run_hours: 620 },
    { equipment_code: 'EQ006', equipment_name: '印刷机C', equipment_type: 'printing', current_status: 1, oee: 79.8, total_run_hours: 1320 },
    { equipment_code: 'EQ007', equipment_name: 'UV固化机', equipment_type: 'drying', current_status: 1, oee: 88.6, total_run_hours: 890 },
    { equipment_code: 'EQ008', equipment_name: '质检机B', equipment_type: 'testing', current_status: 2, oee: 0, total_run_hours: 560 },
  ];
  
  for (const eq of equipmentData) {
    await conn.execute(
      `INSERT IGNORE INTO eqp_equipment (equipment_code, equipment_name, equipment_type, current_status, oee, total_run_hours, status, create_time) 
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [eq.equipment_code, eq.equipment_name, eq.equipment_type, eq.current_status, eq.oee, eq.total_run_hours]
    );
  }
  console.log('设备数据插入完成');

  console.log('\n2. 更新生产工单状态为字符串格式...');
  const statusMap = {
    '1': 'pending',
    '2': 'confirmed',
    '3': 'producing',
    '4': 'completed',
    '5': 'cancelled'
  };
  
  for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
    await conn.execute(
      `UPDATE prod_work_order SET status = ? WHERE status = ? AND deleted = 0`,
      [newStatus, oldStatus]
    );
  }
  console.log('生产工单状态更新完成');

  console.log('\n3. 更新工艺卡状态...');
  await conn.execute(
    `UPDATE prd_process_card SET burdening_status = 3 WHERE burdening_status = 1 LIMIT 3`
  );
  await conn.execute(
    `UPDATE prd_process_card SET burdening_status = 2 WHERE burdening_status = 2 LIMIT 2`
  );
  console.log('工艺卡状态更新完成');

  console.log('\n4. 跳过质检记录（已有数据）...');
  console.log('质检记录跳过');

  console.log('\n5. 插入应付数据...');
  await conn.execute(
    `INSERT IGNORE INTO fin_payable (supplier_id, amount, status, create_time) 
     VALUES (1, 150000.00, 1, NOW())`
  );
  console.log('应付数据插入完成');

  console.log('\n=== 验证数据 ===');
  
  let [rows] = await conn.execute('SELECT COUNT(*) as count FROM eqp_equipment WHERE deleted = 0');
  console.log('设备总数:', rows[0].count);
  
  [rows] = await conn.execute('SELECT DISTINCT status FROM prod_work_order WHERE deleted = 0');
  console.log('工单状态分布:', JSON.stringify(rows));
  
  [rows] = await conn.execute('SELECT COUNT(*) as count FROM qc_inspection WHERE deleted = 0');
  console.log('质检记录总数:', rows[0].count);
  
  [rows] = await conn.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM fin_payable WHERE deleted = 0');
  console.log('应付数据:', rows[0]);

  await conn.end();
  console.log('\n=== 测试数据插入完成 ===');
}

main().catch(e => { console.error(e); process.exit(1); });