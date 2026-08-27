-- ============================================================
-- Migration 034: 自引用 FK + 代码适配 + 全量验证
--
-- 背景：根据《项目整体分析报告》P0 #2（外键约束缺失）
--   补全 3 个自引用 FK（sys_department, sys_menu, inv_material_category）
--   完成代码适配检查和全量验证
--
-- 前置条件：Migration 026-033 已完成
--
-- 操作步骤：
--   A. 自引用 FK 数据清洗（parent_id = 0 改为 NULL）
--   B. 自引用 FK 列定义修改（DEFAULT 0 → DEFAULT NULL）
--   C. 添加 3 个自引用 FK（ON DELETE RESTRICT 防止误删父级）
--   D. 代码适配验证（tsc + vitest）
--
-- 审计字段 FK（27 个 create_by/update_by → sys_user.id）说明：
--   这些 FK 优先级较低，需先补 18 个索引，工作量大且风险低
--   建议在后续 Sprint 中单独处理（Migration 035）
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== A. 数据清洗：parent_id = 0 改为 NULL =====

-- A1. sys_department.parent_id
UPDATE sys_department SET parent_id = NULL WHERE parent_id = 0;

-- A2. sys_menu.parent_id
UPDATE sys_menu SET parent_id = NULL WHERE parent_id = 0;

-- A3. inv_material_category.parent_id
UPDATE inv_material_category SET parent_id = NULL WHERE parent_id = 0;

-- ===== B. 列定义修改：DEFAULT 0 → DEFAULT NULL =====

-- B1. sys_department.parent_id
SET @curr = (SELECT COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_department' AND COLUMN_NAME = 'parent_id');
SET @sql = IF(@curr = '0',
  'ALTER TABLE sys_department MODIFY COLUMN parent_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''父部门ID, NULL为顶级部门''',
  'SELECT ''sys_department.parent_id default already null'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B2. sys_menu.parent_id
SET @curr = (SELECT COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_menu' AND COLUMN_NAME = 'parent_id');
SET @sql = IF(@curr = '0',
  'ALTER TABLE sys_menu MODIFY COLUMN parent_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''父菜单ID, NULL为顶级菜单''',
  'SELECT ''sys_menu.parent_id default already null'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B3. inv_material_category.parent_id
SET @curr = (SELECT COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material_category' AND COLUMN_NAME = 'parent_id');
SET @sql = IF(@curr = '0',
  'ALTER TABLE inv_material_category MODIFY COLUMN parent_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''父分类ID, NULL为顶级分类''',
  'SELECT ''inv_material_category.parent_id default already null'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== C. 添加自引用 FK（3 个，ON DELETE RESTRICT）=====

-- C1. sys_department.parent_id → sys_department.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_department' AND CONSTRAINT_NAME = 'fk_sys_department_parent');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_department ADD CONSTRAINT fk_sys_department_parent FOREIGN KEY (parent_id) REFERENCES sys_department (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_sys_department_parent already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C2. sys_menu.parent_id → sys_menu.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_menu' AND CONSTRAINT_NAME = 'fk_sys_menu_parent');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sys_menu ADD CONSTRAINT fk_sys_menu_parent FOREIGN KEY (parent_id) REFERENCES sys_menu (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_sys_menu_parent already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C3. inv_material_category.parent_id → inv_material_category.id
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material_category' AND INDEX_NAME = 'idx_parent');
SET @sql = IF(@idx = 0, 'ALTER TABLE inv_material_category ADD INDEX idx_parent (parent_id)', 'SELECT ''idx_parent exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material_category' AND CONSTRAINT_NAME = 'fk_material_category_parent');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_material_category ADD CONSTRAINT fk_material_category_parent FOREIGN KEY (parent_id) REFERENCES inv_material_category (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_material_category_parent already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== D. 验证：自引用 FK 已添加 =====
SELECT
  TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
  AND CONSTRAINT_NAME IN ('fk_sys_department_parent', 'fk_sys_menu_parent', 'fk_material_category_parent')
ORDER BY TABLE_NAME;

-- ===== E. Sprint 3 完成：统计 FK 总数 =====
SELECT
  'Sprint 3 FK 总数' AS metric,
  COUNT(*) AS value
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND CONSTRAINT_TYPE = 'FOREIGN KEY';

-- ===== 代码适配验证说明 =====
-- 1. TypeScript 代码使用 number 类型接收所有 ID 字段，BIGINT UNSIGNED 在 JS 中仍为 number（安全范围 2^53）
-- 2. Migration 027/028 修改的主键类型（INT → BIGINT UNSIGNED）不影响代码逻辑
-- 3. Migration 029 的类型对齐（inv_inbound_item.order_id/material_id, pur_purchase_order.supplier_id, pur_purchase_order_line.material_id）
--    仅影响 DB 层，代码中这些列已用 number 类型接收
-- 4. 全量验证：tsc --noEmit + vitest run 需在应用此 migration 后执行

-- ===== 后续工作（Migration 035，留待 Sprint 4）=====
-- 1. 审计字段 FK（27 个 create_by/update_by → sys_user.id）
--    - 需先补 18 个索引（sal_order/sal_delivery/sal_return/sal_reconciliation/prd_work_order/prd_bom 等）
--    - 优先级低，建议在 Sprint 4 处理
-- 2. vnerpdacahng_schema.sql 主 schema 文件同步
--    - 反映 Migration 022-034 的所有变更
--    - 建议通过 mysqldump 重新导出 schema 替代手动修改
