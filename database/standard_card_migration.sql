-- 标准卡管理模块数据库迁移脚本
-- 创建日期: 2026-05-11
-- 说明: 丝网印刷ERP标准卡管理核心模块

-- =============================================
-- 1. 标准卡主表
-- =============================================
CREATE TABLE IF NOT EXISTS `prd_standard_card` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `code` VARCHAR(50) NOT NULL COMMENT '标准卡编号',
  `version` VARCHAR(20) NOT NULL DEFAULT '1.0' COMMENT '版本号',
  `name` VARCHAR(100) NOT NULL COMMENT '标准卡名称',
  `type` VARCHAR(20) NOT NULL COMMENT '类型: color/process/quality/comprehensive',
  `material_id` BIGINT UNSIGNED COMMENT '适用产品ID',
  `material_name` VARCHAR(100) COMMENT '产品名称',
  `customer_id` BIGINT UNSIGNED COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户名称',
  `spec` VARCHAR(100) COMMENT '产品规格',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/auditing/approved/confirmed/obsolete',
  `effective_date` DATE COMMENT '生效日期',
  `expiry_date` DATE COMMENT '失效日期',
  `parent_version_id` INT COMMENT '父版本ID',
  `is_current` TINYINT DEFAULT 0 COMMENT '是否为当前生效版本',
  `is_obsolete` TINYINT DEFAULT 0 COMMENT '是否作废',
  `is_locked` TINYINT DEFAULT 0 COMMENT '是否锁定(客户确认后自动锁定)',
  `change_description` TEXT COMMENT '版本变更说明',
  `obsolete_reason` TEXT COMMENT '作废原因',
  `obsolete_by` INT COMMENT '作废人',
  `obsolete_at` DATETIME COMMENT '作废时间',
  `quality_requirement` TEXT COMMENT '品质要求',
  `material_requirement` TEXT COMMENT '物料要求(自动生成)',
  `ink_requirement` TEXT COMMENT '油墨要求(自动生成)',
  `tooling_requirement` TEXT COMMENT '工装要求(自动生成)',
  `process_requirement` TEXT COMMENT '工艺要求(自动生成)',
  `create_user` INT COMMENT '创建人',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code_version` (`code`, `version`),
  KEY `idx_material` (`material_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_is_current` (`is_current`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准卡主表';

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
