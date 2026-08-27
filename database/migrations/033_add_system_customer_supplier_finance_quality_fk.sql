-- ============================================================
-- Migration 033: 批量 FK - 系统+客户+供应商+财务+质量（13 个）
--
-- 背景：根据《项目整体分析报告》P0 #2（外键约束缺失）
--   补全 5 个模块的业务关联 FK
--
-- 前置条件：Migration 021/028/029/030/031/032 已完成
--
-- 涉及模块：
--   系统（2 个）：sys_user.department_id, sys_department.leader_id
--   客户（1 个）：crm_customer.salesman_id
--   供应商（0 个）：无业务 FK 缺失
--   财务（8 个）：fin_voucher, fin_voucher_line, fin_account_balance,
--                 fin_receivable, fin_payable
--   质量（2 个）：qc_inspection.material_id, qc_inspection.inspector_id
--
-- 排除项（留待 Migration 034）：
--   - 自引用 FK：fin_account.parent_id, sys_menu.parent_id, sys_department.parent_id
--   - 审计字段 FK：所有 create_by/update_by → sys_user.id
--   - 多态外键：source_id + source_type
--   - 类型不一致：fin_voucher_line.department_id (INT UNSIGNED vs BIGINT UNSIGNED)
--   - 无父表：fin_voucher_line.project_id
--
-- 特殊说明：
--   - fin_voucher.period_code 和 fin_account_balance.period_code 引用 fin_period.period_code (UNIQUE 键)
--   - MySQL 支持引用 UNIQUE 键而非主键的 FK
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== A. 系统模块（2 个）=====

-- A1. sys_user.department_id → sys_department.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user' AND CONSTRAINT_NAME = 'fk_sys_user_department');
SET @sql = IF(@fk = 0, 'ALTER TABLE sys_user ADD CONSTRAINT fk_sys_user_department FOREIGN KEY (department_id) REFERENCES sys_department (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A2. sys_department.leader_id → sys_user.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_department' AND CONSTRAINT_NAME = 'fk_sys_department_leader');
SET @sql = IF(@fk = 0, 'ALTER TABLE sys_department ADD CONSTRAINT fk_sys_department_leader FOREIGN KEY (leader_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== B. 客户模块（1 个）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_customer' AND CONSTRAINT_NAME = 'fk_crm_customer_salesman');
SET @sql = IF(@fk = 0, 'ALTER TABLE crm_customer ADD CONSTRAINT fk_crm_customer_salesman FOREIGN KEY (salesman_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== C. 财务模块（8 个）=====

-- C1. fin_voucher.period_code → fin_period.period_code（引用 UNIQUE 键）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher' AND CONSTRAINT_NAME = 'fk_fin_voucher_period');
SET @sql = IF(@fk = 0, 'ALTER TABLE fin_voucher ADD CONSTRAINT fk_fin_voucher_period FOREIGN KEY (period_code) REFERENCES fin_period (period_code) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C2. fin_voucher_line.account_id → fin_account.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line' AND CONSTRAINT_NAME = 'fk_fin_voucher_line_account');
SET @sql = IF(@fk = 0, 'ALTER TABLE fin_voucher_line ADD CONSTRAINT fk_fin_voucher_line_account FOREIGN KEY (account_id) REFERENCES fin_account (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C3. fin_voucher_line.customer_id → crm_customer.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line' AND CONSTRAINT_NAME = 'fk_fin_voucher_line_customer');
SET @sql = IF(@fk = 0, 'ALTER TABLE fin_voucher_line ADD CONSTRAINT fk_fin_voucher_line_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C4. fin_voucher_line.supplier_id → pur_supplier.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line' AND CONSTRAINT_NAME = 'fk_fin_voucher_line_supplier');
SET @sql = IF(@fk = 0, 'ALTER TABLE fin_voucher_line ADD CONSTRAINT fk_fin_voucher_line_supplier FOREIGN KEY (supplier_id) REFERENCES pur_supplier (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C5. fin_account_balance.account_id → fin_account.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_account_balance' AND CONSTRAINT_NAME = 'fk_fin_account_balance_account');
SET @sql = IF(@fk = 0, 'ALTER TABLE fin_account_balance ADD CONSTRAINT fk_fin_account_balance_account FOREIGN KEY (account_id) REFERENCES fin_account (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C6. fin_account_balance.period_code → fin_period.period_code（引用 UNIQUE 键）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_account_balance' AND CONSTRAINT_NAME = 'fk_fin_account_balance_period');
SET @sql = IF(@fk = 0, 'ALTER TABLE fin_account_balance ADD CONSTRAINT fk_fin_account_balance_period FOREIGN KEY (period_code) REFERENCES fin_period (period_code) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C7. fin_receivable.customer_id → crm_customer.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_receivable' AND CONSTRAINT_NAME = 'fk_fin_receivable_customer');
SET @sql = IF(@fk = 0, 'ALTER TABLE fin_receivable ADD CONSTRAINT fk_fin_receivable_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C8. fin_payable.supplier_id → pur_supplier.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_payable' AND CONSTRAINT_NAME = 'fk_fin_payable_supplier');
SET @sql = IF(@fk = 0, 'ALTER TABLE fin_payable ADD CONSTRAINT fk_fin_payable_supplier FOREIGN KEY (supplier_id) REFERENCES pur_supplier (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== D. 质量模块（2 个）=====

-- D1. qc_inspection.material_id → inv_material.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_inspection' AND CONSTRAINT_NAME = 'fk_qc_inspection_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE qc_inspection ADD CONSTRAINT fk_qc_inspection_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- D2. qc_inspection.inspector_id → sys_user.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_inspection' AND CONSTRAINT_NAME = 'fk_qc_inspection_inspector');
SET @sql = IF(@fk = 0, 'ALTER TABLE qc_inspection ADD CONSTRAINT fk_qc_inspection_inspector FOREIGN KEY (inspector_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== E. 验证：5 模块 FK 总数 =====
SELECT
  CASE
    WHEN TABLE_NAME LIKE 'sys_%' THEN '系统'
    WHEN TABLE_NAME LIKE 'crm_%' THEN '客户'
    WHEN TABLE_NAME LIKE 'pur_supplier' THEN '供应商'
    WHEN TABLE_NAME LIKE 'fin_%' THEN '财务'
    WHEN TABLE_NAME LIKE 'qc_%' THEN '质量'
  END AS module,
  COUNT(*) AS fk_count
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND (
    TABLE_NAME LIKE 'sys_%' OR TABLE_NAME LIKE 'crm_%'
    OR TABLE_NAME = 'pur_supplier'
    OR TABLE_NAME LIKE 'fin_%' OR TABLE_NAME LIKE 'qc_%'
  )
GROUP BY module
ORDER BY module;
