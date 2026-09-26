/**
 * create_eqp_maintenance_plan_table
 *
 * eqp_maintenance_plan 表从未被创建过——
 * 20260925_unify_equipment_tables.ts 中只执行了 ALTER（表不存在时静默忽略）。
 * 本迁移补齐建表，字段以 API route.ts + 前端 page.tsx + 原 DDL 三方对齐为准。
 */

import type { Connection } from 'mysql2/promise';

export async function up(conn: Connection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`eqp_maintenance_plan\` (
      \`id\`                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`plan_no\`                     VARCHAR(50)     NOT NULL                COMMENT '计划编号',
      \`equipment_id\`                BIGINT UNSIGNED NOT NULL                COMMENT '设备ID',
      \`plan_name\`                   VARCHAR(100)    NOT NULL DEFAULT ''     COMMENT '计划名称',
      \`maintenance_type\`            VARCHAR(20)     NOT NULL DEFAULT 'routine' COMMENT '维保类型',
      \`cycle_type\`                  VARCHAR(20)     NOT NULL DEFAULT 'monthly' COMMENT '周期类型',
      \`cycle_value\`                 INT             NOT NULL DEFAULT 30     COMMENT '周期值（天）',
      \`lead_days\`                   INT             DEFAULT 7               COMMENT '提前提醒天数',
      \`estimated_hours\`             DECIMAL(5,2)    DEFAULT 4.00            COMMENT '预计耗时（小时）',
      \`estimated_cost\`              DECIMAL(10,2)   DEFAULT 0.00            COMMENT '预计费用',
      \`checklist\`                   JSON            DEFAULT NULL            COMMENT '检查项目清单',
      \`plan_date\`                   DATE            DEFAULT NULL            COMMENT '计划日期',
      \`responsible_id\`              BIGINT UNSIGNED DEFAULT NULL            COMMENT '负责人ID',
      \`status\`                      TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1=启用 2=停用',
      \`last_executed_date\`          DATE            DEFAULT NULL            COMMENT '上次执行日期',
      \`next_execute_date\`           DATE            DEFAULT NULL            COMMENT '下次执行日期',
      \`complete_date\`               DATE            DEFAULT NULL            COMMENT '完成日期',
      \`content\`                     TEXT            DEFAULT NULL            COMMENT '内容',
      \`remark\`                      TEXT            DEFAULT NULL            COMMENT '备注',
      \`deleted\`                     TINYINT         NOT NULL DEFAULT 0,
      \`create_time\`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`update_time\`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`create_by\`                   BIGINT UNSIGNED DEFAULT NULL,
      \`update_by\`                   BIGINT UNSIGNED DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_plan_no\` (\`plan_no\`),
      KEY \`idx_plan_equipment\` (\`equipment_id\`),
      KEY \`idx_plan_status\` (\`status\`),
      KEY \`idx_plan_next_execute\` (\`next_execute_date\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `, []);
}

export async function down(conn: Connection): Promise<void> {
  await conn.query('DROP TABLE IF EXISTS \`eqp_maintenance_plan\`', []);
}
