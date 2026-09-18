/**
 * src/app/api/init/die-template-seed/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_PRD_DIE_MAINTENANCE = `CREATE TABLE IF NOT EXISTS prd_die_maintenance (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        maintenance_no VARCHAR(50) NOT NULL COMMENT '保养单号',
        die_id BIGINT UNSIGNED DEFAULT NULL COMMENT '刀模/网版ID',
        maintenance_type VARCHAR(30) DEFAULT NULL COMMENT '保养类型 routine/grinding',
        impressions_before BIGINT DEFAULT 0 COMMENT '保养前印次',
        impressions_after BIGINT DEFAULT 0 COMMENT '保养后印次',
        maintenance_date DATE DEFAULT NULL COMMENT '保养日期',
        cost DECIMAL(14,2) DEFAULT 0 COMMENT '保养费用',
        technician_name VARCHAR(50) DEFAULT NULL COMMENT '技师',
        status TINYINT DEFAULT 0 COMMENT '状态',
        remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
        KEY idx_die_id (die_id),
        KEY idx_maintenance_no (maintenance_no),
        CONSTRAINT fk_die_maint_template FOREIGN KEY (die_id) REFERENCES prd_die_template(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刀模/网版保养记录'`;

/** CREATE … */
export const CREATE_TABLE_PRD_DIE_USAGE_LOG = `CREATE TABLE IF NOT EXISTS prd_die_usage_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        die_id BIGINT UNSIGNED DEFAULT NULL COMMENT '刀模/网版ID',
        work_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '工单ID',
        work_order_no VARCHAR(50) DEFAULT NULL COMMENT '工单号',
        process_name VARCHAR(50) DEFAULT NULL COMMENT '工序',
        impressions BIGINT DEFAULT 0 COMMENT '印次',
        cumulative_after BIGINT DEFAULT 0 COMMENT '累计印次',
        operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作员',
        usage_date DATE DEFAULT NULL COMMENT '使用日期',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
        KEY idx_die_id (die_id),
        KEY idx_work_order_id (work_order_id),
        CONSTRAINT fk_die_usage_template FOREIGN KEY (die_id) REFERENCES prd_die_template(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刀模/网版使用记录'`;
