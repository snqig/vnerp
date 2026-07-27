import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.beginTransaction();

  try {
    // 查询现有主数据
    const [employees] = await conn.execute('SELECT id, name FROM sys_employee LIMIT 5');
    console.log(`可用员工: ${employees.length} 人`);

    // ═══════════════════════════════════════════════
    // 1. hr_shift - 修复表结构
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 修复 hr_shift 表 ━━━');
    await conn.execute('DROP TABLE IF EXISTS hr_shift');
    await conn.execute(`
      CREATE TABLE hr_shift (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        shift_name VARCHAR(50) NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        allow_overtime TINYINT DEFAULT 1,
        overtime_rate DECIMAL(3,1) DEFAULT 1.5,
        night_allowance DECIMAL(10,2) DEFAULT 0.00,
        late_threshold INT DEFAULT 15,
        early_leave_threshold INT DEFAULT 15,
        working_hours DECIMAL(4,1),
        sort_order INT DEFAULT 0,
        status TINYINT DEFAULT 1,
        remark TEXT,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted TINYINT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`INSERT INTO hr_shift (shift_name, start_time, end_time, allow_overtime, overtime_rate, night_allowance, late_threshold, early_leave_threshold, working_hours, sort_order, status, remark) VALUES ?`, [
      [['白班', '08:00', '17:00', 1, 1.5, 0.00, 30, 30, 8.0, 1, 1, '正常工作日白班'],
       ['中班', '16:30', '00:30', 1, 1.5, 20.00, 30, 30, 8.0, 2, 1, '中班作业'],
       ['夜班', '00:30', '08:00', 1, 1.5, 30.00, 30, 30, 7.5, 3, 1, '夜班作业']]
    ]);
    console.log('✓ 插入3条班次数据');

    // ═══════════════════════════════════════════════
    // 2. hr_schedule - 修复表结构
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 修复 hr_schedule 表 ━━━');
    await conn.execute('DROP TABLE IF EXISTS hr_schedule');
    await conn.execute(`
      CREATE TABLE hr_schedule (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        schedule_date DATE NOT NULL,
        shift_id BIGINT UNSIGNED,
        schedule_type VARCHAR(20) DEFAULT 'normal',
        source VARCHAR(20) DEFAULT 'manual',
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_sc_emp_date (employee_id, schedule_date),
        KEY idx_sc_date (schedule_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 为每位员工排一周的班
    const schedules = [];
    for (let i = 0; i < employees.length; i++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date();
        date.setDate(date.getDate() - (7 - day));
        const shiftId = day % 3 + 1; // 轮换班次
        schedules.push([employees[i].id, date.toISOString().split('T')[0], shiftId, 'normal', 'manual', 1]);
      }
    }
    await conn.query(`INSERT INTO hr_schedule (employee_id, schedule_date, shift_id, schedule_type, source, status) VALUES ?`, [schedules]);
    console.log(`✓ 插入 ${schedules.length} 条排班数据`);

    // ═══════════════════════════════════════════════
    // 3. hr_skill_matrix - 修复表结构
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 修复 hr_skill_matrix 表 ━━━');
    await conn.execute('DROP TABLE IF EXISTS hr_skill_matrix');
    await conn.execute(`
      CREATE TABLE hr_skill_matrix (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        skill_code VARCHAR(50) NOT NULL,
        skill_name VARCHAR(100) NOT NULL,
        skill_category VARCHAR(50),
        skill_level TINYINT DEFAULT 1,
        certified TINYINT DEFAULT 0,
        certificate_id BIGINT UNSIGNED,
        assessor VARCHAR(50),
        assess_date DATE,
        next_assess_date DATE,
        remark TEXT,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted TINYINT DEFAULT 0,
        KEY idx_sk_employee (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`INSERT INTO hr_skill_matrix (employee_id, skill_code, skill_name, skill_category, skill_level, certified, assessor, assess_date, next_assess_date, remark) VALUES ?`, [
      [[employees[0].id, 'SK-001', '丝网印刷', '印刷技术', 5, 1, '李明', '2026-01-15', '2027-01-15', '高级印刷技师'],
       [employees[0].id, 'SK-002', 'UV固化', '后加工', 4, 1, '王芳', '2026-02-20', '2027-02-20', '熟练操作UV设备'],
       [employees[1].id, 'SK-003', '模切操作', '模切技术', 5, 1, '张伟', '2026-01-10', '2027-01-10', '高级模切技师'],
       [employees[1].id, 'SK-004', '刀模制作', '模具技术', 3, 0, null, null, null, '学习中'],
       [employees[2].id, 'SK-001', '丝网印刷', '印刷技术', 3, 1, '李明', '2026-03-01', '2027-03-01', '中级印刷工'],
       [employees[3].id, 'SK-005', '质量检验', '质量管理', 4, 1, '赵强', '2026-02-15', '2027-02-15', '质检员']]
    ]);
    console.log('✓ 插入6条技能数据');

    // ═══════════════════════════════════════════════
    // 4. hr_certificate - 修复表结构
    // ═══════════════════════════════════════════════
    console.log('\n━━━ 修复 hr_certificate 表 ━━━');
    await conn.execute('DROP TABLE IF EXISTS hr_certificate');
    await conn.execute(`
      CREATE TABLE hr_certificate (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        cert_name VARCHAR(200) NOT NULL,
        cert_code VARCHAR(100),
        cert_type VARCHAR(50),
        issue_authority VARCHAR(200),
        issue_date DATE,
        expiry_date DATE,
        remind_days INT DEFAULT 30,
        status TINYINT DEFAULT 1,
        file_url VARCHAR(500),
        remark TEXT,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted TINYINT DEFAULT 0,
        KEY idx_ce_employee (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`INSERT INTO hr_certificate (employee_id, cert_name, cert_code, cert_type, issue_authority, issue_date, expiry_date, remind_days, status, remark) VALUES ?`, [
      [[employees[0].id, '印刷技师资格证', 'CERT-001', '职业资格', '国家职业技能鉴定中心', '2025-06-01', '2030-06-01', 30, 1, '高级技师'],
       [employees[0].id, '安全培训证书', 'CERT-002', '培训证书', '公司安全部', '2026-01-15', '2027-01-15', 30, 1, '年度安全培训'],
       [employees[1].id, '模切技师资格证', 'CERT-003', '职业资格', '国家职业技能鉴定中心', '2024-12-01', '2029-12-01', 30, 1, '高级技师'],
       [employees[2].id, '印刷操作工证', 'CERT-004', '职业资格', '地方职业技能鉴定中心', '2025-09-01', '2030-09-01', 30, 1, '中级工'],
       [employees[2].id, 'ISO9001内审员证', 'CERT-005', '体系认证', 'SGS认证中心', '2025-03-01', '2028-03-01', 30, 1, '内审员'],
       [employees[3].id, '质量检验员证', 'CERT-006', '职业资格', '国家职业技能鉴定中心', '2025-07-01', '2030-07-01', 30, 1, '检验员']]
    ]);
    console.log('✓ 插入6条证书数据');

    await conn.commit();
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✅ HR表结构修复完成！');

    // 验证数据量
    const tables = [
      { name: 'hr/shifts', table: 'hr_shift' },
      { name: 'hr/schedules', table: 'hr_schedule' },
      { name: 'hr/skills', table: 'hr_skill_matrix' },
      { name: 'hr/certificates', table: 'hr_certificate' },
    ];

    console.log('\n━━━ 数据验证 ━━━');
    for (const t of tables) {
      const [r] = await conn.execute(`SELECT COUNT(*) as cnt FROM ${t.table}`);
      console.log(`${t.name}: ${t.table} - ${r[0].cnt} 条数据`);
    }

    await conn.end();
  } catch (error) {
    await conn.rollback();
    console.error('❌ 表结构修复失败:', error);
    process.exit(1);
  }
}

main().catch(console.error);
