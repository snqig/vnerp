-- 标准卡管理模块数据库迁移脚本（DDD 子表部分）
-- 创建日期: 2026-05-11
-- 说明: 丝网印刷ERP标准卡管理核心模块
--
-- ⚠️ 架构统一说明（P1-17 修复 / 双 schema 统一，2026-08-10）：
-- `prd_standard_card` 的权威 schema 已确定为「print 取向单表」
-- （见 database/update_standard_card.sql 与 database/vnerpdacahng_schema.sql，
--  column: card_no / status TINYINT 1-5 / FK crm_customer），由整个前端驱动，是 live 表。
-- 本文件【不再创建】prd_standard_card，避免与 update_standard_card.sql 重复定义同一张表
-- （历史上两者同表名、不同字段，迁移顺序一旦翻转就会建出错误结构）。
-- 本文件仅保留以下 DDD 子表（CREATE TABLE IF NOT EXISTS，幂等、无害）：
--   prd_color_standard_item / prd_process_standard_item / prd_quality_standard_item /
--   prd_standard_card_material / prd_standard_card_ink / prd_standard_card_tooling /
--   prd_standard_card_attachment / prd_standard_card_version_log /
--   prd_work_order_standard_card / inv_material_standard_card / qc_inspection_standard_card
-- 注意：上述子表在当前 print 主链路中未被使用；状态流转端点已改为直接操作 print 主表
--       （见 src/infrastructure/repositories/PrintStandardCardRepository.ts）。

-- =============================================
-- （原 1. 标准卡主表 prd_standard_card 已统一到 update_standard_card.sql，此处不再创建）
-- =============================================

-- =============================================
-- 2. 颜色标准卡明细表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_color_standard_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '关联标准卡ID',
  `color_name` VARCHAR(50) NOT NULL COMMENT '颜色名称',
  `pantone_code` VARCHAR(30) COMMENT '潘通色号',
  `cmyk_value` VARCHAR(30) COMMENT 'CMYK值 格式:C,M,Y,K',
  `rgb_value` VARCHAR(30) COMMENT 'RGB值 格式:R,G,B',
  `color_sample_image` VARCHAR(255) COMMENT '色样图片URL',
  `tolerance` VARCHAR(50) COMMENT '颜色公差范围',
  `remark` VARCHAR(500) COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_standard_card` (`standard_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='颜色标准卡明细表';

-- =============================================
-- 3. 工艺标准卡明细表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_process_standard_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '关联标准卡ID',
  `process_id` INT COMMENT '关联工序ID',
  `process_name` VARCHAR(50) NOT NULL COMMENT '工序名称',
  `process_order` INT NOT NULL DEFAULT 0 COMMENT '工序顺序',
  `parameter_name` VARCHAR(50) COMMENT '参数名称',
  `standard_value` VARCHAR(100) COMMENT '标准值',
  `tolerance` VARCHAR(50) COMMENT '公差范围',
  `unit` VARCHAR(10) COMMENT '单位',
  `standard_time` DECIMAL(10,2) COMMENT '标准工时(分钟)',
  `machine_type` VARCHAR(50) COMMENT '所需设备类型',
  `description` TEXT COMMENT '参数说明',
  `remark` VARCHAR(500) COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_standard_card` (`standard_card_id`),
  KEY `idx_process_order` (`process_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工艺标准卡明细表';

-- =============================================
-- 4. 质量标准卡明细表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_quality_standard_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '关联标准卡ID',
  `inspection_item` VARCHAR(100) NOT NULL COMMENT '检验项目',
  `standard_value` VARCHAR(100) COMMENT '标准值',
  `tolerance` VARCHAR(50) COMMENT '公差范围',
  `inspection_method` VARCHAR(200) COMMENT '检验方法',
  `is_key` TINYINT DEFAULT 0 COMMENT '是否关键项目',
  `defect_level` VARCHAR(10) COMMENT '缺陷等级: fatal/serious/general/slight',
  `remark` VARCHAR(500) COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_standard_card` (`standard_card_id`),
  KEY `idx_is_key` (`is_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='质量标准卡明细表';

-- =============================================
-- 5. 标准卡物料表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_standard_card_material` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '关联标准卡ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `spec` VARCHAR(50) COMMENT '小料规格(长×宽)',
  `unit_consumption` DECIMAL(10,4) NOT NULL COMMENT '单耗',
  `loss_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '损耗率(%)',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_standard_card` (`standard_card_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准卡物料表';

-- =============================================
-- 6. 标准卡油墨表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_standard_card_ink` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '关联标准卡ID',
  `ink_id` BIGINT UNSIGNED NOT NULL COMMENT '油墨ID',
  `ratio` VARCHAR(50) COMMENT '配比',
  `unit_consumption` DECIMAL(10,4) NOT NULL COMMENT '单耗',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_standard_card` (`standard_card_id`),
  KEY `idx_ink` (`ink_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准卡油墨表';

-- =============================================
-- 7. 标准卡工装表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_standard_card_tooling` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '关联标准卡ID',
  `die_mold_id` INT COMMENT '刀模ID',
  `screen_plate_id` INT COMMENT '网版ID',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_standard_card` (`standard_card_id`),
  KEY `idx_die_mold` (`die_mold_id`),
  KEY `idx_screen_plate` (`screen_plate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准卡工装表';

-- =============================================
-- 8. 标准卡附件表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_standard_card_attachment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '关联标准卡ID',
  `version` VARCHAR(20) NOT NULL COMMENT '关联的标准卡版本',
  `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
  `file_path` VARCHAR(255) NOT NULL COMMENT '文件存储路径',
  `file_size` INT NOT NULL COMMENT '文件大小(字节)',
  `remark` TEXT COMMENT '备注',
  `uploaded_by` INT NOT NULL COMMENT '上传人',
  `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  PRIMARY KEY (`id`),
  KEY `idx_standard_card` (`standard_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准卡附件表';

-- =============================================
-- 9. 标准卡版本变更日志表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_standard_card_version_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '关联标准卡ID',
  `version` VARCHAR(20) NOT NULL COMMENT '版本号',
  `change_type` VARCHAR(50) NOT NULL COMMENT '变更类型: create/update/obsolete/restore',
  `change_content` TEXT NOT NULL COMMENT '变更内容',
  `changed_by` INT NOT NULL COMMENT '操作人',
  `changed_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_standard_card` (`standard_card_id`),
  KEY `idx_change_type` (`change_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准卡版本变更日志表';

-- =============================================
-- 10. 工单标准卡关联表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_work_order_standard_card` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `work_order_id` BIGINT UNSIGNED NOT NULL COMMENT '工单ID',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '标准卡ID',
  `linked_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '关联时间',
  `remark` VARCHAR(500) COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order` (`work_order_id`),
  KEY `idx_standard_card` (`standard_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单标准卡关联表';

-- =============================================
-- 11. 物料标准卡关联表 (物料创建时自动关联当前版本)
-- =============================================
CREATE TABLE IF NOT EXISTS `inv_material_standard_card` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '标准卡ID',
  `linked_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '关联时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material` (`material_id`),
  KEY `idx_standard_card` (`standard_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料标准卡关联表';

-- =============================================
-- 12. 检验任务标准卡关联表
-- =============================================
CREATE TABLE IF NOT EXISTS `qc_inspection_standard_card` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `inspection_id` BIGINT UNSIGNED NOT NULL COMMENT '检验任务ID',
  `standard_card_id` BIGINT UNSIGNED NOT NULL COMMENT '标准卡ID',
  `linked_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '关联时间',
  PRIMARY KEY (`id`),
  KEY `idx_inspection` (`inspection_id`),
  KEY `idx_standard_card` (`standard_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='检验任务标准卡关联表';
