-- ============================================================
-- Migration 043: 主键类型对齐 - P0 缺口（Drizzle ORM 消费表 FK 不一致）
--
-- 背景：根据《PK 类型统一分析报告》P0 缺口
--   inv_inbound_order.id 与 inv_inbound_item.id/order_id/material_id 类型不一致
--   pur_purchase_order 审计列（create_by/update_by/audit_by/close_by）引用 sys_user.id(BIGINT) 但本身为 INT
--   pur_purchase_return.id / pur_purchase_reconciliation.id 缺 UNSIGNED
--
-- 涉及列（10 列）：
--   A. inv_inbound_order.id              INT UNSIGNED → BIGINT UNSIGNED（主键，Drizzle 已声明 serial）
--   B. inv_inbound_item.id               INT UNSIGNED → BIGINT UNSIGNED（主键）
--   C. inv_inbound_item.order_id         INT UNSIGNED → BIGINT UNSIGNED（FK → inv_inbound_order.id）
--   D. inv_inbound_item.material_id      INT UNSIGNED → BIGINT UNSIGNED（逻辑引用物料表）
--   E. pur_purchase_order.create_by      INT UNSIGNED → BIGINT UNSIGNED（FK → sys_user.id）
--   F. pur_purchase_order.update_by      INT UNSIGNED → BIGINT UNSIGNED
--   G. pur_purchase_order.audit_by       INT UNSIGNED → BIGINT UNSIGNED
--   H. pur_purchase_order.close_by       INT UNSIGNED → BIGINT UNSIGNED
--   I. pur_purchase_return.id            BIGINT       → BIGINT UNSIGNED（补 UNSIGNED）
--   J. pur_purchase_reconciliation.id    BIGINT       → BIGINT UNSIGNED（补 UNSIGNED）
--
-- 操作顺序（避免 FK 冲突）：
--   1. 删除 fk_inv_inbound_item_order（如果存在）
--   2. 修改 inv_inbound_order.id
--   3. 修改 inv_inbound_item.id / order_id / material_id
--   4. 重建 fk_inv_inbound_item_order
--   5. 修改 pur_purchase_order 审计列（无 FK，直接 MODIFY）
--   6. 修改 pur_purchase_return.id / pur_purchase_reconciliation.id（补 UNSIGNED）
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== 1. 删除 inv_inbound_item 上的 FK =====

-- 1a. 删除 fk_inv_inbound_item_order（如果存在）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND CONSTRAINT_NAME = 'fk_inv_inbound_item_order');
SET @sql = IF(@fk > 0,
  'ALTER TABLE inv_inbound_item DROP FOREIGN KEY fk_inv_inbound_item_order',
  'SELECT ''fk_inv_inbound_item_order not exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. 删除旧名 fk_inbound_item_order（如果存在，migration 009 遗留）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND CONSTRAINT_NAME = 'fk_inbound_item_order');
SET @sql = IF(@fk > 0,
  'ALTER TABLE inv_inbound_item DROP FOREIGN KEY fk_inbound_item_order',
  'SELECT ''fk_inbound_item_order not exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 2. 修改 inv_inbound_order.id 为 BIGINT UNSIGNED =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_order MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID''',
  'SELECT ''inv_inbound_order.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 3. 修改 inv_inbound_item 列 =====

-- 3a. inv_inbound_item.id → BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_item MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID''',
  'SELECT ''inv_inbound_item.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3b. inv_inbound_item.order_id → BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND COLUMN_NAME = 'order_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_item MODIFY COLUMN order_id BIGINT UNSIGNED NOT NULL COMMENT ''入库单ID''',
  'SELECT ''inv_inbound_item.order_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3c. inv_inbound_item.material_id → BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND COLUMN_NAME = 'material_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_item MODIFY COLUMN material_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''物料ID''',
  'SELECT ''inv_inbound_item.material_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 4. 重建 fk_inv_inbound_item_order =====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND CONSTRAINT_NAME = 'fk_inv_inbound_item_order');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_inbound_item ADD CONSTRAINT fk_inv_inbound_item_order FOREIGN KEY (order_id) REFERENCES inv_inbound_order (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_inv_inbound_item_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 5. 修改 pur_purchase_order 审计列（无 FK，直接 MODIFY）=====

-- 5a. create_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'create_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order MODIFY COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID''',
  'SELECT ''pur_purchase_order.create_by already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5b. update_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'update_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order MODIFY COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''',
  'SELECT ''pur_purchase_order.update_by already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5c. audit_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'audit_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order MODIFY COLUMN audit_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''审核人ID''',
  'SELECT ''pur_purchase_order.audit_by already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5d. close_by
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'close_by');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order MODIFY COLUMN close_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''关闭人ID''',
  'SELECT ''pur_purchase_order.close_by already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 6. 修改 pur_purchase_return.id / pur_purchase_reconciliation.id（补 UNSIGNED）=====

-- 6a. pur_purchase_return.id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_return' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_return MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID''',
  'SELECT ''pur_purchase_return.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6b. pur_purchase_reconciliation.id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_reconciliation' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_reconciliation MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''主键ID''',
  'SELECT ''pur_purchase_reconciliation.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 7. 验证：检查所有目标列类型已对齐 =====
SELECT
  TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'inv_inbound_item' AND COLUMN_NAME IN ('id', 'order_id', 'material_id'))
    OR (TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME IN ('create_by', 'update_by', 'audit_by', 'close_by'))
    OR (TABLE_NAME = 'pur_purchase_return' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'pur_purchase_reconciliation' AND COLUMN_NAME = 'id')
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;
