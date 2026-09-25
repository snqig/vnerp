-- 字段对齐 P1：前端 UI 缺失列补全
-- 审计时间：2026-09-22

-- 1. inv_outbound_item: 添加 is_raw_material（区分原料/成品出库）
-- idempotent: add column is_raw_material if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_item' AND COLUMN_NAME='is_raw_material');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_outbound_item` ADD COLUMN `is_raw_material` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否原料出库' AFTER `width`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- 2. prd_die_template: 添加 category（分类）和 tags（标签 JSON）
-- idempotent: add column category if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_die_template' AND COLUMN_NAME='category');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_die_template` ADD COLUMN `category` VARCHAR(64) NULL COMMENT '模板分类' AFTER `storage_location`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column tags if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_die_template' AND COLUMN_NAME='tags');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_die_template` ADD COLUMN `tags` JSON NULL COMMENT '标签列表' AFTER `category`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- 3. prd_standard_card: 添加 template_category（模板分类）和 tags（标签 JSON）
-- idempotent: add column template_category if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_standard_card' AND COLUMN_NAME='template_category');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_standard_card` ADD COLUMN `template_category` VARCHAR(64) NULL COMMENT '模板分类' AFTER `notes`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column tags if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_standard_card' AND COLUMN_NAME='tags');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_standard_card` ADD COLUMN `tags` JSON NULL COMMENT '标签列表' AFTER `template_category`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;

