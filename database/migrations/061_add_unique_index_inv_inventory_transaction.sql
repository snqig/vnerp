-- ============================================================
-- Migration 061: 为 inv_inventory_transaction 添加 (source_type, source_id) 唯一索引
--
-- 背景：
--   FinishOrderInventoryHandler 使用"先 SELECT 后 INSERT"模式做幂等检查，
--   当 StreamConsumer 的 XAUTOCLAIM 回收机制将同一事件重新投递给另一个消费者时，
--   两个消费者可能同时通过 SELECT 检查（均读到 0 行），随后各自执行 INSERT，
--   造成库存双计数（TOCTOU 竞态条件）。
--
--   Handler 侧已改为 INSERT IGNORE + 唯一索引做幂等保护，本 migration 提供底层约束。
--
-- 索引：uk_inv_txn_source (source_type, source_id)
--   - source_type: 流水来源类型（如 'prod_finish'）
--   - source_id:   来源单据 ID（如 finishOrderId）
--
-- 幂等模式：使用 INFORMATION_SCHEMA.STATISTICS 检查索引是否存在再添加
-- ============================================================

-- 检查唯一索引 uk_inv_txn_source 是否已存在，不存在则添加
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_transaction' AND INDEX_NAME = 'uk_inv_txn_source');
SET @sql = IF(@idx = 0,
  'ALTER TABLE inv_inventory_transaction ADD UNIQUE INDEX uk_inv_txn_source (source_type, source_id)',
  'SELECT ''uk_inv_txn_source already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证：确认索引已创建
SELECT
  INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'inv_inventory_transaction'
  AND INDEX_NAME = 'uk_inv_txn_source'
ORDER BY SEQ_IN_INDEX;
