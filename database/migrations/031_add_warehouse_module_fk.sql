-- ============================================================
-- Migration 031: 批量 FK - 仓储模块（40 个）
--
-- 背景：根据《项目整体分析报告》P0 #2（外键约束缺失）
--   仓储模块 11 张表 schema 中无任何 FK CONSTRAINT
--   迁移 009/017/018/029/030 已部分补齐，本迁移补全剩余 FK
--
-- 前置条件：Migration 026/029/030 已完成
--
-- 涉及表：
--   inv_inventory_log, inv_inbound_order, inv_inbound_item,
--   inv_outbound_order, inv_outbound_item,
--   inv_transfer_order, inv_transfer_item,
--   inv_stocktaking, inv_stocktaking_item,
--   inv_stock_adjust, inv_stock_adjust_item,
--   inv_sales_outbound, inv_sales_outbound_item,
--   inv_production_inbound, inv_production_inbound_item,
--   inv_unit_conversion
--
-- 跳过项：
--   - batch_no 系列 FK：父表 inv_inventory_batch.batch_no 无 UNIQUE 约束，不可作 FK
--   - from_unit/to_unit：inv_unit 表不存在，单位为 VARCHAR 字符串
--   - 多态外键：仓储表未发现 source_id+source_type 模式
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫（与 009/017/018 重叠的会自动跳过）
-- ============================================================

-- ===== A. 前置类型对齐 =====

-- A1. inv_inbound_order.warehouse_id: INT → BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'warehouse_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_order MODIFY COLUMN warehouse_id BIGINT UNSIGNED NOT NULL COMMENT ''入库仓库ID''',
  'SELECT ''inv_inbound_order.warehouse_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== B. inv_inventory_log（3 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_log' AND CONSTRAINT_NAME = 'fk_inv_invlog_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_inventory_log ADD CONSTRAINT fk_inv_invlog_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_log' AND CONSTRAINT_NAME = 'fk_inv_invlog_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_inventory_log ADD CONSTRAINT fk_inv_invlog_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_log' AND CONSTRAINT_NAME = 'fk_inv_invlog_operator');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_inventory_log ADD CONSTRAINT fk_inv_invlog_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== C. inv_inbound_order（1 个 FK，warehouse_id）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND CONSTRAINT_NAME = 'fk_inv_inbound_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_inbound_order ADD CONSTRAINT fk_inv_inbound_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== D. inv_outbound_order（5 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND CONSTRAINT_NAME = 'fk_inv_outbound_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND CONSTRAINT_NAME = 'fk_inv_outbound_customer');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND CONSTRAINT_NAME = 'fk_inv_outbound_workorder');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_workorder FOREIGN KEY (work_order_id) REFERENCES prd_work_order (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND CONSTRAINT_NAME = 'fk_inv_outbound_auditor');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_auditor FOREIGN KEY (auditor_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND CONSTRAINT_NAME = 'fk_inv_outbound_operator');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== E. inv_outbound_item（3 个 FK：material_id, batch_id）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_item' AND CONSTRAINT_NAME = 'fk_inv_outbound_item_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_outbound_item ADD CONSTRAINT fk_inv_outbound_item_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_item' AND CONSTRAINT_NAME = 'fk_inv_outbound_item_batch');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_outbound_item ADD CONSTRAINT fk_inv_outbound_item_batch FOREIGN KEY (batch_id) REFERENCES inv_inventory_batch (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== F. inv_transfer_order（5 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND CONSTRAINT_NAME = 'fk_inv_transfer_from_wh');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_transfer_order ADD CONSTRAINT fk_inv_transfer_from_wh FOREIGN KEY (from_warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND CONSTRAINT_NAME = 'fk_inv_transfer_to_wh');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_transfer_order ADD CONSTRAINT fk_inv_transfer_to_wh FOREIGN KEY (to_warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND CONSTRAINT_NAME = 'fk_inv_transfer_applicant');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_transfer_order ADD CONSTRAINT fk_inv_transfer_applicant FOREIGN KEY (applicant_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND CONSTRAINT_NAME = 'fk_inv_transfer_approver');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_transfer_order ADD CONSTRAINT fk_inv_transfer_approver FOREIGN KEY (approver_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND CONSTRAINT_NAME = 'fk_inv_transfer_operator');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_transfer_order ADD CONSTRAINT fk_inv_transfer_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== G. inv_transfer_item（1 个 FK：material_id）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_item' AND CONSTRAINT_NAME = 'fk_inv_transfer_item_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_transfer_item ADD CONSTRAINT fk_inv_transfer_item_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== H. inv_stocktaking（3 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking' AND CONSTRAINT_NAME = 'fk_inv_stocktaking_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stocktaking ADD CONSTRAINT fk_inv_stocktaking_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking' AND CONSTRAINT_NAME = 'fk_inv_stocktaking_applicant');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stocktaking ADD CONSTRAINT fk_inv_stocktaking_applicant FOREIGN KEY (applicant_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking' AND CONSTRAINT_NAME = 'fk_inv_stocktaking_approver');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stocktaking ADD CONSTRAINT fk_inv_stocktaking_approver FOREIGN KEY (approver_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== I. inv_stocktaking_item（2 个 FK：material_id, warehouse_id）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking_item' AND CONSTRAINT_NAME = 'fk_inv_stocktaking_item_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stocktaking_item ADD CONSTRAINT fk_inv_stocktaking_item_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking_item' AND CONSTRAINT_NAME = 'fk_inv_stocktaking_item_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stocktaking_item ADD CONSTRAINT fk_inv_stocktaking_item_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== J. inv_stock_adjust（3 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust' AND CONSTRAINT_NAME = 'fk_inv_adjust_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stock_adjust ADD CONSTRAINT fk_inv_adjust_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust' AND CONSTRAINT_NAME = 'fk_inv_adjust_operator');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stock_adjust ADD CONSTRAINT fk_inv_adjust_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust' AND CONSTRAINT_NAME = 'fk_inv_adjust_approver');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stock_adjust ADD CONSTRAINT fk_inv_adjust_approver FOREIGN KEY (approver_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== K. inv_stock_adjust_item（2 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust_item' AND CONSTRAINT_NAME = 'fk_inv_adjust_item_adjust');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stock_adjust_item ADD CONSTRAINT fk_inv_adjust_item_adjust FOREIGN KEY (adjust_id) REFERENCES inv_stock_adjust (id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust_item' AND CONSTRAINT_NAME = 'fk_inv_adjust_item_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_stock_adjust_item ADD CONSTRAINT fk_inv_adjust_item_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== L. inv_sales_outbound（4 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound' AND CONSTRAINT_NAME = 'fk_inv_sales_outbound_order');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_sales_outbound ADD CONSTRAINT fk_inv_sales_outbound_order FOREIGN KEY (order_id) REFERENCES sal_order (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound' AND CONSTRAINT_NAME = 'fk_inv_sales_outbound_customer');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_sales_outbound ADD CONSTRAINT fk_inv_sales_outbound_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound' AND CONSTRAINT_NAME = 'fk_inv_sales_outbound_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_sales_outbound ADD CONSTRAINT fk_inv_sales_outbound_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound' AND CONSTRAINT_NAME = 'fk_inv_sales_outbound_operator');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_sales_outbound ADD CONSTRAINT fk_inv_sales_outbound_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== M. inv_sales_outbound_item（2 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound_item' AND CONSTRAINT_NAME = 'fk_inv_sales_outbound_item_outbound');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_sales_outbound_item ADD CONSTRAINT fk_inv_sales_outbound_item_outbound FOREIGN KEY (outbound_id) REFERENCES inv_sales_outbound (id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound_item' AND CONSTRAINT_NAME = 'fk_inv_sales_outbound_item_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_sales_outbound_item ADD CONSTRAINT fk_inv_sales_outbound_item_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== N. inv_production_inbound（3 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_production_inbound' AND CONSTRAINT_NAME = 'fk_inv_prod_inbound_workorder');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_production_inbound ADD CONSTRAINT fk_inv_prod_inbound_workorder FOREIGN KEY (work_order_id) REFERENCES prd_work_order (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_production_inbound' AND CONSTRAINT_NAME = 'fk_inv_prod_inbound_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_production_inbound ADD CONSTRAINT fk_inv_prod_inbound_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_production_inbound' AND CONSTRAINT_NAME = 'fk_inv_prod_inbound_operator');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_production_inbound ADD CONSTRAINT fk_inv_prod_inbound_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== O. inv_production_inbound_item（2 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_production_inbound_item' AND CONSTRAINT_NAME = 'fk_inv_prod_inbound_item_inbound');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_production_inbound_item ADD CONSTRAINT fk_inv_prod_inbound_item_inbound FOREIGN KEY (inbound_id) REFERENCES inv_production_inbound (id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_production_inbound_item' AND CONSTRAINT_NAME = 'fk_inv_prod_inbound_item_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_production_inbound_item ADD CONSTRAINT fk_inv_prod_inbound_item_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== P. inv_unit_conversion（1 个 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_unit_conversion' AND CONSTRAINT_NAME = 'fk_inv_unit_conv_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE inv_unit_conversion ADD CONSTRAINT fk_inv_unit_conv_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== Q. 验证：仓储模块 FK 总数 =====
SELECT COUNT(*) AS warehouse_fk_count
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND TABLE_NAME LIKE 'inv_%';
