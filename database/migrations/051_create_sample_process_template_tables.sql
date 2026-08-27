-- Migration 051: 标准工艺模板库 — 统一模板与录入即沉淀
-- 依据: docs/打样工艺卡录入页统一完善方案.md
-- 镜像打样工艺卡结构，支持「存为模板」与「从模板导入」全链路

-- 1. 标准工艺模板主表
CREATE TABLE IF NOT EXISTS `dcprint_sample_process_template` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_no` VARCHAR(50) NOT NULL COMMENT '模板编号',
  `template_name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '分类（如:标签/软包装/纸盒）',
  `tags` VARCHAR(255) DEFAULT NULL COMMENT '标签（逗号分隔）',
  `description` TEXT DEFAULT NULL COMMENT '模板描述',
  `source_card_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '来源工艺卡ID',
  `customer_id` BIGINT UNSIGNED DEFAULT NULL,
  `customer_name` VARCHAR(100) DEFAULT NULL,
  `product_name` VARCHAR(200) DEFAULT NULL,
  `substrate_material_id` BIGINT UNSIGNED DEFAULT NULL,
  `substrate_material_name` VARCHAR(100) DEFAULT NULL,
  `spec` VARCHAR(255) DEFAULT NULL,
  `print_color` VARCHAR(100) DEFAULT NULL,
  `ink_color_id` BIGINT UNSIGNED DEFAULT NULL,
  `screen_plate_id` BIGINT UNSIGNED DEFAULT NULL,
  `die_tool_id` BIGINT UNSIGNED DEFAULT NULL,
  `material_loss_rate` DECIMAL(5,2) DEFAULT 5.00,
  `estimated_hour` DECIMAL(6,2) DEFAULT NULL,
  `diagram_url` VARCHAR(500) DEFAULT NULL COMMENT '工艺图示URL',
  `total_material_cost` DECIMAL(12,4) DEFAULT 0.0000,
  `total_labor_cost` DECIMAL(12,4) DEFAULT 0.0000,
  `total_tool_cost` DECIMAL(12,4) DEFAULT 0.0000,
  `total_cost` DECIMAL(12,4) DEFAULT 0.0000,
  `remark` TEXT DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1-启用 2-停用',
  `usage_count` INT NOT NULL DEFAULT 0 COMMENT '使用次数',
  `create_by` BIGINT UNSIGNED DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_by` BIGINT UNSIGNED DEFAULT NULL,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_no` (`template_no`),
  KEY `idx_category` (`category`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准工艺模板主表';

-- 2. 模板物料明细表
CREATE TABLE IF NOT EXISTS `dcprint_sample_process_template_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` BIGINT UNSIGNED NOT NULL COMMENT '模板ID',
  `item_type` TINYINT NOT NULL DEFAULT 1 COMMENT '1-主料 2-油墨 3-辅料',
  `material_id` BIGINT UNSIGNED DEFAULT NULL,
  `material_code` VARCHAR(50) NOT NULL,
  `material_name` VARCHAR(100) NOT NULL,
  `specification` VARCHAR(255) DEFAULT NULL,
  `unit_dosage` DECIMAL(10,4) NOT NULL,
  `unit` VARCHAR(20) DEFAULT NULL,
  `unit_cost` DECIMAL(12,4) DEFAULT 0.0000,
  `line_cost` DECIMAL(12,4) DEFAULT 0.0000,
  `remark` VARCHAR(255) DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`),
  CONSTRAINT `fk_tpl_item_card` FOREIGN KEY (`template_id`) REFERENCES `dcprint_sample_process_template` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准工艺模板物料明细表';

-- 3. 模板工序明细表
CREATE TABLE IF NOT EXISTS `dcprint_sample_process_template_step` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` BIGINT UNSIGNED NOT NULL COMMENT '模板ID',
  `process_id` BIGINT UNSIGNED DEFAULT NULL,
  `process_name` VARCHAR(100) NOT NULL,
  `work_hour` DECIMAL(6,2) NOT NULL,
  `hourly_rate` DECIMAL(10,2) DEFAULT 0.00,
  `line_cost` DECIMAL(12,4) DEFAULT 0.0000,
  `process_param` TEXT DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`),
  CONSTRAINT `fk_tpl_step_card` FOREIGN KEY (`template_id`) REFERENCES `dcprint_sample_process_template` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准工艺模板工序明细表';
