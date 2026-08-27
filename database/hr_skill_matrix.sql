-- 技能矩阵表：岗位 × 技能 × 等级
CREATE TABLE IF NOT EXISTS `hr_skill_matrix` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
  `skill_code` VARCHAR(50) NOT NULL COMMENT '技能编码',
  `skill_name` VARCHAR(100) NOT NULL COMMENT '技能名称',
  `skill_category` VARCHAR(50) DEFAULT NULL COMMENT '技能分类(printing/binding/finishing/maintenance)',
  `skill_level` TINYINT DEFAULT 1 COMMENT '技能等级 1-5',
  `certified` TINYINT DEFAULT 0 COMMENT '是否认证 0/1',
  `certificate_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联证书ID',
  `assessor` VARCHAR(50) DEFAULT NULL COMMENT '评估人',
  `assess_date` DATE DEFAULT NULL COMMENT '评估日期',
  `next_assess_date` DATE DEFAULT NULL COMMENT '下次评估日期',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_sk_employee` (`employee_id`),
  KEY `idx_sk_category` (`skill_category`),
  KEY `idx_sk_level` (`skill_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工技能矩阵';

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
