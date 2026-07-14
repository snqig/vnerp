-- T001: 工单 BOM 表 + 打样报价表
-- 前置：migration 054 已创建 prd_pick_order 等核心流程表

-- 1. 工单 BOM 表
CREATE TABLE IF NOT EXISTS `prd_work_order_bom` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` BIGINT UNSIGNED NOT NULL COMMENT '工单ID（prd_work_order.id）',
  `work_order_no` VARCHAR(50) DEFAULT NULL COMMENT '工单号（冗余）',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID（inv_material.id）',
  `material_code` VARCHAR(50) NOT NULL COMMENT '物料编码',
  `material_name` VARCHAR(100) NOT NULL COMMENT '物料名称',
  `specification` VARCHAR(255) DEFAULT NULL COMMENT '规格',
  `unit` VARCHAR(20) DEFAULT NULL COMMENT '单位',
  `required_qty` DECIMAL(18,4) NOT NULL COMMENT '需求数量',
  `picked_qty` DECIMAL(18,4) DEFAULT 0.0000 COMMENT '已领数量',
  `returned_qty` DECIMAL(18,4) DEFAULT 0.0000 COMMENT '已退数量',
  `unit_cost` DECIMAL(18,4) DEFAULT 0.0000 COMMENT '单价',
  `line_cost` DECIMAL(18,4) DEFAULT 0.0000 COMMENT '行成本',
  `item_type` TINYINT DEFAULT 1 COMMENT '1-主料 2-油墨 3-辅料',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单 BOM 表';

-- 2. 打样报价表
CREATE TABLE IF NOT EXISTS `sal_sample_quotation` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sample_order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联打样单ID',
  `quotation_no` VARCHAR(50) NOT NULL COMMENT '报价单号（唯一）',
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号',
  `material_cost` DECIMAL(14,4) DEFAULT 0.0000 COMMENT '物料成本',
  `labor_cost` DECIMAL(14,4) DEFAULT 0.0000 COMMENT '人工成本',
  `tool_cost` DECIMAL(14,4) DEFAULT 0.0000 COMMENT '工装成本',
  `overhead_cost` DECIMAL(14,4) DEFAULT 0.0000 COMMENT '制造费用',
  `total_cost` DECIMAL(14,4) DEFAULT 0.0000 COMMENT '总成本',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` DECIMAL(18,4) DEFAULT 1.0000 COMMENT '汇率',
  `profit_rate` DECIMAL(6,2) DEFAULT 20.00 COMMENT '利润率(%)',
  `quoted_price` DECIMAL(14,4) DEFAULT 0.0000 COMMENT '报价金额',
  `status` TINYINT DEFAULT 1 COMMENT '1-草稿 2-已确认 3-已作废',
  `valid_until` DATE DEFAULT NULL COMMENT '报价有效期',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `create_by` BIGINT UNSIGNED DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_quotation_no` (`quotation_no`),
  KEY `idx_sample_order` (`sample_order_id`),
  KEY `idx_quotation_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打样报价表';

-- 3. 扩展 sample_order 表（添加工艺卡、工单、销售订单关联字段）
ALTER TABLE `sample_order`
  ADD COLUMN IF NOT EXISTS `customer_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '客户ID' AFTER `customer_name`,
  ADD COLUMN IF NOT EXISTS `process_card_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联工艺卡ID' AFTER `customer_confirm`,
  ADD COLUMN IF NOT EXISTS `work_order_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '打样工单ID' AFTER `process_card_id`,
  ADD COLUMN IF NOT EXISTS `sales_order_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '转大货后销售订单ID' AFTER `work_order_id`,
  ADD COLUMN IF NOT EXISTS `create_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID' AFTER `remark`,
  ADD COLUMN IF NOT EXISTS `update_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID' AFTER `create_by`;

ALTER TABLE `sample_order`
  ADD KEY IF NOT EXISTS `idx_process_card` (`process_card_id`),
  ADD KEY IF NOT EXISTS `idx_work_order` (`work_order_id`);
