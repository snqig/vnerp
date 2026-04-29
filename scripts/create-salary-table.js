const mysql = require('mysql2/promise');

async function createSalaryTable() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng'
  });

  try {
    // 创建薪资表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sys_salary (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        employee_id INT UNSIGNED NOT NULL,
        month VARCHAR(7) NOT NULL COMMENT '薪资月份yyyy-MM',
        basic_salary DECIMAL(10,2) DEFAULT 0 COMMENT '基本工资',
        position_allowance DECIMAL(10,2) DEFAULT 0 COMMENT '岗位津贴',
        performance_bonus DECIMAL(10,2) DEFAULT 0 COMMENT '绩效奖金',
        overtime_pay DECIMAL(10,2) DEFAULT 0 COMMENT '加班费',
        other_bonus DECIMAL(10,2) DEFAULT 0 COMMENT '其他奖金',
        social_security DECIMAL(10,2) DEFAULT 0 COMMENT '社保',
        housing_fund DECIMAL(10,2) DEFAULT 0 COMMENT '公积金',
        personal_tax DECIMAL(10,2) DEFAULT 0 COMMENT '个人所得税',
        other_deduction DECIMAL(10,2) DEFAULT 0 COMMENT '其他扣款',
        actual_salary DECIMAL(10,2) DEFAULT 0 COMMENT '实发工资',
        remark VARCHAR(500) COMMENT '备注',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_employee_month (employee_id, month),
        KEY idx_month (month),
        KEY idx_employee_id (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工薪资表'
    `);

    console.log('✅ sys_salary 表创建成功');

    // 检查是否已存在薪资数据
    const [existingRows] = await connection.execute('SELECT COUNT(*) as count FROM sys_salary');
    
    if (existingRows[0].count === 0) {
      // 插入模拟薪资数据
      const mockData = [
        [1, '2024-03', 8000, 2000, 1500, 800, 500, 800, 1000, 200, 0, 10800, '正常发放'],
        [2, '2024-03', 5000, 500, 800, 1200, 300, 500, 600, 0, 0, 6700, '正常发放'],
        [3, '2024-03', 5500, 800, 1000, 600, 200, 550, 660, 0, 0, 6890, '正常发放'],
        [4, '2024-03', 10000, 3000, 2000, 0, 1000, 1000, 1200, 500, 0, 13300, '正常发放'],
        [5, '2024-03', 9000, 2500, 3000, 0, 1500, 900, 1080, 600, 0, 13420, '含销售提成'],
        [6, '2024-03', 6500, 1000, 1200, 0, 300, 650, 780, 100, 0, 7470, '正常发放'],
      ];

      for (const data of mockData) {
        await connection.execute(
          `INSERT INTO sys_salary (employee_id, month, basic_salary, position_allowance, performance_bonus, 
           overtime_pay, other_bonus, social_security, housing_fund, personal_tax, other_deduction, 
           actual_salary, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          data
        );
      }

      console.log('✅ 模拟薪资数据插入成功');
    } else {
      console.log('ℹ️ 薪资数据已存在，跳过插入');
    }

    // 验证数据
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM sys_salary');
    console.log(`📊 当前薪资记录数: ${rows[0].count}`);

  } catch (error) {
    console.error('❌ 创建薪资表失败:', error.message);
  } finally {
    await connection.end();
  }
}

createSalaryTable().catch(console.error);
