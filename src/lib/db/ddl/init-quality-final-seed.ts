/**
 * src/app/api/init/quality-final-seed/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_QC_FINAL_INSPECTION = `CREATE TABLE IF NOT EXISTS qc_final_inspection (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        inspection_no VARCHAR(50) NOT NULL COMMENT '终检单号',
        inspection_date DATE DEFAULT NULL COMMENT '检验日期',
        work_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '工单ID',
        work_order_no VARCHAR(50) DEFAULT NULL COMMENT '工单号',
        product_id BIGINT UNSIGNED DEFAULT NULL COMMENT '产品ID',
        product_code VARCHAR(50) DEFAULT NULL COMMENT '产品编码',
        product_name VARCHAR(200) DEFAULT NULL COMMENT '产品名称',
        batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号',
        inspection_qty INT DEFAULT 0 COMMENT '检验数量',
        qualified_qty INT DEFAULT 0 COMMENT '合格数',
        unqualified_qty INT DEFAULT 0 COMMENT '不合格数',
        inspection_result TINYINT DEFAULT 0 COMMENT '结果 1合格 2不合格',
        inspector_name VARCHAR(50) DEFAULT NULL COMMENT '检验员',
        create_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
        KEY idx_work_order_id (work_order_id),
        KEY idx_inspection_no (inspection_no),
        CONSTRAINT fk_qc_final_pc FOREIGN KEY (work_order_id) REFERENCES prd_process_card(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='终检记录'`;
