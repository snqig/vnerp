-- Migration 054: prod_work_order 新增累计统计字段
-- 依据: docs/生产工单 - 领料 - 库存 - 完工入库 全链路完善方案.md 第2.4节
-- 目的: 工单累计已领/完工/退料数量与材料成本，用于快速查询与状态判断

ALTER TABLE `prod_work_order`
  ADD COLUMN `picked_qty` DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计已领数量（按BOM折算）' AFTER `deleted`,
  ADD COLUMN `finished_qty` DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计完工合格数量' AFTER `picked_qty`,
  ADD COLUMN `returned_qty` DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计退料数量' AFTER `finished_qty`,
  ADD COLUMN `total_material_cost` DECIMAL(12,2) DEFAULT 0.00 COMMENT '累计材料成本' AFTER `returned_qty`;
