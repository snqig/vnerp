import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  
  console.log('━━━ 测试 hr_shift API 查询 ━━━');
  const sql1 = `SELECT id, shift_name, start_time, end_time, allow_overtime, overtime_rate, night_allowance, late_threshold, early_leave_threshold, working_hours, status FROM hr_shift WHERE deleted = 0 ORDER BY sort_order`;
  const [shifts] = await conn.execute(sql1);
  console.log('返回记录数:', shifts.length);
  console.log('数据:', JSON.stringify(shifts, null, 2));

  console.log('\n━━━ 测试 hr_schedule API 查询 ━━━');
  const sql2 = `SELECT id, employee_id, schedule_date, shift_id, schedule_type, source, status FROM hr_schedule ORDER BY schedule_date DESC LIMIT 5`;
  const [schedules] = await conn.execute(sql2);
  console.log('返回记录数:', schedules.length);
  console.log('数据:', JSON.stringify(schedules, null, 2));

  console.log('\n━━━ 测试 hr_skill_matrix API 查询 ━━━');
  const sql3 = `SELECT id, employee_id, skill_code, skill_name, skill_category, skill_level, certified, assessor, assess_date, next_assess_date, remark FROM hr_skill_matrix WHERE deleted = 0 LIMIT 5`;
  const [skills] = await conn.execute(sql3);
  console.log('返回记录数:', skills.length);
  console.log('数据:', JSON.stringify(skills, null, 2));

  console.log('\n━━━ 测试 hr_certificate API 查询 ━━━');
  const sql4 = `SELECT id, employee_id, cert_name, cert_code, cert_type, issue_authority, issue_date, expiry_date, remind_days, status, remark FROM hr_certificate WHERE deleted = 0 LIMIT 5`;
  const [certs] = await conn.execute(sql4);
  console.log('返回记录数:', certs.length);
  console.log('数据:', JSON.stringify(certs, null, 2));

  await conn.end();
}

main().catch(console.error);
