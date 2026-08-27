-- Migration 052: 打样报价单 — 一键生成报价
-- 依据: docs/打样工艺卡录入页统一完善方案.md (阶段 3)
-- 已确认工艺卡一键生成报价单，支持加价率、有效期、成本快照

-- 1. 报价单主表
CREATE TABLE IF NOT EXISTS `sal_quote` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_no` VARCHAR(50) NOT NULL COMMENT '报价单号',
  `quote_date` DATE NOT NULL,
  `customer_id` BIGINT UNSIGNED DEFAULT NULL,
  `customer_name` VARCHAR(100) DEFAULT NULL,
  `sample_card_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '来源工艺卡ID',
  `sample_no` VARCHAR(50) DEFAULT NULL,
  `product_name` VARCHAR(200) DEFAULT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit` VARCHAR(20) DEFAULT 'pcs',
  `material_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '物料成本快照',
  `labor_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '人工成本快照',
  `tool_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '工装成本快照',
  `total_cost` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '成本合计快照',
  `markup_rate` DECIMAL(5,2) DEFAULT 30.00 COMMENT '加价率(%)',
  `quoted_price` DECIMAL(12,4) DEFAULT 0.0000 COMMENT '报价金额',
  `currency` VARCHAR(10) DEFAULT 'CNY',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1-草稿 2-已发送 3-已接受 4-已拒绝 5-已作废',
  `valid_until` DATE DEFAULT NULL,
  `remark` TEXT DEFAULT NULL,
  `create_by` BIGINT UNSIGNED DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_by` BIGINT UNSIGNED DEFAULT NULL,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_quote_no` (`quote_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_sample_card` (`sample_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报价单主表';

-- 2. 报价明细表（支持多行报价，可选使用）
CREATE TABLE IF NOT EXISTS `sal_quote_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_id` BIGINT UNSIGNED NOT NULL,
  `line_no` INT NOT NULL DEFAULT 1,
  `item_name` VARCHAR(200) NOT NULL,
  `quantity` DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
  `unit` VARCHAR(20) DEFAULT 'pcs',
  `unit_cost` DECIMAL(12,4) DEFAULT 0.0000,
  `unit_price` DECIMAL(12,4) DEFAULT 0.0000,
  `total_price` DECIMAL(12,4) DEFAULT 0.0000,
  `remark` VARCHAR(255) DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quote_id` (`quote_id`),
  CONSTRAINT `fk_quote_item_quote` FOREIGN KEY (`quote_id`) REFERENCES `sal_quote` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报价单明细表';
