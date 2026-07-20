-- 证书表
CREATE TABLE IF NOT EXISTS `hr_certificate` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
  `cert_name` VARCHAR(200) NOT NULL COMMENT '证书名称',
  `cert_code` VARCHAR(100) DEFAULT NULL COMMENT '证书编号',
  `cert_type` VARCHAR(50) DEFAULT NULL COMMENT '证书类型(operation/safety/quality/skill)',
  `issue_authority` VARCHAR(200) DEFAULT NULL COMMENT '发证机关',
  `issue_date` DATE DEFAULT NULL COMMENT '发证日期',
  `expiry_date` DATE DEFAULT NULL COMMENT '到期日期',
  `remind_days` INT DEFAULT 30 COMMENT '提前提醒天数',
  `status` TINYINT DEFAULT 1 COMMENT '状态 1有效 0过期',
  `file_url` VARCHAR(500) DEFAULT NULL COMMENT '证书扫描件',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_ce_employee` (`employee_id`),
  KEY `idx_ce_type` (`cert_type`),
  KEY `idx_ce_expiry` (`expiry_date`),
  KEY `idx_ce_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工证书';
