-- 回滚：20260923_add_mdm_product_material_bridge.sql
--
-- 说明：ALTER TABLE 属 DDL，**无法在事务中回滚**，故本脚本用于人工/受控执行回退。
-- 步骤：先删外键，再删索引与列。备份表 mdm_product_bak_20260923_material_bridge 保留，
--       由人工确认数据无误后再行删除。

ALTER TABLE mdm_product DROP FOREIGN KEY fk_mdm_product_material;
ALTER TABLE mdm_product DROP INDEX idx_mdm_product_material_id;
ALTER TABLE mdm_product DROP COLUMN material_id;

-- 校验：material_id 应已不存在
SELECT COUNT(*) AS remaining_material_id_col
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mdm_product' AND COLUMN_NAME = 'material_id';
