/**
 * src/app/api/migrations/add-workshop-column/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_PRD_SCHEDULE_DETAIL = `
        CREATE TABLE IF NOT EXISTS prd_schedule_detail (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          schedule_id BIGINT UNSIGNED COMMENT '排程ID',
          work_order_id BIGINT UNSIGNED COMMENT '工单ID',
          color_seq_no INT COMMENT '色序号',
          color_name VARCHAR(50) COMMENT '颜色名称',
          equipment_id BIGINT UNSIGNED COMMENT '设备ID',
          equipment_name VARCHAR(100) COMMENT '设备名称',
          planned_start DATETIME COMMENT '计划开始时间',
          planned_end DATETIME COMMENT '计划结束时间',
          actual_start DATETIME COMMENT '实际开始时间',
          actual_end DATETIME COMMENT '实际结束时间',
          duration_hours DECIMAL(8,2) COMMENT '预计耗时(小时)',
          status TINYINT DEFAULT 1 COMMENT '状态: 1-待排, 2-已排, 3-生产中, 4-已完成',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted TINYINT DEFAULT 0,
          PRIMARY KEY (id),
          KEY idx_schedule (schedule_id),
          KEY idx_work_order (work_order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排程明细表'
      `;

/** CREATE … */
export const CREATE_TABLE_PRD_WORK_ORDER_COLOR_SEQ = `
        CREATE TABLE IF NOT EXISTS prd_work_order_color_seq (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          work_order_id BIGINT UNSIGNED COMMENT '工单ID',
          seq_no INT NOT NULL COMMENT '色序号',
          color_name VARCHAR(50) COMMENT '颜色名称',
          screen_plate_id BIGINT UNSIGNED COMMENT '网版ID',
          ink_formula_id BIGINT UNSIGNED COMMENT '油墨配方ID',
          estimated_duration_hours DECIMAL(8,2) COMMENT '预计耗时(小时)',
          equipment_type_required VARCHAR(50) COMMENT '所需设备类型',
          depends_on_seq INT COMMENT '依赖工序',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted TINYINT DEFAULT 0,
          PRIMARY KEY (id),
          KEY idx_work_order (work_order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单色序表'
      `;
