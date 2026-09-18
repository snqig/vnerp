/**
 * src/app/api/migrations/foreign-keys/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_SCREEN_PLATE_HISTORY = `
        CREATE TABLE screen_plate_history (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          screen_plate_id INT NOT NULL,
          action VARCHAR(50) NOT NULL COMMENT 'Created/Exposed/Printed/Cleaned/Reclaimed/Scrapped/TensionAdjusted',
          tension_value DECIMAL(6,2) NULL,
          life_increment INT DEFAULT 0,
          remark TEXT NULL,
          operator_id BIGINT UNSIGNED NULL,
          operator_name VARCHAR(50) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (screen_plate_id) REFERENCES prd_screen_plate(id) ON DELETE CASCADE,
          INDEX idx_screen_plate_action (screen_plate_id, action),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网版生命周期历史记录表'
      `;

/** CREATE … */
export const CREATE_TABLE_INK_USAGE = `
        CREATE TABLE ink_usage (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          work_order_id BIGINT UNSIGNED NULL COMMENT '工单ID',
          screen_plate_id INT NULL COMMENT '网版ID',
          ink_id BIGINT UNSIGNED NOT NULL COMMENT '油墨ID',
          ink_code VARCHAR(50) NULL COMMENT '油墨编码',
          ink_name VARCHAR(100) NULL COMMENT '油墨名称',
          usage_qty DECIMAL(18,4) NOT NULL COMMENT '耗用数量',
          unit VARCHAR(20) NULL COMMENT '单位',
          usage_date DATETIME NOT NULL COMMENT '耗用日期',
          operator_id BIGINT UNSIGNED NULL COMMENT '操作人ID',
          operator_name VARCHAR(50) NULL COMMENT '操作人姓名',
          remark TEXT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted TINYINT DEFAULT 0,
          FOREIGN KEY (ink_id) REFERENCES base_ink(id) ON DELETE RESTRICT,
          FOREIGN KEY (screen_plate_id) REFERENCES prd_screen_plate(id) ON DELETE SET NULL,
          INDEX idx_work_order_id (work_order_id),
          INDEX idx_screen_plate_id (screen_plate_id),
          INDEX idx_ink_id (ink_id),
          INDEX idx_usage_date (usage_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨耗用记录表'
      `;
