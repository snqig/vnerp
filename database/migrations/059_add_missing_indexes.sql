-- 059: 补齐高基数列索引
-- 为外键、状态、日期等高查询频率列添加索引

-- 仓库模块
-- idempotent guard for idx_supplier_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_order' AND INDEX_NAME='idx_supplier_id');
SET @sql = IF(@idx=0, 'ALTER TABLE inv_inbound_order ADD INDEX idx_supplier_id (supplier_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_po_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_order' AND INDEX_NAME='idx_po_id');
SET @sql = IF(@idx=0, 'ALTER TABLE inv_inbound_order ADD INDEX idx_po_id (po_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 销售模块
-- idempotent guard for idx_status
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND INDEX_NAME='idx_status');
SET @sql = IF(@idx=0, 'ALTER TABLE sal_order ADD INDEX idx_status (status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_order_date
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND INDEX_NAME='idx_order_date');
SET @sql = IF(@idx=0, 'ALTER TABLE sal_order ADD INDEX idx_order_date (order_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_status
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_delivery' AND INDEX_NAME='idx_status');
SET @sql = IF(@idx=0, 'ALTER TABLE sal_delivery ADD INDEX idx_status (status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_delivery_date
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_delivery' AND INDEX_NAME='idx_delivery_date');
SET @sql = IF(@idx=0, 'ALTER TABLE sal_delivery ADD INDEX idx_delivery_date (delivery_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_delivery_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_return_order' AND INDEX_NAME='idx_delivery_id');
SET @sql = IF(@idx=0, 'ALTER TABLE sal_return_order ADD INDEX idx_delivery_id (delivery_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_warehouse_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_return_order' AND INDEX_NAME='idx_warehouse_id');
SET @sql = IF(@idx=0, 'ALTER TABLE sal_return_order ADD INDEX idx_warehouse_id (warehouse_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_status
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_quote' AND INDEX_NAME='idx_status');
SET @sql = IF(@idx=0, 'ALTER TABLE sal_quote ADD INDEX idx_status (status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_quote_date
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_quote' AND INDEX_NAME='idx_quote_date');
SET @sql = IF(@idx=0, 'ALTER TABLE sal_quote ADD INDEX idx_quote_date (quote_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 采购模块
-- idempotent guard for idx_create_by
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND INDEX_NAME='idx_create_by');
SET @sql = IF(@idx=0, 'ALTER TABLE pur_purchase_order ADD INDEX idx_create_by (create_by)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 财务模块
-- idempotent guard for idx_due_date
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_receivable' AND INDEX_NAME='idx_due_date');
SET @sql = IF(@idx=0, 'ALTER TABLE fin_receivable ADD INDEX idx_due_date (due_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_due_date
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_payable' AND INDEX_NAME='idx_due_date');
SET @sql = IF(@idx=0, 'ALTER TABLE fin_payable ADD INDEX idx_due_date (due_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 生产模块
-- idempotent guard for idx_work_order_date
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_work_order' AND INDEX_NAME='idx_work_order_date');
SET @sql = IF(@idx=0, 'ALTER TABLE prd_work_order ADD INDEX idx_work_order_date (work_order_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_status
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prod_work_order' AND INDEX_NAME='idx_status');
SET @sql = IF(@idx=0, 'ALTER TABLE prod_work_order ADD INDEX idx_status (status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_material_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prod_work_order_item' AND INDEX_NAME='idx_material_id');
SET @sql = IF(@idx=0, 'ALTER TABLE prod_work_order_item ADD INDEX idx_material_id (material_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 打样模块
-- idempotent guard for idx_status
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dcprint_sample_process_template' AND INDEX_NAME='idx_status');
SET @sql = IF(@idx=0, 'ALTER TABLE dcprint_sample_process_template ADD INDEX idx_status (status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_material_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dcprint_sample_process_template_item' AND INDEX_NAME='idx_material_id');
SET @sql = IF(@idx=0, 'ALTER TABLE dcprint_sample_process_template_item ADD INDEX idx_material_id (material_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 工装模块
-- idempotent guard for idx_customer_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dcprint_tool' AND INDEX_NAME='idx_customer_id');
SET @sql = IF(@idx=0, 'ALTER TABLE dcprint_tool ADD INDEX idx_customer_id (customer_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_operator_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dcprint_tool_usage' AND INDEX_NAME='idx_operator_id');
SET @sql = IF(@idx=0, 'ALTER TABLE dcprint_tool_usage ADD INDEX idx_operator_id (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_operator_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dcprint_tool_maintenance' AND INDEX_NAME='idx_operator_id');
SET @sql = IF(@idx=0, 'ALTER TABLE dcprint_tool_maintenance ADD INDEX idx_operator_id (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 油墨模块
-- idempotent guard for idx_material_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dcprint_ink_formula_item' AND INDEX_NAME='idx_material_id');
SET @sql = IF(@idx=0, 'ALTER TABLE dcprint_ink_formula_item ADD INDEX idx_material_id (material_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 盘点模块
-- idempotent guard for idx_operator_id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking' AND INDEX_NAME='idx_operator_id');
SET @sql = IF(@idx=0, 'ALTER TABLE inv_stocktaking ADD INDEX idx_operator_id (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent guard for idx_taking_date
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking' AND INDEX_NAME='idx_taking_date');
SET @sql = IF(@idx=0, 'ALTER TABLE inv_stocktaking ADD INDEX idx_taking_date (taking_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

