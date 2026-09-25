-- ============================================================
-- 20260925_regen_inbound_orders.sql
-- warehouse/inbound 三层一致性治理：删除旧数据，重生成跨表关联的真实入库数据
--
-- 现况（2026-09-25 DB 运行时核实）：
--   inv_inbound_order 205 行 active / inv_inbound_item 232 行，几乎全为 QA 造数：
--   仓库=测试仓库_xxx(id 516)、供应商=测试供应商、po_id/work_order_id 全 NULL、
--   total_amount=0、operator=测试操作员 —— 与项目主数据零关联。
--
-- 重生成口径（全部关联真实存在行）：
--   - 20 张采购入库：pur_purchase_order 285-304（PO-2026-09-14-01~20，已全额实收）
--     ⤷ supplier pur_supplier 1-6 / 物料 inv_material MAT001-008(id 1-8) /
--       仓库 WH001 原材料仓・WH005 油墨仓(id 1,5) / 行级 purchase_order_item_id⤷po_line
--     状态 completed + qc_status pass×16 / fail×2 / partial×2，inspection_status=3
--     （approve() 自置口径）、finance_posted=1
--   - 4 张其他入库（期初导入）：物料 inv_material 4922/4924，仓库 WH001/WH004，
--     2×pending + 2×draft，inspection_status=0 / qc_status=pending
-- 旧数据软删（deleted=1，可按备份表回滚）；全程幂等。
-- 回滚：inv_inbound_order_bak_20260925 / inv_inbound_item_bak_20260925
-- ============================================================

-- 0. 备份（幂等）
CREATE TABLE IF NOT EXISTS inv_inbound_order_bak_20260925 AS
  SELECT * FROM inv_inbound_order;
CREATE TABLE IF NOT EXISTS inv_inbound_item_bak_20260925 AS
  SELECT * FROM inv_inbound_item;

-- 1. 软删旧数据（幂等：仅 deleted=0 命中一次；排除本迁移生成的 GRN-2026-09* 行，
--    因 uk_inbound_order_no 为 (order_no, deleted) 复合唯一键，重插行不可再软删）
UPDATE inv_inbound_order SET deleted = 1, update_time = NOW()
WHERE deleted = 0 AND order_no NOT LIKE 'GRN-2026-09%';
UPDATE inv_inbound_item ii
JOIN inv_inbound_order o ON o.id = ii.order_id
SET ii.deleted = 1
WHERE (ii.deleted = 0 OR ii.deleted IS NULL)
  AND o.order_no NOT LIKE 'GRN-2026-09%';

-- 1b. 清理重跑残影：GRN 行不允许存在软删副本（幂等，正常首跑 0 行）
DELETE ii FROM inv_inbound_item ii
JOIN inv_inbound_order o ON o.id = ii.order_id
WHERE ii.deleted = 1 AND o.order_no LIKE 'GRN-2026-09%' AND o.deleted = 1;
DELETE FROM inv_inbound_order
WHERE order_no LIKE 'GRN-2026-09%' AND deleted = 1;

-- 2. 采购入库 ×20（幂等守卫：同单号不存在才插）
INSERT INTO inv_inbound_order
  (order_no, order_type, warehouse_id, warehouse_code, warehouse_name,
   supplier_id, supplier_name, operator_id, operator_name,
   po_id, po_no, grn_type, total_amount, total_quantity,
   status, status_new, mandatory_qc, qc_status, qc_status_new,
   inbound_date, remark, create_by, create_time, update_time, deleted,
   currency, exchange_rate, base_total_amount, inspection_status, finance_posted)
SELECT
  CONCAT('GRN-2026-0916-', LPAD(ROW_NUMBER() OVER (ORDER BY o.id), 2, '0')),
  'purchase',
  w.wid, w.wcode, w.wname,
  o.supplier_id, o.supplier_name, 6, '陈明',
  o.id, o.po_no, 'po',
  l.order_qty * l.unit_price, l.order_qty,
  'completed', 1, 1,
  CASE WHEN (o.id - 285) % 10 = 8 THEN 'fail'      -- id 293/303 → 2 张
       WHEN (o.id - 285) % 10 = 9 THEN 'partial'   -- id 294/304 → 2 张
       ELSE 'pass' END,
  CASE WHEN (o.id - 285) % 10 = 8 THEN 2
       WHEN (o.id - 285) % 10 = 9 THEN 0
       ELSE 1 END,
  DATE_ADD(o.order_date, INTERVAL 2 DAY),
  '按采购单到货入库',
  6, NOW(), NOW(), 0,
  o.currency, o.exchange_rate,
  l.order_qty * l.unit_price * o.exchange_rate,
  3, 1
FROM pur_purchase_order o
JOIN pur_purchase_order_line l ON l.po_id = o.id
JOIN (
  SELECT 1 AS wid, 'WH001' AS wcode, '原材料仓' AS wname
  UNION ALL SELECT 5, 'WH005', '油墨仓'
) w ON w.wid = CASE WHEN l.material_id IN (6, 7, 8) THEN 5 ELSE 1 END
WHERE o.deleted = 0 AND o.id BETWEEN 285 AND 304
  AND NOT EXISTS (
    SELECT 1 FROM inv_inbound_order i
    WHERE i.po_id = o.id AND i.order_type = 'purchase' AND i.deleted = 0
  );

-- 3. 采购入库明细 ×20（关联刚插入的表头 + 采购行）
INSERT INTO inv_inbound_item
  (order_id, material_id, material_code, material_name, material_spec,
   batch_no, quantity, unit, unit_price, total_price,
   warehouse_location, produce_date, deleted,
   base_unit_price, base_amount, purchase_order_item_id, purchase_order_line_no,
   po_line_id, line_no, accepted_qty, rejected_qty, qc_result,
   qc_inspector_id, qc_time, warehouse_id, putaway_status, is_consumed)
SELECT
  h.id, l.material_id, l.material_code, l.material_name, l.material_spec,
  CONCAT('B20260916', LPAD(h.po_id - 284, 2, '0')),
  l.order_qty, l.unit, l.unit_price, l.order_qty * l.unit_price,
  CONCAT('A-', LPAD(h.po_id % 10, 2, '0')),
  h.inbound_date, 0,
  l.unit_price, l.order_qty * l.unit_price * h.exchange_rate, l.id, 1,
  l.id, 1,
  CASE h.qc_status WHEN 'pass' THEN l.order_qty
                   WHEN 'fail' THEN 0
                   ELSE ROUND(l.order_qty * 0.8, 0) END,
  CASE h.qc_status WHEN 'pass' THEN 0
                   WHEN 'fail' THEN l.order_qty
                   ELSE l.order_qty - ROUND(l.order_qty * 0.8, 0) END,
  h.qc_status,
  7, h.inbound_date,
  h.warehouse_id, 'done', 0
FROM inv_inbound_order h
JOIN pur_purchase_order o ON o.id = h.po_id
JOIN pur_purchase_order_line l ON l.po_id = o.id
WHERE h.deleted = 0 AND h.order_type = 'purchase'
  AND h.order_no LIKE 'GRN-2026-0916-%'
  AND NOT EXISTS (
    SELECT 1 FROM inv_inbound_item ii WHERE ii.order_id = h.id AND (ii.deleted = 0 OR ii.deleted IS NULL)
  );

-- 4. 其他入库（期初导入）×4：2×pending + 2×draft，物料 4922/4924（真实主数据）
INSERT INTO inv_inbound_order
  (order_no, order_type, warehouse_id, warehouse_code, warehouse_name,
   supplier_id, supplier_name, operator_id, operator_name,
   po_id, po_no, grn_type, total_amount, total_quantity,
   status, status_new, mandatory_qc, qc_status, qc_status_new,
   inbound_date, remark, create_by, create_time, update_time, deleted,
   currency, exchange_rate, base_total_amount, inspection_status, finance_posted)
SELECT
  CONCAT('GRN-2026-0920-', LPAD(20 + m.seq, 2, '0')),
  'other',
  m.wid, m.wcode, m.wname,
  NULL, NULL, 6, '陈明',
  NULL, NULL, NULL,
  ROUND(m.qty * COALESCE(NULLIF(m.purchase_price, 0), 5), 2), m.qty,
  m.st, 1, 0, 'pending', 0,
  m.inb_date, '期初库存导入',
  6, NOW(), NOW(), 0,
  'CNY', 1,
  ROUND(m.qty * COALESCE(NULLIF(m.purchase_price, 0), 5), 2),
  0, 0
FROM (
  SELECT 1 AS seq, 500 AS qty, 'pending' AS st, '2026-09-20' AS inb_date,
         1 AS wid, 'WH001' AS wcode, '原材料仓' AS wname, purchase_price
  FROM inv_material WHERE id = 4922
  UNION ALL
  SELECT 2, 300, 'pending',  '2026-09-21',
         4, 'WH004', '辅料仓', purchase_price
  FROM inv_material WHERE id = 4924
  UNION ALL
  SELECT 3, 200, 'draft',    '2026-09-22',
         1, 'WH001', '原材料仓', purchase_price
  FROM inv_material WHERE id = 4922
  UNION ALL
  SELECT 4, 150, 'draft',    '2026-09-23',
         4, 'WH004', '辅料仓', purchase_price
  FROM inv_material WHERE id = 4924
) m
WHERE NOT EXISTS (
  SELECT 1 FROM inv_inbound_order i
  WHERE i.order_no = CONCAT('GRN-2026-0920-', LPAD(20 + m.seq, 2, '0'))
);

INSERT INTO inv_inbound_item
  (order_id, material_id, material_code, material_name, material_spec,
   batch_no, quantity, unit, unit_price, total_price,
   warehouse_location, produce_date, deleted,
   base_unit_price, base_amount, line_no,
   accepted_qty, rejected_qty, qc_result, warehouse_id, putaway_status, is_consumed)
SELECT
  h.id, m.id, m.material_code, m.material_name, m.specification,
  CONCAT('B', DATE_FORMAT(h.inbound_date, '%Y%m%d'), '-', LPAD(h.id % 100, 2, '0')),
  h.total_quantity, m.unit,
  COALESCE(NULLIF(m.purchase_price, 0), 5),
  ROUND(h.total_quantity * COALESCE(NULLIF(m.purchase_price, 0), 5), 2),
  'A-01', h.inbound_date, 0,
  COALESCE(NULLIF(m.purchase_price, 0), 5),
  ROUND(h.total_quantity * COALESCE(NULLIF(m.purchase_price, 0), 5) * h.exchange_rate, 2),
  1,
  0, 0, 'pending', h.warehouse_id,
  CASE h.status WHEN 'completed' THEN 'done' ELSE 'pending' END,
  0
FROM inv_inbound_order h
JOIN inv_material m ON m.id IN (4922, 4924)
WHERE h.deleted = 0 AND h.order_type = 'other'
  AND h.order_no LIKE 'GRN-2026-0920-%'
  AND (
       (h.warehouse_id = 1 AND m.id = 4922)
    OR (h.warehouse_id = 4 AND m.id = 4924)
  )
  AND NOT EXISTS (
    SELECT 1 FROM inv_inbound_item ii WHERE ii.order_id = h.id AND (ii.deleted = 0 OR ii.deleted IS NULL)
  );

-- 5. 表头数量/金额与明细对齐（幂等守卫，防四舍五入尾差）
UPDATE inv_inbound_order o
JOIN (
  SELECT order_id, SUM(quantity) AS sq, SUM(total_price) AS st
  FROM inv_inbound_item
  WHERE deleted = 0 OR deleted IS NULL
  GROUP BY order_id
) t ON t.order_id = o.id
SET o.total_quantity = t.sq,
    o.total_amount = t.st,
    o.base_total_amount = ROUND(t.st * o.exchange_rate, 2)
WHERE o.deleted = 0
  AND (NOT (o.total_quantity <=> t.sq) OR NOT (o.total_amount <=> t.st));
