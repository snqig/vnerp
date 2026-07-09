-- 047: 油墨配方版本管理 — 创建色号、版本、明细三张表
-- 依据: docs/油墨配方版本管理完整落地方案.md
-- 命名规范: dcprint_ 模块前缀 + 实体名，全量审计字段 + 软删除

-- 1. 色号基础档案表
CREATE TABLE IF NOT EXISTS `dcprint_ink_color` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `color_code` VARCHAR(50) NOT NULL COMMENT '色号编码（唯一）',
  `color_name` VARCHAR(100) NOT NULL COMMENT '色号名称',
  `color_series` VARCHAR(50) COMMENT '色系（红/蓝/绿...）',
  `base_ink_type` VARCHAR(50) COMMENT '基墨类型（UV/solvent/water）',
  `pantone_code` VARCHAR(50) COMMENT 'Pantone 色号',
  `remark` TEXT COMMENT '备注',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1-启用 2-停用',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_color_code` (`color_code`),
  KEY `idx_color_name` (`color_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨色号基础档案表';

-- 2. 配方版本主表（含成本快照）
CREATE TABLE IF NOT EXISTS `dcprint_ink_formula_version` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `color_id` BIGINT UNSIGNED NOT NULL COMMENT '色号ID',
  `version_no` VARCHAR(20) NOT NULL COMMENT '版本号 V1.0',
  `version_name` VARCHAR(100) COMMENT '版本名称',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1-草稿 2-已生效 3-已作废',
  `change_reason` TEXT COMMENT '变更原因',
  `source_version_id` BIGINT UNSIGNED COMMENT '源版本ID（一键复用来源）',
  `process_note` TEXT COMMENT '工艺说明',
  `total_weight` DECIMAL(10,3) COMMENT '配方总重量',
  `unit` VARCHAR(10) DEFAULT 'kg' COMMENT '单位',
  `shelf_life_hours` INT DEFAULT 168 COMMENT '保质期(小时)',

  -- 成本快照
  `theoretical_cost` DECIMAL(12,4) COMMENT '理论成本',
  `cost_snapshot_time` DATETIME COMMENT '成本快照时间',
  `cost_calc_status` TINYINT NOT NULL DEFAULT 0 COMMENT '0-未计算 1-完成 2-部分缺失',
  `cost_warning` VARCHAR(255) COMMENT '成本缺失警告',

  `activate_by` BIGINT UNSIGNED COMMENT '生效操作人ID',
  `activate_time` DATETIME COMMENT '生效时间',
  `cancel_by` BIGINT UNSIGNED COMMENT '作废操作人ID',
  `cancel_reason` TEXT COMMENT '作废原因',
  `cancel_time` DATETIME COMMENT '作废时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_color_version` (`color_id`, `version_no`),
  KEY `idx_color_id` (`color_id`),
  KEY `idx_status` (`status`),
  KEY `idx_source_version` (`source_version_id`),
  CONSTRAINT `fk_formula_version_color` FOREIGN KEY (`color_id`) REFERENCES `dcprint_ink_color` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨配方版本主表';

-- 3. 配方明细表（含成本快照）
CREATE TABLE IF NOT EXISTS `dcprint_ink_formula_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `version_id` BIGINT UNSIGNED NOT NULL COMMENT '版本ID',
  `material_id` BIGINT UNSIGNED COMMENT '物料ID（base_ink.id）',
  `material_code` VARCHAR(50) NOT NULL COMMENT '物料编码',
  `material_name` VARCHAR(100) NOT NULL COMMENT '物料名称',
  `ink_type` VARCHAR(20) COMMENT '油墨类型',
  `brand` VARCHAR(100) COMMENT '品牌',
  `ratio` DECIMAL(8,4) NOT NULL DEFAULT 0 COMMENT '配比百分比',
  `weight` DECIMAL(10,3) COMMENT '重量',
  `unit` VARCHAR(10) DEFAULT 'kg' COMMENT '单位',
  `add_order` INT NOT NULL DEFAULT 0 COMMENT '加料顺序',
  `process_remark` VARCHAR(255) COMMENT '工艺备注',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `is_base` TINYINT NOT NULL DEFAULT 0 COMMENT '是否基墨',
  `snapshot_unit_cost` DECIMAL(12,4) COMMENT '快照单位成本',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_version_id` (`version_id`),
  CONSTRAINT `fk_formula_item_version` FOREIGN KEY (`version_id`) REFERENCES `dcprint_ink_formula_version` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨配方明细表';
