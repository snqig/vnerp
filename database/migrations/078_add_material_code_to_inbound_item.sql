-- Migration 078: Add material_code to inv_inbound_item
-- 入库明细表补齐物料编码冗余列，用于前端列表展示与新增时持久化用户填写的物料编码
-- 修复：新增入库单填写的物料编码落库即丢失，列表永远为空的字段链路断裂问题

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inv_inbound_item'
    AND COLUMN_NAME = 'material_code'
);

SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE inv_inbound_item ADD COLUMN material_code VARCHAR(50) NULL COMMENT ''物料编码（冗余，便于查询）'' AFTER material_id',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 回填历史数据：根据 material_id 关联 inv_material 补齐 material_code
UPDATE inv_inbound_item ii
LEFT JOIN inv_material m ON m.id = ii.material_id AND m.deleted = 0
SET ii.material_code = m.material_code
WHERE ii.material_code IS NULL AND ii.material_id IS NOT NULL;
