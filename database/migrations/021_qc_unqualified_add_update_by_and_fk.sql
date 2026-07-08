-- ============================================================
-- Migration 021: qc_unqualified 补齐 update_by 列 + 外键约束
--
-- 背景：根据《项目整体分析报告》P0 #2（外键约束缺失）和 P2 #7（审计字段命名不统一）
-- 为 qc_unqualified 表补齐：
--   1. update_by BIGINT UNSIGNED 列（统一审计字段）
--   2. 修改 deleted 列为 NOT NULL DEFAULT 0（统一软删除 P2 #9）
--   3. 添加 material_id → inv_material.id 外键
--   4. 添加 create_by → sys_user.id 外键
--   5. 添加 update_by → sys_user.id 外键
--   6. 添加 idx_material_id 和 idx_source 索引（高频查询字段，参见报告"高频查询字段必须索引"硬约束）
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- 1. 补齐 update_by 列
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'update_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE qc_unqualified ADD COLUMN update_by BIGINT UNSIGNED COMMENT ''更新人ID'' AFTER create_by',
  'SELECT ''update_by column already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 统一 deleted 列定义为 NOT NULL DEFAULT 0（P2 #9 软删除字段统一）
SET @col_def = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'deleted');
SET @sql = IF(@col_def IS NOT NULL AND @col_def NOT LIKE '%NOT NULL%',
  'ALTER TABLE qc_unqualified MODIFY COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''',
  'SELECT ''deleted column already NOT NULL DEFAULT 0'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 添加 idx_material_id 索引（高频查询字段）
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND INDEX_NAME = 'idx_material_id');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE qc_unqualified ADD INDEX idx_material_id (material_id)',
  'SELECT ''idx_material_id already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 添加 idx_source 复合索引（source_type + source_no 高频查询）
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND INDEX_NAME = 'idx_source');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE qc_unqualified ADD INDEX idx_source (source_type, source_no)',
  'SELECT ''idx_source already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. 添加 fk_qc_unqualified_material 外键（material_id → inv_material.id）
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND CONSTRAINT_NAME = 'fk_qc_unqualified_material');
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE qc_unqualified ADD CONSTRAINT fk_qc_unqualified_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_qc_unqualified_material already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. 添加 fk_qc_unqualified_create_by 外键（create_by → sys_user.id）
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND CONSTRAINT_NAME = 'fk_qc_unqualified_create_by');
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE qc_unqualified ADD CONSTRAINT fk_qc_unqualified_create_by FOREIGN KEY (create_by) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_qc_unqualified_create_by already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. 添加 fk_qc_unqualified_update_by 外键（update_by → sys_user.id）
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND CONSTRAINT_NAME = 'fk_qc_unqualified_update_by');
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE qc_unqualified ADD CONSTRAINT fk_qc_unqualified_update_by FOREIGN KEY (update_by) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_qc_unqualified_update_by already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. 验证最终表结构
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified'
ORDER BY ORDINAL_POSITION;
