-- ============================================================
-- Migration 027: 主键类型对齐 - 采购模块
--
-- 背景：根据《项目整体分析报告》P2 #6（主键类型不一致）
--   采购模块 2 张表主键为 INT UNSIGNED，需统一为 BIGINT UNSIGNED
--   以匹配 ERP 全局主键类型标准（id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT）
--
-- 涉及表：
--   pur_purchase_order.id         INT UNSIGNED → BIGINT UNSIGNED
--   pur_purchase_order_line.id    INT UNSIGNED → BIGINT UNSIGNED
--   pur_purchase_order_line.po_id INT UNSIGNED → BIGINT UNSIGNED（关联列同步）
--
-- 操作顺序（避免 FK 冲突）：
--   1. 删除 fk_pur_line_po
--   2. 修改 pur_purchase_order.id 类型
--   3. 修改 pur_purchase_order_line.id 类型
--   4. 修改 pur_purchase_order_line.po_id 类型
--   5. 重建 fk_pur_line_po
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- 1. 删除 fk_pur_line_po（如果存在）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND CONSTRAINT_NAME = 'fk_pur_line_po');
SET @sql = IF(@fk > 0,
  'ALTER TABLE pur_purchase_order_line DROP FOREIGN KEY fk_pur_line_po',
  'SELECT ''fk_pur_line_po not exists (already dropped)'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 修改 pur_purchase_order.id 为 BIGINT UNSIGNED
--    守卫：仅当当前类型不是 BIGINT UNSIGNED 时执行
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID''',
  'SELECT ''pur_purchase_order.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 修改 pur_purchase_order_line.id 为 BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order_line MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID''',
  'SELECT ''pur_purchase_order_line.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. 修改 pur_purchase_order_line.po_id 为 BIGINT UNSIGNED（关联列必须与主键类型一致）
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

-- 6. 验证：检查主键类型已对齐
SELECT
  TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'pur_purchase_order_line' AND COLUMN_NAME IN ('id', 'po_id')))
ORDER BY TABLE_NAME, ORDINAL_POSITION;
