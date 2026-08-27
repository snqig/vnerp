-- ============================================================
-- Migration 023: 统一软删除字段为 deleted TINYINT NOT NULL DEFAULT 0
--
-- 背景：根据《项目整体分析报告》P2 #9（软删除字段不统一）
-- 约 43 张表的 deleted 字段定义不一致：
--   - TINYINT(1) 变体（2 张）
--   - 缺 NOT NULL（约 35 张）
--   - COMMENT 不标准（7 张）
-- 统一为：deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0-正常, 1-已删除'
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- 守卫条件：IS_NULLABLE='NO' AND COLUMN_TYPE='tinyint' AND COLUMN_DEFAULT='0'
-- ============================================================

-- A. TINYINT(1) 变体 + B. 缺 NOT NULL + C. COMMENT 不标准
-- 所有变体用相同 MODIFY COLUMN 语句处理

-- 1. sys_user
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_user' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sys_user MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sys_user.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. sys_department
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_department' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sys_department MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sys_department.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. sys_role
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_role' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sys_role MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sys_role.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. crm_customer
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_customer' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE crm_customer MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''crm_customer.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. crm_customer_contact
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_customer_contact' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE crm_customer_contact MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''crm_customer_contact.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. pur_supplier
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_supplier' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE pur_supplier MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''pur_supplier.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. inv_material_category
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_material_category' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_material_category MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_material_category.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8. inv_material
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_material' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_material MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_material.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9. inv_warehouse
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_warehouse' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_warehouse MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_warehouse.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 10. inv_inventory
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_inventory MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_inventory.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 11. pur_request
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_request' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE pur_request MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''pur_request.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 12. pur_purchase_order (TINYINT(1) 变体)
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE pur_purchase_order MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''pur_purchase_order.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 13. sal_order
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_order MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_order.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 14. sal_order_detail
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order_detail' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_order_detail MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_order_detail.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 15. sal_delivery
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_delivery' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_delivery MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_delivery.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 16. sal_delivery_detail
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_delivery_detail' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_delivery_detail MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_delivery_detail.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 17. sal_return
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_return' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_return MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_return.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 18. sal_return_detail
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_return_detail' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_return_detail MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_return_detail.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 19. sal_reconciliation
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_reconciliation' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_reconciliation MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_reconciliation.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 20. sal_reconciliation_line
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_reconciliation_line' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_reconciliation_line MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_reconciliation_line.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 21. sal_reconciliation_writeoff
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_reconciliation_writeoff' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE sal_reconciliation_writeoff MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sal_reconciliation_writeoff.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 22. prd_standard_card
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_standard_card' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE prd_standard_card MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''prd_standard_card.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 23. qc_inspection
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='qc_inspection' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE qc_inspection MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''qc_inspection.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 24. eqp_equipment
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_equipment' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE eqp_equipment MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''eqp_equipment.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 25. prd_schedule
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_schedule' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE prd_schedule MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''prd_schedule.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 26. material_requisitions
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='material_requisitions' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE material_requisitions MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''material_requisitions.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 27. material_returns
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='material_returns' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE material_returns MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''material_returns.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 28. inv_inventory_batch
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_inventory_batch MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_inventory_batch.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 29. fin_voucher
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE fin_voucher MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''fin_voucher.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 30. inv_material_std
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_material_std' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_material_std MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_material_std.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 31. prd_bom_std
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_bom_std' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE prd_bom_std MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''prd_bom_std.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 32. prd_bom_line_std
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_bom_line_std' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE prd_bom_line_std MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''prd_bom_line_std.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 33. inv_inbound_order (TINYINT(1) 变体)
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_order' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_inbound_order MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_inbound_order.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 34. inv_outbound_order
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_order' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_outbound_order MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_outbound_order.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 35. inv_outbound_item
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_item' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_outbound_item MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_outbound_item.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 36. inv_transfer_order
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_order' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_transfer_order MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_transfer_order.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 37. inv_transfer_item
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_item' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_transfer_item MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_transfer_item.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 38. inv_stocktaking
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_stocktaking MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_stocktaking.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 39. inv_stocktaking_item
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_stocktaking_item MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_stocktaking_item.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 40. inv_stock_adjust
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_stock_adjust MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_stock_adjust.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 41. inv_stock_adjust_item
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_stock_adjust_item MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_stock_adjust_item.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 42. inv_sales_outbound
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_sales_outbound' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_sales_outbound MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_sales_outbound.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 43. inv_sales_outbound_item
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_sales_outbound_item' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_sales_outbound_item MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_sales_outbound_item.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 44. inv_production_inbound
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_production_inbound' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_production_inbound MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_production_inbound.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 45. inv_production_inbound_item
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_production_inbound_item' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_production_inbound_item MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_production_inbound_item.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 46. inv_unit_conversion
SET @curr = (SELECT CONCAT(IS_NULLABLE,'|',COLUMN_TYPE,'|',IFNULL(COLUMN_DEFAULT,'')) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_unit_conversion' AND COLUMN_NAME='deleted');
SET @sql = IF(@curr != 'NO|tinyint|0', 'ALTER TABLE inv_unit_conversion MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''inv_unit_conversion.deleted already standard'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证：检查是否仍有非标准 deleted 字段
SELECT TABLE_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME = 'deleted'
  AND (IS_NULLABLE = 'YES' OR COLUMN_TYPE != 'tinyint' OR IFNULL(COLUMN_DEFAULT,'') != '0')
ORDER BY TABLE_NAME;
