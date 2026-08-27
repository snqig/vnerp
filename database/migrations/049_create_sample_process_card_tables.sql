-- Migration 049: 打样工艺卡 — 创建主表、物料明细表、工序明细表
-- 依据: docs/打样工艺卡录入页统一完善方案.md
-- 双录入页同源同库：经典版(input)和高效版(input-v2)共用此数据模型
-- 关联: crm_customer, inv_material, dcprint_ink_color, dcprint_tool, prd_process_route_step

-- 1. 打样工艺卡主表
CREATE TABLE IF NOT EXISTS `dcprint_sample_process_card` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sample_no` VARCHAR(50) NOT NULL COMMENT '打样编号（唯一）',
  `sample_name` VARCHAR(100) NOT NULL COMMENT '打样名称',
  `customer_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) DEFAULT NULL COMMENT '客户名称（冗余）',
  `product_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '产品ID',
  `product_name` VARCHAR(200) DEFAULT NULL COMMENT '产品名称',
  `version_no` VARCHAR(20) NOT NULL DEFAULT 'V1.0' COMMENT '版本号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1-草稿 2-打样中 3-已确认 4-已作废',
  `substrate_material_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '基材物料ID',
  `substrate_material_name` VARCHAR(100) DEFAULT NULL COMMENT '基材名称（冗余）',
  `spec` VARCHAR(255) DEFAULT NULL COMMENT '规格',
  `print_color` VARCHAR(100) DEFAULT NULL COMMENT '印刷颜色描述',
  `ink_color_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '油墨色号ID',
  `screen_plate_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '网版工装ID',
  `die_tool_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '刀模工装ID',
  `material_loss_rate` DECIMAL(5,2) DEFAULT 5.00 COMMENT '物料损耗率(%)',
  `estimated_hour` DECIMAL(6,2) DEFAULT NULL COMMENT '预估工时',
  `sample_work_order_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '打样工单ID',
  `sample_work_order_no` VARCHAR(50) DEFAULT NULL COMMENT '打样工单号',
  `quote_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '报价单ID',
  `formal_work_order_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '正式工单ID',
  `source_version_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '源版本ID（复制来源）',
  `confirm_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '确认人ID',
  `confirm_time` DATETIME DEFAULT NULL COMMENT '确认时间',
  `total_material_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '物料总成本快照',
  `total_labor_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '人工总成本快照',
  `total_tool_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '工装总成本快照',
  `total_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '总成本快照',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `create_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sample_no` (`sample_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_ink_color` (`ink_color_id`),
  KEY `idx_die_tool` (`die_tool_id`),
  KEY `idx_screen_plate` (`screen_plate_id`),
  KEY `idx_source_version` (`source_version_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打样工艺卡主表';

-- 2. 工艺卡物料明细表
CREATE TABLE IF NOT EXISTS `dcprint_sample_process_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `card_id` BIGINT UNSIGNED NOT NULL COMMENT '工艺卡ID',
  `item_type` TINYINT NOT NULL DEFAULT 1 COMMENT '1-主料 2-油墨 3-辅料',
  `material_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID（inv_material.id）',
  `material_code` VARCHAR(50) NOT NULL COMMENT '物料编码',
  `material_name` VARCHAR(100) NOT NULL COMMENT '物料名称',
  `specification` VARCHAR(255) DEFAULT NULL COMMENT '规格',
  `unit_dosage` DECIMAL(10,4) NOT NULL COMMENT '单耗',
  `unit` VARCHAR(20) DEFAULT NULL COMMENT '单位',
  `unit_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '单价快照',
  `line_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '行成本快照',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_material_id` (`material_id`),
  CONSTRAINT `fk_sample_item_card` FOREIGN KEY (`card_id`) REFERENCES `dcprint_sample_process_card` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打样工艺卡物料明细表';

-- 3. 工艺卡工序明细表
CREATE TABLE IF NOT EXISTS `dcprint_sample_process_step` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `card_id` BIGINT UNSIGNED NOT NULL COMMENT '工艺卡ID',
  `process_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '标准工序ID（prd_process_route_step.id）',
  `process_name` VARCHAR(100) NOT NULL COMMENT '工序名称',
  `work_hour` DECIMAL(6,2) NOT NULL COMMENT '工时',
  `hourly_rate` DECIMAL(10,2) DEFAULT 0.00 COMMENT '工时单价快照',
  `line_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '行成本快照',
  `process_param` TEXT DEFAULT NULL COMMENT '工艺参数',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_process_id` (`process_id`),
  CONSTRAINT `fk_sample_step_card` FOREIGN KEY (`card_id`) REFERENCES `dcprint_sample_process_card` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打样工艺卡工序明细表';
