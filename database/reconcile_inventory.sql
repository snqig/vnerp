-- ============================================================
-- vnerp 库存账实对账脚本（只读，不修改任何数据）
-- 适用库：vnerpdacahng
-- 说明：
--   inv_inventory_batch = 批次明细库存（最细粒度，quantity 为库存量）
--   inv_inventory       = 物料+仓库 账面汇总库存
--   inv_inventory_transaction = 流水账（当前库实测为 0 行，未启用，故本对账以两张库存表互校）
--   inv_inventory_log   = 移动日志（仅 STOCKTAKING/INBOUND，无批次号/前后量，无法重建余额）
-- 原则：账面汇总 inv_inventory.quantity 必须等于 SUM(inv_inventory_batch.quantity)
--       同一 (material_id, warehouse_id) 分组，软删行 excluded(deleted=0)
-- ============================================================

-- 0) 前置健康检查
SELECT 'inv_inventory_batch 行数(含软删)' AS chk, COUNT(*) AS cnt FROM inv_inventory_batch;
SELECT 'inv_inventory 有效行(deleted=0)' AS chk, COUNT(*) AS cnt FROM inv_inventory WHERE deleted=0;
SELECT 'inv_inventory_transaction 行数'   AS chk, COUNT(*) AS cnt FROM inv_inventory_transaction;
SELECT 'inv_inventory_log 行数'           AS chk, COUNT(*) AS cnt FROM inv_inventory_log;

-- 1) 主对账：账面汇总 vs 批次明细合计（含数量与可用量差异）
--    返回所有不一致的行（diff <> 0）
SELECT
  i.material_id,
  i.warehouse_id,
  i.quantity     AS inv_qty,
  i.available_qty AS inv_avail,
  IFNULL(b.qty,0)   AS batch_qty,
  IFNULL(b.avail,0) AS batch_avail,
  ROUND(i.quantity      - IFNULL(b.qty,0),   4) AS diff_qty,
  ROUND(i.available_qty - IFNULL(b.avail,0), 4) AS diff_avail
FROM inv_inventory i
LEFT JOIN (
  SELECT material_id, warehouse_id,
         SUM(quantity)      AS qty,
         SUM(available_qty) AS avail
  FROM inv_inventory_batch
  WHERE deleted = 0
  GROUP BY material_id, warehouse_id
) b ON b.material_id = i.material_id AND b.warehouse_id = i.warehouse_id
WHERE i.deleted = 0
  AND (
        ROUND(i.quantity      - IFNULL(b.qty,0),   4) <> 0
     OR ROUND(i.available_qty - IFNULL(b.avail,0), 4) <> 0
  )
ORDER BY ABS(i.quantity - IFNULL(b.qty,0)) DESC;

-- 2) 孤儿批次：有批次库存，但 inv_inventory 没有对应汇总行
SELECT
  b.material_id,
  b.warehouse_id,
  SUM(b.quantity)      AS batch_qty,
  SUM(b.available_qty) AS batch_avail
FROM inv_inventory_batch b
LEFT JOIN inv_inventory i
  ON i.material_id = b.material_id
 AND i.warehouse_id = b.warehouse_id
 AND i.deleted = 0
WHERE b.deleted = 0
  AND i.id IS NULL
GROUP BY b.material_id, b.warehouse_id;

-- 3) 孤儿汇总：有 inv_inventory 汇总行，但一个批次都没有
SELECT
  i.material_id,
  i.warehouse_id,
  i.quantity      AS inv_qty,
  i.available_qty AS inv_avail
FROM inv_inventory i
LEFT JOIN inv_inventory_batch b
  ON b.material_id = i.material_id
 AND b.warehouse_id = i.warehouse_id
 AND b.deleted = 0
WHERE i.deleted = 0
  AND b.id IS NULL;

-- 4) 行内自相矛盾：available_qty > quantity（库存逻辑不可能）
SELECT 'batch' AS tbl, id, material_id, warehouse_id, quantity, available_qty
FROM inv_inventory_batch
WHERE deleted = 0 AND available_qty > quantity
UNION ALL
SELECT 'inv' AS tbl, id, material_id, warehouse_id, quantity, available_qty
FROM inv_inventory
WHERE deleted = 0 AND available_qty > quantity;

-- 5) 差异物料的批次明细（排查用，按需改 material_id/warehouse_id）
-- SELECT batch_no, material_id, warehouse_id, quantity, available_qty, inbound_date, status
-- FROM inv_inventory_batch
-- WHERE deleted = 0 AND material_id = 11 AND warehouse_id = 3;
