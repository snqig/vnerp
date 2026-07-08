-- ============================================================
-- Migration 044: 主键类型对齐 - sys_user.id 级联迁移
--
-- 背景：sys_user.id 为 INT，被全库 20 个 FK 约束引用 + 多个无 FK 审计列逻辑引用。
--   必须迁移为 BIGINT UNSIGNED 以匹配全局标准，并级联修改所有引用列。
--
-- 涉及列：
--   A. sys_user.id                        INT          → BIGINT UNSIGNED（主键）
--   B. 20 个 FK 引用列                    INT/INT UNSIGNED → BIGINT UNSIGNED
--   C. 6 个无 FK 审计列                   INT UNSIGNED → BIGINT UNSIGNED
--
-- FK 引用列清单（20 个）：
--   1.  crm_customer.salesman_id           fk_crm_customer_salesman          SET NULL / CASCADE
--   2.  inv_outbound_order.operator_id     fk_inv_outbound_operator          SET NULL / CASCADE
--   3.  inv_outbound_order.auditor_id      fk_inv_outbound_auditor           SET NULL / CASCADE
--   4.  inv_stock_adjust.approver_id       fk_inv_adjust_approver            SET NULL / CASCADE
--   5.  inv_stock_adjust.operator_id       fk_inv_adjust_operator            SET NULL / CASCADE
--   6.  inv_transfer_order.applicant_id    fk_inv_transfer_applicant         SET NULL / CASCADE
--   7.  inv_transfer_order.approver_id     fk_inv_transfer_approver          SET NULL / CASCADE
--   8.  inv_transfer_order.operator_id     fk_inv_transfer_operator          SET NULL / CASCADE
--   9.  inv_warehouse.manager_id           fk_warehouse_manager              SET NULL / CASCADE
--   10. inv_inventory_log.operator_id      fk_inv_invlog_operator            SET NULL / CASCADE
--   11. inv_stocktaking.applicant_id       fk_inv_stocktaking_applicant      SET NULL / CASCADE
--   12. inv_stocktaking.approver_id        fk_inv_stocktaking_approver       SET NULL / CASCADE
--   13. inv_sales_outbound.operator_id     fk_inv_sales_outbound_operator    SET NULL / CASCADE
--   14. inv_production_inbound.operator_id fk_inv_prod_inbound_operator      SET NULL / CASCADE
--   15. sys_department.leader_id           fk_sys_department_leader          SET NULL / CASCADE
--   16. qc_unqualified.create_by           fk_qc_unqualified_create_by       SET NULL / CASCADE
--   17. qc_unqualified.update_by           fk_qc_unqualified_update_by       SET NULL / CASCADE
--   18. qc_inspection.inspector_id         fk_qc_inspection_inspector        SET NULL / CASCADE
--   19. sal_order.salesman_id              fk_sal_order_salesman             SET NULL / CASCADE
--   20. sys_user_role.user_id              fk_user_role_user                 CASCADE / CASCADE
--
-- 无 FK 审计列清单（6 个）：
--   21. inv_inbound_order.create_by
--   22. inv_inbound_order.update_by
--   23. pur_request.requester_id
--   24. pur_request.approver_id
--   25. pur_request_item.create_by
--   26. pur_request_item.update_by
--
-- 操作顺序：删 FK → 改 sys_user.id → 改引用列 → 重建 FK
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== 1. 删除所有引用 sys_user.id 的 FK 约束 =====

-- 1.1 通用删除宏：存在则删，不存在则跳过
-- fk_crm_customer_salesman
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_crm_customer_salesman');
SET @sql = IF(@fk > 0, 'ALTER TABLE crm_customer DROP FOREIGN KEY fk_crm_customer_salesman', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_outbound_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_outbound_operator');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_outbound_order DROP FOREIGN KEY fk_inv_outbound_operator', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_outbound_auditor
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_outbound_auditor');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_outbound_order DROP FOREIGN KEY fk_inv_outbound_auditor', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_adjust_approver
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_adjust_approver');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_stock_adjust DROP FOREIGN KEY fk_inv_adjust_approver', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_adjust_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_adjust_operator');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_stock_adjust DROP FOREIGN KEY fk_inv_adjust_operator', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_transfer_applicant
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_transfer_applicant');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_transfer_order DROP FOREIGN KEY fk_inv_transfer_applicant', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_transfer_approver
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_transfer_approver');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_transfer_order DROP FOREIGN KEY fk_inv_transfer_approver', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_transfer_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_transfer_operator');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_transfer_order DROP FOREIGN KEY fk_inv_transfer_operator', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_warehouse_manager
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_warehouse_manager');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_warehouse DROP FOREIGN KEY fk_warehouse_manager', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_invlog_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_invlog_operator');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_inventory_log DROP FOREIGN KEY fk_inv_invlog_operator', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_stocktaking_applicant
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_stocktaking_applicant');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_stocktaking DROP FOREIGN KEY fk_inv_stocktaking_applicant', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_stocktaking_approver
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_stocktaking_approver');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_stocktaking DROP FOREIGN KEY fk_inv_stocktaking_approver', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_sales_outbound_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_sales_outbound_operator');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_sales_outbound DROP FOREIGN KEY fk_inv_sales_outbound_operator', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_inv_prod_inbound_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_prod_inbound_operator');
SET @sql = IF(@fk > 0, 'ALTER TABLE inv_production_inbound DROP FOREIGN KEY fk_inv_prod_inbound_operator', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_sys_department_leader
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_sys_department_leader');
SET @sql = IF(@fk > 0, 'ALTER TABLE sys_department DROP FOREIGN KEY fk_sys_department_leader', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_qc_unqualified_create_by
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_qc_unqualified_create_by');
SET @sql = IF(@fk > 0, 'ALTER TABLE qc_unqualified DROP FOREIGN KEY fk_qc_unqualified_create_by', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_qc_unqualified_update_by
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_qc_unqualified_update_by');
SET @sql = IF(@fk > 0, 'ALTER TABLE qc_unqualified DROP FOREIGN KEY fk_qc_unqualified_update_by', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_qc_inspection_inspector
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_qc_inspection_inspector');
SET @sql = IF(@fk > 0, 'ALTER TABLE qc_inspection DROP FOREIGN KEY fk_qc_inspection_inspector', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_sal_order_salesman
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_sal_order_salesman');
SET @sql = IF(@fk > 0, 'ALTER TABLE sal_order DROP FOREIGN KEY fk_sal_order_salesman', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fk_user_role_user
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_user_role_user');
SET @sql = IF(@fk > 0, 'ALTER TABLE sys_user_role DROP FOREIGN KEY fk_user_role_user', 'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 2. 修改 sys_user.id 为 BIGINT UNSIGNED =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE sys_user MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''用户ID''',
  'SELECT ''sys_user.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 3. 修改 20 个 FK 引用列为 BIGINT UNSIGNED =====

-- 3.1 crm_customer.salesman_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_customer' AND COLUMN_NAME = 'salesman_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE crm_customer MODIFY COLUMN salesman_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''销售员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.2 inv_outbound_order.operator_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_outbound_order MODIFY COLUMN operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''操作员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.3 inv_outbound_order.auditor_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND COLUMN_NAME = 'auditor_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_outbound_order MODIFY COLUMN auditor_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''审核员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.4 inv_stock_adjust.approver_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust' AND COLUMN_NAME = 'approver_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_stock_adjust MODIFY COLUMN approver_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''审批人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.5 inv_stock_adjust.operator_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stock_adjust' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_stock_adjust MODIFY COLUMN operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''操作员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.6 inv_transfer_order.applicant_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND COLUMN_NAME = 'applicant_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_transfer_order MODIFY COLUMN applicant_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''申请人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.7 inv_transfer_order.approver_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND COLUMN_NAME = 'approver_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_transfer_order MODIFY COLUMN approver_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''审批人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.8 inv_transfer_order.operator_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_order' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_transfer_order MODIFY COLUMN operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''操作员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.9 inv_warehouse.manager_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_warehouse' AND COLUMN_NAME = 'manager_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_warehouse MODIFY COLUMN manager_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''仓库管理员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.10 inv_inventory_log.operator_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_log' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inventory_log MODIFY COLUMN operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''操作员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.11 inv_stocktaking.applicant_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking' AND COLUMN_NAME = 'applicant_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_stocktaking MODIFY COLUMN applicant_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''申请人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.12 inv_stocktaking.approver_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking' AND COLUMN_NAME = 'approver_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_stocktaking MODIFY COLUMN approver_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''审批人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.13 inv_sales_outbound.operator_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_sales_outbound' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_sales_outbound MODIFY COLUMN operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''操作员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.14 inv_production_inbound.operator_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_production_inbound' AND COLUMN_NAME = 'operator_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_production_inbound MODIFY COLUMN operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''操作员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.15 sys_department.leader_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_department' AND COLUMN_NAME = 'leader_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE sys_department MODIFY COLUMN leader_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''部门负责人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.16 qc_unqualified.create_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'create_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE qc_unqualified MODIFY COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.17 qc_unqualified.update_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'update_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE qc_unqualified MODIFY COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.18 qc_inspection.inspector_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_inspection' AND COLUMN_NAME = 'inspector_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE qc_inspection MODIFY COLUMN inspector_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''检验员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.19 sal_order.salesman_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_order' AND COLUMN_NAME = 'salesman_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE sal_order MODIFY COLUMN salesman_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''销售员ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.20 sys_user_role.user_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user_role' AND COLUMN_NAME = 'user_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE sys_user_role MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL COMMENT ''用户ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 4. 修改无 FK 审计列（6 个）=====

-- 4.1 inv_inbound_order.create_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'create_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_order MODIFY COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.2 inv_inbound_order.update_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'update_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_order MODIFY COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.3 pur_request.requester_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request' AND COLUMN_NAME = 'requester_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_request MODIFY COLUMN requester_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''申请人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.4 pur_request.approver_id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request' AND COLUMN_NAME = 'approver_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_request MODIFY COLUMN approver_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''审批人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.5 pur_request_item.create_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request_item' AND COLUMN_NAME = 'create_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_request_item MODIFY COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.6 pur_request_item.update_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request_item' AND COLUMN_NAME = 'update_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_request_item MODIFY COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 5. 重建所有 FK 约束 =====

-- 5.1 fk_crm_customer_salesman
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_crm_customer_salesman');
SET @sql = IF(@fk = 0,
  'ALTER TABLE crm_customer ADD CONSTRAINT fk_crm_customer_salesman FOREIGN KEY (salesman_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.2 fk_inv_outbound_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_outbound_operator');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.3 fk_inv_outbound_auditor
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_outbound_auditor');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_auditor FOREIGN KEY (auditor_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.4 fk_inv_adjust_approver
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_adjust_approver');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_stock_adjust ADD CONSTRAINT fk_inv_adjust_approver FOREIGN KEY (approver_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.5 fk_inv_adjust_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_adjust_operator');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_stock_adjust ADD CONSTRAINT fk_inv_adjust_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.6 fk_inv_transfer_applicant
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_transfer_applicant');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_transfer_order ADD CONSTRAINT fk_inv_transfer_applicant FOREIGN KEY (applicant_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.7 fk_inv_transfer_approver
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_transfer_approver');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_transfer_order ADD CONSTRAINT fk_inv_transfer_approver FOREIGN KEY (approver_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.8 fk_inv_transfer_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_transfer_operator');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_transfer_order ADD CONSTRAINT fk_inv_transfer_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.9 fk_warehouse_manager
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_warehouse_manager');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_warehouse ADD CONSTRAINT fk_warehouse_manager FOREIGN KEY (manager_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.10 fk_inv_invlog_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_invlog_operator');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_inventory_log ADD CONSTRAINT fk_inv_invlog_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.11 fk_inv_stocktaking_applicant
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_stocktaking_applicant');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_stocktaking ADD CONSTRAINT fk_inv_stocktaking_applicant FOREIGN KEY (applicant_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.12 fk_inv_stocktaking_approver
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_stocktaking_approver');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_stocktaking ADD CONSTRAINT fk_inv_stocktaking_approver FOREIGN KEY (approver_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.13 fk_inv_sales_outbound_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_sales_outbound_operator');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_sales_outbound ADD CONSTRAINT fk_inv_sales_outbound_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.14 fk_inv_prod_inbound_operator
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_inv_prod_inbound_operator');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_production_inbound ADD CONSTRAINT fk_inv_prod_inbound_operator FOREIGN KEY (operator_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.15 fk_sys_department_leader
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_sys_department_leader');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_department ADD CONSTRAINT fk_sys_department_leader FOREIGN KEY (leader_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.16 fk_qc_unqualified_create_by
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_qc_unqualified_create_by');
SET @sql = IF(@fk = 0,
  'ALTER TABLE qc_unqualified ADD CONSTRAINT fk_qc_unqualified_create_by FOREIGN KEY (create_by) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.17 fk_qc_unqualified_update_by
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_qc_unqualified_update_by');
SET @sql = IF(@fk = 0,
  'ALTER TABLE qc_unqualified ADD CONSTRAINT fk_qc_unqualified_update_by FOREIGN KEY (update_by) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.18 fk_qc_inspection_inspector
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_qc_inspection_inspector');
SET @sql = IF(@fk = 0,
  'ALTER TABLE qc_inspection ADD CONSTRAINT fk_qc_inspection_inspector FOREIGN KEY (inspector_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.19 fk_sal_order_salesman
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_sal_order_salesman');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sal_order ADD CONSTRAINT fk_sal_order_salesman FOREIGN KEY (salesman_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.20 fk_user_role_user
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_user_role_user');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_user_role ADD CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 6. 验证：检查 sys_user.id 及所有引用列类型已对齐 =====
SELECT
  TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'crm_customer' AND COLUMN_NAME = 'salesman_id')
    OR (TABLE_NAME = 'inv_outbound_order' AND COLUMN_NAME IN ('operator_id', 'auditor_id'))
    OR (TABLE_NAME = 'inv_stock_adjust' AND COLUMN_NAME IN ('approver_id', 'operator_id'))
    OR (TABLE_NAME = 'inv_transfer_order' AND COLUMN_NAME IN ('applicant_id', 'approver_id', 'operator_id'))
    OR (TABLE_NAME = 'inv_warehouse' AND COLUMN_NAME = 'manager_id')
    OR (TABLE_NAME = 'inv_inventory_log' AND COLUMN_NAME = 'operator_id')
    OR (TABLE_NAME = 'inv_stocktaking' AND COLUMN_NAME IN ('applicant_id', 'approver_id'))
    OR (TABLE_NAME = 'inv_sales_outbound' AND COLUMN_NAME = 'operator_id')
    OR (TABLE_NAME = 'inv_production_inbound' AND COLUMN_NAME = 'operator_id')
    OR (TABLE_NAME = 'sys_department' AND COLUMN_NAME = 'leader_id')
    OR (TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME IN ('create_by', 'update_by'))
    OR (TABLE_NAME = 'qc_inspection' AND COLUMN_NAME = 'inspector_id')
    OR (TABLE_NAME = 'sal_order' AND COLUMN_NAME = 'salesman_id')
    OR (TABLE_NAME = 'sys_user_role' AND COLUMN_NAME = 'user_id')
    OR (TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME IN ('create_by', 'update_by'))
    OR (TABLE_NAME = 'pur_request' AND COLUMN_NAME IN ('requester_id', 'approver_id'))
    OR (TABLE_NAME = 'pur_request_item' AND COLUMN_NAME IN ('create_by', 'update_by'))
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;
