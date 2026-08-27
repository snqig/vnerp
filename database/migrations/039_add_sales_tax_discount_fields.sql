-- =====================================================
-- Migration 039: Add tax and discount fields to sales order
-- 补齐销售订单与采购订单对称的税额/折扣率字段。
-- sal_order 表已有 tax_amount/total_with_tax/discount_amount，缺 tax_rate 和 discount_rate
-- sal_order_detail 表已有 tax_rate/tax_amount/total_amount，完整无需修改
-- =====================================================

-- sal_order 主表添加 tax_rate 和 discount_rate
ALTER TABLE `sal_order`
  ADD COLUMN IF NOT EXISTS `tax_rate` DECIMAL(18,4) DEFAULT 0 COMMENT '订单税率(%)' AFTER `tax_amount`,
  ADD COLUMN IF NOT EXISTS `discount_rate` DECIMAL(18,4) DEFAULT 0 COMMENT '折扣率(%)' AFTER `discount_amount`;

-- sal_order_detail 表确认已有字段（无需修改，仅注释说明）
-- 已有: tax_rate, tax_amount, total_amount(含税行合计)
-- sal_order_detail.tax_rate 默认 0（由领域模型 SalesOrderLine.create 填充）
