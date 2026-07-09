-- ==========================================
-- Migration 046: 设备维保管理模块建表
-- 创建三张表：eq_equipment（设备台账）、eq_maintenance_plan（维保计划）、eq_maintenance_record（维保记录）
-- 遵循项目规范：utf8mb4 字符集、BIGINT UNSIGNED 主键、软删除、审计字段
-- ==========================================

-- 1. 设备台账表
CREATE TABLE IF NOT EXISTS `eq_equipment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '设备ID',
  `equipment_code` VARCHAR(50) NOT NULL COMMENT '设备编号（唯一）',
  `equipment_name` VARCHAR(100) NOT NULL COMMENT '设备名称',
  `equipment_type` VARCHAR(50) NOT NULL DEFAULT 'other' COMMENT '设备类型：printing/die_cutting/laminating/slitting/other',
  `model` VARCHAR(100) DEFAULT NULL COMMENT '型号规格',
  `manufacturer` VARCHAR(100) DEFAULT NULL COMMENT '制造商',
  `workshop` VARCHAR(50) DEFAULT NULL COMMENT '所属车间',
  `location` VARCHAR(100) DEFAULT NULL COMMENT '安装位置',
  `purchase_date` DATE DEFAULT NULL COMMENT '购置日期',
  `install_date` DATE DEFAULT NULL COMMENT '安装日期',
  `purchase_price` DECIMAL(12,2) DEFAULT 0.00 COMMENT '购置价格',
  `expected_life_years` INT DEFAULT 10 COMMENT '预计使用年限（年）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=运行中 2=停机 3=维修中 4=报废',
  `cumulative_run_hours` DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计运行时长（小时）',
  `cumulative_print_count` BIGINT DEFAULT 0 COMMENT '累计印刷次数',
  `last_maintenance_date` DATE DEFAULT NULL COMMENT '上次维保日期',
  `next_maintenance_date` DATE DEFAULT NULL COMMENT '下次维保日期',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0=正常 1=已删除',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_equipment_code` (`equipment_code`),
  KEY `idx_equipment_type` (`equipment_type`),
  KEY `idx_equipment_status` (`status`),
  KEY `idx_equipment_workshop` (`workshop`),
  KEY `idx_equipment_next_maintenance` (`next_maintenance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备台账表';

-- 2. 维保计划表
CREATE TABLE IF NOT EXISTS `eq_maintenance_plan` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '计划ID',
  `plan_no` VARCHAR(50) NOT NULL COMMENT '计划编号（唯一）',
  `equipment_id` BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
  `plan_name` VARCHAR(100) NOT NULL COMMENT '计划名称',
  `maintenance_type` VARCHAR(20) NOT NULL DEFAULT 'routine' COMMENT '维保类型：routine=日常保养/periodic=定期维保/major=大修',
  `cycle_type` VARCHAR(20) NOT NULL DEFAULT 'monthly' COMMENT '周期类型：daily/weekly/monthly/quarterly/yearly/custom',
  `cycle_days` INT DEFAULT 30 COMMENT '自定义周期天数（cycle_type=custom 时使用）',
  `lead_days` INT DEFAULT 7 COMMENT '提前提醒天数',
  `estimated_hours` DECIMAL(5,2) DEFAULT 4.00 COMMENT '预计耗时（小时）',
  `estimated_cost` DECIMAL(10,2) DEFAULT 0.00 COMMENT '预计费用',
  `checklist` JSON DEFAULT NULL COMMENT '检查项目清单（JSON 数组）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=启用 2=停用',
  `last_executed_date` DATE DEFAULT NULL COMMENT '上次执行日期',
  `next_execute_date` DATE DEFAULT NULL COMMENT '下次执行日期',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0=正常 1=已删除',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_no` (`plan_no`),
  KEY `idx_plan_equipment` (`equipment_id`),
  KEY `idx_plan_status` (`status`),
  KEY `idx_plan_next_execute` (`next_execute_date`),
  CONSTRAINT `fk_plan_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `eq_equipment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='维保计划表';

-- 3. 维保记录表
CREATE TABLE IF NOT EXISTS `eq_maintenance_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `record_no` VARCHAR(50) NOT NULL COMMENT '记录编号（唯一）',
  `equipment_id` BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
  `plan_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联计划ID（自主维保为 NULL）',
  `maintenance_type` VARCHAR(20) NOT NULL DEFAULT 'routine' COMMENT '维保类型：routine=日常保养/periodic=定期维保/major=大修/emergency=紧急维修',
  `maintenance_date` DATE NOT NULL COMMENT '维保日期',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
  `actual_hours` DECIMAL(5,2) DEFAULT 0.00 COMMENT '实际耗时（小时）',
  `actual_cost` DECIMAL(10,2) DEFAULT 0.00 COMMENT '实际费用',
  `technician_name` VARCHAR(50) DEFAULT NULL COMMENT '技术员',
  `run_hours_before` DECIMAL(10,2) DEFAULT NULL COMMENT '维保前运行时长',
  `run_hours_after` DECIMAL(10,2) DEFAULT NULL COMMENT '维保后运行时长',
  `description` TEXT DEFAULT NULL COMMENT '维保内容描述',
  `parts_replaced` JSON DEFAULT NULL COMMENT '更换配件清单（JSON 数组）',
  `result` VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT '维保结果：completed=完成/partial=部分完成/failed=失败',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=已完成 2=进行中 3=已取消',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0=正常 1=已删除',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_record_equipment` (`equipment_id`),
  KEY `idx_record_plan` (`plan_id`),
  KEY `idx_record_date` (`maintenance_date`),
  KEY `idx_record_status` (`status`),
  CONSTRAINT `fk_record_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `eq_equipment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_record_plan` FOREIGN KEY (`plan_id`) REFERENCES `eq_maintenance_plan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='维保记录表';
