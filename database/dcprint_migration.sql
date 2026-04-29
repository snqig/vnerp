-- ============================================
-- dcprint 功能迁移 - 数据库表结构
-- 包含：物料标签管理、分切功能、生产流程卡、二维码追溯
-- ============================================

-- ============================================
-- 1. 物料标签表 (对应原系统的 CODEAA/CODEAB)
-- ============================================
CREATE TABLE IF NOT EXISTS `inv_material_label` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标签ID',
  `label_no` VARCHAR(50) NOT NULL COMMENT '标签编号（唯一）',
  `qr_code` VARCHAR(255) COMMENT '二维码内容',
  `purchase_order_no` VARCHAR(50) COMMENT '采购单号',
  `supplier_name` VARCHAR(200) COMMENT '供应商名称',
  `receive_date` DATE COMMENT '进料日期',
  `material_code` VARCHAR(50) NOT NULL COMMENT '物料代号',
  `material_name` VARCHAR(200) COMMENT '品名',
  `specification` VARCHAR(200) COMMENT '进料规格',
  `unit` VARCHAR(20) COMMENT '单位',
  `batch_no` VARCHAR(50) COMMENT '批号',
  `quantity` DECIMAL(18,4) DEFAULT 0 COMMENT '数量',
  `package_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '包装量',
  `width` DECIMAL(18,2) COMMENT '宽幅',
  `length_per_roll` DECIMAL(18,2) COMMENT '每卷米数',
  `remark` VARCHAR(500) COMMENT '备注',
  `color_code` VARCHAR(50) COMMENT '颜色代号',
  `mix_remark` VARCHAR(500) COMMENT '混合料备注',
  `warehouse_id` BIGINT UNSIGNED COMMENT '仓库ID',
  `location_id` BIGINT UNSIGNED COMMENT '库位ID',
  `is_main_material` TINYINT DEFAULT 0 COMMENT '是否母材: 0-否, 1-是',
  `is_used` TINYINT DEFAULT 0 COMMENT '是否已使用: 0-否, 1-是',
  `is_cut` TINYINT DEFAULT 0 COMMENT '是否已分切: 0-否, 1-是',
  `parent_label_id` BIGINT UNSIGNED COMMENT '父标签ID（分切来源）',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用, 2-冻结',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_label_no` (`label_no`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_purchase_order` (`purchase_order_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_parent_label` (`parent_label_id`),
  KEY `idx_is_main` (`is_main_material`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料标签表';

-- ============================================
-- 2. 分切记录表
-- ============================================
CREATE TABLE IF NOT EXISTS `inv_cutting_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分切记录ID',
  `record_no` VARCHAR(50) NOT NULL COMMENT '分切单号',
  `source_label_id` BIGINT UNSIGNED NOT NULL COMMENT '源标签ID',
  `source_label_no` VARCHAR(50) NOT NULL COMMENT '源标签编号',
  `cut_width_str` VARCHAR(200) COMMENT '分切宽幅（如：10+20+30）',
  `original_width` DECIMAL(18,2) COMMENT '原宽幅',
  `cut_total_width` DECIMAL(18,2) COMMENT '分切总宽幅',
  `remain_width` DECIMAL(18,2) COMMENT '剩余宽幅',
  `operator_id` BIGINT UNSIGNED COMMENT '操作员ID',
  `operator_name` VARCHAR(50) COMMENT '操作员名称',
  `cut_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '分切时间',
  `remark` VARCHAR(500) COMMENT '备注',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-作废, 1-正常',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_source_label` (`source_label_id`),
  KEY `idx_cut_time` (`cut_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分切记录表';

-- ============================================
-- 3. 分切明细表（记录分切后的子标签）
-- ============================================
CREATE TABLE IF NOT EXISTS `inv_cutting_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `record_id` BIGINT UNSIGNED NOT NULL COMMENT '分切记录ID',
  `new_label_id` BIGINT UNSIGNED NOT NULL COMMENT '新标签ID',
  `new_label_no` VARCHAR(50) NOT NULL COMMENT '新标签编号',
  `cut_width` DECIMAL(18,2) COMMENT '分切宽幅',
  `sequence` INT DEFAULT 0 COMMENT '分切序号',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_new_label` (`new_label_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分切明细表';

-- ============================================
-- 4. 生产流程卡表
-- ============================================
CREATE TABLE IF NOT EXISTS `prd_process_card` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '流程卡ID',
  `card_no` VARCHAR(50) NOT NULL COMMENT '流程卡卡号（唯一）',
  `qr_code` VARCHAR(255) COMMENT '二维码内容',
  `work_order_id` BIGINT UNSIGNED COMMENT '工单ID',
  `work_order_no` VARCHAR(50) COMMENT '工单号',
  `product_code` VARCHAR(50) COMMENT '成品料号',
  `product_name` VARCHAR(200) COMMENT '成品品名',
  `material_spec` VARCHAR(200) COMMENT '材料规格',
  `work_order_date` DATE COMMENT '工单日期',
  `plan_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '计划生产数量',
  `main_label_id` BIGINT UNSIGNED COMMENT '主材标签ID',
  `main_label_no` VARCHAR(50) COMMENT '主材标签编号',
  `burdening_status` TINYINT DEFAULT 0 COMMENT '配料状态: 0-未配料, 1-已配料',
  `lock_status` TINYINT DEFAULT 0 COMMENT '锁住状态: 0-未锁, 1-已锁',
  `create_user_id` BIGINT UNSIGNED COMMENT '创建人ID',
  `create_user_name` VARCHAR(50) COMMENT '创建人名称',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_card_no` (`card_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_main_label` (`main_label_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产流程卡表';

-- ============================================
-- 5. 流程卡辅料关联表
-- ============================================
CREATE TABLE IF NOT EXISTS `prd_process_card_material` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `card_id` BIGINT UNSIGNED NOT NULL COMMENT '流程卡ID',
  `card_no` VARCHAR(50) COMMENT '流程卡卡号',
  `label_id` BIGINT UNSIGNED NOT NULL COMMENT '物料标签ID',
  `label_no` VARCHAR(50) NOT NULL COMMENT '物料标签编号',
  `material_type` TINYINT DEFAULT 1 COMMENT '物料类型: 1-主材, 2-辅料',
  `material_code` VARCHAR(50) COMMENT '物料代号',
  `material_name` VARCHAR(200) COMMENT '物料名称',
  `specification` VARCHAR(200) COMMENT '规格',
  `batch_no` VARCHAR(50) COMMENT '批号',
  `quantity` DECIMAL(18,4) DEFAULT 0 COMMENT '用量',
  `unit` VARCHAR(20) COMMENT '单位',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_label_id` (`label_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='流程卡物料关联表';

-- ============================================
-- 6. 物料追溯记录表
-- ============================================
CREATE TABLE IF NOT EXISTS `inv_trace_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '追溯记录ID',
  `trace_no` VARCHAR(50) NOT NULL COMMENT '追溯单号',
  `card_id` BIGINT UNSIGNED COMMENT '流程卡ID',
  `card_no` VARCHAR(50) COMMENT '流程卡卡号',
  `work_order_no` VARCHAR(50) COMMENT '工单号',
  `product_code` VARCHAR(50) COMMENT '成品料号',
  `main_label_id` BIGINT UNSIGNED COMMENT '主材标签ID',
  `trace_type` TINYINT DEFAULT 1 COMMENT '追溯类型: 1-正向追溯, 2-反向追溯',
  `operator_id` BIGINT UNSIGNED COMMENT '操作员ID',
  `operator_name` VARCHAR(50) COMMENT '操作员名称',
  `trace_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '追溯时间',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trace_no` (`trace_no`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_main_label` (`main_label_id`),
  KEY `idx_trace_time` (`trace_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料追溯记录表';

-- ============================================
-- 7. 物料追溯明细表
-- ============================================
CREATE TABLE IF NOT EXISTS `inv_trace_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `trace_id` BIGINT UNSIGNED NOT NULL COMMENT '追溯记录ID',
  `label_id` BIGINT UNSIGNED NOT NULL COMMENT '物料标签ID',
  `label_no` VARCHAR(50) NOT NULL COMMENT '物料标签编号',
  `material_code` VARCHAR(50) COMMENT '物料代号',
  `material_name` VARCHAR(200) COMMENT '物料名称',
  `specification` VARCHAR(200) COMMENT '规格',
  `batch_no` VARCHAR(50) COMMENT '批号',
  `supplier_name` VARCHAR(200) COMMENT '供应商名称',
  `receive_date` DATE COMMENT '进料日期',
  `material_type` TINYINT DEFAULT 2 COMMENT '物料类型: 1-主材, 2-辅料',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_trace_id` (`trace_id`),
  KEY `idx_label_id` (`label_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料追溯明细表';

-- ============================================
-- 8. 扫码操作日志表
-- ============================================
CREATE TABLE IF NOT EXISTS `inv_scan_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `scan_type` VARCHAR(50) NOT NULL COMMENT '扫码类型: cutting-分切, process-流程卡, trace-追溯',
  `qr_content` VARCHAR(500) COMMENT '二维码内容',
  `label_no` VARCHAR(50) COMMENT '标签编号',
  `operation` VARCHAR(50) COMMENT '操作类型',
  `result` TINYINT DEFAULT 1 COMMENT '结果: 0-失败, 1-成功',
  `message` VARCHAR(500) COMMENT '结果消息',
  `operator_id` BIGINT UNSIGNED COMMENT '操作员ID',
  `operator_name` VARCHAR(50) COMMENT '操作员名称',
  `scan_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '扫码时间',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  PRIMARY KEY (`id`),
  KEY `idx_scan_type` (`scan_type`),
  KEY `idx_label_no` (`label_no`),
  KEY `idx_scan_time` (`scan_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扫码操作日志表';

-- ============================================
-- 添加示例数据
-- ============================================

-- 插入示例物料标签数据
INSERT INTO `inv_material_label` (`label_no`, `qr_code`, `purchase_order_no`, `supplier_name`, 
  `receive_date`, `material_code`, `material_name`, `specification`, `unit`, `batch_no`, 
  `quantity`, `width`, `length_per_roll`, `remark`, `is_main_material`, `status`)
VALUES 
('LBL202401150001', '{"ID":"LBL202401150001","TYPE":"0"}', 'PO2024001', '苏州材料供应商A',
 '2024-01-15', 'MAT001', 'PET膜-透明', '1000mm*100m', '卷', 'BATCH001',
 100.00, 1000.00, 100.00, '母材入库', 1, 1),
('LBL202401150002', '{"ID":"LBL202401150002","TYPE":"0"}', 'PO2024001', '苏州材料供应商A',
 '2024-01-15', 'MAT001', 'PET膜-透明', '1000mm*100m', '卷', 'BATCH001',
 100.00, 1000.00, 100.00, '母材入库', 1, 1),
('LBL202401160001', '{"ID":"LBL202401160001","TYPE":"1"}', 'PO2024002', '上海油墨供应商B',
 '2024-01-16', 'MAT002', 'UV油墨-黑色', '5kg/桶', '桶', 'BATCH002',
 50.00, NULL, NULL, '辅料入库', 0, 1)
ON DUPLICATE KEY UPDATE `material_name` = VALUES(`material_name`);

-- 插入示例生产工单数据（如果表存在）
-- 注意：这里假设 work_orders 表已存在，如果不存在需要先创建

-- ============================================
-- 创建视图：物料标签完整信息视图
-- ============================================
CREATE OR REPLACE VIEW `view_material_label_full` AS
SELECT 
  l.*,
  NULL as warehouse_name,
  NULL as location_name
FROM `inv_material_label` l
WHERE l.deleted = 0;

-- ============================================
-- 创建视图：流程卡完整信息视图
-- ============================================
CREATE OR REPLACE VIEW `view_process_card_full` AS
SELECT 
  c.*,
  ml.material_code as main_material_code,
  ml.material_name as main_material_name,
  ml.specification as main_specification,
  ml.batch_no as main_batch_no,
  ml.supplier_name as main_supplier_name,
  ml.receive_date as main_receive_date
FROM `prd_process_card` c
LEFT JOIN `inv_material_label` ml ON c.main_label_id = ml.id
WHERE c.deleted = 0;

-- ============================================
-- 添加注释说明
-- ============================================
SELECT 'dcprint 功能迁移数据库表创建完成' AS message;
