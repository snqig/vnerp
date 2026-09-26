import type { Connection } from 'mysql2/promise';

export async function up(conn: Connection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`eqp_scrap\` (
      \`id\`                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`scrap_no\`                    VARCHAR(50)     NOT NULL,
      \`equipment_id\`                BIGINT UNSIGNED DEFAULT NULL,
      \`equipment_code\`              VARCHAR(50)     DEFAULT '',
      \`equipment_name\`              VARCHAR(200)    DEFAULT '',
      \`scrap_date\`                  DATE            DEFAULT NULL,
      \`scrap_reason\`                TEXT            DEFAULT NULL,
      \`original_value\`              DECIMAL(12,2)   DEFAULT 0.00,
      \`net_value\`                   DECIMAL(12,2)   DEFAULT 0.00,
      \`approval_person\`             VARCHAR(100)    DEFAULT '',
      \`status\`                      TINYINT         NOT NULL DEFAULT 1 COMMENT '1=待审批 2=已审批 3=已报废',
      \`remark\`                      TEXT            DEFAULT NULL,
      \`create_time\`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`update_time\`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`create_by\`                   BIGINT UNSIGNED DEFAULT NULL,
      \`update_by\`                   BIGINT UNSIGNED DEFAULT NULL,
      \`deleted\`                     TINYINT         NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_scrap_no\` (\`scrap_no\`),
      KEY \`idx_scrap_equipment\` (\`equipment_id\`),
      KEY \`idx_scrap_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备报废单表'
  `, []);
}

export async function down(conn: Connection): Promise<void> {
  await conn.query('DROP TABLE IF EXISTS \`eqp_scrap\`', []);
}
