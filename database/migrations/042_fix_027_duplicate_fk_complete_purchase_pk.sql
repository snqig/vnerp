-- ============================================================
-- Migration 042: 修复 027 残留的重复 FK，完成采购模块 PK 类型对齐
--
-- 背景：
--   Migration 027 已在 sys_migration 记录为 applied，但其 ALTER 语句
--   因 pur_purchase_order_line 上存在遗留的自动生成 FK 约束
--   `pur_purchase_order_line_ibfk_1`（与 027 显式创建的 `fk_pur_line_po`
--   并存，指向同一对 po_id → pur_purchase_order.id）而静默失败。
--   结果：
--     - pur_purchase_order.id        仍是 int unsigned（应为 bigint unsigned）
--     - pur_purchase_order_line.po_id 仍是 int unsigned（应为 bigint unsigned）
--   而 pur_purchase_order_line.id 已成功转为 bigint unsigned。
--
-- 操作顺序（避免 FK 冲突）：
--   1. 删除遗留 FK `pur_purchase_order_line_ibfk_1`（如存在）
--   2. 删除现代 FK `fk_pur_line_po`（如存在，避免重建时名字冲突）
--   3. 修改 pur_purchase_order.id 为 BIGINT UNSIGNED
--   4. 修改 pur_purchase_order_line.po_id 为 BIGINT UNSIGNED
--   5. 重建 fk_pur_line_po
--
-- 幂等模式：所有 ALTER / DROP 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- 1. 删除遗留 FK `pur_purchase_order_line_ibfk_1`
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND CONSTRAINT_NAME = 'pur_purchase_order_line_ibfk_1');
SET @sql = IF(@fk > 0,
  'ALTER TABLE pur_purchase_order_line DROP FOREIGN KEY pur_purchase_order_line_ibfk_1',
  'SELECT ''pur_purchase_order_line_ibfk_1 not exists (already dropped)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 删除现代 FK `fk_pur_line_po`（027 重建过，但需先确保删除以便类型变更）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND CONSTRAINT_NAME = 'fk_pur_line_po');
SET @sql = IF(@fk > 0,
  'ALTER TABLE pur_purchase_order_line DROP FOREIGN KEY fk_pur_line_po',
  'SELECT ''fk_pur_line_po not exists (already dropped)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 修改 pur_purchase_order.id 为 BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID''',
  'SELECT ''pur_purchase_order.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. 修改 pur_purchase_order_line.po_id 为 BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND COLUMN_NAME = 'po_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order_line MODIFY COLUMN po_id BIGINT UNSIGNED NOT NULL COMMENT ''采购单ID''',
  'SELECT ''pur_purchase_order_line.po_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. 重建 fk_pur_line_po（如果不存在）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND CONSTRAINT_NAME = 'fk_pur_line_po');
SET @sql = IF(@fk = 0,
  'ALTER TABLE pur_purchase_order_line ADD CONSTRAINT fk_pur_line_po FOREIGN KEY (po_id) REFERENCES pur_purchase_order (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_pur_line_po already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. 验证：FK 与列类型已对齐
SELECT
  TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'pur_purchase_order_line' AND COLUMN_NAME IN ('id', 'po_id')))
ORDER BY TABLE_NAME, ORDINAL_POSITION;
