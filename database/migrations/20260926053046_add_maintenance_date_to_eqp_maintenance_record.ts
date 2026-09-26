import type { Connection } from 'mysql2/promise';

/**
 * Migration: 为 eqp_maintenance_record 补全缺失的 maintenance_date 列
 *
 * 20260926052658_create_eqp_maintenance_record_table.ts 漏写了该列，
 * 导致 POST /api/equipment/maintenance 写入失败。
 */

export async function up(conn: Connection): Promise<void> {
  try {
    await conn.query(
      `ALTER TABLE \`eqp_maintenance_record\`
       ADD COLUMN \`maintenance_date\` DATE NOT NULL DEFAULT (CURRENT_DATE)
       AFTER \`maintenance_type\`
       COMMENT '维保日期'`,
      []
    );
  } catch {
    // 列已存在，忽略
  }
}

export async function down(conn: Connection): Promise<void> {
  try {
    await conn.query(`ALTER TABLE \`eqp_maintenance_record\` DROP COLUMN \`maintenance_date\``, []);
  } catch {
    // 列不存在，忽略
  }
}