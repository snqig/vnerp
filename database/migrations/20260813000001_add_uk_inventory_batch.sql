-- 任务 001：库存批次表 联合唯一约束
-- 真实表 inv_inventory_batch（Drizzle schema 误注册为复数 inv_inventory_orders，已漂移，勿依赖）
-- 软删除列 deleted tinyint NOT NULL DEFAULT 0，纳入复合键实现「未删唯一、已删可重建」
-- 策略：先加复合唯一（失败则保留旧 uk_batch_no，安全）；成功后再删旧单列 uk_batch_no

-- 1) 新增复合唯一索引 uk_warehouse_material_batch
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND INDEX_NAME = 'uk_warehouse_material_batch');
SET @sql = IF(@idx = 0, 'ALTER TABLE inv_inventory_batch ADD UNIQUE INDEX uk_warehouse_material_batch (warehouse_id, material_id, batch_no, deleted)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) 删除旧的单列 uk_batch_no（允许同批次号跨仓库存在）
SET @idx2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND INDEX_NAME = 'uk_batch_no');
SET @sql2 = IF(@idx2 > 0, 'ALTER TABLE inv_inventory_batch DROP INDEX uk_batch_no', 'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
