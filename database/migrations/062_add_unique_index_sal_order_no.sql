-- ============================================================
-- Migration 062: 为 sal_order.order_no 添加 UNIQUE INDEX
--
-- 背景：
--   SampleOrderApplicationService.createSalesOrderFromSample() 使用
--   SELECT COUNT(*) + 1 生成销售订单号（SO + YYYYMMDD + 4位序号）。
--   当多个请求并发执行时，可能读到相同的 COUNT 值从而生成重复的订单号，
--   导致 INSERT 冲突或数据不一致。
--
--   本 migration 为 order_no 列添加唯一索引，作为并发保护的底层约束。
--   应用层已改为捕获 ER_DUP_ENTRY 并重试（序号递增），本索引提供最终防线。
--
-- 索引：uk_order_no (order_no)
--   - 与 vnerpdacahng_schema.sql 中的 UNIQUE KEY uk_order_no 一致
--   - 确保已运行的旧数据库也拥有此约束
--
-- 幂等模式：使用 INFORMATION_SCHEMA.STATISTICS 检查索引是否存在再添加
-- ============================================================

-- 检查唯一索引 uk_order_no 是否已存在，不存在则添加
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_order' AND INDEX_NAME = 'uk_order_no');
SET @sql = IF(@idx = 0,
  'ALTER TABLE sal_order ADD UNIQUE INDEX uk_order_no (order_no)',
  'SELECT ''uk_order_no already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证：确认索引已创建
SELECT
  INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'sal_order'
  AND INDEX_NAME = 'uk_order_no'
ORDER BY SEQ_IN_INDEX;
