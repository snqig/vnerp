-- 二维码核心表结构
CREATE TABLE IF NOT EXISTS `inv_qr_code` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `qr_code` VARCHAR(100) NOT NULL COMMENT '二维码编码',
  `qr_type` VARCHAR(50) NOT NULL COMMENT '二维码类型: material/product/batch/workorder/inbound/outbound',
  `source_type` VARCHAR(50) NOT NULL COMMENT '来源类型',
  `source_id` BIGINT UNSIGNED NOT NULL COMMENT '来源ID',
  `source_no` VARCHAR(100) COMMENT '来源单号',
  `material_id` BIGINT UNSIGNED COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码',
  `material_name` VARCHAR(100) COMMENT '物料名称',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `work_order_no` VARCHAR(50) COMMENT '工单号',
  `warehouse_id` BIGINT UNSIGNED COMMENT '仓库ID',
  `warehouse_name` VARCHAR(100) COMMENT '仓库名称',
  `production_date` DATE COMMENT '生产日期',
  `expire_date` DATE COMMENT '到期日期',
  `qr_image_url` TEXT COMMENT '二维码图片URL',
  `trace_url` VARCHAR(500) COMMENT '追溯链接',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/invalidated/void',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_qr_code` (`qr_code`),
  KEY `idx_source` (`source_type`, `source_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_work_order` (`work_order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='二维码主表';

-- 二维码扫描日志表
CREATE TABLE IF NOT EXISTS `qrcode_scan_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `qr_code` VARCHAR(100) NOT NULL COMMENT '二维码编码',
  `qr_type` VARCHAR(50) COMMENT '二维码类型',
  `scan_type` VARCHAR(50) NOT NULL COMMENT '扫描类型: inbound/outbound/issue/report/check/inventory/ink_open/plate_use/die_use/trace',
  `ref_id` BIGINT COMMENT '关联ID',
  `ref_no` VARCHAR(100) COMMENT '关联单号',
  `operator_id` BIGINT COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人',
  `scan_result` VARCHAR(20) DEFAULT 'success' COMMENT '扫描结果: success/fail',
  `scan_message` VARCHAR(500) COMMENT '扫描消息',
  `scan_data` TEXT COMMENT '扫描数据JSON',
  `device_info` VARCHAR(200) COMMENT '设备信息',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_qr_code` (`qr_code`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='二维码扫描日志';

-- 打印模板表
CREATE TABLE IF NOT EXISTS `sys_print_template` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_code` VARCHAR(50) NOT NULL COMMENT '模板编码',
  `template_name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `template_type` VARCHAR(50) NOT NULL COMMENT '模板类型: purchase_order/sales_order/inbound/outbound/workorder/label/tag',
  `template_content` TEXT COMMENT '模板内容JSON',
  `page_size` VARCHAR(20) DEFAULT 'A4' COMMENT '纸张大小',
  `orientation` VARCHAR(10) DEFAULT 'portrait' COMMENT 'orientation: portrait/landscape',
  `margin_top` DECIMAL(10,2) DEFAULT 10 COMMENT '上边距mm',
  `margin_bottom` DECIMAL(10,2) DEFAULT 10 COMMENT '下边距mm',
  `margin_left` DECIMAL(10,2) DEFAULT 10 COMMENT '左边距mm',
  `margin_right` DECIMAL(10,2) DEFAULT 10 COMMENT '右边距mm',
  `is_default` TINYINT DEFAULT 0 COMMENT '是否默认模板',
  `is_active` TINYINT DEFAULT 1 COMMENT '是否启用',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_by` BIGINT COMMENT '创建人',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`),
  KEY `idx_template_type` (`template_type`),
  KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打印模板配置表';

-- 初始化默认打印模板
INSERT INTO `sys_print_template` (`template_code`, `template_name`, `template_type`, `template_content`, `is_default`) VALUES
('PO_PRINT', '采购订单打印模板', 'purchase_order', '{"title":"采购订单","fields":[{"key":"order_no","label":"订单号"},{"key":"supplier_name","label":"供应商"},{"key":"order_date","label":"订单日期"},{"key":"total_amount","label":"总金额"}]}', 1),
('SO_PRINT', '销售订单打印模板', 'sales_order', '{"title":"销售订单","fields":[{"key":"order_no","label":"订单号"},{"key":"customer_name","label":"客户"},{"key":"order_date","label":"订单日期"},{"key":"total_amount","label":"总金额"}]}', 1),
('INBOUND_PRINT', '入库单打印模板', 'inbound', '{"title":"入库单","fields":[{"key":"inbound_no","label":"入库单号"},{"key":"warehouse_name","label":"仓库"},{"key":"inbound_date","label":"入库日期"}]}', 1),
('OUTBOUND_PRINT', '出库单打印模板', 'outbound', '{"title":"出库单","fields":[{"key":"outbound_no","label":"出库单号"},{"key":"warehouse_name","label":"仓库"},{"key":"outbound_date","label":"出库日期"}]}', 1),
('WORKORDER_PRINT', '工单打印模板', 'workorder', '{"title":"生产工单","fields":[{"key":"work_order_no","label":"工单号"},{"key":"product_name","label":"产品"},{"key":"plan_qty","label":"计划数量"},{"key":"plan_end_date","label":"计划完成日期"}]}', 1),
('MATERIAL_LABEL', '物料标签模板', 'label', '{"title":"物料标签","fields":[{"key":"material_code","label":"物料编码"},{"key":"material_name","label":"物料名称"},{"key":"batch_no","label":"批次号"},{"key":"quantity","label":"数量"},{"key":"production_date","label":"生产日期"}],"include_qr":true}', 1),
('PRODUCT_LABEL', '产品标签模板', 'tag', '{"title":"产品标签","fields":[{"key":"product_code","label":"产品编码"},{"key":"product_name","label":"产品名称"},{"key":"work_order_no","label":"工单号"},{"key":"quantity","label":"数量"}],"include_qr":true}', 1);
