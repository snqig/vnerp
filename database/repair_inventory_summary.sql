-- ============================================================
-- hot-07 库存脏数据修复：以批次明细(inv_inventory_batch)为准，重建汇总表(inv_inventory)
-- 适用库：vnerpdacahng
-- 原则（已与老板确认）：批次明细为权威源；inv_inventory 汇总由批次派生重算
-- 安全性：
--   1) 先备份 inv_inventory -> inv_inventory_bak_YYYYMMDD（已存在则跳过，可回滚）
--   2) 全部 UPDATE/INSERT 均为幂等，可重复执行
--   3) 执行后用 database/reconcile_inventory.sql 验证 diff 全为 0
-- 回滚：DROP TABLE IF EXISTS inv_inventory; RENAME TABLE inv_inventory_bak_YYYYMMDD TO inv_inventory;
-- ============================================================

-- 0) 备份（仅首次）
CREATE TABLE IF NOT EXISTS inv_inventory_bak_20260816 AS SELECT * FROM inv_inventory;

-- 1) 现有汇总行：按批次合计刷新数量/可用量（同时修复 available>quantity 的行内矛盾）
UPDATE inv_inventory i
JOIN (
  SELECT material_id, warehouse_id, SUM(quantity) q, SUM(available_qty) a
  FROM inv_inventory_batch WHERE deleted = 0
  GROUP BY material_id, warehouse_id
) b ON b.material_id = i.material_id AND b.warehouse_id = i.warehouse_id AND i.deleted = 0
SET i.quantity      = b.q,
    i.available_qty = b.a,
    i.version       = COALESCE(i.version, 0) + 1,
    i.update_time   = NOW();

-- 2) 孤儿批次（有批次但无汇总行）：补建汇总行，主数据从 inv_material / inv_warehouse 取
INSERT INTO inv_inventory
  (material_id, material_code, material_name, warehouse_id, warehouse_name,
   quantity, available_qty, batch_no, locked_qty, unit, version, create_time, update_time, deleted)
SELECT
  b.material_id, m.material_code, m.material_name, b.warehouse_id, w.warehouse_name,
  b.q, b.a, NULL, 0, m.unit, 0, NOW(), NOW(), 0
FROM (
  SELECT material_id, warehouse_id, SUM(quantity) q, SUM(available_qty) a
  FROM inv_inventory_batch WHERE deleted = 0
  GROUP BY material_id, warehouse_id
) b
JOIN inv_material m   ON m.id = b.material_id
JOIN inv_warehouse w  ON w.id = b.warehouse_id
LEFT JOIN inv_inventory i
  ON i.material_id = b.material_id AND i.warehouse_id = b.warehouse_id AND i.deleted = 0
WHERE i.id IS NULL;

-- 3) 孤儿汇总（有汇总行但一个批次都没有）：清零（保留行，便于追溯）
UPDATE inv_inventory i
LEFT JOIN (
  SELECT material_id, warehouse_id FROM inv_inventory_batch WHERE deleted = 0
  GROUP BY material_id, warehouse_id
) b ON b.material_id = i.material_id AND b.warehouse_id = i.warehouse_id
SET i.quantity      = 0,
    i.available_qty = 0,
    i.version       = COALESCE(i.version, 0) + 1,
    i.update_time   = NOW()
WHERE i.deleted = 0 AND b.material_id IS NULL;
