-- =====================================================
-- Migration 041: Create unified BOM view + migrate V1 data to V2
-- 统一 BOM 表结构：创建兼容视图，将 V1 (prd_bom/prd_bom_detail) 数据迁移至 V2 (bom_header/bom_line)
-- V2 表字段更完整（审核、层级、工序关联），作为权威实现
-- V1 数据迁移后保留只读，通过视图统一访问
-- =====================================================

-- 1. 将 V1 数据迁移到 V2（INSERT IGNORE 避免重复）
INSERT IGNORE INTO `bom_header` (
  bom_no, product_id, product_code, product_name,
  version, is_default, status, total_cost, remark, create_time
)
SELECT
  CONCAT('V1-', pb.id) AS bom_no,
  pb.product_id,
  (SELECT material_code FROM inv_material WHERE id = pb.product_id LIMIT 1) AS product_code,
  (SELECT material_name FROM inv_material WHERE id = pb.product_id LIMIT 1) AS product_name,
  pb.version,
  1 AS is_default,
  CASE WHEN pb.status = 1 THEN 20 ELSE 10 END AS status, -- V1 1=启用→V2 20=已审核
  pb.total_cost,
  pb.remark,
  pb.create_time
FROM `prd_bom` pb
WHERE pb.deleted = 0
  AND pb.id NOT IN (SELECT legacy_id FROM bom_header WHERE legacy_source = 'prd_bom');

-- 添加 legacy 追踪列（如果不存在）
ALTER TABLE `bom_header`
  ADD COLUMN IF NOT EXISTS `legacy_source` VARCHAR(30) DEFAULT NULL COMMENT '旧表来源: prd_bom/bom_header' AFTER `remark`,
  ADD COLUMN IF NOT EXISTS `legacy_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID' AFTER `legacy_source`;

-- 更新已迁移记录的 legacy 信息
UPDATE `bom_header` bh
INNER JOIN `prd_bom` pb ON bh.bom_no = CONCAT('V1-', pb.id)
SET bh.legacy_source = 'prd_bom', bh.legacy_id = pb.id
WHERE bh.legacy_source IS NULL;

-- 2. 迁移 V1 明细到 V2 明细
INSERT IGNORE INTO `bom_line` (
  bom_id, line_no, material_id, material_code, material_name,
  material_spec, material_unit, consumption_qty, loss_rate,
  unit_cost, total_cost, remark, create_time
)
SELECT
  bh.id AS bom_id,
  pbd.id AS line_no,
  pbd.material_id,
  (SELECT material_code FROM inv_material WHERE id = pbd.material_id LIMIT 1) AS material_code,
  pbd.material_name,
  NULL AS material_spec,
  pbd.unit AS material_unit,
  pbd.quantity AS consumption_qty,
  pbd.loss_rate,
  pbd.unit_cost,
  pbd.total_cost,
  pbd.remark,
  pbd.create_time
FROM `prd_bom_detail` pbd
INNER JOIN `prd_bom` pb ON pbd.bom_id = pb.id
INNER JOIN `bom_header` bh ON bh.bom_no = CONCAT('V1-', pb.id)
WHERE pb.deleted = 0
  AND pbd.id NOT IN (SELECT legacy_id FROM bom_line WHERE legacy_source = 'prd_bom_detail');

-- 添加 legacy 追踪列到明细表
ALTER TABLE `bom_line`
  ADD COLUMN IF NOT EXISTS `legacy_source` VARCHAR(30) DEFAULT NULL COMMENT '旧表来源' AFTER `remark`,
  ADD COLUMN IF NOT EXISTS `legacy_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID' AFTER `legacy_source`;

-- 3. 创建统一 BOM 视图（V1 + V2 合并查询）
CREATE OR REPLACE VIEW `v_bom_unified` AS
SELECT
  bh.id AS bom_id,
  bh.bom_no,
  bh.product_id,
  bh.product_code,
  bh.product_name,
  bh.version,
  bh.status,
  bh.is_default,
  bh.total_cost,
  bh.remark,
  bh.create_time,
  bh.legacy_source,
  bh.legacy_id,
  'v2' AS source_table
FROM `bom_header` bh
WHERE bh.deleted = 0

UNION ALL

SELECT
  pb.id AS bom_id,
  CONCAT('V1-', pb.id) AS bom_no,
  pb.product_id,
  (SELECT material_code FROM inv_material WHERE id = pb.product_id LIMIT 1) AS product_code,
  (SELECT material_name FROM inv_material WHERE id = pb.product_id LIMIT 1) AS product_name,
  pb.version,
  CASE WHEN pb.status = 1 THEN 20 ELSE 10 END AS status,
  1 AS is_default,
  pb.total_cost,
  pb.remark,
  pb.create_time,
  'prd_bom' AS legacy_source,
  pb.id AS legacy_id,
  'v1' AS source_table
FROM `prd_bom` pb
WHERE pb.deleted = 0
  AND pb.id NOT IN (SELECT legacy_id FROM bom_header WHERE legacy_source = 'prd_bom' AND legacy_id IS NOT NULL);

-- 4. 创建统一 BOM 明细视图
CREATE OR REPLACE VIEW `v_bom_detail_unified` AS
SELECT
  bl.id AS line_id,
  bl.bom_id,
  bl.line_no,
  bl.material_id,
  bl.material_code,
  bl.material_name,
  bl.material_spec,
  bl.material_unit,
  bl.consumption_qty,
  bl.loss_rate,
  bl.unit_cost,
  bl.total_cost,
  bl.remark,
  'v2' AS source_table
FROM `bom_line` bl

UNION ALL

SELECT
  pbd.id AS line_id,
  pbd.bom_id,
  pbd.id AS line_no,
  pbd.material_id,
  (SELECT material_code FROM inv_material WHERE id = pbd.material_id LIMIT 1) AS material_code,
  pbd.material_name,
  NULL AS material_spec,
  pbd.unit AS material_unit,
  pbd.quantity AS consumption_qty,
  pbd.loss_rate,
  pbd.unit_cost,
  pbd.total_cost,
  pbd.remark,
  'v1' AS source_table
FROM `prd_bom_detail` pbd
INNER JOIN `prd_bom` pb ON pbd.bom_id = pb.id
WHERE pb.deleted = 0
  AND pbd.bom_id NOT IN (SELECT legacy_id FROM bom_header WHERE legacy_source = 'prd_bom' AND legacy_id IS NOT NULL);
