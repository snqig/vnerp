-- ============================================================================
-- 20260922_mass_add_missing_cols.sql
-- 自动生成 — 覆盖 migration-plan.json 中 33 张表的 200+ 缺失列
-- ============================================================================

-- qms_lab_test (add 26 cols)
-- ✓ qms_lab_test.product_id BIGINT UNSIGNED NULL
-- ✓ qms_lab_test.product_code VARCHAR(50) NULL
-- ✓ qms_lab_test.product_name VARCHAR(50) NULL
-- ✓ qms_lab_test.batch_no VARCHAR(50) NULL
-- ✓ qms_lab_test.sample_source VARCHAR(50) NULL
-- ✓ qms_lab_test.overall_result TINYINT NULL
-- ✓ qms_lab_test.tester VARCHAR(100) NULL
-- ✓ qms_lab_test.test_time DATETIME NULL
-- ✓ qms_lab_test.reviewer VARCHAR(100) NULL
-- ✓ qms_lab_test.review_time DATETIME NULL
-- ✓ qms_lab_test.equipment_used VARCHAR(255) NULL
-- ✓ qms_lab_test.create_by VARCHAR(100) NULL
-- ✓ qms_lab_test.lab_test_no VARCHAR(50) NULL
-- ✓ qms_lab_test.inspection_type TINYINT NULL
-- ✓ qms_lab_test.sample_size DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_lab_test.accept_qty DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_lab_test.reject_qty DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_lab_test.aql_level TINYINT NULL
-- ✓ qms_lab_test.inspection_standard VARCHAR(100) NULL
-- ✓ qms_lab_test.inspection_id BIGINT UNSIGNED NULL
-- ✓ qms_lab_test.update_time DATETIME NULL
-- ✓ qms_lab_test.test_standard VARCHAR(100) NULL
-- ✓ qms_lab_test.test_equipment VARCHAR(255) NULL
-- ✓ qms_lab_test.result_summary TINYINT NULL
-- ✓ qms_lab_test.detail_data JSON NULL
-- ✓ qms_lab_test.conclusion VARCHAR(100) NULL

-- qms_complaint (add 25 cols)
-- ✓ qms_complaint.order_no VARCHAR(50) NULL
-- ✓ qms_complaint.product_code VARCHAR(50) NULL
-- ✓ qms_complaint.product_name VARCHAR(50) NULL
-- ✓ qms_complaint.complaint_level TINYINT NULL
-- ✓ qms_complaint.defect_desc VARCHAR(100) NULL
-- ✓ qms_complaint.defect_qty DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_complaint.total_qty DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_complaint.defect_rate DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_complaint.reporter VARCHAR(50) NULL
-- ✓ qms_complaint.report_time DATETIME NULL
-- ✓ qms_complaint.handler VARCHAR(100) NULL
-- ✓ qms_complaint.contain_action VARCHAR(100) NULL
-- ✓ qms_complaint.root_cause VARCHAR(100) NULL
-- ✓ qms_complaint.corrective_action VARCHAR(100) NULL
-- ✓ qms_complaint.preventive_action VARCHAR(50) NULL
-- ✓ qms_complaint.verify_result TINYINT NULL
-- ✓ qms_complaint.verifier VARCHAR(100) NULL
-- ✓ qms_complaint.verify_time DATETIME NULL
-- ✓ qms_complaint.close_time DATETIME NULL
-- ✓ qms_complaint.create_by VARCHAR(100) NULL
-- ✓ qms_complaint.complaint_source VARCHAR(50) NULL
-- ✓ qms_complaint.product_id BIGINT UNSIGNED NULL
-- ✓ qms_complaint.defect_date DATETIME NULL
-- ✓ qms_complaint.severity TINYINT NULL
-- ✓ qms_complaint.report_date DATETIME NULL

-- qms_supplier_audit (add 16 cols)
-- ✓ qms_supplier_audit.audit_scope VARCHAR(100) NULL
-- ✓ qms_supplier_audit.auditor VARCHAR(100) NULL
-- ✓ qms_supplier_audit.audit_items VARCHAR(100) NULL
-- ✓ qms_supplier_audit.audit_scores DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_supplier_audit.total_score DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_supplier_audit.conclusion VARCHAR(100) NULL
-- ✓ qms_supplier_audit.nonconformities VARCHAR(50) NULL
-- ✓ qms_supplier_audit.corrective_request VARCHAR(100) NULL
-- ✓ qms_supplier_audit.deadline VARCHAR(100) NULL
-- ✓ qms_supplier_audit.create_by VARCHAR(100) NULL
-- ✓ qms_supplier_audit.quality_system_score DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_supplier_audit.delivery_score DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_supplier_audit.price_score DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_supplier_audit.service_score DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qms_supplier_audit.improvement_items VARCHAR(50) NULL
-- ✓ qms_supplier_audit.follow_up_date DATETIME NULL

-- plm_eco (add 13 cols)
-- ✓ plm_eco.eco_type TINYINT NULL
-- ✓ plm_eco.product_name VARCHAR(50) NULL
-- ✓ plm_eco.old_version VARCHAR(100) NULL
-- ✓ plm_eco.new_version VARCHAR(100) NULL
-- ✓ plm_eco.change_reason VARCHAR(50) NULL
-- ✓ plm_eco.change_content VARCHAR(100) NULL
-- ✓ plm_eco.impact_analysis VARCHAR(100) NULL
-- ✓ plm_eco.applicant VARCHAR(100) NULL
-- ✓ plm_eco.apply_time DATETIME NULL
-- ✓ plm_eco.approver VARCHAR(50) NULL
-- ✓ plm_eco.approve_time DATETIME NULL
-- ✓ plm_eco.remark VARCHAR(100) NULL
-- ✓ plm_eco.create_by VARCHAR(100) NULL

-- bom_line (add 10 cols)
-- ✓ bom_line.parent_line_id BIGINT UNSIGNED NULL
-- ✓ bom_line.level TINYINT NULL
-- ✓ bom_line.unit VARCHAR(100) NULL
-- ✓ bom_line.consumption_qty DECIMAL(18,4) NULL DEFAULT 0
-- ✓ bom_line.actual_qty DECIMAL(18,4) NULL DEFAULT 0
-- ✓ bom_line.material_type TINYINT NULL
-- ✓ bom_line.is_key_material VARCHAR(100) NULL
-- ✓ bom_line.position_no VARCHAR(50) NULL
-- ✓ bom_line.process_seq VARCHAR(50) NULL
-- ✓ bom_line.process_name VARCHAR(50) NULL

-- sys_operation_log (add 10 cols)
-- ✓ sys_operation_log.title VARCHAR(100) NULL
-- ✓ sys_operation_log.oper_name VARCHAR(100) NULL
-- ✓ sys_operation_log.oper_type TINYINT NULL
-- ✓ sys_operation_log.oper_method VARCHAR(100) NULL
-- ✓ sys_operation_log.oper_url VARCHAR(255) NULL
-- ✓ sys_operation_log.oper_ip VARCHAR(255) NULL
-- ✓ sys_operation_log.oper_time DATETIME NULL
-- ✓ sys_operation_log.module VARCHAR(100) NULL
-- ✓ sys_operation_log.oper_param JSON NULL
-- ✓ sys_operation_log.oper_result TINYINT NULL

-- inv_sales_outbound_item (add 6 cols)
-- ✓ inv_sales_outbound_item.batch_inventory_id BIGINT UNSIGNED NULL
-- ✓ inv_sales_outbound_item.remark VARCHAR(100) NULL
-- ✓ inv_sales_outbound_item.batch_id BIGINT UNSIGNED NULL
-- ✓ inv_sales_outbound_item.original_inbound_date DATETIME NULL
-- ✓ inv_sales_outbound_item.location_id BIGINT UNSIGNED NULL
-- ✓ inv_sales_outbound_item.qr_code VARCHAR(50) NULL

-- prd_die_usage_log (add 5 cols)
-- ✓ prd_die_usage_log.die_code VARCHAR(50) NULL
-- ✓ prd_die_usage_log.work_report_id BIGINT UNSIGNED NULL
-- ✓ prd_die_usage_log.operator_id BIGINT UNSIGNED NULL
-- ✓ prd_die_usage_log.equipment_id BIGINT UNSIGNED NULL
-- ✓ prd_die_usage_log.remark VARCHAR(100) NULL

-- fin_cost_record (add 4 cols)
-- ✓ fin_cost_record.source_type VARCHAR(50) NULL
-- ✓ fin_cost_record.source_no VARCHAR(50) NULL
-- ✓ fin_cost_record.source_id BIGINT UNSIGNED NULL
-- ✓ fin_cost_record.create_by VARCHAR(100) NULL

-- qc_incoming_inspection (add 4 cols)
-- ✓ qc_incoming_inspection.supplier_id BIGINT UNSIGNED NULL
-- ✓ qc_incoming_inspection.material_id BIGINT UNSIGNED NULL
-- ✓ qc_incoming_inspection.qualified_qty DECIMAL(18,4) NULL DEFAULT 0
-- ✓ qc_incoming_inspection.unqualified_qty DECIMAL(18,4) NULL DEFAULT 0

-- qms_sgs_cert_item (add 4 cols)
-- ✓ qms_sgs_cert_item.test_item_name VARCHAR(100) NULL
-- ✓ qms_sgs_cert_item.test_standard VARCHAR(100) NULL
-- ✓ qms_sgs_cert_item.unit VARCHAR(100) NULL
-- ✓ qms_sgs_cert_item.sort_order VARCHAR(50) NULL

-- biz_contract_review (add 3 cols)
-- ✓ biz_contract_review.total_amount DECIMAL(18,4) NULL DEFAULT 0
-- ✓ biz_contract_review.final_result TINYINT NULL
-- ✓ biz_contract_review.final_reviewer VARCHAR(100) NULL

-- prod_work_order (add 3 cols)
-- ✓ prod_work_order.sales_order_id BIGINT UNSIGNED NULL
-- ✓ prod_work_order.standard_card_id BIGINT UNSIGNED NULL
-- ✓ prod_work_order.process_card_id BIGINT UNSIGNED NULL

-- prd_product_label (add 3 cols)
-- ✓ prd_product_label.print_count VARCHAR(50) NULL
-- ✓ prd_product_label.create_by VARCHAR(100) NULL
-- ✓ prd_product_label.print_time DATETIME NULL

-- plm_product_lifecycle (add 3 cols)
-- ✓ plm_product_lifecycle.approver VARCHAR(50) NULL
-- ✓ plm_product_lifecycle.approve_time DATETIME NULL
-- ✓ plm_product_lifecycle.create_by VARCHAR(100) NULL

-- prd_material_return (add 3 cols)
-- ✓ prd_material_return.operator_id BIGINT UNSIGNED NULL
-- ✓ prd_material_return.create_by VARCHAR(100) NULL
-- ✓ prd_material_return.return_reason VARCHAR(50) NULL

-- prd_die_maintenance (add 3 cols)
-- ✓ prd_die_maintenance.die_code VARCHAR(50) NULL
-- ✓ prd_die_maintenance.next_maintenance_date DATETIME NULL
-- ✓ prd_die_maintenance.technician_id BIGINT UNSIGNED NULL

-- inv_inventory_batch (add 3 cols)
-- ✓ inv_inventory_batch.inbound_quantity DECIMAL(18,4) NULL DEFAULT 0
-- ✓ inv_inventory_batch.outbound_quantity DECIMAL(18,4) NULL DEFAULT 0
-- ✓ inv_inventory_batch.available_quantity DECIMAL(18,4) NULL DEFAULT 0

-- eqp_calibration (add 2 cols)
-- ✓ eqp_calibration.status TINYINT NULL
-- ✓ eqp_calibration.create_by VARCHAR(100) NULL

-- eqp_scrap (add 2 cols)
-- ✓ eqp_scrap.status TINYINT NULL
-- ✓ eqp_scrap.create_by VARCHAR(100) NULL

-- inv_production_inbound_item (add 2 cols)
-- ✓ inv_production_inbound_item.remaining_qty DECIMAL(18,4) NULL DEFAULT 0
-- ✓ inv_production_inbound_item.remark VARCHAR(100) NULL

-- ink_usage (add 2 cols)
-- ✓ ink_usage.work_order_id BIGINT UNSIGNED NULL
-- ✓ ink_usage.update_time DATETIME NULL

-- prd_material_return_item (add 2 cols)
-- ✓ prd_material_return_item.remark VARCHAR(100) NULL
-- ✓ prd_material_return_item.create_time DATETIME NULL

-- qrcode_record (add 2 cols)
-- ✓ qrcode_record.shipped_at VARCHAR(255) NULL
-- ✓ qrcode_record.shipment_id BIGINT UNSIGNED NULL

-- prd_material_issue (add 1 cols)
-- ✓ prd_material_issue.create_by VARCHAR(100) NULL

-- inv_production_inbound (add 1 cols)
-- ✓ inv_production_inbound.operator_id BIGINT UNSIGNED NULL

-- mdm_product (add 1 cols)
-- ✓ mdm_product.create_by VARCHAR(100) NULL

-- crm_follow_record (add 1 cols)
-- ✓ crm_follow_record.create_by VARCHAR(100) NULL

-- bom_header (add 1 cols)
-- ✓ bom_header.create_by VARCHAR(100) NULL

-- hr_training (add 1 cols)
-- ✓ hr_training.create_by VARCHAR(100) NULL

-- outsource_settlement (add 1 cols)
-- ✓ outsource_settlement.payment_date DATETIME NULL

-- prd_standard_card (add 1 cols)
-- ✗ prd_standard_card.${fields.join(': You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ${fields.join( at line 1

-- inv_inventory (add 1 cols)
-- ✓ inv_inventory.total_qty DECIMAL(18,4) NULL DEFAULT 0


-- Result: added=164, skipped=0, errors=1
-- Errors:
--   prd_standard_card.${fields.join(': You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ''${fields.join(''' at line 1
