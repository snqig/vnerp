-- 入库管理表结构
-- 创建时间: 2024-03-20
-- 描述: 入库单管理和物料标签管理

-- 删除已存在的表
DROP TABLE IF EXISTS `inv_inbound_label`;
DROP TABLE IF EXISTS `inv_inbound_item`;
DROP TABLE IF EXISTS `inv_inbound_order`;

-- 入库单主表
CREATE TABLE `inv_inbound_order` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_no` VARCHAR(30) NOT NULL COMMENT '入库单号',
  `order_date` DATE NOT NULL COMMENT '入库日期',
  `purchase_order_no` VARCHAR(50) DEFAULT NULL COMMENT '采购单号',
  `supplier_id` INT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` VARCHAR(100) DEFAULT NULL COMMENT '供应商名称',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '入库仓库ID',
  `warehouse_code` VARCHAR(20) DEFAULT NULL COMMENT '仓库编码',
  `warehouse_name` VARCHAR(100) DEFAULT NULL COMMENT '仓库名称',
  `inbound_type` VARCHAR(20) NOT NULL DEFAULT 'purchase' COMMENT '入库类型: purchase-采购入库, return-退货入库, transfer-调拨入库, other-其他',
  `total_qty` DECIMAL(15,3) NOT NULL DEFAULT 0 COMMENT '总数量',
  `total_amount` DECIMAL(15,2) DEFAULT NULL COMMENT '总金额',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending-待入库, processing-入库中, completed-已完成, cancelled-已取消',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `operator_id` INT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  `audit_status` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核',
  `auditor_id` INT UNSIGNED DEFAULT NULL COMMENT '审核人ID',
  `auditor_name` VARCHAR(50) DEFAULT NULL COMMENT '审核人姓名',
  `audit_time` DATETIME DEFAULT NULL COMMENT '审核时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记: 0-正常, 1-已删除',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库单主表';

-- 入库单明细表
CREATE TABLE `inv_inbound_item` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id` INT UNSIGNED NOT NULL COMMENT '入库单ID',
  `order_no` VARCHAR(30) NOT NULL COMMENT '入库单号',
  `material_id` INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) NOT NULL COMMENT '物料代号',
  `material_name` VARCHAR(100) NOT NULL COMMENT '物料名称',
  `specification` VARCHAR(200) DEFAULT NULL COMMENT '规格',
  `width` DECIMAL(10,2) DEFAULT 0 COMMENT '宽幅',
  `batch_no` VARCHAR(50) DEFAULT NULL COMMENT '批号',
  `qty` DECIMAL(15,3) NOT NULL DEFAULT 0 COMMENT '数量',
  `unit` VARCHAR(20) NOT NULL COMMENT '单位',
  `is_raw_material` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否母材: 1-是, 0-否',
  `package_qty` DECIMAL(15,3) DEFAULT 0 COMMENT '包装量',
  `unit_price` DECIMAL(15,4) DEFAULT NULL COMMENT '单价',
  `total_price` DECIMAL(15,2) DEFAULT NULL COMMENT '总价',
  `location_code` VARCHAR(50) DEFAULT NULL COMMENT '存放位置',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `color_code` VARCHAR(50) DEFAULT NULL COMMENT '颜色代号',
  `mixed_material_remark` VARCHAR(200) DEFAULT NULL COMMENT '混合料备注',
  `machine_no` VARCHAR(50) DEFAULT NULL COMMENT '机台号',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库单明细表';

-- 物料标签表
CREATE TABLE `inv_inbound_label` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `label_id` VARCHAR(30) NOT NULL COMMENT '标签ID',
  `order_id` INT UNSIGNED NOT NULL COMMENT '入库单ID',
  `order_no` VARCHAR(30) NOT NULL COMMENT '入库单号',
  `item_id` INT UNSIGNED NOT NULL COMMENT '入库明细ID',
  `purchase_order_no` VARCHAR(50) DEFAULT NULL COMMENT '采购单号',
  `supplier_name` VARCHAR(100) DEFAULT NULL COMMENT '供应商名称',
  `inbound_date` DATE NOT NULL COMMENT '进料日期',
  `warehouse_code` VARCHAR(20) NOT NULL COMMENT '仓库编码',
  `material_code` VARCHAR(50) NOT NULL COMMENT '物料代号',
  `material_name` VARCHAR(100) NOT NULL COMMENT '物料名称',
  `specification` VARCHAR(200) DEFAULT NULL COMMENT '规格',
  `width` DECIMAL(10,2) DEFAULT 0 COMMENT '宽幅',
  `batch_no` VARCHAR(50) DEFAULT NULL COMMENT '批号',
  `qty` DECIMAL(15,3) NOT NULL DEFAULT 0 COMMENT '数量',
  `unit` VARCHAR(20) NOT NULL COMMENT '单位',
  `is_raw_material` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否母材: 1-是, 0-否',
  `package_qty` DECIMAL(15,3) DEFAULT 0 COMMENT '包装量',
  `label_qty` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '标签量',
  `label_status` VARCHAR(20) NOT NULL DEFAULT 'generated' COMMENT '标签状态: generated-已生成, split-已分切, used-已使用, void-已作废',
  `audit_status` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核',
  `operator_id` INT UNSIGNED DEFAULT NULL COMMENT '录入人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '录入人姓名',
  `auditor_id` INT UNSIGNED DEFAULT NULL COMMENT '审核人ID',
  `auditor_name` VARCHAR(50) DEFAULT NULL COMMENT '审核人姓名',
  `audit_time` DATETIME DEFAULT NULL COMMENT '审核时间',
  `color_code` VARCHAR(50) DEFAULT NULL COMMENT '颜色代号',
  `mixed_material_remark` VARCHAR(200) DEFAULT NULL COMMENT '混合料备注',
  `machine_no` VARCHAR(50) DEFAULT NULL COMMENT '机台号',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_label_id` (`label_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_label_status` (`label_status`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料标签表';

-- 插入测试数据
INSERT INTO `inv_inbound_order` (`order_no`, `order_date`, `purchase_order_no`, `supplier_name`, `warehouse_id`, `warehouse_code`, `warehouse_name`, `inbound_type`, `total_qty`, `status`, `operator_name`, `audit_status`) VALUES
('RK20250303001', '2025-03-03', 'PO181002', '锦悦电子', 1, 'WH001', '原料主仓库', 'purchase', 1500, 'completed', '张三', 1),
('RK20250303002', '2025-03-03', 'PO181003', '恒翌达', 1, 'WH001', '原料主仓库', 'purchase', 500, 'completed', '张三', 1),
('RK20250302001', '2025-03-02', 'PO181004', '恒翌达', 1, 'WH001', '原料主仓库', 'purchase', 800, 'completed', '李四', 1),
('RK20250301001', '2025-03-01', 'PO181005', '恒翌达', 1, 'WH001', '原料主仓库', 'purchase', 2000, 'completed', '张三', 1);

INSERT INTO `inv_inbound_item` (`order_id`, `order_no`, `material_code`, `material_name`, `specification`, `width`, `batch_no`, `qty`, `unit`, `is_raw_material`, `location_code`) VALUES
(1, 'RK20250303001', 'MA01-01', '保护膜', '50*20', 0, '201812', 1000, 'M', 1, 'A-01-01'),
(1, 'RK20250303001', 'MA01-02', '保护膜', '60*30', 0, '201812', 500, 'M', 1, 'A-01-02'),
(2, 'RK20250303002', 'PE-25', 'PE管', '25mm', 25.00, '202503', 500, 'M', 1, 'A-01-02'),
(3, 'RK20250302001', 'RSG-0.2-22', '厚0.2热缩套管', 'Ф22', 22.00, '202503', 800, 'M', 1, 'A-01-03'),
(4, 'RK20250301001', 'RSG-0.3-32', '厚0.3热缩套管', 'Ф32', 32.00, '202503', 2000, 'M', 1, 'A-01-01');

INSERT INTO `inv_inbound_label` (`label_id`, `order_id`, `order_no`, `item_id`, `purchase_order_no`, `supplier_name`, `inbound_date`, `warehouse_code`, `material_code`, `material_name`, `specification`, `width`, `batch_no`, `qty`, `unit`, `is_raw_material`, `package_qty`, `label_qty`, `label_status`, `audit_status`, `operator_name`, `color_code`, `machine_no`) VALUES
('20181221000001', 1, 'RK20250303001', 1, 'PO181002', '锦悦电子', '2018-12-21', 'O01', 'MA01-01', '保护膜', '50*20', 0, '201812', 1, '支', 1, 0, 1, 'used', 1, '测试管理员', NULL, NULL),
('20181221000002', 1, 'RK20250303001', 1, 'PO181002', '锦悦电子', '2018-12-21', 'O01', 'MA01-02', '保护膜', '60*30', 0, '201812', 2, '支', 1, 0, 2, 'split', 1, '测试管理员', NULL, NULL),
('20181221000004', 1, 'RK20250303001', 2, 'PO181002', '川大油墨', '2018-12-21', 'O01', 'MA01-04', '油墨B', '红色', 0, '091022', 3, '桶', 0, 0, 3, 'split', 1, '测试管理员', NULL, NULL),
('20181226000001', 2, 'RK20250303002', 3, '2018-12-25-15L', '高冠', '2018-12-26', 'O01', 'HALHK', '格底加强胶铜版纸', '140', 0, '20181226', 400, 'M', 1, 0, 1, 'used', 1, '李环', NULL, NULL),
('20181226000002', 2, 'RK20250303002', 3, '2018-12-25-15L', '高冠', '2018-12-26', 'O01', 'HALHK', '格底加强胶铜版纸', '110', 0, '20181226', 400, 'M', 1, 0, 1, 'split', 1, '李环', NULL, NULL),
('20181226000003', 3, 'RK20250302001', 4, 'K2018-12-25-8L', '百仟岱', '2018-12-26', 'O01', '3M467', '3M胶带', '220', 0, '0001E8286', 550, 'M', 1, 0, 10, 'split', 1, '李环', NULL, NULL),
('20181226000004', 3, 'RK20250302001', 4, 'K2018-12-25-8L', '百仟岱', '2018-12-26', 'O01', '3M467', '3M胶带', '85', 0, '0001E8286', 110, 'M', 1, 0, 2, 'split', 1, '李环', NULL, NULL);
