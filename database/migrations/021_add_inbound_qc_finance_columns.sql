-- ============================================================
-- Migration 021: 为 inv_inbound_order 补齐 QC / 财务过账列
-- 日期: 2026-08-28
-- 背景:
--   - 领域模型 InboundOrder 已引入 inspectionStatus / financePosted
--   - 应用层审核链路会写入这两类状态,但部分历史 schema 缺少对应列
-- 策略:
--   1. 为 inv_inbound_order 增加 inspection_status / finance_posted
--   2. 基于现有 qc_status 做回填,避免老数据空值
--   3. 添加必要索引,方便审核/过账查询
-- 注意:
--   - 幂等执行(INFORMATION_SCHEMA 守卫)
--   - 仅补齐列,不删除历史数据
-- ============================================================

SET @inspection_status_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inv_inbound_order'
    AND COLUMN_NAME = 'inspection_status'
);
SET @sql = IF(@inspection_status_exists = 0,
  'ALTER TABLE inv_inbound_order ADD COLUMN inspection_status TINYINT NOT NULL DEFAULT 0 COMMENT 0-待检/1-检验中/2-不合格/3-合格 AFTER qc_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @finance_posted_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inv_inbound_order'
    AND COLUMN_NAME = 'finance_posted'
);
SET @sql = IF(@finance_posted_exists = 0,
  'ALTER TABLE inv_inbound_order ADD COLUMN finance_posted TINYINT NOT NULL DEFAULT 0 COMMENT 0-未过账/1-已过账 AFTER inspection_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 回填历史数据:用现有 qc_status 推导 inspection_status
UPDATE inv_inbound_order
SET inspection_status = CASE qc_status
  WHEN 'pass' THEN 3
  WHEN 'fail' THEN 2
  WHEN 'partial' THEN 1
  ELSE 0
END,
finance_posted = CASE
  WHEN status IN ('approved','completed') THEN 1
  ELSE 0
END
WHERE inspection_status = 0
  AND finance_posted = 0
  AND deleted = 0;

-- 索引
SET @idx_inspection_status_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inv_inbound_order'
    AND INDEX_NAME = 'idx_inspection_status'
);
SET @sql = IF(@idx_inspection_status_exists = 0,
  'ALTER TABLE inv_inbound_order ADD INDEX idx_inspection_status (inspection_status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_finance_posted_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inv_inbound_order'
    AND INDEX_NAME = 'idx_finance_posted'
);
SET @sql = IF(@idx_finance_posted_exists = 0,
  'ALTER TABLE inv_inbound_order ADD INDEX idx_finance_posted (finance_posted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

