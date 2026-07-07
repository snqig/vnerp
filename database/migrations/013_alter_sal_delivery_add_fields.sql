-- ========================================================
-- 013: 补全 sal_delivery / sal_delivery_detail 缺失字段
-- 目的：使现有 sal_delivery 表能完整持久化 Delivery 聚合根
-- 缺失字段：
--   sal_delivery:
--     - order_no        销售订单号（冗余）
--     - customer_name   客户名称（冗余）
--     - ship_by         发货人ID
--     - ship_time       发货时间
--     - sign_by         签收人ID
--     - sign_time       签收时间
--     - version         乐观锁版本号
--     - update_time     更新时间（已有 create_time）
--     - update_by       更新人ID
--     - deleted         软删除标记
--   sal_delivery_detail:
--     - line_no         行号
--     - material_code   物料编码（冗余）
--     - material_name   物料名称（冗余）
--     - material_spec   物料规格（冗余）
--     - deleted         软删除标记
-- 兼容：使用 ALTER TABLE ADD COLUMN IF NOT EXISTS（MySQL 8.0.29+）
--       低版本用存储过程幂等检测，此处采用 INFORMATION_SCHEMA 检测
-- ========================================================

-- --------------------------------------------------------
-- 1. sal_delivery 补字段
-- --------------------------------------------------------

-- order_no
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'order_no');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `order_no` VARCHAR(50) COMMENT ''销售订单号（冗余）'' AFTER `order_id`',
  'SELECT ''column order_no already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customer_name
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'customer_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `customer_name` VARCHAR(100) COMMENT ''客户名称（冗余）'' AFTER `customer_id`',
  'SELECT ''column customer_name already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ship_by
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'ship_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `ship_by` BIGINT UNSIGNED COMMENT ''发货人ID'' AFTER `create_by`',
  'SELECT ''column ship_by already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ship_time
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'ship_time');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `ship_time` DATETIME COMMENT ''发货时间'' AFTER `ship_by`',
  'SELECT ''column ship_time already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sign_by
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'sign_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `sign_by` BIGINT UNSIGNED COMMENT ''签收人ID'' AFTER `ship_time`',
  'SELECT ''column sign_by already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sign_time
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'sign_time');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `sign_time` DATETIME COMMENT ''签收时间'' AFTER `sign_by`',
  'SELECT ''column sign_time already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- version
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'version');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `version` INT DEFAULT 0 COMMENT ''乐观锁版本号''',
  'SELECT ''column version already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- update_time
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'update_time');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''',
  'SELECT ''column update_time already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- update_by
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'update_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `update_by` BIGINT UNSIGNED COMMENT ''更新人ID''',
  'SELECT ''column update_by already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- deleted
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'deleted');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `deleted` TINYINT DEFAULT 0 COMMENT ''删除标记''',
  'SELECT ''column deleted already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- 2. sal_delivery_detail 补字段
-- --------------------------------------------------------

-- line_no
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND COLUMN_NAME = 'line_no');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery_detail` ADD COLUMN `line_no` INT COMMENT ''行号'' AFTER `delivery_id`',
  'SELECT ''column line_no already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- material_code
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND COLUMN_NAME = 'material_code');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery_detail` ADD COLUMN `material_code` VARCHAR(50) COMMENT ''物料编码（冗余）'' AFTER `material_id`',
  'SELECT ''column material_code already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- material_name
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND COLUMN_NAME = 'material_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery_detail` ADD COLUMN `material_name` VARCHAR(200) COMMENT ''物料名称（冗余）'' AFTER `material_code`',
  'SELECT ''column material_name already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- material_spec
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND COLUMN_NAME = 'material_spec');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery_detail` ADD COLUMN `material_spec` VARCHAR(100) COMMENT ''物料规格（冗余）'' AFTER `material_name`',
  'SELECT ''column material_spec already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- deleted
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND COLUMN_NAME = 'deleted');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery_detail` ADD COLUMN `deleted` TINYINT DEFAULT 0 COMMENT ''删除标记''',
  'SELECT ''column deleted already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
