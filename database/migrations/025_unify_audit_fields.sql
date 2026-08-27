-- ============================================================
-- Migration 025: 统一审计字段命名为 create_time/update_time/create_by/update_by
--
-- 背景：根据《项目整体分析报告》P2 #7（审计字段命名不统一）
-- 5 张表使用非标准审计字段命名：
--   - created_at → create_time
--   - created_by/updated_by → create_by/update_by
--   - creator_id → create_by
--
-- 特殊处理：
--   - domain_event_outbox: 需重建 idx_status_created 索引
--   - fin_voucher: created_at 与 create_time 冗余，删除 created_at
--   - fin_voucher.created_by 为 VARCHAR(50)（存姓名），保留类型仅改名
--   - prd_standard_card.creator 是业务字段（"制作"），保留不动；creator_id → create_by
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== 1. prd_standard_card: creator_id → create_by =====

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_standard_card' AND COLUMN_NAME = 'creator_id');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE prd_standard_card CHANGE COLUMN creator_id create_by BIGINT UNSIGNED COMMENT ''创建人ID''',
  'SELECT ''prd_standard_card.creator_id already renamed to create_by'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 2. domain_event_outbox: created_at → create_time（需重建索引）=====

-- 2.1 先删除 idx_status_created 索引（如果存在）
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'domain_event_outbox' AND INDEX_NAME = 'idx_status_created');
SET @sql = IF(@idx_exists > 0,
  'ALTER TABLE domain_event_outbox DROP INDEX idx_status_created',
  'SELECT ''idx_status_created already dropped'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.2 CHANGE COLUMN created_at → create_time
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'domain_event_outbox' AND COLUMN_NAME = 'created_at');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE domain_event_outbox CHANGE COLUMN created_at create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''事件创建时间''',
  'SELECT ''domain_event_outbox.created_at already renamed to create_time'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.3 重建 idx_status_created 索引（引用 create_time）
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'domain_event_outbox' AND INDEX_NAME = 'idx_status_created');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE domain_event_outbox ADD INDEX idx_status_created (status, create_time) COMMENT ''待处理事件查询索引''',
  'SELECT ''idx_status_created already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 3. inv_material_std: created_by → create_by, updated_by → update_by =====

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material_std' AND COLUMN_NAME = 'created_by');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE inv_material_std CHANGE COLUMN created_by create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID''',
  'SELECT ''inv_material_std.created_by already renamed'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_material_std' AND COLUMN_NAME = 'updated_by');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE inv_material_std CHANGE COLUMN updated_by update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''',
  'SELECT ''inv_material_std.updated_by already renamed'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 4. prd_bom_std: created_by → create_by, updated_by → update_by =====

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_bom_std' AND COLUMN_NAME = 'created_by');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE prd_bom_std CHANGE COLUMN created_by create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID''',
  'SELECT ''prd_bom_std.created_by already renamed'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_bom_std' AND COLUMN_NAME = 'updated_by');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE prd_bom_std CHANGE COLUMN updated_by update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''',
  'SELECT ''prd_bom_std.updated_by already renamed'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== 5. fin_voucher: 删除冗余 created_at, created_by → create_by =====

-- 5.1 删除冗余的 created_at 字段（create_time 已存在）
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher' AND COLUMN_NAME = 'created_at');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE fin_voucher DROP COLUMN created_at',
  'SELECT ''fin_voucher.created_at already dropped'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.2 created_by VARCHAR(50) → create_by VARCHAR(50)（保留类型，仅改名）
--     注意：fin_voucher.created_by 存制单人姓名，保留 VARCHAR(50) 类型避免数据丢失
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_voucher' AND COLUMN_NAME = 'created_by');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE fin_voucher CHANGE COLUMN created_by create_by VARCHAR(50) COMMENT ''制单人''',
  'SELECT ''fin_voucher.created_by already renamed'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证：检查是否仍有非标准审计字段
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (COLUMN_NAME IN ('created_at', 'updated_at', 'created_by', 'updated_by', 'creator_id')
       OR (TABLE_NAME = 'fin_voucher' AND COLUMN_NAME = 'created_at'))
ORDER BY TABLE_NAME, COLUMN_NAME;
