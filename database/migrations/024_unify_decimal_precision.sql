-- ============================================================
-- Migration 024: 统一所有 DECIMAL 字段精度为 DECIMAL(18,4)
--
-- 背景：根据《项目整体分析报告》P2 #5（DECIMAL 精度不一致）
-- 14 张表共 39 个 DECIMAL 字段精度非 (18,4)
-- 涉及金额、数量、税率、汇率、比率等字段
-- 统一为 DECIMAL(18,4) 以保证计算精度一致
--
-- 注意：inv_unit_conversion.ratio 从 (18,6) 收敛到 (18,4)，可能丢失 2 位小数精度
--       但为统一规范，按报告要求处理
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== pur_purchase_order (7 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME='exchange_rate');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order MODIFY COLUMN exchange_rate DECIMAL(18,4) DEFAULT 1.0000 COMMENT ''汇率''', 'SELECT ''pur_purchase_order.exchange_rate already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME='total_amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order MODIFY COLUMN total_amount DECIMAL(18,4) DEFAULT 0 COMMENT ''订单总金额''', 'SELECT ''pur_purchase_order.total_amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME='total_quantity');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order MODIFY COLUMN total_quantity DECIMAL(18,4) DEFAULT 0 COMMENT ''订单总数量''', 'SELECT ''pur_purchase_order.total_quantity already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME='tax_rate');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order MODIFY COLUMN tax_rate DECIMAL(18,4) DEFAULT 13.00 COMMENT ''税率%''', 'SELECT ''pur_purchase_order.tax_rate already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME='tax_amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order MODIFY COLUMN tax_amount DECIMAL(18,4) DEFAULT 0 COMMENT ''税额''', 'SELECT ''pur_purchase_order.tax_amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME='grand_total');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order MODIFY COLUMN grand_total DECIMAL(18,4) DEFAULT 0 COMMENT ''含税总金额''', 'SELECT ''pur_purchase_order.grand_total already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order' AND COLUMN_NAME='over_receipt_tolerance');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order MODIFY COLUMN over_receipt_tolerance DECIMAL(18,4) DEFAULT 5.00 COMMENT ''超收容差率%''', 'SELECT ''pur_purchase_order.over_receipt_tolerance already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== pur_purchase_order_line (8 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order_line' AND COLUMN_NAME='order_qty');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order_line MODIFY COLUMN order_qty DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT ''订购数量''', 'SELECT ''pur_purchase_order_line.order_qty already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order_line' AND COLUMN_NAME='received_qty');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order_line MODIFY COLUMN received_qty DECIMAL(18,4) DEFAULT 0 COMMENT ''累计入库数量''', 'SELECT ''pur_purchase_order_line.received_qty already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order_line' AND COLUMN_NAME='returned_qty');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order_line MODIFY COLUMN returned_qty DECIMAL(18,4) DEFAULT 0 COMMENT ''累计退货数量''', 'SELECT ''pur_purchase_order_line.returned_qty already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order_line' AND COLUMN_NAME='unit_price');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order_line MODIFY COLUMN unit_price DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT ''单价''', 'SELECT ''pur_purchase_order_line.unit_price already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order_line' AND COLUMN_NAME='amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order_line MODIFY COLUMN amount DECIMAL(18,4) DEFAULT 0 COMMENT ''金额''', 'SELECT ''pur_purchase_order_line.amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order_line' AND COLUMN_NAME='tax_rate');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order_line MODIFY COLUMN tax_rate DECIMAL(18,4) DEFAULT 13.00 COMMENT ''税率%''', 'SELECT ''pur_purchase_order_line.tax_rate already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order_line' AND COLUMN_NAME='tax_amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order_line MODIFY COLUMN tax_amount DECIMAL(18,4) DEFAULT 0 COMMENT ''税额''', 'SELECT ''pur_purchase_order_line.tax_amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_purchase_order_line' AND COLUMN_NAME='line_total');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE pur_purchase_order_line MODIFY COLUMN line_total DECIMAL(18,4) DEFAULT 0 COMMENT ''行合计''', 'SELECT ''pur_purchase_order_line.line_total already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== sal_order (1 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND COLUMN_NAME='exchange_rate');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE sal_order MODIFY COLUMN exchange_rate DECIMAL(18,4) DEFAULT 1 COMMENT ''汇率''', 'SELECT ''sal_order.exchange_rate already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== sal_order_detail (1 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order_detail' AND COLUMN_NAME='tax_rate');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE sal_order_detail MODIFY COLUMN tax_rate DECIMAL(18,4) DEFAULT 0 COMMENT ''税率(%)''', 'SELECT ''sal_order_detail.tax_rate already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== prd_bom_detail (1 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_bom_detail' AND COLUMN_NAME='loss_rate');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE prd_bom_detail MODIFY COLUMN loss_rate DECIMAL(18,4) DEFAULT 0 COMMENT ''损耗率(%)''', 'SELECT ''prd_bom_detail.loss_rate already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== eqp_equipment (1 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_equipment' AND COLUMN_NAME='capacity_per_hour');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE eqp_equipment MODIFY COLUMN capacity_per_hour DECIMAL(18,4) DEFAULT 100 COMMENT ''每小时产能（件/小时）''', 'SELECT ''eqp_equipment.capacity_per_hour already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== prd_schedule_detail (1 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_schedule_detail' AND COLUMN_NAME='duration_hours');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE prd_schedule_detail MODIFY COLUMN duration_hours DECIMAL(18,4) COMMENT ''预计耗时（小时）''', 'SELECT ''prd_schedule_detail.duration_hours already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== prd_work_order_color_seq (1 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_work_order_color_seq' AND COLUMN_NAME='estimated_duration_hours');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE prd_work_order_color_seq MODIFY COLUMN estimated_duration_hours DECIMAL(18,4) DEFAULT 4 COMMENT ''预计耗时（小时）''', 'SELECT ''prd_work_order_color_seq.estimated_duration_hours already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== inv_inbound_order (2 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_order' AND COLUMN_NAME='total_quantity');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE inv_inbound_order MODIFY COLUMN total_quantity DECIMAL(18,4) DEFAULT 0 COMMENT ''总数量''', 'SELECT ''inv_inbound_order.total_quantity already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_order' AND COLUMN_NAME='total_amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE inv_inbound_order MODIFY COLUMN total_amount DECIMAL(18,4) COMMENT ''总金额''', 'SELECT ''inv_inbound_order.total_amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== inv_inbound_item (3 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_item' AND COLUMN_NAME='quantity');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE inv_inbound_item MODIFY COLUMN quantity DECIMAL(18,4) COMMENT ''数量''', 'SELECT ''inv_inbound_item.quantity already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_item' AND COLUMN_NAME='unit_price');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE inv_inbound_item MODIFY COLUMN unit_price DECIMAL(18,4) COMMENT ''单价''', 'SELECT ''inv_inbound_item.unit_price already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_item' AND COLUMN_NAME='total_price');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE inv_inbound_item MODIFY COLUMN total_price DECIMAL(18,4) COMMENT ''总价''', 'SELECT ''inv_inbound_item.total_price already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== fin_voucher (3 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher' AND COLUMN_NAME='total_debit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_voucher MODIFY COLUMN total_debit DECIMAL(18,4) DEFAULT 0 COMMENT ''借方合计''', 'SELECT ''fin_voucher.total_debit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher' AND COLUMN_NAME='total_credit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_voucher MODIFY COLUMN total_credit DECIMAL(18,4) DEFAULT 0 COMMENT ''贷方合计''', 'SELECT ''fin_voucher.total_credit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher' AND COLUMN_NAME='total_amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_voucher MODIFY COLUMN total_amount DECIMAL(18,4) DEFAULT 0 COMMENT ''凭证总额（旧版兼容）''', 'SELECT ''fin_voucher.total_amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== fin_voucher_line (3 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher_line' AND COLUMN_NAME='debit_amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_voucher_line MODIFY COLUMN debit_amount DECIMAL(18,4) DEFAULT 0 COMMENT ''借方金额''', 'SELECT ''fin_voucher_line.debit_amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher_line' AND COLUMN_NAME='credit_amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_voucher_line MODIFY COLUMN credit_amount DECIMAL(18,4) DEFAULT 0 COMMENT ''贷方金额''', 'SELECT ''fin_voucher_line.credit_amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher_line' AND COLUMN_NAME='amount');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_voucher_line MODIFY COLUMN amount DECIMAL(18,4) DEFAULT 0 COMMENT ''金额（旧版兼容）''', 'SELECT ''fin_voucher_line.amount already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== fin_account_balance (8 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='begin_debit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_account_balance MODIFY COLUMN begin_debit DECIMAL(18,4) DEFAULT 0 COMMENT ''期初借方''', 'SELECT ''fin_account_balance.begin_debit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='begin_credit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_account_balance MODIFY COLUMN begin_credit DECIMAL(18,4) DEFAULT 0 COMMENT ''期初贷方''', 'SELECT ''fin_account_balance.begin_credit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='current_debit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_account_balance MODIFY COLUMN current_debit DECIMAL(18,4) DEFAULT 0 COMMENT ''本期借方发生''', 'SELECT ''fin_account_balance.current_debit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='current_credit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_account_balance MODIFY COLUMN current_credit DECIMAL(18,4) DEFAULT 0 COMMENT ''本期贷方发生''', 'SELECT ''fin_account_balance.current_credit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='year_debit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_account_balance MODIFY COLUMN year_debit DECIMAL(18,4) DEFAULT 0 COMMENT ''本年累计借方''', 'SELECT ''fin_account_balance.year_debit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='year_credit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_account_balance MODIFY COLUMN year_credit DECIMAL(18,4) DEFAULT 0 COMMENT ''本年累计贷方''', 'SELECT ''fin_account_balance.year_credit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='end_debit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_account_balance MODIFY COLUMN end_debit DECIMAL(18,4) DEFAULT 0 COMMENT ''期末借方''', 'SELECT ''fin_account_balance.end_debit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='end_credit');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE fin_account_balance MODIFY COLUMN end_credit DECIMAL(18,4) DEFAULT 0 COMMENT ''期末贷方''', 'SELECT ''fin_account_balance.end_credit already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== inv_unit_conversion (1 字段) =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_unit_conversion' AND COLUMN_NAME='ratio');
SET @sql = IF(@curr != 'decimal(18,4)', 'ALTER TABLE inv_unit_conversion MODIFY COLUMN ratio DECIMAL(18,4) NOT NULL COMMENT ''换算比率: from_unit * ratio = to_unit''', 'SELECT ''inv_unit_conversion.ratio already (18,4)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证：检查是否仍有非 decimal(18,4) 的 DECIMAL 字段
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND DATA_TYPE = 'decimal'
  AND COLUMN_TYPE != 'decimal(18,4)'
ORDER BY TABLE_NAME, COLUMN_NAME;
