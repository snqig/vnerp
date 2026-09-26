import type { Connection } from 'mysql2/promise';

export async function up(conn: Connection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`eqp_repair\` (
      \`id\`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`repair_no\`               VARCHAR(50)     NOT NULL,
      \`equipment_id\`            BIGINT UNSIGNED DEFAULT NULL,
      \`equipment_code\`          VARCHAR(50)     DEFAULT '',
      \`equipment_name\`          VARCHAR(200)    DEFAULT '',
      \`fault_date\`              DATE            DEFAULT NULL,
      \`fault_desc\`              TEXT            DEFAULT NULL,
      \`repair_type\`             VARCHAR(20)     NOT NULL DEFAULT 'corrective' COMMENT 'corrective=故障维修/preventive=预防性维修/emergency=紧急维修',
      \`repair_person\`           VARCHAR(100)    DEFAULT '',
      \`status\`                  TINYINT         NOT NULL DEFAULT 1 COMMENT '1=待维修 2=维修中 3=已完成 4=已关闭',
      \`repair_start_time\`       DATETIME        DEFAULT NULL,
      \`repair_end_time\`         DATETIME        DEFAULT NULL,
      \`repair_cost\`             DECIMAL(12,2)   DEFAULT 0.00,
      \`repair_result\`           VARCHAR(50)     DEFAULT NULL,
      \`remark\`                  TEXT            DEFAULT NULL,
      \`create_time\`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`update_time\`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`create_by\`               BIGINT UNSIGNED DEFAULT NULL,
      \`update_by\`               BIGINT UNSIGNED DEFAULT NULL,
      \`deleted\`                 TINYINT         NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_repair_no\` (\`repair_no\`),
      KEY \`idx_repair_equipment\` (\`equipment_id\`),
      KEY \`idx_repair_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备维修单表'
  `, []);
}

export async function down(conn: Connection): Promise<void> {
  await conn.query('DROP TABLE IF EXISTS \`eqp_repair\`', []);
}
