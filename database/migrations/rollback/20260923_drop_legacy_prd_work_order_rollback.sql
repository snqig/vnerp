-- ============================================================
-- Rollback: 恢复遗留工单表 prd_work_order
-- 对应迁移: 20260923_drop_legacy_prd_work_order.sql
-- ============================================================
--
-- 注意事项:
--   * 恢复的是 2026-09-23 DROP 时的原样快照（prd_work_order_bak_20260923）。
--   * 业务层代码已切换为 prod_work_order，仅恢复表不会让代码再读它；
--     若要完整回滚，需同时把 src/ 下 11 个文件改回 prd_work_order（不推荐）。
--   * 恢复后 prd_work_order 无任何 FK / 触发器，与删除前一致。
-- ============================================================

CREATE TABLE IF NOT EXISTS prd_work_order LIKE prd_work_order_bak_20260923;

INSERT INTO prd_work_order
SELECT * FROM prd_work_order_bak_20260923
WHERE NOT EXISTS (SELECT 1 FROM prd_work_order p WHERE p.id = prd_work_order_bak_20260923.id);

-- 如需连同留档一起清除:
-- DROP TABLE IF EXISTS prd_work_order_bak_20260923;
