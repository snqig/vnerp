-- Migration 075: Add material_id, material_code, deleted to sal_order_item
-- 销售订单明细表补齐物料关联字段，用于前端物料选择后直接存储物料ID和编码

ALTER TABLE `sal_order_item`
  ADD COLUMN IF NOT EXISTS `material_id` BIGINT UNSIGNED NULL COMMENT '物料ID' AFTER `order_id`,
  ADD COLUMN IF NOT EXISTS `material_code` VARCHAR(50) NULL COMMENT '物料编码' AFTER `material_id`,
  ADD COLUMN IF NOT EXISTS `deleted` TINYINT(1) DEFAULT 0 COMMENT '软删除' AFTER `remark`;

-- 回填历史数据：根据 material_name 匹配 inv_material 获取 material_id
UPDATE sal_order_item soi
JOIN inv_material m ON m.material_name = soi.material_name AND m.deleted = 0
SET soi.material_id = m.id,
    soi.material_code = m.material_code
WHERE soi.material_id IS NULL AND soi.deleted = 0;