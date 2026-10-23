-- batch 158: 回填 inv_material.shelf_life 默认值，激活批次保质期派生
-- 业务裁定（2026-10-03）：全量统一默认 365 天。
--   成品 / 辅料 / 包材 / 待确认 / NULL 分类等此前均无保质期，统一赋 365
--   作为默认基准，后续可在物料主数据界面逐物料精修。
-- 仅填充 shelf_life IS NULL 的行，幂等；不覆盖已手动设置的值。
-- 注：本迁移只修正物料主数据。已存在的 inv_inventory_batch 多数批次
--     produce_date/expire_date 仍为 NULL（历史入库未采集），新入库才会
--     按 shelf_life 派生 expire_date；存量批次需另补 produce_date 后方激活。

UPDATE `inv_material`
SET `shelf_life` = 365
WHERE `shelf_life` IS NULL;
