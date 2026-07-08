-- ============================================================
-- Migration 030: 批量 FK - P1 RBAC + 主从表（16 个）
--
-- 背景：根据《项目整体分析报告》P0 #2（外键约束缺失）
--   补全 P1 级别 FK：RBAC 多对多关联 + 业务主从表 + 主数据从属关系
--
-- 涉及 FK（共 16 个）：
--   A. RBAC 关联（5 个）：sys_user_role, sys_role_menu, sys_dict_data
--   B. 业务主从表（8 个）：sal_delivery_detail, sal_return_detail, prd_bom_detail,
--      prd_schedule_detail, material_requisition_items, material_return_items,
--      inv_transfer_item, inv_stocktaking_item
--   C. 主数据从属（3 个）：crm_customer_contact, inv_material.category_id, inv_warehouse.manager_id
--
-- 自引用 FK（sys_department.parent_id, sys_menu.parent_id）留待 Migration 034 处理
--   原因：DEFAULT 0 占位值需先数据清洗（改为 NULL），避免加 FK 时校验失败
--
-- 前置条件：Migration 026 已补齐审计字段；Migration 029 已补 P0 核心 FK
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== A. RBAC 关联表（5 个）=====

-- A1. sys_user_role.user_id → sys_user.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user_role' AND CONSTRAINT_NAME = 'fk_user_role_user');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_user_role ADD CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES sys_user (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_user_role_user already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A2. sys_user_role.role_id → sys_role.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_user_role' AND CONSTRAINT_NAME = 'fk_user_role_role');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_user_role ADD CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES sys_role (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_user_role_role already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A3. sys_role_menu.role_id → sys_role.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_role_menu' AND CONSTRAINT_NAME = 'fk_role_menu_role');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_role_menu ADD CONSTRAINT fk_role_menu_role FOREIGN KEY (role_id) REFERENCES sys_role (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_role_menu_role already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A4. sys_role_menu.menu_id → sys_menu.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_role_menu' AND CONSTRAINT_NAME = 'fk_role_menu_menu');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_role_menu ADD CONSTRAINT fk_role_menu_menu FOREIGN KEY (menu_id) REFERENCES sys_menu (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_role_menu_menu already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A5. sys_dict_data.dict_type_id → sys_dict_type.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_dict_data' AND CONSTRAINT_NAME = 'fk_dict_data_type');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_dict_data ADD CONSTRAINT fk_dict_data_type FOREIGN KEY (dict_type_id) REFERENCES sys_dict_type (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_dict_data_type already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== B. 业务主从表（8 个）=====

-- B1. sal_delivery_detail.delivery_id → sal_delivery.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND CONSTRAINT_NAME = 'fk_delivery_detail_delivery');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sal_delivery_detail ADD CONSTRAINT fk_delivery_detail_delivery FOREIGN KEY (delivery_id) REFERENCES sal_delivery (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_delivery_detail_delivery already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B2. sal_return_detail.return_id → sal_return.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_detail' AND CONSTRAINT_NAME = 'fk_return_detail_return');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sal_return_detail ADD CONSTRAINT fk_return_detail_return FOREIGN KEY (return_id) REFERENCES sal_return (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_return_detail_return already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B3. prd_bom_detail.bom_id → prd_bom.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_bom_detail' AND CONSTRAINT_NAME = 'fk_bom_detail_bom');
SET @sql = IF(@fk = 0,
  'ALTER TABLE prd_bom_detail ADD CONSTRAINT fk_bom_detail_bom FOREIGN KEY (bom_id) REFERENCES prd_bom (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_bom_detail_bom already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B4. prd_schedule_detail.schedule_id → prd_schedule.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule_detail' AND CONSTRAINT_NAME = 'fk_schedule_detail_schedule');
SET @sql = IF(@fk = 0,
  'ALTER TABLE prd_schedule_detail ADD CONSTRAINT fk_schedule_detail_schedule FOREIGN KEY (schedule_id) REFERENCES prd_schedule (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_schedule_detail_schedule already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B5. material_requisition_items.requisition_id → material_requisitions.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisition_items' AND CONSTRAINT_NAME = 'fk_req_items_requisition');
SET @sql = IF(@fk = 0,
  'ALTER TABLE material_requisition_items ADD CONSTRAINT fk_req_items_requisition FOREIGN KEY (requisition_id) REFERENCES material_requisitions (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_req_items_requisition already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B6. material_return_items.return_id → material_returns.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_return_items' AND CONSTRAINT_NAME = 'fk_ret_items_return');
SET @sql = IF(@fk = 0,
  'ALTER TABLE material_return_items ADD CONSTRAINT fk_ret_items_return FOREIGN KEY (return_id) REFERENCES material_returns (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_ret_items_return already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B7. inv_transfer_item.transfer_id → inv_transfer_order.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_transfer_item' AND CONSTRAINT_NAME = 'fk_transfer_item_order');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_transfer_item ADD CONSTRAINT fk_transfer_item_order FOREIGN KEY (transfer_id) REFERENCES inv_transfer_order (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_transfer_item_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B8. inv_stocktaking_item.taking_id → inv_stocktaking.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_stocktaking_item' AND CONSTRAINT_NAME = 'fk_stocktaking_item_taking');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_stocktaking_item ADD CONSTRAINT fk_stocktaking_item_taking FOREIGN KEY (taking_id) REFERENCES inv_stocktaking (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_stocktaking_item_taking already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== C. 主数据从属（3 个）=====

-- C1. crm_customer_contact.customer_id → crm_customer.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_customer_contact' AND CONSTRAINT_NAME = 'fk_customer_contact_customer');
SET @sql = IF(@fk = 0,
  'ALTER TABLE crm_customer_contact ADD CONSTRAINT fk_customer_contact_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_customer_contact_customer already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C2. inv_material.category_id → inv_material_category.id（可空，SET NULL）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material' AND CONSTRAINT_NAME = 'fk_material_category');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_material ADD CONSTRAINT fk_material_category FOREIGN KEY (category_id) REFERENCES inv_material_category (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_material_category already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C3. inv_warehouse.manager_id → sys_user.id（需先建索引）
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_warehouse' AND INDEX_NAME = 'idx_manager');
SET @sql = IF(@idx = 0,
  'ALTER TABLE inv_warehouse ADD INDEX idx_manager (manager_id)',
  'SELECT ''idx_manager already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_warehouse' AND CONSTRAINT_NAME = 'fk_warehouse_manager');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_warehouse ADD CONSTRAINT fk_warehouse_manager FOREIGN KEY (manager_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_warehouse_manager already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== D. 验证：检查 P1 FK 已添加 =====
SELECT
  TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
  AND CONSTRAINT_NAME IN (
    'fk_user_role_user', 'fk_user_role_role', 'fk_role_menu_role', 'fk_role_menu_menu', 'fk_dict_data_type',
    'fk_delivery_detail_delivery', 'fk_return_detail_return', 'fk_bom_detail_bom',
    'fk_schedule_detail_schedule', 'fk_req_items_requisition', 'fk_ret_items_return',
    'fk_transfer_item_order', 'fk_stocktaking_item_taking',
    'fk_customer_contact_customer', 'fk_material_category', 'fk_warehouse_manager'
  )
ORDER BY TABLE_NAME;
