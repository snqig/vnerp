-- =============================================================
-- 084_backfill_sales_order_base_amounts.sql
--
-- 目的：回填 sal_order 的币种/本位币快照列。
--
-- 背景（BUG-ORD-003）：
--   `/api/orders` 的 POST 自上线起只写 total_amount，从不写 currency /
--   exchange_rate / base_total_amount / base_tax_amount / base_grand_total，
--   导致存量行的 base_* 全部停留在 DEFAULT 0.0000，而 /orders/sales 列表的
--   「本位币金额」列正是取 base_total_amount —— 表现为「有金额却不显示数据」。
--
--   代码侧（src/app/api/orders/route.ts）已修复写入与读取；本迁移负责把
--   历史行按 exchange_rate 折算补齐，使历史订单与新建订单口径一致。
--
-- 口径（与 SalesApplicationService.createOrder 一致）：
--   base_total_amount = round(total_amount * exchange_rate, 4)
--   base_tax_amount   = round(max(total_with_tax - total_amount, 0) * exchange_rate, 4)
--   base_grand_total  = base_total_amount + base_tax_amount
--   注：不做自动加税（finance.tax_rate 不参与），仅折算库中已记录的税额。
--
-- 幂等性：WHERE 命中一次后 base_total_amount 不再为 0，重复执行不会改动任何行。
--
-- 迁移前留痕：
--   SELECT id, order_no, currency, exchange_rate, total_amount, total_with_tax,
--          base_total_amount, base_tax_amount, base_grand_total
--     FROM sal_order
--    WHERE deleted = 0 AND base_total_amount = 0 AND total_amount <> 0
--    ORDER BY id;
--
-- 迁移后自检（期望 0 行）：
--   SELECT COUNT(*) AS remaining FROM sal_order
--    WHERE deleted = 0 AND base_total_amount = 0 AND total_amount <> 0;
-- =============================================================

-- 0) 先把缺失汇率的行归一为 1.0000，避免 NULL 让折算结果为 NULL
UPDATE `sal_order`
   SET `exchange_rate` = 1.0000
 WHERE `exchange_rate` IS NULL;

-- 0b) 币种为空的行补本位币（库里 COLUMN DEFAULT 为 CNY，此处显式兜底空串/NULL）
UPDATE `sal_order`
   SET `currency` = 'CNY'
 WHERE `currency` IS NULL OR `currency` = '';

-- 1) 本位币不含税金额
UPDATE `sal_order`
   SET `base_total_amount` = ROUND(`total_amount` * `exchange_rate`, 4)
 WHERE `deleted` = 0
   AND `base_total_amount` = 0
   AND `total_amount` <> 0;

-- 2) 本位币税额（仅折算库中已记录的税，负差归零）
UPDATE `sal_order`
   SET `base_tax_amount` = ROUND(GREATEST(`total_with_tax` - `total_amount`, 0) * `exchange_rate`, 4)
 WHERE `deleted` = 0
   AND `total_amount` <> 0
   AND `base_tax_amount` = 0
   AND `total_with_tax` > `total_amount`;

-- 3) 本位币价税合计
UPDATE `sal_order`
   SET `base_grand_total` = ROUND(`base_total_amount` + `base_tax_amount`, 4)
 WHERE `deleted` = 0
   AND `total_amount` <> 0
   AND `base_grand_total` = 0
   AND (`base_total_amount` <> 0 OR `base_tax_amount` <> 0);
