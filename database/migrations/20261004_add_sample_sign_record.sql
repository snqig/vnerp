-- 20261004 打样签样标准管理闭环（签样登记 + 留样 + 色样档案）
-- 背景：签样仅翻转 sal_sample_order.delivery_status='signed'，无留样登记、色样档案与 Lab 基准
--       （见 docs/Read.md 差距 #2）。色样 Lab 基准供 qms_lab_test(test_type=color_diff) 对照计算 ΔE。
CREATE TABLE IF NOT EXISTS `sal_sample_sign_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '签样登记ID',
  `sign_no` VARCHAR(50) NOT NULL COMMENT '签样登记编号(SG+日期+序号)',
  `sample_order_id` BIGINT UNSIGNED NOT NULL COMMENT '打样订单ID',
  `sample_order_no` VARCHAR(50) DEFAULT NULL COMMENT '打样订单号(快照)',
  `customer_name` VARCHAR(100) DEFAULT NULL COMMENT '客户名称(快照)',
  `product_name` VARCHAR(200) DEFAULT NULL COMMENT '产品名称(快照)',
  `sign_date` DATE NOT NULL COMMENT '签样日期',
  `sign_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '签样登记操作人(系统用户)',
  `customer_rep` VARCHAR(50) DEFAULT NULL COMMENT '客户签样代表',
  `retained_qty` INT DEFAULT 0 COMMENT '留样数量',
  `retained_location` VARCHAR(100) DEFAULT NULL COMMENT '留样存放位置',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `create_by` BIGINT UNSIGNED DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删: 0-正常 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sign_no` (`sign_no`),
  KEY `idx_sample_order` (`sample_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='打样签样登记表';

CREATE TABLE IF NOT EXISTS `sal_sample_color_standard` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '色样档案ID',
  `color_no` VARCHAR(50) NOT NULL COMMENT '色样编号(CS+日期+序号)',
  `sign_record_id` BIGINT UNSIGNED NOT NULL COMMENT '签样登记ID',
  `sample_order_id` BIGINT UNSIGNED NOT NULL COMMENT '打样订单ID',
  `sample_order_no` VARCHAR(50) DEFAULT NULL COMMENT '打样订单号(快照)',
  `color_name` VARCHAR(100) NOT NULL COMMENT '色名/专色名称',
  `l_value` DECIMAL(8,4) NOT NULL COMMENT 'CIE L* 基准值',
  `a_value` DECIMAL(8,4) NOT NULL COMMENT 'CIE a* 基准值',
  `b_value` DECIMAL(8,4) NOT NULL COMMENT 'CIE b* 基准值',
  `measure_device` VARCHAR(100) DEFAULT NULL COMMENT '测量仪器',
  `measure_date` DATE DEFAULT NULL COMMENT '测量日期',
  `color_sample_url` VARCHAR(255) DEFAULT NULL COMMENT '色样照片/图档路径',
  `de_threshold` DECIMAL(5,2) DEFAULT 1.50 COMMENT 'ΔE 判定阈值(默认1.5)',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `create_by` BIGINT UNSIGNED DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删: 0-正常 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_color_no` (`color_no`),
  KEY `idx_sign_record` (`sign_record_id`),
  KEY `idx_sample_order` (`sample_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='签样色样档案表(Lab基准)';
