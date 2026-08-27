-- 任务 005：出库明细 行唯一约束
-- 真实列：order_id（非 outbound_order_id）+ material_id + batch_no（无 line_no 列，用业务行键替代）
-- 软删除列 deleted 纳入复合键

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_item' AND INDEX_NAME = 'uk_outbound_order_line');
SET @sql = IF(@idx = 0, 'ALTER TABLE inv_outbound_item ADD UNIQUE INDEX uk_outbound_order_line (order_id, material_id, batch_no, deleted)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
