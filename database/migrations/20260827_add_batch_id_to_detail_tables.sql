-- ==========================================
-- 迁移: 20260827_add_batch_id_to_detail_tables
-- 用途: 补齐明细表 batch_id / original_inbound_date / location_id 字段，
--       确保库存全链路可追溯（对齐规则 P0）
-- 关联代码: src/app/api/warehouse/**, src/app/api/production/material-*
-- 执行: mysql -u root -p vnerpdacahng < 20260827_add_batch_id_to_detail_tables.sql
-- 注意: 本迁移幂等，可重复执行（使用 IF NOT EXISTS / 检查列存在）
-- ==========================================

DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_column_if_not_exists(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN col_def TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', col_def);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

-- ==========================================
-- 1. inv_sales_outbound_item — 🔴 核心缺失
--    明细需绑定 batch_id 才能精确扣减批次库存
-- ==========================================
CALL add_column_if_not_exists('inv_sales_outbound_item', 'batch_id',
  'BIGINT UNSIGNED NULL COMMENT "库存批次 ID，关联 inv_inventory_batch.id"');
CALL add_column_if_not_exists('inv_sales_outbound_item', 'location_id',
  'BIGINT UNSIGNED NULL COMMENT "出库库位 ID"');
CALL add_column_if_not_exists('inv_sales_outbound_item', 'original_inbound_date',
  'DATE NULL COMMENT "原批次入库日期，用于 FIFO 校验"');
CALL add_column_if_not_exists('inv_sales_outbound_item', 'qr_code',
  'VARCHAR(100) NULL COMMENT "二维码（副本）"');

-- ==========================================
-- 2. inv_outbound_item — 🔴 核心缺失
--    销售出库/通用出库明细需绑定 batch_id
-- ==========================================
CALL add_column_if_not_exists('inv_outbound_item', 'batch_id',
  'BIGINT UNSIGNED NULL COMMENT "库存批次 ID"');
CALL add_column_if_not_exists('inv_outbound_item', 'location_id',
  'BIGINT UNSIGNED NULL COMMENT "出库库位 ID"');
CALL add_column_if_not_exists('inv_outbound_item', 'original_inbound_date',
  'DATE NULL COMMENT "原批次入库日期"');
CALL add_column_if_not_exists('inv_outbound_item', 'qr_code',
  'VARCHAR(100) NULL COMMENT "二维码"');

-- ==========================================
-- 3. inv_inbound_item — 🟡 业务扩展
--    入库明细记录批次 ID，便于反向追溯
-- ==========================================
CALL add_column_if_not_exists('inv_inbound_item', 'batch_id',
  'BIGINT UNSIGNED NULL COMMENT "入库批次 ID，审核通过时在 InventorySyncHandler 中回填"');
CALL add_column_if_not_exists('inv_inbound_item', 'original_inbound_date',
  'DATE NULL COMMENT "原始入库日期（= inbound_date）"');
CALL add_column_if_not_exists('inv_inbound_item', 'location_id',
  'BIGINT UNSIGNED NULL COMMENT "入库库位 ID"');

-- ==========================================
-- 4. prd_material_issue_item — 🔴 生产领料核心
--    领料明细必须绑定批次 ID，FIFO 扣减后可精确追溯
-- ==========================================
CALL add_column_if_not_exists('prd_material_issue_item', 'batch_id',
  'BIGINT UNSIGNED NULL COMMENT "领料使用的库存批次 ID"');
CALL add_column_if_not_exists('prd_material_issue_item', 'original_inbound_date',
  'DATE NULL COMMENT "批次原始入库日期"');

-- ==========================================
-- 5. prd_material_return_item — 🔴 生产退料核心
--    退料明细必须绑定原批次 ID，退库时需恢复正确批次
-- ==========================================
CALL add_column_if_not_exists('prd_material_return_item', 'batch_id',
  'BIGINT UNSIGNED NULL COMMENT "退料的库存批次 ID（与领料原批次一致）"');
CALL add_column_if_not_exists('prd_material_return_item', 'original_inbound_date',
  'DATE NULL COMMENT "原批次入库日期"');

-- ==========================================
-- 6. inv_transfer_item — 🔴 调拨核心
--    调拨明细必须绑定批次 ID，出库/入库流水需精确关联
-- ==========================================
CALL add_column_if_not_exists('inv_transfer_item', 'batch_id',
  'BIGINT UNSIGNED NULL COMMENT "库存批次 ID"');
CALL add_column_if_not_exists('inv_transfer_item', 'original_inbound_date',
  'DATE NULL COMMENT "原批次入库日期"');
CALL add_column_if_not_exists('inv_transfer_item', 'location_id',
  'BIGINT UNSIGNED NULL COMMENT "库位 ID"');
CALL add_column_if_not_exists('inv_transfer_item', 'qr_code',
  'VARCHAR(64) NULL COMMENT "二维码"');

-- ==========================================
-- 7. inv_stocktaking_item — 🟡 盘点扩展
--    盘点明细关联批次 ID，便于差异追溯
-- ==========================================
CALL add_column_if_not_exists('inv_stocktaking_item', 'batch_id',
  'BIGINT UNSIGNED NULL COMMENT "批次 ID"');
CALL add_column_if_not_exists('inv_stocktaking_item', 'location_id',
  'BIGINT UNSIGNED NULL COMMENT "库位 ID"');
CALL add_column_if_not_exists('inv_stocktaking_item', 'original_inbound_date',
  'DATE NULL COMMENT "原批次入库日期"');
CALL add_column_if_not_exists('inv_stocktaking_item', 'qr_code',
  'VARCHAR(100) NULL COMMENT "二维码"');

-- ==========================================
-- 8. inv_stock_adjust_item — 🟡 调整扩展
--    调整明细必须关联批次 ID，确保流水精确
-- ==========================================
CALL add_column_if_not_exists('inv_stock_adjust_item', 'batch_id',
  'BIGINT UNSIGNED NULL COMMENT "库存批次 ID"');
CALL add_column_if_not_exists('inv_stock_adjust_item', 'location_id',
  'BIGINT UNSIGNED NULL COMMENT "库位 ID"');
CALL add_column_if_not_exists('inv_stock_adjust_item', 'original_inbound_date',
  'DATE NULL COMMENT "原批次入库日期"');
CALL add_column_if_not_exists('inv_stock_adjust_item', 'qr_code',
  'VARCHAR(100) NULL COMMENT "二维码"');

-- ==========================================
-- 9. 追加索引（IF NOT EXISTS）
-- ==========================================
SET @ddl = 'ALTER TABLE `inv_sales_outbound_item` ADD INDEX `idx_batch_id` (`batch_id`)';
PREPARE stmt FROM IFNULL(@ddl, 'SELECT 1');
SELECT 1 INTO @dummy WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound_item' AND INDEX_NAME = 'idx_batch_id'
);
PREPARE stmt FROM IFNULL(@ddl, 'SELECT 1'); EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = 'ALTER TABLE `prd_material_issue_item` ADD INDEX `idx_batch_id` (`batch_id`)';
SELECT 1 INTO @dummy WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_material_issue_item' AND INDEX_NAME = 'idx_batch_id'
);
PREPARE stmt FROM IFNULL(@ddl, 'SELECT 1'); EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = 'ALTER TABLE `prd_material_return_item` ADD INDEX `idx_batch_id` (`batch_id`)';
SELECT 1 INTO @dummy WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_material_return_item' AND INDEX_NAME = 'idx_batch_id'
);
PREPARE stmt FROM IFNULL(@ddl, 'SELECT 1'); EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = 'ALTER TABLE `inv_transfer_item` ADD INDEX `idx_batch_id` (`batch_id`)';
SELECT 1 INTO @dummy WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_item' AND INDEX_NAME = 'idx_batch_id'
);
PREPARE stmt FROM IFNULL(@ddl, 'SELECT 1'); EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = 'ALTER TABLE `inv_stocktaking_item` ADD INDEX `idx_batch_id` (`batch_id`)';
SELECT 1 INTO @dummy WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking_item' AND INDEX_NAME = 'idx_batch_id'
);
PREPARE stmt FROM IFNULL(@ddl, 'SELECT 1'); EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = 'ALTER TABLE `inv_stock_adjust_item` ADD INDEX `idx_batch_id` (`batch_id`)';
SELECT 1 INTO @dummy WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust_item' AND INDEX_NAME = 'idx_batch_id'
);
PREPARE stmt FROM IFNULL(@ddl, 'SELECT 1'); EXECUTE stmt; DEALLOCATE PREPARE stmt;
