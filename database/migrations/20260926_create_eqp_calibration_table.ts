import type { Connection } from 'mysql2/promise';

export async function up(conn: Connection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`eqp_calibration\` (
      \`id\`                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`calibration_no\`              VARCHAR(50)     NOT NULL,
      \`equipment_id\`                BIGINT UNSIGNED DEFAULT NULL,
      \`equipment_code\`              VARCHAR(50)     DEFAULT '',
      \`equipment_name\`              VARCHAR(200)    DEFAULT '',
      \`calibration_date\`            DATE            DEFAULT NULL,
      \`next_calibration_date\`       DATE            DEFAULT NULL,
      \`calibration_org\`             VARCHAR(200)    DEFAULT '',
      \`calibration_result\`          VARCHAR(20)     DEFAULT 'qualified',
      \`certificate_no\`              VARCHAR(50)     DEFAULT '',
      \`calibration_cost\`            DECIMAL(12,2)   DEFAULT 0.00,
      \`status\`                      TINYINT         NOT NULL DEFAULT 1 COMMENT '1=待检定 2=检定中 3=已合格 4=不合格',
      \`remark\`                      TEXT            DEFAULT NULL,
      \`create_time\`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`update_time\`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`create_by\`                   BIGINT UNSIGNED DEFAULT NULL,
      \`update_by\`                   BIGINT UNSIGNED DEFAULT NULL,
      \`deleted\`                     TINYINT         NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_calibration_no\` (\`calibration_no\`),
      KEY \`idx_calibration_equipment\` (\`equipment_id\`),
      KEY \`idx_calibration_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备检定/校准表'
  `, []);
}

export async function down(conn: Connection): Promise<void> {
  await conn.query('DROP TABLE IF EXISTS \`eqp_calibration\`', []);
}
