-- Migration 048: Create die-cutting/screen-plate tooling lifecycle management tables
-- Per docs/刀模 _ 网版工装全生命周期管理 完整落地方案.md.md
-- Single-table inheritance: tool_type 1=die, 2=screen_plate
-- 5-state lifecycle: 1=待用, 2=在用, 3=维修中, 4=预警, 5=已报废

CREATE TABLE IF NOT EXISTS `dcprint_tool` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tool_type` TINYINT NOT NULL COMMENT '1-刀模 2-网版',
  `tool_code` VARCHAR(50) NOT NULL COMMENT '工装编码',
  `tool_name` VARCHAR(100) NOT NULL COMMENT '工装名称',
  `spec` VARCHAR(255) DEFAULT NULL COMMENT '规格',
  `material_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联物料ID',
  `total_life` INT NOT NULL COMMENT '额定总寿命(次数)',
  `warning_threshold` INT NOT NULL COMMENT '预警阈值(次数)',
  `used_count` INT NOT NULL DEFAULT 0 COMMENT '已使用次数',
  `remain_life` INT NOT NULL COMMENT '剩余寿命',
  `original_cost` DECIMAL(10,2) NOT NULL COMMENT '原值',
  `accumulated_cost` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '累计分摊成本',
  `net_value` DECIMAL(10,2) NOT NULL COMMENT '账面净值',
  `unit_cost` DECIMAL(10,4) NOT NULL COMMENT '单次分摊成本',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1-待用 2-在用 3-维修中 4-预警 5-已报废',
  `manufacture_date` DATE DEFAULT NULL COMMENT '制作日期',
  `warehouse_location` VARCHAR(100) DEFAULT NULL COMMENT '存放位置',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `scrap_reason` TEXT DEFAULT NULL COMMENT '报废原因',
  `scrap_time` DATETIME DEFAULT NULL COMMENT '报废时间',
  `scrap_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '报废人',
  `create_by` BIGINT UNSIGNED DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_by` BIGINT UNSIGNED DEFAULT NULL,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tool_code` (`tool_code`),
  KEY `type_status_idx` (`tool_type`, `status`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刀模/网版工装主档案表';

CREATE TABLE IF NOT EXISTS `dcprint_tool_usage` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tool_id` BIGINT UNSIGNED NOT NULL COMMENT '工装ID',
  `work_order_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联工单ID',
  `work_order_no` VARCHAR(50) DEFAULT NULL COMMENT '关联工单号',
  `process_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '工序ID',
  `process_name` VARCHAR(100) DEFAULT NULL COMMENT '工序名称',
  `use_count` INT NOT NULL DEFAULT 1 COMMENT '本次使用次数(=报工数量)',
  `operator_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人员ID',
  `operator_name` VARCHAR(100) DEFAULT NULL COMMENT '操作人员姓名',
  `amortized_cost` DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '本次分摊成本快照',
  `use_time` DATETIME NOT NULL COMMENT '使用时间',
  `remark` VARCHAR(500) DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tool` (`tool_id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_use_time` (`use_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工装使用记录表';

CREATE TABLE IF NOT EXISTS `dcprint_tool_maintenance` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tool_id` BIGINT UNSIGNED NOT NULL COMMENT '工装ID',
  `maintenance_type` TINYINT NOT NULL DEFAULT 1 COMMENT '1-维修 2-保养',
  `maintenance_cost` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '维修费用',
  `description` TEXT COMMENT '维修内容',
  `life_before` INT NOT NULL COMMENT '维修前剩余寿命',
  `life_after` INT NOT NULL COMMENT '维修后剩余寿命(手动调整)',
  `life_adjustment` INT NOT NULL DEFAULT 0 COMMENT '寿命调整量',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1-进行中 2-已完成',
  `start_time` DATETIME NOT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '完成时间',
  `operator_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '维修人ID',
  `operator_name` VARCHAR(100) DEFAULT NULL COMMENT '维修人姓名',
  `remark` VARCHAR(500) DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tool` (`tool_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工装维修记录表';
