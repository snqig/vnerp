-- Migration 036: Fix schema mismatches causing 500 errors on
--   /api/organization?type=company  (sys_company missing columns)
--   /api/system/roles               (sys_role missing parent_id, inherit_mode)
--   /api/warehouse/inbound/labels   (inv_inbound_label table missing)
--
-- All tables use utf8mb4_0900_ai_ci per project convention.

-- ============================================================
-- 1. sys_company: add columns expected by organization route
--    Existing columns: company_name, company_code, address, phone
--    Code expects:     full_name, short_name, code, legal_person,
--                      reg_address, contact_phone, tax_no, bank_name,
--                      bank_account, website, fax, postcode, description
--    Strategy: add new columns, copy data from old ones, keep old columns
-- ============================================================

-- Add missing columns (IF NOT EXISTS not supported in MySQL 8 ADD COLUMN)
ALTER TABLE sys_company
  ADD COLUMN full_name VARCHAR(200) NULL AFTER id,
  ADD COLUMN short_name VARCHAR(100) NULL,
  ADD COLUMN code VARCHAR(50) NULL,
  ADD COLUMN legal_person VARCHAR(50) NULL,
  ADD COLUMN reg_address VARCHAR(500) NULL,
  ADD COLUMN contact_phone VARCHAR(50) NULL,
  ADD COLUMN tax_no VARCHAR(50) NULL,
  ADD COLUMN bank_name VARCHAR(100) NULL,
  ADD COLUMN bank_account VARCHAR(100) NULL,
  ADD COLUMN website VARCHAR(200) NULL,
  ADD COLUMN fax VARCHAR(50) NULL,
  ADD COLUMN postcode VARCHAR(20) NULL,
  ADD COLUMN description TEXT NULL;

-- Migrate data from old columns to new ones (only where new is NULL)
UPDATE sys_company SET full_name = company_name WHERE full_name IS NULL AND company_name IS NOT NULL;
UPDATE sys_company SET code = company_code WHERE code IS NULL AND company_code IS NOT NULL;
UPDATE sys_company SET reg_address = address WHERE reg_address IS NULL AND address IS NOT NULL;
UPDATE sys_company SET contact_phone = phone WHERE contact_phone IS NULL AND phone IS NOT NULL;

-- ============================================================
-- 2. sys_role: add parent_id and inherit_mode for role hierarchy
-- ============================================================

ALTER TABLE sys_role
  ADD COLUMN parent_id INT NULL DEFAULT NULL COMMENT '父角色ID（角色继承）',
  ADD COLUMN inherit_mode VARCHAR(20) NOT NULL DEFAULT 'merge' COMMENT '权限继承模式: merge(合并) | override(覆盖)';

-- Add index for parent_id lookups
CREATE INDEX idx_sys_role_parent_id ON sys_role(parent_id);

-- ============================================================
-- 3. inv_inbound_label: create table for warehouse inbound labels
-- ============================================================

CREATE TABLE IF NOT EXISTS inv_inbound_label (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  label_id              VARCHAR(50) NOT NULL COMMENT '标签唯一编号',
  order_id              BIGINT NULL COMMENT '入库单ID',
  order_no              VARCHAR(50) NULL COMMENT '入库单号',
  item_id               BIGINT NULL COMMENT '入库明细ID',
  purchase_order_no     VARCHAR(50) NULL COMMENT '采购单号',
  supplier_name         VARCHAR(200) NULL COMMENT '供应商名称',
  inbound_date          DATE NULL COMMENT '入库日期',
  warehouse_code        VARCHAR(50) NULL COMMENT '仓库编码',
  material_code         VARCHAR(50) NOT NULL COMMENT '物料编码',
  material_name         VARCHAR(200) NOT NULL COMMENT '物料名称',
  specification         VARCHAR(200) NULL COMMENT '规格',
  width                 DECIMAL(18,4) NULL DEFAULT 0 COMMENT '幅宽',
  batch_no              VARCHAR(50) NULL COMMENT '批次号',
  qty                   DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '数量',
  unit                  VARCHAR(20) NOT NULL DEFAULT '件' COMMENT '单位',
  is_raw_material       TINYINT NOT NULL DEFAULT 0 COMMENT '是否原料: 0=否, 1=是',
  package_qty           INT NULL DEFAULT 0 COMMENT '包装数量',
  label_qty             INT NULL DEFAULT 1 COMMENT '标签数量',
  label_status          VARCHAR(20) NOT NULL DEFAULT 'generated' COMMENT '标签状态: generated|used|split|void',
  audit_status          TINYINT NULL DEFAULT 0 COMMENT '审核状态: 0=未审核, 1=已审核',
  operator_id           BIGINT NULL COMMENT '操作员ID',
  operator_name         VARCHAR(50) NULL COMMENT '操作员姓名',
  auditor_id            BIGINT NULL COMMENT '审核员ID',
  auditor_name          VARCHAR(50) NULL COMMENT '审核员姓名',
  audit_time            DATETIME NULL COMMENT '审核时间',
  color_code            VARCHAR(50) NULL COMMENT '色号',
  mixed_material_remark VARCHAR(500) NULL COMMENT '混料备注',
  machine_no            VARCHAR(50) NULL COMMENT '机台号',
  remark                VARCHAR(500) NULL COMMENT '备注',
  deleted               TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0=正常, 1=已删除',
  create_time           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_label_id (label_id),
  KEY idx_order_no (order_no),
  KEY idx_material_code (material_code),
  KEY idx_batch_no (batch_no),
  KEY idx_label_status (label_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库物料标签';
