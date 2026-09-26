import type { Connection } from 'mysql2/promise';

/**
 * Migration: 创建 eqp_maintenance_record 维保记录表
 *
 * 旧表 eq_maintenance_record 已在 20260925_unify_equipment_tables.ts 中重命名为 eq_maintenance_record_deprecated，
 * 但新表 eqp_maintenance_record 从未被创建，导致 API 写入失败。
 * 本迁移补全该表，字段对齐 POST /api/equipment/maintenance 的 INSERT 语句。
 */

export async function up(conn: Connection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`eqp_maintenance_record\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
      \`record_no\` VARCHAR(50) NOT NULL COMMENT '记录编号（唯一）',
      \`equipment_id\` BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
      \`plan_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联计划ID（自主维保为 NULL）',
      \`maintenance_type\` VARCHAR(20) NOT NULL DEFAULT 'routine' COMMENT '维保类型：routine=日常保养/periodic=定期维保/major=大修/emergency=紧急维修',
      \`maintenance_date\` DATE NOT NULL DEFAULT (CURRENT_DATE) COMMENT '维保日期',
      \`fault_desc\` TEXT DEFAULT NULL COMMENT '故障描述',
      \`maintenance_content\` TEXT DEFAULT NULL COMMENT '维保内容',
      \`start_time\` DATETIME DEFAULT NULL COMMENT '开始时间',
      \`end_time\` DATETIME DEFAULT NULL COMMENT '结束时间',
      \`downtime_hours\` DECIMAL(5,2) DEFAULT 0.00 COMMENT '停机时长（小时）',
      \`cost\` DECIMAL(10,2) DEFAULT 0.00 COMMENT '费用',
      \`responsible_id\` BIGINT UNSIGNED DEFAULT NULL COMMENT '负责人ID',
      \`result\` VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '维保结果：completed=完成/partial=部分完成/failed=失败',
      \`remark\` TEXT DEFAULT NULL COMMENT '备注',
      \`deleted\` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0=正常 1=已删除',
      \`create_time\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      \`update_time\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      \`create_by\` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人',
      \`update_by\` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人',
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_record_no\` (\`record_no\`),
      KEY \`idx_record_equipment\` (\`equipment_id\`),
      KEY \`idx_record_plan\` (\`plan_id\`),
      KEY \`idx_record_date\` (\`start_time\`),
      KEY \`idx_record_status\` (\`result\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备维保记录表'
  `, []);

  // 外键：equipment_id -> eqp_equipment.id
  try {
    await conn.query(`
      ALTER TABLE \`eqp_maintenance_record\`
      ADD CONSTRAINT \`fk_record_equipment\`
      FOREIGN KEY (\`equipment_id\`) REFERENCES \`eqp_equipment\` (\`id\`)
      ON DELETE RESTRICT ON UPDATE CASCADE
    `, []);
  } catch {
    // 外键可能已存在
  }

  // 外键：plan_id -> eqp_maintenance_plan.id
  try {
    await conn.query(`
      ALTER TABLE \`eqp_maintenance_record\`
      ADD CONSTRAINT \`fk_record_plan\`
      FOREIGN KEY (\`plan_id\`) REFERENCES \`eqp_maintenance_plan\` (\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE
    `, []);
  } catch {
    // 外键可能已存在
  }
}

export async function down(conn: Connection): Promise<void> {
  // 删除外键
  try {
    await conn.query(`ALTER TABLE \`eqp_maintenance_record\` DROP FOREIGN KEY \`fk_record_equipment\``, []);
  } catch {}
  try {
    await conn.query(`ALTER TABLE \`eqp_maintenance_record\` DROP FOREIGN KEY \`fk_record_plan\``, []);
  } catch {}

  // 删除表
  await conn.query(`DROP TABLE IF EXISTS \`eqp_maintenance_record\``, []);
}