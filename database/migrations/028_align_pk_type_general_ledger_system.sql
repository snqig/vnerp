-- ============================================================
-- Migration 028: 主键类型对齐 - 总账+系统模块
--
-- 背景：根据《项目整体分析报告》P2 #6（主键类型不一致）
--   4 张表主键类型不符合 BIGINT UNSIGNED 标准
--
-- 涉及表：
--   fin_account.id              INT UNSIGNED → BIGINT UNSIGNED
--   fin_account.parent_id       INT UNSIGNED → BIGINT UNSIGNED（自引用关联列）
--   fin_period.id               INT UNSIGNED → BIGINT UNSIGNED
--   sys_event_processed.id      BIGINT (缺 UNSIGNED) → BIGINT UNSIGNED
--   sys_migration.id            INT (缺 UNSIGNED) → BIGINT UNSIGNED
--
-- 级联调整（引用 fin_account.id 的列）：
--   fin_voucher_line.account_id       INT UNSIGNED → BIGINT UNSIGNED
--   fin_account_balance.account_id    INT UNSIGNED → BIGINT UNSIGNED
--   (两表均无 FK 到 fin_account，仅 KEY idx_account，可直接 MODIFY)
--
-- 注：fin_period 通过 period_code 冗余关联，无 period_id 引用列
-- 注：sys_event_processed / sys_migration 无 FK 引用
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== A. fin_account 主键 + 自引用列 =====

-- A1. fin_account.id
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_account' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE fin_account MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''科目ID''',
  'SELECT ''fin_account.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A2. fin_account.parent_id（自引用关联列）
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_account' AND COLUMN_NAME = 'parent_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE fin_account MODIFY COLUMN parent_id BIGINT UNSIGNED COMMENT ''父级科目ID''',
  'SELECT ''fin_account.parent_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== B. fin_period 主键 =====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_period' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE fin_period MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT ''期间ID''',
  'SELECT ''fin_period.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== C. fin_voucher_line.account_id（引用 fin_account.id）=====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher_line' AND COLUMN_NAME = 'account_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE fin_voucher_line MODIFY COLUMN account_id BIGINT UNSIGNED NOT NULL COMMENT ''科目ID''',
  'SELECT ''fin_voucher_line.account_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== D. fin_account_balance.account_id（引用 fin_account.id）=====
--   注：该列参与 UNIQUE KEY uk_period_account，MySQL MODIFY COLUMN 会自动保留索引

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_account_balance' AND COLUMN_NAME = 'account_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE fin_account_balance MODIFY COLUMN account_id BIGINT UNSIGNED NOT NULL COMMENT ''科目ID''',
  'SELECT ''fin_account_balance.account_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== E. sys_event_processed.id（补 UNSIGNED）=====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_event_processed' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE sys_event_processed MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT',
  'SELECT ''sys_event_processed.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== F. sys_migration.id（INT → BIGINT UNSIGNED）=====

SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_migration' AND COLUMN_NAME = 'id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE sys_migration MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT',
  'SELECT ''sys_migration.id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== G. 验证：检查所有目标列类型已对齐 =====
SELECT
  TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'fin_account' AND COLUMN_NAME IN ('id', 'parent_id'))
    OR (TABLE_NAME = 'fin_period' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'fin_voucher_line' AND COLUMN_NAME = 'account_id')
    OR (TABLE_NAME = 'fin_account_balance' AND COLUMN_NAME = 'account_id')
    OR (TABLE_NAME = 'sys_event_processed' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'sys_migration' AND COLUMN_NAME = 'id')
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;
