-- 任务 004：入库单 单据编号唯一约束（真实列名 order_no，非 bill_no）
-- 软删除列 deleted 纳入复合键（未删唯一、已删可重建同单号）

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND INDEX_NAME = 'uk_inbound_order_no');
SET @sql = IF(@idx = 0, 'ALTER TABLE inv_inbound_order ADD UNIQUE INDEX uk_inbound_order_no (order_no, deleted)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
