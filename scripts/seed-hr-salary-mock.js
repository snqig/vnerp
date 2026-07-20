const mysql = require('mysql2/promise');

const mockEmployees = [
  { id: 1001, employeeNo: 'EMP001', name: '张三', deptId: 1, remark: '8000' },
  { id: 1002, employeeNo: 'EMP002', name: '李四', deptId: 1, remark: '6500' },
  { id: 1003, employeeNo: 'EMP003', name: '王五', deptId: 2, remark: '5000' },
  { id: 1004, employeeNo: 'EMP004', name: '赵六', deptId: 2, remark: '7000' },
  { id: 1005, employeeNo: 'EMP005', name: '钱七', deptId: 3, remark: '9000' },
];

const mockSalaryProfiles = [
  { employeeId: 1001, baseSalary: 8000, socialInsuranceBase: 8000, housingFundRate: 12, taxDeduction: 5000, effectiveDate: '2026-01-01' },
  { employeeId: 1002, baseSalary: 6500, socialInsuranceBase: 6500, housingFundRate: 8, taxDeduction: 5000, effectiveDate: '2026-01-01' },
  { employeeId: 1003, baseSalary: 5000, socialInsuranceBase: 5000, housingFundRate: 8, taxDeduction: 5000, effectiveDate: '2026-01-01' },
  { employeeId: 1004, baseSalary: 7000, socialInsuranceBase: 7000, housingFundRate: 10, taxDeduction: 5000, effectiveDate: '2026-01-01' },
  { employeeId: 1005, baseSalary: 9000, socialInsuranceBase: 9000, housingFundRate: 12, taxDeduction: 5000, effectiveDate: '2026-01-01' },
];

const createSalaryProfileTable = `
CREATE TABLE IF NOT EXISTS hr_salary_profile (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  salary_type VARCHAR(20) DEFAULT 'mixed',
  base_salary DECIMAL(10,2) DEFAULT '0.00',
  social_insurance_base DECIMAL(10,2) DEFAULT '0.00',
  housing_fund_rate DECIMAL(5,2) DEFAULT '0.00',
  tax_deduction DECIMAL(10,2) DEFAULT '0.00',
  bank_account VARCHAR(50),
  bank_name VARCHAR(100),
  effective_date DATE NOT NULL,
  status TINYINT DEFAULT 1,
  remark TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sp_employee (employee_id),
  INDEX idx_sp_effective (effective_date),
  UNIQUE INDEX uk_sp_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const createSalaryCalculationTable = `
CREATE TABLE IF NOT EXISTS hr_salary_calculation (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  calc_month VARCHAR(7) NOT NULL,
  base_salary DECIMAL(10,2) DEFAULT '0.00',
  piece_salary DECIMAL(10,2) DEFAULT '0.00',
  overtime_salary DECIMAL(10,2) DEFAULT '0.00',
  performance_salary DECIMAL(10,2) DEFAULT '0.00',
  allowances DECIMAL(10,2) DEFAULT '0.00',
  social_insurance_personal DECIMAL(10,2) DEFAULT '0.00',
  housing_fund_personal DECIMAL(10,2) DEFAULT '0.00',
  individual_tax DECIMAL(10,2) DEFAULT '0.00',
  attendance_deduction DECIMAL(10,2) DEFAULT '0.00',
  other_deduction DECIMAL(10,2) DEFAULT '0.00',
  gross_pay DECIMAL(10,2) DEFAULT '0.00',
  total_deduction DECIMAL(10,2) DEFAULT '0.00',
  net_pay DECIMAL(10,2) DEFAULT '0.00',
  status VARCHAR(20) DEFAULT 'draft',
  calc_log TEXT,
  confirm_time DATETIME,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sc_employee (employee_id),
  INDEX idx_sc_month (calc_month),
  UNIQUE INDEX uk_sc_employee_month (employee_id, calc_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function seedMockData() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'vnerpdacahng',
  });

  console.log('=== HR薪资模拟数据生成脚本 ===');
  console.log('');

  console.log('[0/4] 创建HR薪资相关表...');
  try {
    await c.execute(createSalaryProfileTable);
    console.log('  ✓ 创建 hr_salary_profile 表');
  } catch (e) {
    console.log(`  ~ hr_salary_profile: ${e.message}`);
  }
  try {
    await c.execute(createSalaryCalculationTable);
    console.log('  ✓ 创建 hr_salary_calculation 表');
  } catch (e) {
    console.log(`  ~ hr_salary_calculation: ${e.message}`);
  }

  console.log('');
  console.log('[1/4] 插入模拟员工数据...');
  for (const emp of mockEmployees) {
    try {
      await c.execute(
        'INSERT INTO sys_employee (id, employee_no, name, dept_id, remark, status) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE employee_no=?, name=?, dept_id=?, remark=?',
        [emp.id, emp.employeeNo, emp.name, emp.deptId, emp.remark, emp.employeeNo, emp.name, emp.deptId, emp.remark]
      );
      console.log(`  ✓ 员工 ${emp.id}: ${emp.name} (基本工资: ${emp.remark})`);
    } catch (e) {
      console.log(`  ~ 员工 ${emp.id}: ${e.message}`);
    }
  }

  console.log('');
  console.log('[2/4] 插入模拟薪资档案...');
  for (const profile of mockSalaryProfiles) {
    try {
      await c.execute(
        'INSERT INTO hr_salary_profile (employee_id, base_salary, social_insurance_base, housing_fund_rate, tax_deduction, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE base_salary=?, social_insurance_base=?, housing_fund_rate=?',
        [profile.employeeId, profile.baseSalary, profile.socialInsuranceBase, profile.housingFundRate, profile.taxDeduction, profile.effectiveDate, profile.baseSalary, profile.socialInsuranceBase, profile.housingFundRate]
      );
      console.log(`  ✓ 薪资档案 ${profile.employeeId}: 基本工资=${profile.baseSalary}, 公积金比例=${profile.housingFundRate}%`);
    } catch (e) {
      console.log(`  ~ 薪资档案 ${profile.employeeId}: ${e.message}`);
    }
  }

  console.log('');
  console.log('[3/4] 清理旧的计算结果...');
  try {
    await c.execute('DELETE FROM hr_salary_calculation');
    console.log('  ✓ 已清空 hr_salary_calculation 表');
  } catch (e) {
    console.log(`  ~ 清理失败: ${e.message}`);
  }

  await c.end();

  console.log('');
  console.log('=== 模拟数据插入完成 ===');
  console.log('');
  console.log('测试数据清单:');
  console.log('┌───────┬────────┬───────┬────────────┬─────────────┐');
  console.log('│ 员工ID │ 姓名   │ 部门  │ 基本工资   │ 公积金比例 │');
  console.log('├───────┼────────┼───────┼────────────┼─────────────┤');
  for (let i = 0; i < mockEmployees.length; i++) {
    const emp = mockEmployees[i];
    const prof = mockSalaryProfiles[i];
    console.log(`│ ${emp.id.toString().padStart(5)} │ ${emp.name.padEnd(4)} │ ${emp.deptId.toString().padStart(4)} │ ${prof.baseSalary.toString().padStart(8)} │ ${prof.housingFundRate.toString().padStart(9)}% │`);
  }
  console.log('└───────┴────────┴───────┴────────────┴─────────────┘');
  console.log('');
  console.log('测试方法:');
  console.log('  1. 启动开发服务器: pnpm dev');
  console.log('  2. 访问薪资计算页面: http://localhost:5000/hr/salary/calculate');
  console.log('  3. 单员工计算: 输入员工ID (1001-1005), 选择月份, 点击"执行计算"');
  console.log('  4. 批量计算: 切换到批量模式, 选择月份, 点击"执行计算"');
  console.log('  5. 查看工资条: 访问 http://localhost:5000/hr/salary/payslips');
}

seedMockData().catch(e => {
  console.error('脚本执行失败:', e);
  process.exit(1);
});