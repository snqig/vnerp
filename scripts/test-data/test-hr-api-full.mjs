import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  
  console.log('━━━ 完整验证 HR 数据 ━━━\n');

  // 1. hr_shift - 验证数据和字段名
  console.log('1. hr_shift (班次)');
  const [shifts] = await conn.execute(`SELECT id, shift_name, start_time, end_time, allow_overtime, overtime_rate, night_allowance, late_threshold, early_leave_threshold, working_hours, status FROM hr_shift WHERE deleted = 0 ORDER BY sort_order`);
  console.log('记录数:', shifts.length);
  if (shifts.length > 0) {
    console.log('字段:', Object.keys(shifts[0]));
  }
  console.log();

  // 2. hr_schedule - 验证数据和字段名
  console.log('2. hr_schedule (排班)');
  const [schedules] = await conn.execute(`SELECT id, employee_id, schedule_date, shift_id, schedule_type, source, status FROM hr_schedule ORDER BY schedule_date DESC LIMIT 5`);
  console.log('记录数:', schedules.length);
  if (schedules.length > 0) {
    console.log('字段:', Object.keys(schedules[0]));
  }
  console.log();

  // 3. hr_skill_matrix - 验证数据和字段名
  console.log('3. hr_skill_matrix (技能)');
  const [skills] = await conn.execute(`SELECT id, employee_id, skill_code, skill_name, skill_category, skill_level, certified, assessor, assess_date, next_assess_date, remark FROM hr_skill_matrix WHERE deleted = 0 LIMIT 5`);
  console.log('记录数:', skills.length);
  if (skills.length > 0) {
    console.log('字段:', Object.keys(skills[0]));
  }
  console.log();

  // 4. hr_certificate - 验证数据和字段名
  console.log('4. hr_certificate (证书)');
  const [certs] = await conn.execute(`SELECT id, employee_id, cert_name, cert_code, cert_type, issue_authority, issue_date, expiry_date, remind_days, status, remark FROM hr_certificate WHERE deleted = 0 LIMIT 5`);
  console.log('记录数:', certs.length);
  if (certs.length > 0) {
    console.log('字段:', Object.keys(certs[0]));
  }
  console.log();

  // 5. 验证 sys_employee 表（用于关联）
  console.log('5. sys_employee (员工)');
  const [employees] = await conn.execute(`SELECT id, name FROM sys_employee LIMIT 5`);
  console.log('记录数:', employees.length);
  console.log();

  // 6. 测试关联查询
  console.log('6. 排班 + 员工 + 班次 关联查询');
  const [scheduleJoin] = await conn.execute(`
    SELECT 
      s.id, s.employee_id, e.name AS employee_name, 
      s.shift_id, sh.shift_name, s.schedule_date AS start_date, 
      s.schedule_date AS end_date, s.status 
    FROM hr_schedule s
    LEFT JOIN hr_shift sh ON s.shift_id = sh.id
    LEFT JOIN sys_employee e ON s.employee_id = e.id
    ORDER BY s.schedule_date DESC LIMIT 3
  `);
  console.log('记录数:', scheduleJoin.length);
  if (scheduleJoin.length > 0) {
    console.log('字段:', Object.keys(scheduleJoin[0]));
    console.log('示例数据:', JSON.stringify(scheduleJoin[0], null, 2));
  }
  console.log();

  // 7. 测试技能 + 员工 关联查询
  console.log('7. 技能 + 员工 关联查询');
  const [skillJoin] = await conn.execute(`
    SELECT 
      sm.id, sm.employee_id, e.name AS employee_name,
      sm.skill_code, sm.skill_name, sm.skill_category,
      sm.skill_level, sm.certified, sm.assessor, sm.assess_date,
      sm.next_assess_date, sm.remark
    FROM hr_skill_matrix sm
    LEFT JOIN sys_employee e ON sm.employee_id = e.id
    WHERE sm.deleted = 0 LIMIT 3
  `);
  console.log('记录数:', skillJoin.length);
  if (skillJoin.length > 0) {
    console.log('字段:', Object.keys(skillJoin[0]));
    console.log('示例数据:', JSON.stringify(skillJoin[0], null, 2));
  }
  console.log();

  // 8. 测试证书 + 员工 关联查询
  console.log('8. 证书 + 员工 关联查询');
  const [certJoin] = await conn.execute(`
    SELECT 
      c.id, c.employee_id, e.name AS employee_name,
      c.cert_name, c.cert_code, c.cert_type, c.issue_authority,
      c.issue_date, c.expiry_date, c.status, c.remind_days,
      c.file_url, c.remark
    FROM hr_certificate c
    LEFT JOIN sys_employee e ON c.employee_id = e.id
    WHERE c.deleted = 0 LIMIT 3
  `);
  console.log('记录数:', certJoin.length);
  if (certJoin.length > 0) {
    console.log('字段:', Object.keys(certJoin[0]));
    console.log('示例数据:', JSON.stringify(certJoin[0], null, 2));
  }

  await conn.end();
  
  console.log('\n━━━ 验证完成 ━━━');
}

main().catch(console.error);
