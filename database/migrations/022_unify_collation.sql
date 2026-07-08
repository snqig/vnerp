-- ============================================================
-- Migration 022: 统一所有表 Collation 为 utf8mb4_0900_ai_ci
--
-- 背景：根据《项目整体分析报告》P1 #2（Collation 不统一）
-- 21 张表使用非标准 Collation（utf8mb4_unicode_ci 或 utf8mb4_ai_ci）
-- 统一为 utf8mb4_0900_ai_ci 以支持越南语等特殊字符排序
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- 工具宏：对单张表执行 Collation 统一（幂等）
-- 用法：每次设置 @tbl_name 后调用此块

-- 1. inv_inventory_log (utf8mb4_ai_ci → utf8mb4_0900_ai_ci)
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_log');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE inv_inventory_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''inv_inventory_log collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. eqp_equipment
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eqp_equipment');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE eqp_equipment CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''eqp_equipment collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. prd_schedule
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE prd_schedule CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''prd_schedule collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. prd_schedule_detail
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule_detail');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE prd_schedule_detail CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''prd_schedule_detail collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. prd_work_order_color_seq
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order_color_seq');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE prd_work_order_color_seq CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''prd_work_order_color_seq collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. material_requisitions
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisitions');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE material_requisitions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''material_requisitions collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. material_requisition_items
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisition_items');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE material_requisition_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''material_requisition_items collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8. material_returns
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_returns');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE material_returns CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''material_returns collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9. material_return_items
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_return_items');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE material_return_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''material_return_items collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 10. inv_fifo_override_log
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_fifo_override_log');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE inv_fifo_override_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''inv_fifo_override_log collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 11. work_order_costs
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_costs');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE work_order_costs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''work_order_costs collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 12. material_batch_costs
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_batch_costs');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE material_batch_costs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''material_batch_costs collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 13. inv_inventory_batch
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE inv_inventory_batch CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''inv_inventory_batch collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 14. inv_material_std
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material_std');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE inv_material_std CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''inv_material_std collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 15. prd_bom_std
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_bom_std');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE prd_bom_std CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''prd_bom_std collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 16. prd_bom_line_std
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_bom_line_std');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE prd_bom_line_std CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''prd_bom_line_std collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 17. fin_account
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_account');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE fin_account CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''fin_account collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 18. fin_period
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_period');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE fin_period CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''fin_period collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 19. fin_voucher
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE fin_voucher CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''fin_voucher collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 20. fin_voucher_line
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE fin_voucher_line CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''fin_voucher_line collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 21. fin_account_balance
SET @curr = (SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_account_balance');
SET @sql = IF(@curr IS NOT NULL AND @curr != 'utf8mb4_0900_ai_ci',
  'ALTER TABLE fin_account_balance CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
  'SELECT ''fin_account_balance collation already utf8mb4_0900_ai_ci'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证：检查是否仍有非 utf8mb4_0900_ai_ci 的表
SELECT TABLE_NAME, TABLE_COLLATION
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_COLLATION != 'utf8mb4_0900_ai_ci'
ORDER BY TABLE_NAME;
