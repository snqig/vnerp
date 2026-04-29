const mysql = require('mysql2/promise');

async function verifyData() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  console.log('========================================');
  console.log('验证各模块数据');
  console.log('========================================\n');

  // 1. 客户管理
  const [customers] = await connection.execute('SELECT COUNT(*) as count FROM crm_customer WHERE customer_code LIKE "CUST2024%"');
  const [customerList] = await connection.execute('SELECT customer_code, customer_name, contact_name FROM crm_customer WHERE customer_code LIKE "CUST2024%" LIMIT 5');
  console.log(`✓ 订单管理 - 客户: ${customers[0].count} 条`);
  customerList.forEach(c => console.log(`  - ${c.customer_code}: ${c.customer_name} (${c.contact_name})`));
  console.log('');

  // 2. 采购申请
  const [purchaseRequests] = await connection.execute('SELECT COUNT(*) as count FROM pur_request WHERE request_no LIKE "PR202403%"');
  const [prList] = await connection.execute('SELECT request_no, requester_name, total_amount, status FROM pur_request WHERE request_no LIKE "PR202403%" LIMIT 5');
  console.log(`✓ 采购管理 - 采购申请: ${purchaseRequests[0].count} 条`);
  prList.forEach(pr => {
    const statusText = pr.status === 1 ? '待审批' : pr.status === 2 ? '审批中' : '已批准';
    console.log(`  - ${pr.request_no}: ${pr.requester_name} ¥${pr.total_amount} (${statusText})`);
  });
  console.log('');

  // 3. 仓库
  const [warehouses] = await connection.execute('SELECT COUNT(*) as count FROM inv_warehouse');
  const [whList] = await connection.execute('SELECT warehouse_code, warehouse_name, warehouse_type FROM inv_warehouse LIMIT 5');
  console.log(`✓ 仓库管理 - 仓库: ${warehouses[0].count} 个`);
  whList.forEach(wh => console.log(`  - ${wh.warehouse_code}: ${wh.warehouse_name}`));
  console.log('');

  // 4. 库存记录
  const [inventoryLogs] = await connection.execute('SELECT COUNT(*) as count FROM inv_inventory_log');
  const [logList] = await connection.execute('SELECT business_type, business_no, operation_qty, remark FROM inv_inventory_log LIMIT 5');
  console.log(`✓ 仓库管理 - 库存记录: ${inventoryLogs[0].count} 条`);
  logList.forEach(log => console.log(`  - ${log.business_type}: ${log.business_no} (${log.operation_qty})`));
  console.log('');

  // 5. 标准卡
  const [standardCards] = await connection.execute('SELECT COUNT(*) as count FROM prd_standard_card');
  const [scList] = await connection.execute('SELECT card_no, customer_name, product_name, status FROM prd_standard_card LIMIT 5');
  console.log(`✓ 生产管理 - 标准卡: ${standardCards[0].count} 条`);
  scList.forEach(sc => {
    const statusText = sc.status === 1 ? '草稿' : sc.status === 2 ? '审核中' : '已发布';
    console.log(`  - ${sc.card_no}: ${sc.customer_name} - ${sc.product_name} (${statusText})`);
  });
  console.log('');

  // 6. 打样订单
  const [sampleOrders] = await connection.execute('SELECT COUNT(*) as count FROM sample_order WHERE sample_no LIKE "SP202403%"');
  const [soList] = await connection.execute('SELECT sample_no, customer_name, product_name, progress_status FROM sample_order WHERE sample_no LIKE "SP202403%" LIMIT 5');
  console.log(`✓ 打样中心 - 打样订单: ${sampleOrders[0].count} 条`);
  soList.forEach(so => console.log(`  - ${so.sample_no}: ${so.customer_name} - ${so.product_name} (${so.progress_status})`));
  console.log('');

  // 7. 员工
  const [employees] = await connection.execute('SELECT COUNT(*) as count FROM sys_employee');
  const [empList] = await connection.execute('SELECT employee_no, name, dept_name, position FROM sys_employee LIMIT 5');
  console.log(`✓ 人事管理 - 员工: ${employees[0].count} 人`);
  empList.forEach(emp => console.log(`  - ${emp.employee_no}: ${emp.name} (${emp.dept_name} - ${emp.position})`));
  console.log('');

  console.log('========================================');
  console.log('数据验证完成！');
  console.log('========================================');

  await connection.end();
}

verifyData().catch(console.error);
