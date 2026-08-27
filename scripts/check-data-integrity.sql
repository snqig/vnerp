-- ============================================================
-- 数据完整性检查脚本
-- 用于在添加外键约束前检查孤儿数据
-- ============================================================

USE vnerpdacahng;

-- 检查 sys_user -> sys_department 孤儿数据
SELECT 'sys_user -> sys_department' AS relation, 
       COUNT(*) AS orphan_count,
       GROUP_CONCAT(id) AS orphan_ids
FROM sys_user u 
WHERE u.department_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sys_department d WHERE d.id = u.department_id);

-- 检查 sys_user_role -> sys_user 孤儿数据
SELECT 'sys_user_role -> sys_user' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_user_role ur 
WHERE NOT EXISTS (SELECT 1 FROM sys_user u WHERE u.id = ur.user_id);

-- 检查 sys_user_role -> sys_role 孤儿数据
SELECT 'sys_user_role -> sys_role' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_user_role ur 
WHERE NOT EXISTS (SELECT 1 FROM sys_role r WHERE r.id = ur.role_id);

-- 检查 sys_role_menu -> sys_role 孤儿数据
SELECT 'sys_role_menu -> sys_role' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_role_menu rm 
WHERE NOT EXISTS (SELECT 1 FROM sys_role r WHERE r.id = rm.role_id);

-- 检查 sys_role_menu -> sys_menu 孤儿数据
SELECT 'sys_role_menu -> sys_menu' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_role_menu rm 
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = rm.menu_id);

-- 检查 sys_dict_data -> sys_dict_type 孤儿数据
SELECT 'sys_dict_data -> sys_dict_type' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_dict_data dd 
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type dt WHERE dt.id = dd.dict_type_id);

-- 检查 sys_employee -> sys_role 孤儿数据
SELECT 'sys_employee -> sys_role' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_employee e 
WHERE e.role_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sys_role r WHERE r.id = e.role_id);

-- 检查 sys_login_log -> sys_user 孤儿数据
SELECT 'sys_login_log -> sys_user' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_login_log ll 
WHERE NOT EXISTS (SELECT 1 FROM sys_user u WHERE u.id = ll.user_id);

-- 检查 sys_operation_log -> sys_user 孤儿数据
SELECT 'sys_operation_log -> sys_user' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_operation_log ol 
WHERE ol.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sys_user u WHERE u.id = ol.user_id);

-- 检查 sys_salary -> sys_employee 孤儿数据
SELECT 'sys_salary -> sys_employee' AS relation, 
       COUNT(*) AS orphan_count
FROM sys_salary s 
WHERE NOT EXISTS (SELECT 1 FROM sys_employee e WHERE e.id = s.employee_id);

-- 检查 hr_attendance -> sys_employee 孤儿数据
SELECT 'hr_attendance -> sys_employee' AS relation, 
       COUNT(*) AS orphan_count
FROM hr_attendance a 
WHERE NOT EXISTS (SELECT 1 FROM sys_employee e WHERE e.id = a.employee_id);

-- 检查 hr_training_participant -> sys_employee 孤儿数据
SELECT 'hr_training_participant -> sys_employee' AS relation, 
       COUNT(*) AS orphan_count
FROM hr_training_participant tp 
WHERE NOT EXISTS (SELECT 1 FROM sys_employee e WHERE e.id = tp.employee_id);

-- 检查 hr_training_participant -> hr_training 孤儿数据
SELECT 'hr_training_participant -> hr_training' AS relation, 
       COUNT(*) AS orphan_count
FROM hr_training_participant tp 
WHERE NOT EXISTS (SELECT 1 FROM hr_training t WHERE t.id = tp.training_id);

-- 检查 crm_customer_contact -> crm_customer 孤儿数据
SELECT 'crm_customer_contact -> crm_customer' AS relation, 
       COUNT(*) AS orphan_count
FROM crm_customer_contact cc 
WHERE NOT EXISTS (SELECT 1 FROM crm_customer c WHERE c.id = cc.customer_id);

-- 检查 crm_customer_analysis -> crm_customer 孤儿数据
SELECT 'crm_customer_analysis -> crm_customer' AS relation, 
       COUNT(*) AS orphan_count
FROM crm_customer_analysis ca 
WHERE NOT EXISTS (SELECT 1 FROM crm_customer c WHERE c.id = ca.customer_id);

-- 检查 crm_follow_record -> crm_customer 孤儿数据
SELECT 'crm_follow_record -> crm_customer' AS relation, 
       COUNT(*) AS orphan_count
FROM crm_follow_record fr 
WHERE NOT EXISTS (SELECT 1 FROM crm_customer c WHERE c.id = fr.customer_id);

-- 检查 inv_inventory -> inv_material 孤儿数据
SELECT 'inv_inventory -> inv_material' AS relation, 
       COUNT(*) AS orphan_count
FROM inv_inventory i 
WHERE i.material_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM inv_material m WHERE m.id = i.material_id);

-- 检查 inv_inventory -> inv_warehouse 孤儿数据
SELECT 'inv_inventory -> inv_warehouse' AS relation, 
       COUNT(*) AS orphan_count
FROM inv_inventory i 
WHERE i.warehouse_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM inv_warehouse w WHERE w.id = i.warehouse_id);

-- 检查 inv_inbound_item -> inv_inbound_order 孤儿数据
SELECT 'inv_inbound_item -> inv_inbound_order' AS relation, 
       COUNT(*) AS orphan_count
FROM inv_inbound_item ii 
WHERE NOT EXISTS (SELECT 1 FROM inv_inbound_order io WHERE io.id = ii.order_id);

-- 检查 inv_outbound_item -> inv_outbound_order 孤儿数据
SELECT 'inv_outbound_item -> inv_outbound_order' AS relation, 
       COUNT(*) AS orphan_count
FROM inv_outbound_item oi 
WHERE NOT EXISTS (SELECT 1 FROM inv_outbound_order oo WHERE oo.id = oi.order_id);

-- 检查 outsource_issue -> outsource_order 孤儿数据
SELECT 'outsource_issue -> outsource_order' AS relation, 
       COUNT(*) AS orphan_count
FROM outsource_issue oi 
WHERE NOT EXISTS (SELECT 1 FROM outsource_order oo WHERE oo.id = oi.outsource_order_id);

-- 检查 outsource_receive -> outsource_order 孤儿数据
SELECT 'outsource_receive -> outsource_order' AS relation, 
       COUNT(*) AS orphan_count
FROM outsource_receive orr 
WHERE NOT EXISTS (SELECT 1 FROM outsource_order oo WHERE oo.id = orr.outsource_order_id);

-- 检查 outsource_settlement -> outsource_order 孤儿数据
SELECT 'outsource_settlement -> outsource_order' AS relation, 
       COUNT(*) AS orphan_count
FROM outsource_settlement os 
WHERE NOT EXISTS (SELECT 1 FROM outsource_order oo WHERE oo.id = os.outsource_order_id);

-- 检查 ink_mixed_record -> base_ink 孤儿数据
SELECT 'ink_mixed_record -> base_ink' AS relation, 
       COUNT(*) AS orphan_count
FROM ink_mixed_record imr 
WHERE imr.base_ink_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM base_ink bi WHERE bi.id = imr.base_ink_id);

-- 检查 ink_mixed_record -> sys_company 孤儿数据
SELECT 'ink_mixed_record -> sys_company' AS relation, 
       COUNT(*) AS orphan_count
FROM ink_mixed_record imr 
WHERE imr.company_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sys_company sc WHERE sc.id = imr.company_id);

-- 检查 pur_purchase_order_line -> pur_purchase_order 孤儿数据
SELECT 'pur_purchase_order_line -> pur_purchase_order' AS relation, 
       COUNT(*) AS orphan_count
FROM pur_purchase_order_line pol 
WHERE NOT EXISTS (SELECT 1 FROM pur_purchase_order po WHERE po.id = pol.po_id);

-- 检查 bom_line -> bom_header 孤儿数据
SELECT 'bom_line -> bom_header' AS relation, 
       COUNT(*) AS orphan_count
FROM bom_line bl 
WHERE bl.header_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM bom_header bh WHERE bh.id = bl.header_id);

-- ============================================================
-- 汇总报告
-- ============================================================
SELECT '========== 数据完整性检查完成 ==========' AS report;
