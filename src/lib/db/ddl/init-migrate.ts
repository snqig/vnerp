/**
 * src/app/api/init/migrate/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_BOM_LINE = `CREATE TABLE IF NOT EXISTS bom_line (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bom_id INT NOT NULL COMMENT 'BOM头ID',
          line_no INT NOT NULL COMMENT '行号',
          material_id INT COMMENT '物料ID',
          material_code VARCHAR(50) COMMENT '物料编码',
          material_name VARCHAR(200) COMMENT '物料名称',
          material_spec VARCHAR(200) COMMENT '物料规格',
          material_unit VARCHAR(20) COMMENT '物料单位',
          usage_qty DECIMAL(12,4) NOT NULL DEFAULT 0 COMMENT '用量',
          loss_rate DECIMAL(5,2) DEFAULT 0 COMMENT '损耗率',
          unit_cost DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
          total_cost DECIMAL(12,2) DEFAULT 0 COMMENT '总成本',
          remark VARCHAR(500) COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_bom_id (bom_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM行表'`;

/** CREATE … */
export const CREATE_TABLE_BOM_HEADER = `CREATE TABLE IF NOT EXISTS bom_header (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bom_no VARCHAR(50) NOT NULL COMMENT 'BOM编号',
          product_id INT COMMENT '产品ID',
          product_code VARCHAR(50) COMMENT '产品编码',
          product_name VARCHAR(200) COMMENT '产品名称',
          product_spec VARCHAR(200) COMMENT '产品规格',
          version VARCHAR(20) DEFAULT '1.0' COMMENT '版本号',
          is_default TINYINT DEFAULT 1 COMMENT '是否默认BOM',
          status INT DEFAULT 10 COMMENT '状态: 10-草稿 20-已审核 30-已发布 90-已停用',
          unit VARCHAR(20) COMMENT '单位',
          base_qty DECIMAL(12,2) DEFAULT 1 COMMENT '基本数量',
          total_material_count INT DEFAULT 0 COMMENT '物料总数',
          total_cost DECIMAL(12,2) DEFAULT 0 COMMENT '总成本',
          remark VARCHAR(500) COMMENT '备注',
          deleted TINYINT DEFAULT 0 COMMENT '软删除',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_bom_no (bom_no)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM头表'`;
