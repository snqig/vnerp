-- T063: 多币种基础设施 — 币种主数据 + 汇率表 + 公司本位币字段

-- 1. 币种主数据表
CREATE TABLE IF NOT EXISTS `sys_currency` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL COMMENT '币种代码 ISO 4217 (CNY/USD/VND)',
  `name` varchar(50) NOT NULL COMMENT '币种名称',
  `symbol` varchar(10) DEFAULT NULL COMMENT '符号 (¥/$/₫)',
  `decimal_places` tinyint DEFAULT 2 COMMENT '小数位 (CNY=2, USD=2, VND=0)',
  `status` tinyint DEFAULT 1 COMMENT '1启用 0停用',
  `sort` int DEFAULT 0,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='币种主数据';

-- 预置数据
INSERT INTO `sys_currency` (`code`, `name`, `symbol`, `decimal_places`, `sort`) VALUES
  ('CNY', '人民币', '¥', 2, 1),
  ('USD', '美元', '$', 2, 2),
  ('VND', '越南盾', '₫', 0, 3)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. 汇率表
CREATE TABLE IF NOT EXISTS `sys_exchange_rate` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `from_currency` varchar(10) NOT NULL COMMENT '源币种',
  `to_currency` varchar(10) NOT NULL COMMENT '目标币种',
  `rate` decimal(18,6) NOT NULL COMMENT '汇率',
  `rate_date` date NOT NULL COMMENT '汇率日期',
  `source` varchar(50) DEFAULT 'manual' COMMENT '汇率来源 manual/api',
  `remark` varchar(200) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_from_to_date` (`from_currency`,`to_currency`,`rate_date`),
  KEY `idx_date` (`rate_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='汇率表';

-- 3. 公司表加本位币字段（幂等）
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_company' AND COLUMN_NAME = 'base_currency');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sys_company` ADD COLUMN `base_currency` varchar(10) DEFAULT ''CNY'' COMMENT ''本位币'' AFTER `tax_no`',
  'SELECT ''base_currency already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
