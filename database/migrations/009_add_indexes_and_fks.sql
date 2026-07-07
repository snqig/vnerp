-- ========================================================
-- 009: 索引与外键规范化
-- 来源：Phase 1-4 — 审计 schema.sql 发现 37 张表共 ~85 个 *_id 列缺少索引
-- 策略：
--   1. 补充高频查询字段缺失索引（operator_id, warehouse_id, customer_id, work_order_id 等）
--   2. 为核心父子关系添加外键约束（幂等守卫）
--   3. 所有操作使用 INFORMATION_SCHEMA 守卫，确保幂等
-- 注意：MySQL 不支持 CREATE INDEX IF NOT EXISTS，使用 SET/PREPARE/EXECUTE 模式
-- ========================================================

-- 辅助：为单个索引执行幂等添加
-- 用法：CALL add_index_if_not_exists('table', 'idx_name', 'column_expr');
-- 因 migrate.ts 按分号分割，无法使用存储过程，改用内联守卫模式

-- ========================================================
-- 一、高优先级缺失索引
-- ========================================================

-- fin_voucher_line: 辅助核算维度（财务报表高频过滤/分组）
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line' AND INDEX_NAME = 'idx_customer');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_voucher_line ADD INDEX idx_customer (customer_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line' AND INDEX_NAME = 'idx_supplier');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_voucher_line ADD INDEX idx_supplier (supplier_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line' AND INDEX_NAME = 'idx_department');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_voucher_line ADD INDEX idx_department (department_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line' AND INDEX_NAME = 'idx_project');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_voucher_line ADD INDEX idx_project (project_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- qc_inspection: 质检查询高频字段
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_inspection' AND INDEX_NAME = 'idx_material');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_inspection ADD INDEX idx_material (material_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_inspection' AND INDEX_NAME = 'idx_source');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_inspection ADD INDEX idx_source (source_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_inspection' AND INDEX_NAME = 'idx_inspector');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_inspection ADD INDEX idx_inspector (inspector_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- qc_unqualified: 不合格品处理
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND INDEX_NAME = 'idx_inspection');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD INDEX idx_inspection (inspection_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND INDEX_NAME = 'idx_material');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD INDEX idx_material (material_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND INDEX_NAME = 'idx_handler');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD INDEX idx_handler (handler_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_outbound_order: 出库单高频查询
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND INDEX_NAME = 'idx_customer');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_order ADD INDEX idx_customer (customer_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND INDEX_NAME = 'idx_work_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_order ADD INDEX idx_work_order (work_order_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND INDEX_NAME = 'idx_auditor');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_order ADD INDEX idx_auditor (auditor_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND INDEX_NAME = 'idx_operator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_order ADD INDEX idx_operator (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_outbound_item: batch_id 缺索引（idx_batch 是 batch_no VARCHAR）
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_item' AND INDEX_NAME = 'idx_batch_id');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_item ADD INDEX idx_batch_id (batch_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prd_work_order: 生产工单关联查询
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order' AND INDEX_NAME = 'idx_sales_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_work_order ADD INDEX idx_sales_order (sales_order_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order' AND INDEX_NAME = 'idx_workshop');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_work_order ADD INDEX idx_workshop (workshop_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order' AND INDEX_NAME = 'idx_workcenter');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_work_order ADD INDEX idx_workcenter (workcenter_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_material: 默认仓库 FK 缺索引
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material' AND INDEX_NAME = 'idx_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_material ADD INDEX idx_warehouse (warehouse_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 二、operator_id / handler_id 批量补索引（9 张表）
-- ========================================================

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_log' AND INDEX_NAME = 'idx_operator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inventory_log ADD INDEX idx_operator (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_fifo_override_log' AND INDEX_NAME = 'idx_operator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_fifo_override_log ADD INDEX idx_operator (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND INDEX_NAME = 'idx_operator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_transfer_order ADD INDEX idx_operator (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust' AND INDEX_NAME = 'idx_operator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_stock_adjust ADD INDEX idx_operator (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound' AND INDEX_NAME = 'idx_operator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_sales_outbound ADD INDEX idx_operator (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_production_inbound' AND INDEX_NAME = 'idx_operator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_production_inbound ADD INDEX idx_operator (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_warehouse_log' AND INDEX_NAME = 'idx_operator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_warehouse_log ADD INDEX idx_operator (operator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_receipt_record' AND INDEX_NAME = 'idx_handler');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_receipt_record ADD INDEX idx_handler (handler_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_payment_record' AND INDEX_NAME = 'idx_handler');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_payment_record ADD INDEX idx_handler (handler_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 三、warehouse_id 批量补索引（6 张表）
-- ========================================================

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_receipt' AND INDEX_NAME = 'idx_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE pur_receipt ADD INDEX idx_warehouse (warehouse_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND INDEX_NAME = 'idx_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_delivery ADD INDEX idx_warehouse (warehouse_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisitions' AND INDEX_NAME = 'idx_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE material_requisitions ADD INDEX idx_warehouse (warehouse_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_returns' AND INDEX_NAME = 'idx_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE material_returns ADD INDEX idx_warehouse (warehouse_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_batch_costs' AND INDEX_NAME = 'idx_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE material_batch_costs ADD INDEX idx_warehouse (warehouse_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking_item' AND INDEX_NAME = 'idx_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_stocktaking_item ADD INDEX idx_warehouse (warehouse_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 四、approver_id / applicant_id 批量补索引
-- ========================================================

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisitions' AND INDEX_NAME = 'idx_approver');
SET @sql = IF(@cnt = 0, 'ALTER TABLE material_requisitions ADD INDEX idx_approver (approver_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_returns' AND INDEX_NAME = 'idx_applicant');
SET @sql = IF(@cnt = 0, 'ALTER TABLE material_returns ADD INDEX idx_applicant (applicant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_returns' AND INDEX_NAME = 'idx_confirm');
SET @sql = IF(@cnt = 0, 'ALTER TABLE material_returns ADD INDEX idx_confirm (confirm_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND INDEX_NAME = 'idx_applicant');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_transfer_order ADD INDEX idx_applicant (applicant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND INDEX_NAME = 'idx_approver');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_transfer_order ADD INDEX idx_approver (approver_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking' AND INDEX_NAME = 'idx_applicant');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_stocktaking ADD INDEX idx_applicant (applicant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking' AND INDEX_NAME = 'idx_approver');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_stocktaking ADD INDEX idx_approver (approver_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust' AND INDEX_NAME = 'idx_approver');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_stock_adjust ADD INDEX idx_approver (approver_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_fifo_override_log' AND INDEX_NAME = 'idx_approve');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_fifo_override_log ADD INDEX idx_approve (approve_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 五、其他高频缺失索引
-- ========================================================

-- pur_request: 申请部门/申请人
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request' AND INDEX_NAME = 'idx_request_dept');
SET @sql = IF(@cnt = 0, 'ALTER TABLE pur_request ADD INDEX idx_request_dept (request_dept_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request' AND INDEX_NAME = 'idx_requester');
SET @sql = IF(@cnt = 0, 'ALTER TABLE pur_request ADD INDEX idx_requester (requester_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- pur_receipt: 仓库/检验员
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_receipt' AND INDEX_NAME = 'idx_inspector');
SET @sql = IF(@cnt = 0, 'ALTER TABLE pur_receipt ADD INDEX idx_inspector (inspector_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- pur_receipt_detail: 关联订单明细
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_receipt_detail' AND INDEX_NAME = 'idx_order_detail');
SET @sql = IF(@cnt = 0, 'ALTER TABLE pur_receipt_detail ADD INDEX idx_order_detail (order_detail_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_delivery: 仓库
-- (已在第三节添加 idx_warehouse)

-- sal_delivery_detail: 关联订单明细
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND INDEX_NAME = 'idx_order_detail');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_delivery_detail ADD INDEX idx_order_detail (order_detail_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prd_standard_card: 创建人/审核人
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_standard_card' AND INDEX_NAME = 'idx_creator');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_standard_card ADD INDEX idx_creator (creator_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_standard_card' AND INDEX_NAME = 'idx_reviewer');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_standard_card ADD INDEX idx_reviewer (reviewer_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prd_work_order_color_seq: 网版/油墨配方
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order_color_seq' AND INDEX_NAME = 'idx_screen_plate');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_work_order_color_seq ADD INDEX idx_screen_plate (screen_plate_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order_color_seq' AND INDEX_NAME = 'idx_ink_formula');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_work_order_color_seq ADD INDEX idx_ink_formula (ink_formula_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prd_schedule: 关联订单
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule' AND INDEX_NAME = 'idx_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_schedule ADD INDEX idx_order (order_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fin_receivable / fin_payable: 来源单据
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_receivable' AND INDEX_NAME = 'idx_source');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_receivable ADD INDEX idx_source (source_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_payable' AND INDEX_NAME = 'idx_source');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_payable ADD INDEX idx_source (source_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sys_department: 负责人
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_department' AND INDEX_NAME = 'idx_leader');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sys_department ADD INDEX idx_leader (leader_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sys_role_menu: menu_id 单独索引（复合唯一键 uk_role_menu 中 menu_id 非最左前缀）
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_role_menu' AND INDEX_NAME = 'idx_menu');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sys_role_menu ADD INDEX idx_menu (menu_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- material_requisitions: 原领料单
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisitions' AND INDEX_NAME = 'idx_original_requisition');
SET @sql = IF(@cnt = 0, 'ALTER TABLE material_requisitions ADD INDEX idx_original_requisition (original_requisition_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_sales_outbound: customer_id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound' AND INDEX_NAME = 'idx_customer');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_sales_outbound ADD INDEX idx_customer (customer_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 六、核心外键约束（幂等添加）
-- 仅对强关联的父子表添加 FK，使用 INFORMATION_SCHEMA 守卫
-- ========================================================

-- inv_outbound_item.order_id → inv_outbound_order.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_item' AND CONSTRAINT_NAME = 'fk_outbound_item_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_item ADD CONSTRAINT fk_outbound_item_order FOREIGN KEY (order_id) REFERENCES inv_outbound_order(id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_inbound_item.order_id → inv_inbound_order.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND CONSTRAINT_NAME = 'fk_inbound_item_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inbound_item ADD CONSTRAINT fk_inbound_item_order FOREIGN KEY (order_id) REFERENCES inv_inbound_order(id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- pur_order_detail.order_id → pur_order.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_order_detail' AND CONSTRAINT_NAME = 'fk_pur_order_detail_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE pur_order_detail ADD CONSTRAINT fk_pur_order_detail_order FOREIGN KEY (order_id) REFERENCES pur_order(id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_order_detail.order_id → sal_order.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_order_detail' AND CONSTRAINT_NAME = 'fk_sal_order_detail_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_order_detail ADD CONSTRAINT fk_sal_order_detail_order FOREIGN KEY (order_id) REFERENCES sal_order(id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- pur_request_detail.request_id → pur_request.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request_detail' AND CONSTRAINT_NAME = 'fk_pur_request_detail_request');
SET @sql = IF(@cnt = 0, 'ALTER TABLE pur_request_detail ADD CONSTRAINT fk_pur_request_detail_request FOREIGN KEY (request_id) REFERENCES pur_request(id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
