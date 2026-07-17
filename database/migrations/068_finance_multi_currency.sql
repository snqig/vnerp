-- 财务模块多币种字段
-- Phase 2b: 应付/应收/付款/收款记录补 currency + exchange_rate + base_amount 字段

ALTER TABLE `fin_payable`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

ALTER TABLE `fin_receivable`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

ALTER TABLE `fin_payment_record`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

ALTER TABLE `fin_receipt_record`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

-- 旧数据回填
UPDATE `fin_payable` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_receivable` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_payment_record` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_receipt_record` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
