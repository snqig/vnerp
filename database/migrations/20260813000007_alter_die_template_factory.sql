-- 任务 007：刀模 新增 factory_id + per-factory 复合唯一
-- 真实表 prd_die_template，已有全局唯一 uk_template_code(template_code)，但无 factory_id / die_no
-- 历史行 factory_id 置 NULL（template_code 已全局唯一，复合唯一安全；per-factory 在应用填充 factory_id 后生效）
-- 幂等：列/索引已存在则跳过

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_die_template' AND COLUMN_NAME = 'factory_id');
SET @sql = IF(@col = 0, 'ALTER TABLE prd_die_template ADD COLUMN factory_id BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_die_template' AND INDEX_NAME = 'uk_factory_die_no');
SET @sql2 = IF(@idx = 0, 'ALTER TABLE prd_die_template ADD UNIQUE INDEX uk_factory_die_no (factory_id, template_code)', 'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
