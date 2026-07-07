-- ========================================================
-- 014: 补全 sal_delivery 物流联系人字段
-- 目的：支持发货单的物流配送信息（收货人、联系方式、配送地址）
-- 缺失字段：
--   sal_delivery:
--     - total_qty         总数量（明细数量合计，冗余便于查询）
--     - contact_name      收货人姓名
--     - contact_phone     收货人电话
--     - delivery_address  配送地址
--     - sign_status       签收状态（0-未签收, 1-已签收）
-- 兼容：INFORMATION_SCHEMA 检测 + PREPARE/EXECUTE 实现幂等
-- ========================================================

-- total_qty
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'total_qty');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `total_qty` DECIMAL(18,4) DEFAULT 0 COMMENT ''总数量（明细数量合计）'' AFTER `total_amount`',
  'SELECT ''column total_qty already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- contact_name
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'contact_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `contact_name` VARCHAR(50) COMMENT ''收货人姓名'' AFTER `tracking_no`',
  'SELECT ''column contact_name already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- contact_phone
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'contact_phone');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `contact_phone` VARCHAR(30) COMMENT ''收货人电话'' AFTER `contact_name`',
  'SELECT ''column contact_phone already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- delivery_address
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'delivery_address');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `delivery_address` VARCHAR(500) COMMENT ''配送地址'' AFTER `contact_phone`',
  'SELECT ''column delivery_address already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sign_status
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND COLUMN_NAME = 'sign_status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sal_delivery` ADD COLUMN `sign_status` TINYINT DEFAULT 0 COMMENT ''签收状态: 0-未签收, 1-已签收'' AFTER `sign_time`',
  'SELECT ''column sign_status already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
