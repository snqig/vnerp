/**
 * src/app/api/prepress/die-migrate/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** ALTER … */
export const ALTER_TABLE_PRD_DIE_TEMPLATE = `ALTER TABLE prd_die_template ADD COLUMN layout_type VARCHAR(20) DEFAULT 'single_row' COMMENT '布局类型: single_row/multi_row' AFTER asset_type`;

/** CREATE … */
export const CREATE_TABLE_PRD_DIE_MAINTENANCE = `CREATE TABLE IF NOT EXISTS prd_die_maintenance (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      maintenance_no VARCHAR(50) NOT NULL COMMENT '保养单号',
      die_id BIGINT UNSIGNED NOT NULL COMMENT '刀模/网版ID',
      die_code VARCHAR(50) COMMENT '刀模编码',
      maintenance_type VARCHAR(30) DEFAULT 'routine' COMMENT '保养类型: routine/grinding/re_rule/replace',
      impressions_before INT COMMENT '保养前累计次数',
      impressions_after INT COMMENT '保养后累计次数(重置)',
      maintenance_date DATE COMMENT '保养日期',
      next_maintenance_date DATE COMMENT '下次保养日期',
      cost DECIMAL(12,2) DEFAULT 0 COMMENT '保养费用',
      technician_id BIGINT UNSIGNED COMMENT '保养人员ID',
      technician_name VARCHAR(50) COMMENT '保养人员',
      status TINYINT DEFAULT 1 COMMENT '1-待保养 2-保养中 3-已完成',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_maintenance_no (maintenance_no),
      KEY idx_die_id (die_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刀模/网版保养记录表'`;

/** ALTER … */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_2 = `ALTER TABLE prd_die_template ADD COLUMN last_maintenance_impressions INT DEFAULT 0 COMMENT '上次保养时累计次数' AFTER maintenance_count`;

/** ALTER … */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_3 = `ALTER TABLE prd_die_template ADD COLUMN warning_threshold DECIMAL(5,2) DEFAULT 80.00 COMMENT '预警比例(%)' AFTER max_impressions`;

/** ALTER … */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_4 = `ALTER TABLE prd_die_template ADD COLUMN asset_type VARCHAR(20) DEFAULT 'die' COMMENT '资产类型: die/flexo_plate/screen_mesh' AFTER template_name`;

/** ALTER */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_5 = `ALTER TABLE prd_die_template ADD COLUMN maintenance_interval INT DEFAULT 8000 COMMENT '保养间隔次数' AFTER warning_threshold`;

/** ALTER … */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_6 = `ALTER TABLE prd_die_template ADD COLUMN cumulative_impressions INT DEFAULT 0 COMMENT '累计使用次数(impressions)' AFTER pieces_per_impression`;

/** CREATE … */
export const CREATE_TABLE_PRD_DIE_USAGE_LOG = `CREATE TABLE IF NOT EXISTS prd_die_usage_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      die_id BIGINT UNSIGNED NOT NULL COMMENT '刀模/网版ID',
      die_code VARCHAR(50) COMMENT '刀模编码',
      work_report_id BIGINT UNSIGNED COMMENT '报工记录ID',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单号',
      process_name VARCHAR(50) COMMENT '工序名称',
      impressions INT DEFAULT 0 COMMENT '本次使用次数',
      cumulative_after INT COMMENT '使用后累计次数',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员',
      equipment_id BIGINT UNSIGNED COMMENT '设备ID',
      usage_date DATE COMMENT '使用日期',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_die_id (die_id),
      KEY idx_work_report (work_report_id),
      KEY idx_work_order (work_order_id),
      KEY idx_usage_date (usage_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刀模/网版使用记录表'`;

/** ALTER */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_7 = `ALTER TABLE prd_die_template ADD COLUMN last_used_date DATE COMMENT '最后使用日期' AFTER last_maintenance_date`;

/** ALTER … */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_8 = `ALTER TABLE prd_die_template ADD COLUMN die_status VARCHAR(30) DEFAULT 'available' COMMENT '生命周期状态: available/in_use/maintenance_needed/re_rule_needed/scrap' AFTER unit_price`;

/** ALTER */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_9 = `ALTER TABLE prd_die_template ADD COLUMN max_impressions INT DEFAULT 0 COMMENT '最大使用寿命阈值' AFTER cumulative_impressions`;

/** ALTER */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_10 = `ALTER TABLE prd_die_template ADD COLUMN qr_code VARCHAR(100) COMMENT '二维码编码' AFTER die_status`;

/** ALTER */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_11 = `ALTER TABLE prd_die_template ADD COLUMN pieces_per_impression INT DEFAULT 1 COMMENT '单次冲切/印刷出件数' AFTER layout_type`;

/** ALTER */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_12 = `ALTER TABLE prd_die_template ADD COLUMN last_maintenance_date DATE COMMENT '上次保养日期' AFTER last_maintenance_impressions`;

/** ALTER */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_13 = `ALTER TABLE prd_die_template ADD COLUMN unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价(元)' AFTER last_used_date`;

/** ALTER */
export const ALTER_TABLE_PRD_DIE_TEMPLATE_14 = `ALTER TABLE prd_die_template ADD COLUMN maintenance_count INT DEFAULT 0 COMMENT '已保养次数' AFTER maintenance_interval`;
