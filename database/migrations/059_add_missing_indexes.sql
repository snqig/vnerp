-- 059: 补齐高基数列索引
-- 为外键、状态、日期等高查询频率列添加索引

-- 仓库模块
ALTER TABLE inv_inbound_order ADD INDEX idx_supplier_id (supplier_id);
ALTER TABLE inv_inbound_order ADD INDEX idx_po_id (po_id);

-- 销售模块
ALTER TABLE sal_order ADD INDEX idx_status (status);
ALTER TABLE sal_order ADD INDEX idx_order_date (order_date);
ALTER TABLE sal_delivery ADD INDEX idx_status (status);
ALTER TABLE sal_delivery ADD INDEX idx_delivery_date (delivery_date);
ALTER TABLE sal_return_order ADD INDEX idx_delivery_id (delivery_id);
ALTER TABLE sal_return_order ADD INDEX idx_warehouse_id (warehouse_id);
ALTER TABLE sal_quote ADD INDEX idx_status (status);
ALTER TABLE sal_quote ADD INDEX idx_quote_date (quote_date);

-- 采购模块
ALTER TABLE pur_purchase_order ADD INDEX idx_create_by (create_by);

-- 财务模块
ALTER TABLE fin_receivable ADD INDEX idx_due_date (due_date);
ALTER TABLE fin_payable ADD INDEX idx_due_date (due_date);

-- 生产模块
ALTER TABLE prd_work_order ADD INDEX idx_work_order_date (work_order_date);
ALTER TABLE prod_work_order ADD INDEX idx_status (status);
ALTER TABLE prod_work_order_item ADD INDEX idx_material_id (material_id);

-- 打样模块
ALTER TABLE dcprint_sample_process_template ADD INDEX idx_status (status);
ALTER TABLE dcprint_sample_process_template_item ADD INDEX idx_material_id (material_id);

-- 工装模块
ALTER TABLE dcprint_tool ADD INDEX idx_customer_id (customer_id);
ALTER TABLE dcprint_tool_usage ADD INDEX idx_operator_id (operator_id);
ALTER TABLE dcprint_tool_maintenance ADD INDEX idx_operator_id (operator_id);

-- 油墨模块
ALTER TABLE dcprint_ink_formula_item ADD INDEX idx_material_id (material_id);

-- 盘点模块
ALTER TABLE inv_stocktaking ADD INDEX idx_operator_id (operator_id);
ALTER TABLE inv_stocktaking ADD INDEX idx_taking_date (taking_date);
