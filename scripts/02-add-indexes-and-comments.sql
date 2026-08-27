-- ============================================================
-- 数据库安全优化脚本 v2
-- 数据库: vnerpdacahng
-- 说明: 添加索引 + 补充注释（低风险，可重复执行）
-- 注意: 外键约束因风险较高，单独放在 03-foreign-keys.sql
-- ============================================================

USE vnerpdacahng;

-- ============================================================
-- 工具函数: 安全添加索引（已存在则跳过）
-- ============================================================
DELIMITER //

DROP PROCEDURE IF EXISTS safe_add_index//
CREATE PROCEDURE safe_add_index(
  IN p_table VARCHAR(100),
  IN p_index_name VARCHAR(100),
  IN p_columns VARCHAR(500)
)
BEGIN
  DECLARE idx_exists INT DEFAULT 0;
  SELECT COUNT(*) INTO idx_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index_name;
  IF idx_exists = 0 THEN
    SET @sql = CONCAT('CREATE INDEX ', p_index_name, ' ON ', p_table, '(', p_columns, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Created index: ', p_index_name, ' on ', p_table) AS result;
  ELSE
    SELECT CONCAT('Index already exists: ', p_index_name) AS result;
  END IF;
END//

DROP PROCEDURE IF EXISTS safe_add_comment//
CREATE PROCEDURE safe_add_comment(
  IN p_table VARCHAR(100),
  IN p_comment VARCHAR(500)
)
BEGIN
  SET @sql = CONCAT('ALTER TABLE ', p_table, ' COMMENT ''', p_comment, '''');
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END//

DELIMITER ;

-- ============================================================
-- 第一部分: 补充表注释
-- ============================================================

-- 系统管理
CALL safe_add_comment('sys_user', '用户表');
CALL safe_add_comment('sys_role', '角色表');
CALL safe_add_comment('sys_menu', '菜单表');
CALL safe_add_comment('sys_department', '部门表');
CALL safe_add_comment('sys_employee', '员工信息表');
CALL safe_add_comment('sys_user_role', '用户角色关联表');
CALL safe_add_comment('sys_role_menu', '角色菜单关联表');
CALL safe_add_comment('sys_config', '系统配置表');
CALL safe_add_comment('sys_dict_data', '字典数据表');
CALL safe_add_comment('sys_dict_type', '字典类型表');
CALL safe_add_comment('sys_login_log', '登录日志表');
CALL safe_add_comment('sys_operation_log', '操作日志表');
CALL safe_add_comment('sys_notice', '通知公告表');
CALL safe_add_comment('sys_company', '公司信息表');
CALL safe_add_comment('sys_post', '岗位表');
CALL safe_add_comment('sys_salary', '薪资表');
CALL safe_add_comment('sys_warehouse_category', '仓库分类表');

-- 客户管理
CALL safe_add_comment('crm_customer', '客户信息表');
CALL safe_add_comment('crm_customer_contact', '客户联系人表');
CALL safe_add_comment('crm_customer_analysis', '客户分析表');
CALL safe_add_comment('crm_follow_record', '客户跟进记录表');

-- 供应商管理
CALL safe_add_comment('pur_supplier', '供应商信息表');

-- 库存管理
CALL safe_add_comment('inv_warehouse', '仓库表');
CALL safe_add_comment('inv_material', '物料表');
CALL safe_add_comment('inv_material_category', '物料分类表');
CALL safe_add_comment('inv_material_label', '物料标签表');
CALL safe_add_comment('inv_inventory', '库存表');
CALL safe_add_comment('inv_inventory_batch', '库存批次表');
CALL safe_add_comment('inv_inventory_log', '库存变动日志表');
CALL safe_add_comment('inv_inventory_transaction', '库存事务表');
CALL safe_add_comment('inv_location', '库位表');
CALL safe_add_comment('inv_inbound_order', '入库订单主表');
CALL safe_add_comment('inv_inbound_item', '入库订单明细表');
CALL safe_add_comment('inv_outbound_order', '出库单表');
CALL safe_add_comment('inv_outbound_item', '出库单明细表');
CALL safe_add_comment('inv_cutting_record', '分切记录表');
CALL safe_add_comment('inv_cutting_detail', '分切明细表');
CALL safe_add_comment('inv_scan_log', '扫码操作日志表');
CALL safe_add_comment('inv_trace_record', '追溯记录表');
CALL safe_add_comment('inv_trace_detail', '追溯明细表');
CALL safe_add_comment('inv_fifo_override_log', 'FIFO异常覆盖记录表');

-- 生产管理
CALL safe_add_comment('prd_schedule', '生产排程主表');
CALL safe_add_comment('prd_material_issue', '领料单表');
CALL safe_add_comment('prd_material_return', '退料单表');
CALL safe_add_comment('prd_product_label', '产品标签表');
CALL safe_add_comment('prd_work_order', '生产工单表');
CALL safe_add_comment('prd_work_order_color_seq', '工单色序表');
CALL safe_add_comment('prd_process_card', '生产流程卡表');
CALL safe_add_comment('prd_process_route', '工艺路线表');
CALL safe_add_comment('prd_process_route_step', '工艺路线工序表');
CALL safe_add_comment('prd_standard_card', '标准卡表');
CALL safe_add_comment('prd_bom', 'BOM表');
CALL safe_add_comment('prd_bom_detail', 'BOM明细表');
CALL safe_add_comment('prd_schedule_detail', '排程明细表');
CALL safe_add_comment('prd_work_report', '生产报工表');
CALL safe_add_comment('prd_die', '刀模表');
CALL safe_add_comment('prd_die_template', '刀模板/网版管理表');
CALL safe_add_comment('prd_ink', '油墨表');
CALL safe_add_comment('prd_screen_plate', '网版表');

-- 设备管理
CALL safe_add_comment('eqp_equipment', '设备台账表');
CALL safe_add_comment('eqp_maintenance_plan', '设备维护计划表');
CALL safe_add_comment('eqp_maintenance_record', '设备维护记录表');
CALL safe_add_comment('eqp_calibration', '设备校准表');
CALL safe_add_comment('eqp_repair', '设备维修表');
CALL safe_add_comment('eqp_scrap', '设备报废表');

-- 质量管理
CALL safe_add_comment('qc_inspection', '质检记录表');
CALL safe_add_comment('qc_unqualified', '不合格品处理表');

-- 财务管理
CALL safe_add_comment('fin_payable', '应付账款表');
CALL safe_add_comment('fin_receivable', '应收账款表');
CALL safe_add_comment('fin_payment_record', '付款记录表');
CALL safe_add_comment('fin_receipt_record', '收款记录表');
CALL safe_add_comment('fin_cost_record', '财务成本记录表');

-- 人事管理
CALL safe_add_comment('hr_attendance', '考勤记录表');
CALL safe_add_comment('hr_training', '培训记录表');
CALL safe_add_comment('hr_training_participant', '培训参与人员表');

-- 委外管理
CALL safe_add_comment('outsource_order', '委外订单表');
CALL safe_add_comment('outsource_issue', '委外发料表');
CALL safe_add_comment('outsource_issue_item', '委外发料明细表');
CALL safe_add_comment('outsource_receive', '委外收货表');
CALL safe_add_comment('outsource_settlement', '委外结算表');

-- 油墨管理
CALL safe_add_comment('base_ink', '原油墨基础信息表');
CALL safe_add_comment('ink_mixed_record', '调色后油墨入库记录表');
CALL safe_add_comment('ink_mixed_batch', '调墨批次表');
CALL safe_add_comment('ink_mixed_batch_detail', '调墨明细表');
CALL safe_add_comment('ink_opening_record', '油墨开罐记录表');

-- 采购管理
CALL safe_add_comment('pur_request', '采购申请主表');
CALL safe_add_comment('pur_request_detail', '采购申请明细表');
CALL safe_add_comment('pur_request_item', '采购申请明细表');
CALL safe_add_comment('pur_purchase_order', '采购订单主表');
CALL safe_add_comment('pur_purchase_order_line', '采购订单明细表');

-- BOM管理
CALL safe_add_comment('bom_header', 'BOM头表');
CALL safe_add_comment('bom_line', 'BOM行表');
CALL safe_add_comment('bom_version_history', 'BOM版本历史表');

-- 业务管理
CALL safe_add_comment('biz_contract_review', '合同评审表');

-- 产品管理
CALL safe_add_comment('mdm_product', '产品主数据表');

-- ============================================================
-- 第二部分: 添加索引（安全方式，已存在则跳过）
-- ============================================================

-- 系统管理模块
CALL safe_add_index('sys_user', 'idx_sys_user_department', 'department_id');
CALL safe_add_index('sys_user', 'idx_sys_user_status', 'status');
CALL safe_add_index('sys_user_role', 'idx_sys_user_role_user', 'user_id');
CALL safe_add_index('sys_user_role', 'idx_sys_user_role_role', 'role_id');
CALL safe_add_index('sys_role_menu', 'idx_sys_role_menu_role', 'role_id');
CALL safe_add_index('sys_role_menu', 'idx_sys_role_menu_menu', 'menu_id');
CALL safe_add_index('sys_menu', 'idx_sys_menu_parent', 'parent_id');
CALL safe_add_index('sys_menu', 'idx_sys_menu_type', 'menu_type');
CALL safe_add_index('sys_department', 'idx_sys_dept_parent', 'parent_id');
CALL safe_add_index('sys_employee', 'idx_sys_employee_dept', 'dept_id');
CALL safe_add_index('sys_employee', 'idx_sys_employee_role', 'role_id');
CALL safe_add_index('sys_login_log', 'idx_sys_login_log_user', 'user_id');
CALL safe_add_index('sys_login_log', 'idx_sys_login_log_time', 'login_time');
CALL safe_add_index('sys_operation_log', 'idx_sys_oper_log_user', 'user_id');
CALL safe_add_index('sys_operation_log', 'idx_sys_oper_log_time', 'create_time');
CALL safe_add_index('sys_dict_data', 'idx_sys_dict_data_type', 'dict_type_id');
CALL safe_add_index('sys_config', 'idx_sys_config_key', 'config_key');
CALL safe_add_index('sys_config', 'idx_sys_config_category', 'category');

-- 人事管理模块
CALL safe_add_index('hr_attendance', 'idx_hr_att_employee', 'employee_id_int');
CALL safe_add_index('hr_attendance', 'idx_hr_att_date', 'attendance_date');
CALL safe_add_index('hr_attendance', 'idx_hr_att_status', 'status');
CALL safe_add_index('hr_training', 'idx_hr_training_type', 'training_type');
CALL safe_add_index('hr_training', 'idx_hr_training_date', 'training_date');
CALL safe_add_index('hr_training_participant', 'idx_hr_tp_employee', 'employee_id');
CALL safe_add_index('hr_training_participant', 'idx_hr_tp_training', 'training_id');

-- 客户管理模块
CALL safe_add_index('crm_customer', 'idx_crm_customer_code', 'customer_code');
CALL safe_add_index('crm_customer', 'idx_crm_customer_status', 'status');
CALL safe_add_index('crm_customer', 'idx_crm_customer_salesman', 'salesman_id');
CALL safe_add_index('crm_customer_contact', 'idx_crm_cc_customer', 'customer_id');
CALL safe_add_index('crm_customer_analysis', 'idx_crm_ca_customer', 'customer_id');
CALL safe_add_index('crm_customer_analysis', 'idx_crm_ca_period', 'analysis_period');
CALL safe_add_index('crm_follow_record', 'idx_crm_fr_customer', 'customer_id');
CALL safe_add_index('crm_follow_record', 'idx_crm_fr_status', 'status');

-- 库存管理模块
CALL safe_add_index('inv_inventory', 'idx_inv_inv_material', 'material_id');
CALL safe_add_index('inv_inventory', 'idx_inv_inv_warehouse', 'warehouse_id');
CALL safe_add_index('inv_inventory', 'idx_inv_inv_location', 'location_id');
CALL safe_add_index('inv_inventory_batch', 'idx_inv_ib_material', 'material_id');
CALL safe_add_index('inv_inventory_batch', 'idx_inv_ib_warehouse', 'warehouse_id');
CALL safe_add_index('inv_inventory_log', 'idx_inv_il_material', 'material_id');
CALL safe_add_index('inv_inventory_log', 'idx_inv_il_warehouse', 'warehouse_id');
CALL safe_add_index('inv_inventory_transaction', 'idx_inv_it_material', 'material_id');
CALL safe_add_index('inv_material', 'idx_inv_mat_type', 'material_type');
CALL safe_add_index('inv_material', 'idx_inv_mat_category', 'category_id');
CALL safe_add_index('inv_material', 'idx_inv_mat_status', 'status');
CALL safe_add_index('inv_material_category', 'idx_inv_mc_parent', 'parent_id');
CALL safe_add_index('inv_inbound_item', 'idx_inv_ii_order', 'order_id');
CALL safe_add_index('inv_inbound_item', 'idx_inv_ii_material', 'material_id');
CALL safe_add_index('inv_outbound_item', 'idx_inv_oi_order', 'order_id');
CALL safe_add_index('inv_outbound_item', 'idx_inv_oi_material', 'material_id');
CALL safe_add_index('inv_warehouse', 'idx_inv_wh_type', 'warehouse_type');
CALL safe_add_index('inv_warehouse', 'idx_inv_wh_status', 'status');

-- 生产管理模块
CALL safe_add_index('prd_schedule', 'idx_prd_sched_order', 'order_id');
CALL safe_add_index('prd_schedule', 'idx_prd_sched_product', 'product_id');
CALL safe_add_index('prd_schedule', 'idx_prd_sched_status', 'status');
CALL safe_add_index('prd_schedule', 'idx_prd_sched_workshop', 'workshop');
CALL safe_add_index('prd_material_issue', 'idx_prd_mi_status', 'status');
CALL safe_add_index('prd_material_issue', 'idx_prd_mi_date', 'issue_date');
CALL safe_add_index('prd_material_return', 'idx_prd_mr_status', 'status');
CALL safe_add_index('prd_material_return', 'idx_prd_mr_date', 'return_date');
CALL safe_add_index('prd_product_label', 'idx_prd_pl_product', 'product_id');
CALL safe_add_index('prd_product_label', 'idx_prd_pl_status', 'status');
CALL safe_add_index('prd_work_order', 'idx_prd_wo_material', 'material_id');
CALL safe_add_index('prd_work_order', 'idx_prd_wo_product', 'product_id');
CALL safe_add_index('prd_work_order', 'idx_prd_wo_customer', 'customer_id');
CALL safe_add_index('prd_work_order', 'idx_prd_wo_status', 'status');
CALL safe_add_index('prd_bom_detail', 'idx_prd_bd_bom', 'bom_id');
CALL safe_add_index('prd_bom_detail', 'idx_prd_bd_material', 'material_id');
CALL safe_add_index('prd_process_route_step', 'idx_prd_prs_route', 'route_id');
CALL safe_add_index('prd_schedule_detail', 'idx_prd_sd_schedule', 'schedule_id');
CALL safe_add_index('prd_work_report', 'idx_prd_wr_work_order', 'work_order_id');

-- 设备管理模块
CALL safe_add_index('eqp_equipment', 'idx_eqp_eq_type', 'equipment_type');
CALL safe_add_index('eqp_equipment', 'idx_eqp_eq_status', 'status');
CALL safe_add_index('eqp_maintenance_plan', 'idx_eqp_mp_equipment', 'equipment_id');
CALL safe_add_index('eqp_maintenance_record', 'idx_eqp_mr_equipment', 'equipment_id');
CALL safe_add_index('eqp_calibration', 'idx_eqp_cal_equipment', 'equipment_id');
CALL safe_add_index('eqp_calibration', 'idx_eqp_cal_status', 'status');
CALL safe_add_index('eqp_repair', 'idx_eqp_rep_equipment', 'equipment_id');
CALL safe_add_index('eqp_repair', 'idx_eqp_rep_status', 'status');
CALL safe_add_index('eqp_scrap', 'idx_eqp_scrap_equipment', 'equipment_id');
CALL safe_add_index('eqp_scrap', 'idx_eqp_scrap_status', 'status');

-- 质量管理模块
CALL safe_add_index('qc_inspection', 'idx_qc_inspect_work_order', 'work_order_id');
CALL safe_add_index('qc_inspection', 'idx_qc_inspect_material', 'material_id');
CALL safe_add_index('qc_inspection', 'idx_qc_inspect_status', 'status');
CALL safe_add_index('qc_unqualified', 'idx_qc_unq_inspection', 'inspection_id');

-- 财务管理模块
CALL safe_add_index('fin_payable', 'idx_fin_pay_supplier', 'supplier_id');
CALL safe_add_index('fin_payable', 'idx_fin_pay_status', 'status');
CALL safe_add_index('fin_payable', 'idx_fin_pay_date', 'payable_date');
CALL safe_add_index('fin_receivable', 'idx_fin_rec_customer', 'customer_id');
CALL safe_add_index('fin_receivable', 'idx_fin_rec_status', 'status');
CALL safe_add_index('fin_receivable', 'idx_fin_rec_date', 'receivable_date');
CALL safe_add_index('fin_cost_record', 'idx_fin_cr_type', 'cost_type');
CALL safe_add_index('fin_cost_record', 'idx_fin_cr_date', 'cost_date');
CALL safe_add_index('fin_cost_record', 'idx_fin_cr_status', 'status');
CALL safe_add_index('fin_payment_record', 'idx_fin_pr_payable', 'payable_id');
CALL safe_add_index('fin_receipt_record', 'idx_fin_rr_receivable', 'receivable_id');

-- 委外管理模块
CALL safe_add_index('outsource_order', 'idx_oo_supplier', 'supplier_id');
CALL safe_add_index('outsource_order', 'idx_oo_status', 'status');
CALL safe_add_index('outsource_issue', 'idx_oi_order', 'outsource_order_id');
CALL safe_add_index('outsource_issue', 'idx_oi_status', 'status');
CALL safe_add_index('outsource_issue_item', 'idx_oii_issue', 'issue_id');
CALL safe_add_index('outsource_receive', 'idx_orc_order', 'outsource_order_id');
CALL safe_add_index('outsource_receive', 'idx_orc_status', 'status');
CALL safe_add_index('outsource_settlement', 'idx_os_order', 'outsource_order_id');
CALL safe_add_index('outsource_settlement', 'idx_os_status', 'status');

-- 油墨管理模块
CALL safe_add_index('ink_mixed_record', 'idx_imr_base_ink', 'base_ink_id');
CALL safe_add_index('ink_mixed_record', 'idx_imr_status', 'status');
CALL safe_add_index('ink_mixed_record', 'idx_imr_mix_time', 'mix_time');
CALL safe_add_index('ink_mixed_batch', 'idx_imb_status', 'status');
CALL safe_add_index('ink_mixed_batch', 'idx_imb_mixed_date', 'mixed_date');
CALL safe_add_index('ink_mixed_batch_detail', 'idx_imbd_batch', 'batch_id');
CALL safe_add_index('ink_opening_record', 'idx_ior_ink_type', 'ink_type');
CALL safe_add_index('ink_opening_record', 'idx_ior_status', 'status');
CALL safe_add_index('ink_opening_record', 'idx_ior_expire_time', 'expire_time');

-- 采购管理模块
CALL safe_add_index('pur_request', 'idx_pr_type', 'request_type');
CALL safe_add_index('pur_request', 'idx_pr_status', 'status');
CALL safe_add_index('pur_request', 'idx_pr_date', 'request_date');
CALL safe_add_index('pur_request_detail', 'idx_prd_request', 'request_id');
CALL safe_add_index('pur_request_item', 'idx_pri_request', 'request_id');
CALL safe_add_index('pur_purchase_order', 'idx_ppo_supplier', 'supplier_id');
CALL safe_add_index('pur_purchase_order', 'idx_ppo_status', 'status');
CALL safe_add_index('pur_purchase_order', 'idx_ppo_date', 'order_date');
CALL safe_add_index('pur_purchase_order_line', 'idx_ppol_po', 'po_id');
CALL safe_add_index('pur_purchase_order_line', 'idx_ppol_material', 'material_id');

-- BOM管理模块
CALL safe_add_index('bom_header', 'idx_bh_product', 'product_id');
CALL safe_add_index('bom_header', 'idx_bh_status', 'status');
CALL safe_add_index('bom_line', 'idx_bl_bom', 'bom_id');
CALL safe_add_index('bom_line', 'idx_bl_material', 'material_id');
CALL safe_add_index('bom_version_history', 'idx_bvh_bom', 'bom_id');

-- 业务管理模块
CALL safe_add_index('biz_contract_review', 'idx_bcr_customer', 'customer_id');
CALL safe_add_index('biz_contract_review', 'idx_bcr_status', 'status');
CALL safe_add_index('biz_contract_review', 'idx_bcr_date', 'review_date');

-- 产品管理模块
CALL safe_add_index('mdm_product', 'idx_mp_category', 'category_id');
CALL safe_add_index('mdm_product', 'idx_mp_customer', 'customer_id');
CALL safe_add_index('mdm_product', 'idx_mp_status', 'status');

-- ============================================================
-- 清理临时存储过程
-- ============================================================
DROP PROCEDURE IF EXISTS safe_add_index;
DROP PROCEDURE IF EXISTS safe_add_comment;

-- ============================================================
-- 执行完成
-- ============================================================
SELECT 'Database optimization (indexes + comments) completed successfully!' AS result;
