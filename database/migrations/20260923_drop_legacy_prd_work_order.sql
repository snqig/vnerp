-- ============================================================
-- Migration: 删除遗留工单表 prd_work_order
-- 日期: 2026-09-23
-- 背景: 工单表双轨制收口（prd_work_order 遗留 → prod_work_order 在用）
-- ============================================================
--
-- 前置验证（2026-09-23 实测，全部通过）:
--   1. 数据已收敛: legacy 75 行中 69 行与 prod_work_order 同 id 且同 work_order_no
--      （二者为同一业务记录），余 6 行 material_id 全指向 TEST_MAT_*/测试物料_* 测试垃圾，
--      且其 id 在 prod_work_order 已被更新的记录占用。
--   2. 外键: 0 条 FK 指向 prd_work_order（7 条相关 FK 均已指向 prod_work_order）。
--   3. 视图 / 触发器: 0 处引用（INFORMATION_SCHEMA.VIEWS / TRIGGERS 均为空）。
--   4. 业务层: src/ 下 0 处引用 prd_work_order（已切换为 prod_work_order，
--      详见同批 2026-09-23 提交的 11 个文件改动）。
--   5. 列差异: legacy 独有 11 列（material_id/plan_qty/work_order_date/workshop_id/
--      workcenter_id/标准成本等）在 prod_work_order 有语义对应列
--      （legacy_material_id / planned_qty / 无对应 / 已废弃），无唯一数据丢失。
--
-- 回滚: 见 database/migrations/rollback/20260923_drop_legacy_prd_work_order_rollback.sql
-- ============================================================

-- 1) 留档：原表 75 行原样快照（保留不删，用于回滚与审计）
CREATE TABLE IF NOT EXISTS prd_work_order_bak_20260923 AS SELECT * FROM prd_work_order;

-- 2) 删除遗留表
DROP TABLE IF EXISTS prd_work_order;
