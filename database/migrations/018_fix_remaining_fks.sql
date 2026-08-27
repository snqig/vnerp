-- ============================================================
-- Migration 018: 修复 Migration 017 遗留的 4 个 FK 问题
-- 日期: 2026-07-07
-- 背景: Migration 017 添加 12 个 FK 成功，6 个失败
--   原因:
--     1. inv_inventory_batch.material_id 类型 INT UNSIGNED != inv_material.id BIGINT UNSIGNED
--     2. inv_inventory_batch.warehouse_id NOT NULL 不能用 SET NULL
--     3. sal_return / sal_return_detail 表实际名为 sal_return_order / sal_return_order_item
--     4. inv_outbound_order 缺少 customer_id 和 work_order_id 列
-- 策略:
--   - 修复 inv_inventory_batch 列类型为 BIGINT UNSIGNED（与父表对齐）
--   - 用 RESTRICT 替代 SET NULL 添加 inv_inventory_batch FK
--   - 对 sal_return_order 和 sal_return_order_item 添加 FK
--   - 跳过 inv_outbound_order 的 customer_id/work_order_id（列不存在，需先补列）
-- ============================================================

-- ========================================================
-- 一、修复 inv_inventory_batch 列类型不匹配
-- ========================================================

-- 检查并修改 material_id 类型为 BIGINT UNSIGNED
SET @col_type = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND COLUMN_NAME = 'material_id');
SET @sql = IF(@col_type = 'int unsigned', 'ALTER TABLE inv_inventory_batch MODIFY COLUMN material_id BIGINT UNSIGNED NOT NULL COMMENT ''物料ID''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 检查并修改 warehouse_id 类型为 BIGINT UNSIGNED（保持 NOT NULL）
SET @col_type = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND COLUMN_NAME = 'warehouse_id');
SET @sql = IF(@col_type = 'int unsigned', 'ALTER TABLE inv_inventory_batch MODIFY COLUMN warehouse_id BIGINT UNSIGNED NOT NULL COMMENT ''仓库ID''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 二、补加 inv_inventory_batch 的 FK（用 RESTRICT 因列为 NOT NULL）
-- ========================================================

-- inv_inventory_batch.material_id → inv_material.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND CONSTRAINT_NAME = 'fk_inv_inventory_batch_material');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inventory_batch ADD CONSTRAINT fk_inv_inventory_batch_material FOREIGN KEY (material_id) REFERENCES inv_material(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_inventory_batch.warehouse_id → inv_warehouse.id (NOT NULL，用 RESTRICT)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND CONSTRAINT_NAME = 'fk_inv_inventory_batch_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inventory_batch ADD CONSTRAINT fk_inv_inventory_batch_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 三、对实际表 sal_return_order / sal_return_order_item 添加 FK
-- 注意: schema.sql 写的是 sal_return / sal_return_detail，
--       但实际 DB 表名为 sal_return_order / sal_return_order_item
--       这是 P0-2 基线重置需解决的 schema 不一致问题
-- ========================================================

-- 先检查 sal_return_order 表是否存在
SET @tbl_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_order');
SET @sql = IF(@tbl_exists > 0, 'SELECT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_return_order.order_id → sal_order.id (如果表存在)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_order' AND CONSTRAINT_NAME = 'fk_sal_return_order_order');
SET @tbl_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_order');
SET @has_order_id = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_order' AND COLUMN_NAME = 'order_id');
SET @sql = IF(@cnt = 0 AND @tbl_exists > 0 AND @has_order_id > 0, 'ALTER TABLE sal_return_order ADD CONSTRAINT fk_sal_return_order_order FOREIGN KEY (order_id) REFERENCES sal_order(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_return_order_item.return_order_id → sal_return_order.id (如果表和列存在)
-- 先探测正确的列名（return_id 或 return_order_id）
SET @col_name = (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_order_item' AND COLUMN_NAME IN ('return_order_id','return_id','order_id') LIMIT 1);
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_order_item' AND CONSTRAINT_NAME = 'fk_sal_return_order_item_return');
SET @tbl_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_order_item');
SET @sql = IF(@cnt = 0 AND @tbl_exists > 0 AND @col_name IS NOT NULL, CONCAT('ALTER TABLE sal_return_order_item ADD CONSTRAINT fk_sal_return_order_item_return FOREIGN KEY (', @col_name, ') REFERENCES sal_return_order(id) ON DELETE CASCADE ON UPDATE CASCADE'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 四、校验最终 FK 总数
-- ========================================================
SELECT CONCAT('外键总数: ', COUNT(*)) AS fk_summary
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY';
