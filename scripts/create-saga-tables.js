const mysql = require('mysql2/promise');

async function createTables() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng'
  });

  const sql1 = `
CREATE TABLE IF NOT EXISTS saga_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  saga_id VARCHAR(64) NOT NULL,
  saga_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payload TEXT,
  steps TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX uk_saga_id (saga_id),
  INDEX idx_saga_type (saga_type),
  INDEX idx_saga_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Saga 事务日志表'
`;

  const sql2 = `
CREATE TABLE IF NOT EXISTS hr_payroll_snapshot (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payroll_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  period_month VARCHAR(7) NOT NULL,
  source_type VARCHAR(20),
  source_id BIGINT UNSIGNED,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ps_payroll (payroll_id),
  INDEX idx_ps_employee_period (employee_id, period_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='薪资计算快照表'
`;

  await pool.execute(sql1);
  await pool.execute(sql2);
  console.log('Tables created successfully');
  await pool.end();
}

createTables().catch(console.error);