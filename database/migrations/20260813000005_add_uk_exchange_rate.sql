-- 任务 008：汇率表 唯一约束
-- 真实列：from_currency, to_currency, rate_date（非 currency_code / effective_date）
-- 同一币种对同一生效日仅存在一条汇率记录

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_exchange_rate' AND INDEX_NAME = 'uk_exchange_rate_pair_date');
SET @sql = IF(@idx = 0, 'ALTER TABLE sys_exchange_rate ADD UNIQUE INDEX uk_exchange_rate_pair_date (from_currency, to_currency, rate_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
