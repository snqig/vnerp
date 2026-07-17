-- 065_backfill_purchase_currency.sql
-- Phase 2a: 历史数据回填 — 按订单日期查汇率，查不到 fallback 1.0

-- 1. 回填供应商默认币种
UPDATE pur_supplier SET default_currency = 'CNY' WHERE default_currency IS NULL;

-- 2. 回填采购订单 currency + exchange_rate（若为空）
UPDATE pur_purchase_order SET currency = 'CNY' WHERE currency IS NULL OR currency = '';
UPDATE pur_purchase_order SET exchange_rate = 1.0000 WHERE exchange_rate IS NULL OR exchange_rate = 0;

-- 3. 回填采购订单 base_* 字段（仅处理 base_grand_total = 0 且 grand_total > 0 的记录）
-- 使用子查询按 order_date 查历史汇率，查不到则用 1.0
UPDATE pur_purchase_order po
LEFT JOIN (
  SELECT po2.id, COALESCE(
    (SELECT rate FROM sys_exchange_rate er
     WHERE er.from_currency = po2.currency AND er.to_currency = 'CNY'
       AND er.rate_date <= po2.order_date
     ORDER BY er.rate_date DESC LIMIT 1),
    1.0000
  ) AS historical_rate
  FROM pur_purchase_order po2
  WHERE po2.base_grand_total = 0 AND po2.grand_total > 0
) rates ON po.id = rates.id
SET po.exchange_rate = rates.historical_rate,
    po.base_total_amount = ROUND(po.total_amount * rates.historical_rate, 4),
    po.base_tax_amount = ROUND(po.tax_amount * rates.historical_rate, 4),
    po.base_grand_total = ROUND(po.grand_total * rates.historical_rate, 4)
WHERE rates.id IS NOT NULL;

-- 4. 回填采购订单明细 base_* 字段
UPDATE pur_purchase_order_line pol
INNER JOIN pur_purchase_order po ON pol.po_id = po.id
SET pol.base_unit_price = ROUND(pol.unit_price * po.exchange_rate, 4),
    pol.base_amount = ROUND(pol.amount * po.exchange_rate, 4),
    pol.base_tax_amount = ROUND(pol.tax_amount * po.exchange_rate, 4),
    pol.base_line_total = ROUND(pol.line_total * po.exchange_rate, 4)
WHERE pol.base_line_total = 0 AND pol.line_total > 0;

-- 5. 回填退货单 currency + exchange_rate + base_total_amount
UPDATE pur_purchase_return pr
INNER JOIN pur_purchase_order po ON pr.order_id = po.id
SET pr.currency = po.currency,
    pr.exchange_rate = po.exchange_rate,
    pr.base_total_amount = ROUND(pr.total_amount * po.exchange_rate, 4)
WHERE pr.base_total_amount = 0 AND pr.total_amount > 0;

-- 6. 回填对账单（旧记录按 1.0 回填）
UPDATE pur_purchase_reconciliation SET currency = 'CNY' WHERE currency IS NULL OR currency = '';
UPDATE pur_purchase_reconciliation SET exchange_rate = 1.0000 WHERE exchange_rate IS NULL OR exchange_rate = 0;
UPDATE pur_purchase_reconciliation
SET base_receipt_amount = ROUND(receipt_amount * exchange_rate, 4),
    base_return_amount = ROUND(return_amount * exchange_rate, 4),
    base_net_amount = ROUND(net_amount * exchange_rate, 4),
    base_discount_amount = ROUND(discount_amount * exchange_rate, 4),
    base_paid_amount = ROUND(paid_amount * exchange_rate, 4),
    base_balance_amount = ROUND(balance_amount * exchange_rate, 4)
WHERE base_balance_amount = 0 AND balance_amount > 0;
