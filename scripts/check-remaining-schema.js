// 检查 sal_order / inv_outbound_item / hr_salary_calculation 实际列
const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root',
    password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
  });
  const cols = async (t) => {
    const [rows] = await c.execute(
      `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`, [t]);
    console.log(`\n===== ${t} (${rows.length} cols) =====`);
    console.log(rows.map(r => `${r.COLUMN_NAME}(${r.DATA_TYPE})`).join(', '));
  };
  await cols('sal_order');
  await cols('sal_order_detail');
  await cols('inv_outbound_item');
  await cols('hr_salary_calculation');
  // 检查 employee 1002-1005 是否存在
  const [emp] = await c.execute(`SELECT id, employee_no, name FROM sys_employee WHERE id IN (1001,1002,1003,1004,1005)`);
  console.log('\n===== employees 1001-1005 =====');
  console.log(JSON.stringify(emp));
  // 检查产品物料 (空调控制面板标签)
  const [prod] = await c.execute(`SELECT id, material_code, material_name, unit FROM inv_material WHERE material_name LIKE '%空调%' OR material_name LIKE '%标签%' ORDER BY id LIMIT 5`);
  console.log('\n===== product materials =====');
  console.log(JSON.stringify(prod));
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
