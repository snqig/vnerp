// 检查实际表结构（实际DB与drizzle schema有差异）
const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root',
    password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
  });

  const cols = async (table) => {
    const [rows] = await c.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
      [table]
    );
    console.log(`\n===== ${table} columns (${rows.length}) =====`);
    rows.forEach(r => console.log(`  ${r.COLUMN_NAME} | ${r.DATA_TYPE} | nullable=${r.IS_NULLABLE} | key=${r.COLUMN_KEY} | default=${r.COLUMN_DEFAULT}`));
  };

  const run = async (label, sql) => {
    try {
      const [rows] = await c.execute(sql);
      console.log(`\n===== ${label} (${rows.length} rows) =====`);
      console.log(JSON.stringify(rows, null, 2));
    } catch (e) { console.log(`\n===== ${label} ERROR: ${e.message} =====`); }
  };

  // 实际存在的 HR 表
  await run('SHOW TABLES hr_%', `SHOW TABLES LIKE 'hr_%'`);
  await run('SHOW TABLES prd_%', `SHOW TABLES LIKE 'prd_%'`);
  await run('SHOW TABLES inv_%', `SHOW TABLES LIKE 'inv_%'`);
  await run('SHOW TABLES pur_%', `SHOW TABLES LIKE 'pur_%'`);

  // 关键表的实际列
  await cols('pur_supplier');
  await cols('sys_employee');
  await cols('hr_salary_profile');
  await cols('pur_purchase_order');
  await cols('inv_inventory_batch');
  await cols('inv_inbound_order');
  await cols('inv_inbound_item');
  await cols('prd_work_order');
  await cols('prd_schedule');
  await cols('prd_material_issue');
  await cols('prd_material_issue_item');

  // 实际供应商数据
  await run('pur_supplier data', `SELECT id, supplier_code, supplier_name, status FROM pur_supplier WHERE deleted=0 ORDER BY id LIMIT 10`);
  // 实际员工数据
  await run('sys_employee data', `SELECT id, employee_no, name, dept_name, position, status FROM sys_employee WHERE deleted=0 ORDER BY id LIMIT 10`);
  // 实际薪资档案
  await run('hr_salary_profile data', `SELECT * FROM hr_salary_profile LIMIT 5`);

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
