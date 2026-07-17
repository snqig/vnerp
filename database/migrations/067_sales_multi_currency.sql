-- 销售模块多币种字段
-- Phase 2b: 销售订单/出库/退货/对账表补 currency + exchange_rate + base_* 字段

-- sal_order（已有 currency + exchange_rate）
ALTER TABLE `sal_order`
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `total_amount`,
  ADD COLUMN `base_tax_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币税额' AFTER `tax_amount`,
  ADD COLUMN `base_grand_total` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币含税总额' AFTER `total_with_tax`;

-- sal_order_detail
ALTER TABLE `sal_order_detail`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `material_spec`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`,
  ADD COLUMN `base_tax_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币税额' AFTER `tax_amount`;

-- sal_delivery
ALTER TABLE `sal_delivery`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

-- sal_delivery_detail
ALTER TABLE `sal_delivery_detail`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

-- sal_return
ALTER TABLE `sal_return`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

-- sal_return_detail
ALTER TABLE `sal_return_detail`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

-- sal_reconciliation
ALTER TABLE `sal_reconciliation`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_delivery_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币出库金额' AFTER `delivery_amount`,
  ADD COLUMN `base_return_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币退货金额' AFTER `return_amount`,
  ADD COLUMN `base_net_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币净额' AFTER `net_amount`,
  ADD COLUMN `base_discount_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币折扣金额' AFTER `discount_amount`,
  ADD COLUMN `base_received_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币实收金额' AFTER `received_amount`,
  ADD COLUMN `base_balance_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币余额' AFTER `balance_amount`;

-- 旧数据回填
UPDATE `sal_order` SET `base_total_amount` = `total_amount`, `base_tax_amount` = `tax_amount`, `base_grand_total` = `total_with_tax` WHERE `base_total_amount` = 0;
UPDATE `sal_delivery` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
UPDATE `sal_return` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
