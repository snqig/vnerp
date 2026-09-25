-- ============================================================
-- Migration: 统一工单表（prd_work_order → prod_work_order）
-- 日期: 2026-09-23
-- ============================================================

START TRANSACTION;

-- 迁移数据（只迁移核心字段）
INSERT INTO prod_work_order (
  id, work_order_no, order_no, sales_order_id,
  quantity, unit, status, status_new,
  plan_start_date, plan_end_date, actual_start_date, actual_end_date,
  planned_qty, completed_qty, finished_qty,
  total_material_cost, total_labor_cost, total_overhead_cost,
  remark, create_by, create_time, update_by, update_time, deleted,
  legacy_material_id
)
SELECT
  pwo.id,
  pwo.work_order_no,
  CONCAT('SO-LEGACY-', pwo.id),
  pwo.sales_order_id,
  pwo.plan_qty,
  pwo.unit,
  'migrated',
  pwo.status,
  pwo.plan_start_date,
  pwo.plan_end_date,
  pwo.actual_start_date,
  pwo.actual_end_date,
  pwo.plan_qty,
  pwo.completed_qty,
  pwo.completed_qty,
  pwo.material_cost,
  pwo.labor_cost,
  pwo.overhead_cost,
  pwo.remark,
  pwo.create_by,
  pwo.create_time,
  pwo.update_by,
  pwo.update_time,
  pwo.deleted,
  pwo.material_id
FROM prd_work_order pwo
WHERE NOT EXISTS (
  SELECT 1 FROM prod_work_order p WHERE p.id = pwo.id
);

SELECT COUNT(*) as migrated_rows FROM prod_work_order WHERE status = 'migrated';

COMMIT;
