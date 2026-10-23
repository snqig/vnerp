-- 20261004 报价单转销售订单链接字段（打通 sal_quote → sal_order 断头路）
-- 背景：generate-quote 只写入 sal_quote，无任何 quote→sal_order 转换链路（见 docs/Read.md #7）
ALTER TABLE sal_quote
  ADD COLUMN sales_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '转换生成的销售订单ID',
  ADD COLUMN sales_order_no VARCHAR(50) DEFAULT NULL COMMENT '转换生成的销售订单号',
  ADD COLUMN converted_at DATETIME DEFAULT NULL COMMENT '转订单时间';
