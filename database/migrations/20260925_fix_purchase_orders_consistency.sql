-- ============================================================
-- 20260925_fix_purchase_orders_consistency.sql
-- purchase/orders 三层一致性治理（数据层）
--
-- 根因（2026-09-25 DB 运行时核实）：
--   1. 列表「期望到货」全空：pur_purchase_order 200 行 active 中 delivery_date 200/200 NULL
--      （POST 链路 body.delivery_date 缺省时落 NULL；历史 QA 造数也未填）。
--   2. 「发料/订单明细」列表内容错乱：pur_purchase_order_line 大量行金额不一致
--      （实测 unit_price=10 但 base_unit_price=2000、line_total=10 与 amount=2000 并存）。
--   3. 存量 status=2/3 为旧码（旧口径 1待下单/2已下单/3部分到货/4已完成），
--      新值域为 10/20/30/40/50/90/99（PurchaseOrderStatus.fromDbCode 遇 2/3 抛 DomainError）
--      → 按状态筛选报错、状态徽标无法渲染、stats 统计口径错位。
--
-- 原则：幂等（重跑 affectedRows=0）；只修数据不改结构；先备份。
-- 回滚：pur_purchase_order_bak_20260925 / pur_purchase_order_line_bak_20260925
-- ============================================================

-- 0. 备份（幂等：已存在则跳过）
CREATE TABLE IF NOT EXISTS pur_purchase_order_bak_20260925 AS
  SELECT * FROM pur_purchase_order;
CREATE TABLE IF NOT EXISTS pur_purchase_order_line_bak_20260925 AS
  SELECT * FROM pur_purchase_order_line;

-- 1. 回填 delivery_date：order_date + (7 + id%14) 天（仅在为 NULL 时，幂等）
UPDATE pur_purchase_order
SET delivery_date = DATE_ADD(order_date, INTERVAL 7 + (id % 14) DAY)
WHERE deleted = 0 AND delivery_date IS NULL AND order_date IS NOT NULL;

-- 2. 回填行级 require_date：delivery_date - 3 天，但不早于 order_date（仅在为 NULL 时，幂等）
UPDATE pur_purchase_order_line l
JOIN pur_purchase_order o ON o.id = l.po_id
SET l.require_date = GREATEST(o.order_date, DATE_SUB(o.delivery_date, INTERVAL 3 DAY))
WHERE o.deleted = 0 AND l.require_date IS NULL
  AND o.delivery_date IS NOT NULL AND o.order_date IS NOT NULL;

-- 3. 存量旧码 2/3 → 新值域（按实收进度映射，幂等：跑完即无 2/3）
--    实收 >= 订量 > 0 → 50 已完成；有实收 → 40 部分到货；无实收 → 30 已审核
UPDATE pur_purchase_order
SET status = CASE
  WHEN received_quantity > 0 AND received_quantity >= total_quantity THEN 50
  WHEN received_quantity > 0 THEN 40
  ELSE 30
END
WHERE deleted = 0 AND status IN (2, 3);

-- 4. 行金额一致性重算（仅修不一致行，幂等）
UPDATE pur_purchase_order_line l
JOIN pur_purchase_order o ON o.id = l.po_id
SET l.amount          = ROUND(l.order_qty * l.unit_price, 2),
    l.tax_amount      = ROUND(l.order_qty * l.unit_price * l.tax_rate / 100, 2),
    l.line_total      = ROUND(l.order_qty * l.unit_price * (1 + l.tax_rate / 100), 2),
    l.base_unit_price = ROUND(l.unit_price * o.exchange_rate, 4),
    l.base_amount     = ROUND(l.order_qty * l.unit_price * o.exchange_rate, 2),
    l.base_tax_amount = ROUND(l.order_qty * l.unit_price * l.tax_rate / 100 * o.exchange_rate, 2),
    l.base_line_total = ROUND(l.order_qty * l.unit_price * (1 + l.tax_rate / 100) * o.exchange_rate, 2)
WHERE o.deleted = 0
  AND (
       NOT (l.amount <=> ROUND(l.order_qty * l.unit_price, 2))
    OR NOT (l.line_total <=> ROUND(l.order_qty * l.unit_price * (1 + l.tax_rate / 100), 2))
    OR NOT (l.base_unit_price <=> ROUND(l.unit_price * o.exchange_rate, 4))
    OR NOT (l.base_amount <=> ROUND(l.order_qty * l.unit_price * o.exchange_rate, 2))
  );

-- 5. 表头汇总与明细行对齐（仅修不一致行，幂等）
UPDATE pur_purchase_order o
JOIN (
  SELECT po_id,
         SUM(order_qty)    AS sq,
         SUM(amount)       AS sa,
         SUM(tax_amount)   AS st,
         SUM(line_total)   AS sl,
         SUM(received_qty) AS sr
  FROM pur_purchase_order_line
  GROUP BY po_id
) t ON t.po_id = o.id
SET o.total_quantity    = t.sq,
    o.total_amount      = t.sa,
    o.tax_amount        = t.st,
    o.grand_total       = t.sl,
    o.base_total_amount = ROUND(t.sa * o.exchange_rate, 2),
    o.base_tax_amount   = ROUND(t.st * o.exchange_rate, 2),
    o.base_grand_total  = ROUND(t.sl * o.exchange_rate, 2),
    o.received_quantity = t.sr
WHERE o.deleted = 0
  AND (
       NOT (o.total_quantity <=> t.sq)
    OR NOT (o.total_amount <=> t.sa)
    OR NOT (o.grand_total <=> t.sl)
    OR NOT (o.received_quantity <=> t.sr)
  );
