-- 库存模块多币种字段
-- Phase 2b: 入库/出库表补 currency + exchange_rate + base_amount 字段

-- inv_inbound_order
ALTER TABLE `inv_inbound_order`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

-- inv_inbound_item
ALTER TABLE `inv_inbound_item`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

-- inv_outbound_order
ALTER TABLE `inv_outbound_order`
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

-- inv_outbound_item
ALTER TABLE `inv_outbound_item`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

-- 旧数据回填
UPDATE `inv_inbound_order` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
UPDATE `inv_outbound_order` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
