-- 标签打印记录表
CREATE TABLE IF NOT EXISTS `label_print_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `qr_code` VARCHAR(100) NOT NULL COMMENT '二维码编码',
  `label_type` VARCHAR(50) NOT NULL COMMENT '标签类型: material/small/finished/shipping/workorder/ink',
  `label_spec` VARCHAR(50) COMMENT '标签规格: L-60x40',
  `printer_id` BIGINT UNSIGNED COMMENT '打印机ID',
  `printer_name` VARCHAR(100) COMMENT '打印机名称',
  `print_command` TEXT COMMENT '打印指令内容',
  `print_data` JSON COMMENT '打印数据JSON',
  `copies` INT DEFAULT 1 COMMENT '打印份数',
  `status` TINYINT DEFAULT 0 COMMENT '状态: 0=待打印, 1=打印中, 2=打印成功, 3=打印失败',
  `error_msg` TEXT COMMENT '错误信息',
  `operator_id` BIGINT COMMENT '操作员ID',
  `operator_name` VARCHAR(50) COMMENT '操作员姓名',
  `print_time` DATETIME COMMENT '打印时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_qr_code` (`qr_code`),
  KEY `idx_label_type` (`label_type`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签打印记录表';

-- 打印机配置表
CREATE TABLE IF NOT EXISTS `printer_configs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `printer_name` VARCHAR(50) NOT NULL COMMENT '打印机名称',
  `printer_type` VARCHAR(20) NOT NULL COMMENT '类型: zebra/tsc/godex/laser',
  `connection_type` VARCHAR(20) NOT NULL COMMENT '连接方式: usb/serial/network/bluetooth',
  `connection_config` JSON COMMENT '连接配置（端口/IP等）',
  `label_width` DECIMAL(5,2) COMMENT '标签宽度(mm)',
  `label_height` DECIMAL(5,2) COMMENT '标签高度(mm)',
  `dpi` INT COMMENT '分辨率',
  `is_default` TINYINT DEFAULT 0 COMMENT '是否默认打印机',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_printer_name` (`printer_name`),
  KEY `idx_is_default` (`is_default`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打印机配置表';

-- 初始化默认打印机
INSERT INTO `printer_configs` (`printer_name`, `printer_type`, `connection_type`, `label_width`, `label_height`, `dpi`, `is_default`, `status`) VALUES
('Zebra ZT230', 'zebra', 'usb', 60, 40, 203, 1, 1),
('TSC TTP-244', 'tsc', 'usb', 60, 40, 203, 0, 1),
('Godex G500', 'godex', 'usb', 80, 60, 203, 0, 1);