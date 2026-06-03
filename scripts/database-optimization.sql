-- ============================================================
-- 数据库优化脚本
-- 数据库: vnerpdacahng
-- 生成时间: 2026-06-02
-- 说明: 增加外键约束、添加索引、补充表注释
-- ============================================================

-- 使用数据库
USE vnerpdacahng;

-- ============================================================
-- 第一部分: 补充表注释
-- ============================================================

-- 系统管理模块
ALTER TABLE sys_company COMMENT '公司信息表';
ALTER TABLE sys_config COMMENT '系统配置表';
ALTER TABLE sys_department COMMENT '部门表';
ALTER TABLE sys_dict_data COMMENT '字典数据表';
ALTER TABLE sys_dict_type COMMENT '字典类型表';
ALTER TABLE sys_employee COMMENT '员工信息表';
ALTER TABLE sys_login_log COMMENT '登录日志表';
ALTER TABLE sys_menu COMMENT '菜单表';
ALTER TABLE sys_notice COMMENT '通知公告表';
ALTER TABLE sys_operation_log COMMENT '操作日志表';
ALTER TABLE sys_post COMMENT '岗位表';
ALTER TABLE sys_role COMMENT '角色表';
ALTER TABLE sys_role_menu COMMENT '角色菜单关联表';
ALTER TABLE sys_user COMMENT '用户表';
ALTER TABLE sys_user_role COMMENT '用户角色关联表';
ALTER TABLE sys_salary COMMENT '薪资表';

-- 客户管理模块
ALTER TABLE crm_customer COMMENT '客户信息表';
ALTER TABLE crm_customer_analysis COMMENT '客户分析表';
ALTER TABLE crm_customer_contact COMMENT '客户联系人表';
ALTER TABLE crm_customer_follow_up COMMENT '客户跟进记录表';
ALTER TABLE crm_follow_record COMMENT '客户跟进记录表';

-- 供应商管理模块
ALTER TABLE pur_supplier COMMENT '供应商信息表';

-- 库存管理模块
ALTER TABLE inv_inventory COMMENT '库存表';
ALTER TABLE inv_inventory_batch COMMENT '库存批次表';
ALTER TABLE inv_inventory_log COMMENT '库存变动日志表';
ALTER TABLE inv_inventory_transaction COMMENT '库存事务表';
ALTER TABLE inv_warehouse COMMENT '仓库表';
ALTER TABLE inv_location COMMENT '库位表';
ALTER TABLE inv_material COMMENT '物料表';
ALTER TABLE inv_material_category COMMENT '物料分类表';
ALTER TABLE inv_material_label COMMENT '物料标签表';
ALTER TABLE inv_inbound_order COMMENT '入库订单主表';
ALTER TABLE inv_inbound_item COMMENT '入库订单明细表';
ALTER TABLE inv_outbound_order COMMENT '出库单表';
ALTER TABLE inv_outbound_item COMMENT '出库单明细表';
ALTER TABLE inv_cutting_record COMMENT '分切记录表';
ALTER TABLE inv_cutting_detail COMMENT '分切明细表';
ALTER TABLE inv_scan_log COMMENT '扫码操作日志表';
ALTER TABLE inv_trace_record COMMENT '追溯记录表';
ALTER TABLE inv_trace_detail COMMENT '追溯明细表';
ALTER TABLE inv_fifo_override_log COMMENT 'FIFO异常覆盖记录表';

-- 生产管理模块
ALTER TABLE prd_work_order COMMENT '生产工单表';
ALTER TABLE prd_work_order_color_seq COMMENT '工单色序表（多色套印）';
ALTER TABLE prd_process_card COMMENT '生产流程卡表';
ALTER TABLE prd_process_route COMMENT '工艺路线表';
ALTER TABLE prd_process_route_step COMMENT '工艺路线工序表';
ALTER TABLE prd_standard_card COMMENT '标准卡表';
ALTER TABLE prd_bom COMMENT 'BOM表';
ALTER TABLE prd_bom_detail COMMENT 'BOM明细表';
ALTER TABLE prd_schedule COMMENT '生产排程主表';
ALTER TABLE prd_schedule_detail COMMENT '排程明细表（色序级）';
ALTER TABLE prd_work_report COMMENT '生产报工表';
ALTER TABLE prd_die COMMENT '刀模表';
ALTER TABLE prd_die_template COMMENT '刀模板/网版管理表';
ALTER TABLE prd_ink COMMENT '油墨表';
ALTER TABLE prd_screen_plate COMMENT '网版表';

-- 设备管理模块
ALTER TABLE eqp_equipment COMMENT '设备台账表';
ALTER TABLE eqp_maintenance_plan COMMENT '设备维护计划表';
ALTER TABLE eqp_maintenance_record COMMENT '设备维护记录表';
ALTER TABLE eqp_calibration COMMENT '设备校准表';
ALTER TABLE eqp_repair COMMENT '设备维修表';
ALTER TABLE eqp_scrap COMMENT '设备报废表';

-- 质量管理模块
ALTER TABLE qc_inspection COMMENT '质检记录表';
ALTER TABLE qc_unqualified COMMENT '不合格品处理表';

-- 财务管理模块
ALTER TABLE fin_payable COMMENT '应付账款表';
ALTER TABLE fin_receivable COMMENT '应收账款表';
ALTER TABLE fin_payment_record COMMENT '付款记录表';
ALTER TABLE fin_receipt_record COMMENT '收款记录表';
ALTER TABLE fin_cost_record COMMENT '财务成本记录表';

-- 人事管理模块
ALTER TABLE hr_attendance COMMENT '考勤记录表';
ALTER TABLE hr_training COMMENT '培训记录表';
ALTER TABLE hr_training_participant COMMENT '培训参与人员表';

-- 委外管理模块
ALTER TABLE outsource_order COMMENT '委外订单表';
ALTER TABLE outsource_issue COMMENT '委外发料表';
ALTER TABLE outsource_issue_item COMMENT '委外发料明细表';
ALTER TABLE outsource_receive COMMENT '委外收货表';
ALTER TABLE outsource_settlement COMMENT '委外结算表';

-- 油墨管理模块
ALTER TABLE base_ink COMMENT '原油墨基础信息表';
ALTER TABLE ink_mixed_record COMMENT '调色后油墨入库记录表';
ALTER TABLE ink_mixed_batch COMMENT '调墨批次表';
ALTER TABLE ink_mixed_batch_detail COMMENT '调墨明细表';
ALTER TABLE ink_opening_record COMMENT '油墨开罐记录表';

-- 采购管理模块
ALTER TABLE pur_request COMMENT '采购申请主表';
ALTER TABLE pur_request_detail COMMENT '采购申请明细表';
ALTER TABLE pur_request_item COMMENT '采购申请明细表';
ALTER TABLE pur_purchase_order COMMENT '采购订单主表';
ALTER TABLE pur_purchase_order_line COMMENT '采购订单明细表';

-- BOM管理模块
ALTER TABLE bom_header COMMENT 'BOM头表';
ALTER TABLE bom_line COMMENT 'BOM行表';

-- 业务管理模块
ALTER TABLE biz_contract_review COMMENT '合同评审表';

-- ============================================================
-- 第二部分: 添加索引
-- ============================================================

-- 系统管理模块索引
CREATE INDEX idx_sys_user_department ON sys_user(department_id);
CREATE INDEX idx_sys_user_role_user ON sys_user_role(user_id);
CREATE INDEX idx_sys_user_role_role ON sys_user_role(role_id);
CREATE INDEX idx_sys_role_menu_role ON sys_role_menu(role_id);
CREATE INDEX idx_sys_role_menu_menu ON sys_role_menu(menu_id);
CREATE INDEX idx_sys_dict_data_type ON sys_dict_data(dict_type_id);
CREATE INDEX idx_sys_employee_role ON sys_employee(role_id);
CREATE INDEX idx_sys_login_log_user ON sys_login_log(user_id);
CREATE INDEX idx_sys_operation_log_user ON sys_operation_log(user_id);
CREATE INDEX idx_sys_salary_employee ON sys_salary(employee_id);

-- 人事管理模块索引
CREATE INDEX idx_hr_attendance_employee ON hr_attendance(employee_id);
CREATE INDEX idx_hr_training_participant_employee ON hr_training_participant(employee_id);
CREATE INDEX idx_hr_training_participant_training ON hr_training_participant(training_id);

-- 客户管理模块索引
CREATE INDEX idx_crm_customer_contact_customer ON crm_customer_contact(customer_id);
CREATE INDEX idx_crm_customer_analysis_customer ON crm_customer_analysis(customer_id);
CREATE INDEX idx_crm_follow_record_customer ON crm_follow_record(customer_id);

-- 库存管理模块索引
CREATE INDEX idx_inv_inventory_material ON inv_inventory(material_id);
CREATE INDEX idx_inv_inventory_warehouse ON inv_inventory(warehouse_id);
CREATE INDEX idx_inv_inventory_location ON inv_inventory(location_id);
CREATE INDEX idx_inv_inventory_batch_material ON inv_inventory_batch(material_id);
CREATE INDEX idx_inv_inbound_item_order ON inv_inbound_item(order_id);
CREATE INDEX idx_inv_inbound_item_material ON inv_inbound_item(material_id);
CREATE INDEX idx_inv_outbound_item_order ON inv_outbound_item(order_id);
CREATE INDEX idx_inv_outbound_item_material ON inv_outbound_item(material_id);
CREATE INDEX idx_inv_material_category_parent ON inv_material_category(parent_id);
CREATE INDEX idx_inv_inventory_log_material ON inv_inventory_log(material_id);
CREATE INDEX idx_inv_inventory_transaction_material ON inv_inventory_transaction(material_id);

-- 生产管理模块索引
CREATE INDEX idx_prd_work_order_material ON prd_work_order(material_id);
CREATE INDEX idx_prd_work_order_product ON prd_work_order(product_id);
CREATE INDEX idx_prd_work_order_customer ON prd_work_order(customer_id);
CREATE INDEX idx_prd_bom_detail_bom ON prd_bom_detail(bom_id);
CREATE INDEX idx_prd_bom_detail_material ON prd_bom_detail(material_id);
CREATE INDEX idx_prd_process_route_step_route ON prd_process_route_step(route_id);
CREATE INDEX idx_prd_schedule_detail_schedule ON prd_schedule_detail(schedule_id);
CREATE INDEX idx_prd_work_report_work_order ON prd_work_report(work_order_id);

-- 设备管理模块索引
CREATE INDEX idx_eqp_maintenance_plan_equipment ON eqp_maintenance_plan(equipment_id);
CREATE INDEX idx_eqp_maintenance_record_equipment ON eqp_maintenance_record(equipment_id);
CREATE INDEX idx_eqp_calibration_equipment ON eqp_calibration(equipment_id);
CREATE INDEX idx_eqp_repair_equipment ON eqp_repair(equipment_id);
CREATE INDEX idx_eqp_scrap_equipment ON eqp_scrap(equipment_id);

-- 质量管理模块索引
CREATE INDEX idx_qc_inspection_work_order ON qc_inspection(work_order_id);
CREATE INDEX idx_qc_inspection_material ON qc_inspection(material_id);
CREATE INDEX idx_qc_unqualified_inspection ON qc_unqualified(inspection_id);

-- 财务管理模块索引
CREATE INDEX idx_fin_payable_supplier ON fin_payable(supplier_id);
CREATE INDEX idx_fin_receivable_customer ON fin_receivable(customer_id);
CREATE INDEX idx_fin_payment_record_payable ON fin_payment_record(payable_id);
CREATE INDEX idx_fin_receipt_record_receivable ON fin_receipt_record(receivable_id);

-- 委外管理模块索引
CREATE INDEX idx_outsource_issue_order ON outsource_issue(outsource_order_id);
CREATE INDEX idx_outsource_receive_order ON outsource_receive(outsource_order_id);
CREATE INDEX idx_outsource_settlement_order ON outsource_settlement(outsource_order_id);
CREATE INDEX idx_outsource_issue_item_issue ON outsource_issue_item(issue_id);

-- 油墨管理模块索引
CREATE INDEX idx_ink_mixed_record_base_ink ON ink_mixed_record(base_ink_id);
CREATE INDEX idx_ink_mixed_record_company ON ink_mixed_record(company_id);
CREATE INDEX idx_ink_mixed_batch_detail_batch ON ink_mixed_batch_detail(batch_id);
CREATE INDEX idx_ink_opening_record_ink ON ink_opening_record(ink_id);

-- 采购管理模块索引
CREATE INDEX idx_pur_request_detail_request ON pur_request_detail(request_id);
CREATE INDEX idx_pur_request_item_request ON pur_request_item(request_id);
CREATE INDEX idx_pur_purchase_order_line_order ON pur_purchase_order_line(po_id);
CREATE INDEX idx_pur_purchase_order_supplier ON pur_purchase_order(supplier_id);

-- BOM管理模块索引
CREATE INDEX idx_bom_line_header ON bom_line(header_id);
CREATE INDEX idx_bom_line_material ON bom_line(material_id);

-- ============================================================
-- 第三部分: 增加外键约束
-- ============================================================
-- 注意: 执行前请确保数据完整性，建议先备份数据库

-- 系统管理模块外键
ALTER TABLE sys_user 
  ADD CONSTRAINT fk_sys_user_department 
  FOREIGN KEY (department_id) REFERENCES sys_department(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE sys_user_role 
  ADD CONSTRAINT fk_sys_user_role_user 
  FOREIGN KEY (user_id) REFERENCES sys_user(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE sys_user_role 
  ADD CONSTRAINT fk_sys_user_role_role 
  FOREIGN KEY (role_id) REFERENCES sys_role(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE sys_role_menu 
  ADD CONSTRAINT fk_sys_role_menu_role 
  FOREIGN KEY (role_id) REFERENCES sys_role(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE sys_role_menu 
  ADD CONSTRAINT fk_sys_role_menu_menu 
  FOREIGN KEY (menu_id) REFERENCES sys_menu(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE sys_dict_data 
  ADD CONSTRAINT fk_sys_dict_data_type 
  FOREIGN KEY (dict_type_id) REFERENCES sys_dict_type(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE sys_employee 
  ADD CONSTRAINT fk_sys_employee_role 
  FOREIGN KEY (role_id) REFERENCES sys_role(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE sys_login_log 
  ADD CONSTRAINT fk_sys_login_log_user 
  FOREIGN KEY (user_id) REFERENCES sys_user(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE sys_operation_log 
  ADD CONSTRAINT fk_sys_operation_log_user 
  FOREIGN KEY (user_id) REFERENCES sys_user(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE sys_salary 
  ADD CONSTRAINT fk_sys_salary_employee 
  FOREIGN KEY (employee_id) REFERENCES sys_employee(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 人事管理模块外键
ALTER TABLE hr_attendance 
  ADD CONSTRAINT fk_hr_attendance_employee 
  FOREIGN KEY (employee_id) REFERENCES sys_employee(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE hr_training_participant 
  ADD CONSTRAINT fk_hr_training_participant_employee 
  FOREIGN KEY (employee_id) REFERENCES sys_employee(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE hr_training_participant 
  ADD CONSTRAINT fk_hr_training_participant_training 
  FOREIGN KEY (training_id) REFERENCES hr_training(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 客户管理模块外键
ALTER TABLE crm_customer_contact 
  ADD CONSTRAINT fk_crm_customer_contact_customer 
  FOREIGN KEY (customer_id) REFERENCES crm_customer(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE crm_customer_analysis 
  ADD CONSTRAINT fk_crm_customer_analysis_customer 
  FOREIGN KEY (customer_id) REFERENCES crm_customer(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE crm_follow_record 
  ADD CONSTRAINT fk_crm_follow_record_customer 
  FOREIGN KEY (customer_id) REFERENCES crm_customer(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 库存管理模块外键
ALTER TABLE inv_inventory 
  ADD CONSTRAINT fk_inv_inventory_material 
  FOREIGN KEY (material_id) REFERENCES inv_material(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inv_inventory 
  ADD CONSTRAINT fk_inv_inventory_warehouse 
  FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inv_inventory_batch 
  ADD CONSTRAINT fk_inv_inventory_batch_material 
  FOREIGN KEY (material_id) REFERENCES inv_material(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inv_inbound_item 
  ADD CONSTRAINT fk_inv_inbound_item_order 
  FOREIGN KEY (order_id) REFERENCES inv_inbound_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE inv_outbound_item 
  ADD CONSTRAINT fk_inv_outbound_item_order 
  FOREIGN KEY (order_id) REFERENCES inv_outbound_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE inv_material_category 
  ADD CONSTRAINT fk_inv_material_category_parent 
  FOREIGN KEY (parent_id) REFERENCES inv_material_category(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 委外管理模块外键
ALTER TABLE outsource_issue 
  ADD CONSTRAINT fk_outsource_issue_order 
  FOREIGN KEY (outsource_order_id) REFERENCES outsource_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE outsource_receive 
  ADD CONSTRAINT fk_outsource_receive_order 
  FOREIGN KEY (outsource_order_id) REFERENCES outsource_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE outsource_settlement 
  ADD CONSTRAINT fk_outsource_settlement_order 
  FOREIGN KEY (outsource_order_id) REFERENCES outsource_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE outsource_issue_item 
  ADD CONSTRAINT fk_outsource_issue_item_issue 
  FOREIGN KEY (issue_id) REFERENCES outsource_issue(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 油墨管理模块外键
ALTER TABLE ink_mixed_record 
  ADD CONSTRAINT fk_ink_mixed_record_base_ink 
  FOREIGN KEY (base_ink_id) REFERENCES base_ink(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE ink_mixed_record 
  ADD CONSTRAINT fk_ink_mixed_record_company 
  FOREIGN KEY (company_id) REFERENCES sys_company(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE ink_mixed_batch_detail 
  ADD CONSTRAINT fk_ink_mixed_batch_detail_batch 
  FOREIGN KEY (batch_id) REFERENCES ink_mixed_batch(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 采购管理模块外键
ALTER TABLE pur_request_detail 
  ADD CONSTRAINT fk_pur_request_detail_request 
  FOREIGN KEY (request_id) REFERENCES pur_request(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE pur_request_item 
  ADD CONSTRAINT fk_pur_request_item_request 
  FOREIGN KEY (request_id) REFERENCES pur_request(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE pur_purchase_order 
  ADD CONSTRAINT fk_pur_purchase_order_supplier 
  FOREIGN KEY (supplier_id) REFERENCES pur_supplier(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- BOM管理模块外键
ALTER TABLE bom_line 
  ADD CONSTRAINT fk_bom_line_header 
  FOREIGN KEY (header_id) REFERENCES bom_header(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 第四部分: 命名规范修正建议
-- ============================================================
-- 以下字段命名不符合规范，建议修改（需要修改应用代码配合）

-- 1. sys_employee.role_id -> 建议保持不变（符合规范）
-- 2. pur_purchase_order_line.po_id -> 建议改为 purchase_order_id
-- 3. bom_line.header_id -> 建议改为 bom_header_id

-- 重命名字段示例（需要同步修改应用代码）:
-- ALTER TABLE pur_purchase_order_line CHANGE po_id purchase_order_id INT;
-- ALTER TABLE bom_line CHANGE header_id bom_header_id INT;

-- ============================================================
-- 执行说明
-- ============================================================
-- 1. 执行前请先备份数据库:
--    mysqldump -u root -p vnerpdacahng > vnerpdacahng_backup_$(date +%Y%m%d).sql
--
-- 2. 建议分步执行:
--    - 先执行表注释部分（无风险）
--    - 再执行索引部分（无风险，但可能需要时间）
--    - 最后执行外键部分（需要确保数据完整性）
--
-- 3. 如果外键创建失败，可能原因:
--    - 存在孤儿数据（子表引用了不存在的主表记录）
--    - 数据类型不匹配
--    - 字符集/排序规则不一致
--
-- 4. 检查孤儿数据示例:
--    SELECT * FROM sys_user u 
--    WHERE u.department_id IS NOT NULL 
--      AND NOT EXISTS (SELECT 1 FROM sys_department d WHERE d.id = u.department_id);

-- ============================================================
-- 完成
-- ============================================================
