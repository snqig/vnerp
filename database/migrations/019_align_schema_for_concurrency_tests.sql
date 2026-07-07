-- ============================================================
-- Migration 019: 为并发测试补齐缺失的表和列
-- 日期: 2026-07-07
-- 目的: P0-2 基线重置的一部分，恢复 8 个被 skip 的 concurrency 测试
-- 内容:
--   1. 创建 inv_stocktaking 和 inv_stocktaking_item 表
--   2. 为 inv_inventory 添加 batch_no 列
--   3. 为 inv_outbound_order 添加 operator_id, version 列
--   4. 为 inv_outbound_item 添加 deleted 列
--   5. 为 inv_inbound_order 添加 operator_id, operator_name, warehouse_code, warehouse_name 列
--   6. 为 inv_inbound_item 添加 deleted 列
--   7. 为 prd_material_issue 添加 operator_id 列
--   8. 为 prd_material_issue_item 添加 create_time 列
-- 幂等性: 所有 ALTER 使用 INFORMATION_SCHEMA 守卫
-- ========================================================

-- ========================================================
-- 一、创建 inv_stocktaking 盘点单主表
-- ========================================================
SET @tbl_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking');
SET @sql = IF(@tbl_exists = 0, 'CREATE TABLE inv_stocktaking (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  taking_no VARCHAR(50) NOT NULL COMMENT ''盘点单号'',
  taking_type TINYINT DEFAULT 1 COMMENT ''盘点类型: 1-全盘, 2-部分盘'',
  warehouse_id BIGINT UNSIGNED NOT NULL COMMENT ''仓库ID'',
  status TINYINT DEFAULT 1 COMMENT ''状态: 1-待盘点, 2-盘点中, 3-待审批, 4-已审批, 9-已取消'',
  taking_date DATE COMMENT ''盘点日期'',
  operator_id BIGINT UNSIGNED COMMENT ''操作员ID'',
  operator_name VARCHAR(50) COMMENT ''操作员姓名'',
  remark VARCHAR(500) COMMENT ''备注'',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_taking_no (taking_no),
  KEY idx_warehouse (warehouse_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=''盘点单主表''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 二、创建 inv_stocktaking_item 盘点单明细表
-- ========================================================
SET @tbl_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking_item');
SET @sql = IF(@tbl_exists = 0, 'CREATE TABLE inv_stocktaking_item (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  taking_id BIGINT UNSIGNED NOT NULL COMMENT ''盘点单ID'',
  material_id BIGINT UNSIGNED NOT NULL COMMENT ''物料ID'',
  material_code VARCHAR(50) COMMENT ''物料编码'',
  material_name VARCHAR(100) COMMENT ''物料名称'',
  system_qty DECIMAL(18,4) DEFAULT 0 COMMENT ''系统数量'',
  actual_qty DECIMAL(18,4) DEFAULT 0 COMMENT ''实盘数量'',
  diff_qty DECIMAL(18,4) DEFAULT 0 COMMENT ''差异数量'',
  unit VARCHAR(20) COMMENT ''单位'',
  batch_no VARCHAR(50) COMMENT ''批次号'',
  remark VARCHAR(255) COMMENT ''备注'',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_taking (taking_id),
  KEY idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=''盘点单明细表''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 三、为 inv_inventory 添加 batch_no 列
-- ========================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory' AND COLUMN_NAME = 'batch_no');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_inventory ADD COLUMN batch_no VARCHAR(50) COMMENT ''批次号'' AFTER available_qty', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 四、为 inv_outbound_order 添加缺失列
-- ========================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_outbound_order ADD COLUMN operator_id BIGINT UNSIGNED COMMENT ''操作员ID'' AFTER operator_name', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND COLUMN_NAME = 'version');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_outbound_order ADD COLUMN version INT DEFAULT 0 COMMENT ''乐观锁版本号'' AFTER deleted', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 五、为 inv_outbound_item 添加 deleted 列
-- ========================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_item' AND COLUMN_NAME = 'deleted');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_outbound_item ADD COLUMN deleted TINYINT DEFAULT 0 COMMENT ''软删除'' AFTER create_time', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 六、为 inv_inbound_order 添加缺失列
-- ========================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_inbound_order ADD COLUMN operator_id BIGINT UNSIGNED COMMENT ''操作员ID'' AFTER supplier_name', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'operator_name');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_inbound_order ADD COLUMN operator_name VARCHAR(50) COMMENT ''操作员姓名'' AFTER operator_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'warehouse_code');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_inbound_order ADD COLUMN warehouse_code VARCHAR(50) COMMENT ''仓库编码'' AFTER warehouse_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'warehouse_name');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_inbound_order ADD COLUMN warehouse_name VARCHAR(100) COMMENT ''仓库名称'' AFTER warehouse_code', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 七、为 inv_inbound_item 添加 deleted 列
-- ========================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND COLUMN_NAME = 'deleted');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE inv_inbound_item ADD COLUMN deleted TINYINT DEFAULT 0 COMMENT ''软删除'' AFTER create_time', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 八、为 prd_material_issue 添加 operator_id 列
-- ========================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_material_issue' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE prd_material_issue ADD COLUMN operator_id BIGINT UNSIGNED COMMENT ''操作员ID'' AFTER operator_name', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 九、为 prd_material_issue_item 添加 create_time 列
-- ========================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_material_issue_item' AND COLUMN_NAME = 'create_time');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE prd_material_issue_item ADD COLUMN create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 十、校验
-- ========================================================
SELECT CONCAT('inv_stocktaking: ', COUNT(*)) AS summary
FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking';
