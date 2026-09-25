-- 补齐缺失索引：配送单、退货单、应收应付账龄、设备维护、来料质检

-- 配送单：按客户+状态筛选
ALTER TABLE sal_delivery ADD INDEX IF NOT EXISTS idx_delivery_customer_status (customer_id, status);

-- 退货单：按客户+状态筛选
ALTER TABLE sal_return ADD INDEX IF NOT EXISTS idx_return_customer_status (customer_id, status);

-- 应收账款：账龄分析
ALTER TABLE fin_receivable ADD INDEX IF NOT EXISTS idx_receivable_status_due (status, due_date);

-- 应付账款：账龄分析
ALTER TABLE fin_payable ADD INDEX IF NOT EXISTS idx_payable_status_due (status, due_date);

-- 设备：维护提醒查询
ALTER TABLE eq_equipment ADD INDEX IF NOT EXISTS idx_equipment_status_maintenance (status, next_maintenance_date);

-- 来料质检：按物料查询
ALTER TABLE qc_inspection ADD INDEX IF NOT EXISTS idx_qc_inspection_material_date (material_id, inspection_date);
