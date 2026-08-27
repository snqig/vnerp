-- 库存管理相关表
-- 用于修复 inv_inventory_batch 表不存在的问题

-- 物料表
CREATE TABLE IF NOT EXISTS `bas_material` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '物料ID',
  `code` VARCHAR(50) NOT NULL COMMENT '物料编码',
  `name` VARCHAR(100) NOT NULL COMMENT '物料名称',
  `specification` VARCHAR(255) COMMENT '规格型号',
  `category_id` BIGINT UNSIGNED COMMENT '分类ID',
  `unit` VARCHAR(20) COMMENT '单位',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料表';

-- 库位表
CREATE TABLE IF NOT EXISTS `inv_location` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '库位ID',
  `location_code` VARCHAR(50) NOT NULL COMMENT '库位编码',
  `location_name` VARCHAR(100) NOT NULL COMMENT '库位名称',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `area` VARCHAR(50) COMMENT '区域',
  `shelf` VARCHAR(50) COMMENT '货架',
  `layer` VARCHAR(20) COMMENT '层',
  `position` VARCHAR(20) COMMENT '位',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库位表';

-- 库存批次表
CREATE TABLE IF NOT EXISTS `inv_inventory_batch` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '批次ID',
  `batch_no` VARCHAR(50) NOT NULL COMMENT '批次号',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `location_id` BIGINT UNSIGNED COMMENT '库位ID',
  `quantity` DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '数量',
  `available_qty` DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '可用数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_batch_no` (`batch_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_location` (`location_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存批次表';

-- 插入测试数据
INSERT INTO `bas_material` (`code`, `name`, `specification`, `unit`, `status`) VALUES
('MAT001', '原材料A', '规格A', '件', 1),
('MAT002', '原材料B', '规格B', '千克', 1),
('MAT003', '半成品X', '规格X', '件', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 插入测试库位数据（如果仓库表有数据）
INSERT INTO `inv_location` (`location_code`, `location_name`, `warehouse_id`, `area`, `shelf`, `layer`, `position`, `status`)
SELECT 
  'LOC001', 'A区-01货架', w.id, 'A区', '01', '1', '01', 1
FROM `inv_warehouse` w 
WHERE w.warehouse_code = 'WH001' AND w.deleted = 0
LIMIT 1
ON DUPLICATE KEY UPDATE `location_name` = VALUES(`location_name`);

-- 插入测试库存批次数据
INSERT INTO `inv_inventory_batch` (`batch_no`, `material_id`, `warehouse_id`, `location_id`, `quantity`, `available_qty`, `unit`, `status`)
SELECT 
  'BATCH001',
  (SELECT id FROM `bas_material` WHERE code = 'MAT001' LIMIT 1),
  w.id,
  (SELECT id FROM `inv_location` WHERE location_code = 'LOC001' LIMIT 1),
  100.0000,
  100.0000,
  '件',
  1
FROM `inv_warehouse` w 
WHERE w.warehouse_code = 'WH001' AND w.deleted = 0
LIMIT 1
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`);
