-- ========================================================
-- 008: 库存批次告警与检验状态字段
-- 来源：migrations/0001_add_inventory_alerts.sql
-- 修正：
--   1. 表名 inventory_batches → inv_inventory_batch（与 schema.sql 对齐）
--   2. 列名 expiry_date → expire_date（与 schema.sql 对齐）
--   3. 移除 PostgreSQL 专有语法 COMMENT ON COLUMN（MySQL 用 ALTER TABLE 内联 COMMENT）
-- ========================================================

SET @dbname = DATABASE();
SET @tablename = 'inv_inventory_batch';

-- alert_level
SET @colname = 'alert_level';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE inv_inventory_batch ADD COLUMN alert_level VARCHAR(20) DEFAULT ''normal'' COMMENT ''库存告警级别: normal/warning/critical'''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- last_alert_time
SET @colname = 'last_alert_time';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE inv_inventory_batch ADD COLUMN last_alert_time TIMESTAMP NULL COMMENT ''最后告警时间'''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- inspection_status
SET @colname = 'inspection_status';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE inv_inventory_batch ADD COLUMN inspection_status VARCHAR(20) DEFAULT ''pending'' COMMENT ''检验状态: pending/pass/fail'''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- quarantine_status
SET @colname = 'quarantine_status';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE inv_inventory_batch ADD COLUMN quarantine_status VARCHAR(20) DEFAULT ''none'' COMMENT ''隔离状态: none/quarantined/released'''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 告警级别索引
SET @indexname = 'idx_alert_level';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = @indexname) > 0,
  'SELECT 1',
  'CREATE INDEX idx_alert_level ON inv_inventory_batch(alert_level)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
