-- ============================================================
-- 库存流水安全迁移脚本
-- 确保 inv_inventory_transaction 不可篡改
-- 确保 fin_payable / fin_receivable 核心字段受保护
-- ============================================================

-- 1. 库存流水表增强（如果不存在则创建）
CREATE TABLE IF NOT EXISTS `inv_inventory_transaction` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `trans_no` VARCHAR(50) NOT NULL COMMENT '流水号',
  `trans_type` VARCHAR(20) NOT NULL COMMENT '类型: in/out/transfer/adjust/return',
  `source_type` VARCHAR(50) COMMENT '来源类型: inbound/purchase/sales/transfer/adjust',
  `source_id` BIGINT COMMENT '来源单据ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码',
  `material_name` VARCHAR(100) COMMENT '物料名称',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '数量(正数)',
  `unit_price` DECIMAL(12,4) DEFAULT 0 COMMENT '单价',
  `total_amount` DECIMAL(14,2) DEFAULT 0 COMMENT '总金额',
  `account_dr` VARCHAR(100) COMMENT '借方科目',
  `account_cr` VARCHAR(100) COMMENT '贷方科目',
  `is_reversed` TINYINT DEFAULT 0 COMMENT '是否被冲销: 0-否, 1-是',
  `reversed_by` BIGINT COMMENT '冲销流水ID',
  `operator_id` BIGINT COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间(不可修改)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trans_no` (`trans_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_source` (`source_type`, `source_id`),
  KEY `idx_trans_type` (`trans_type`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_batch_no` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存流水表(不可修改/不可删除)';

-- 2. 采购单表增加审核字段
ALTER TABLE `pur_purchase_order`
  ADD COLUMN IF NOT EXISTS `create_by` BIGINT COMMENT '创建人ID',
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间';

-- 3. 销售订单表增加审核字段
ALTER TABLE `sal_order`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间';

-- 4. 应付账款表增强
CREATE TABLE IF NOT EXISTS `fin_payable` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payable_no` VARCHAR(50) NOT NULL COMMENT '应付编号',
  `supplier_id` BIGINT COMMENT '供应商ID',
  `supplier_name` VARCHAR(100) COMMENT '供应商名称',
  `source_type` VARCHAR(50) NOT NULL COMMENT '来源类型',
  `source_id` BIGINT NOT NULL COMMENT '来源单据ID',
  `source_no` VARCHAR(50) COMMENT '来源单据号',
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '应付金额',
  `paid_amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '已付金额',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-未付, 2-部分付, 3-已付',
  `due_date` DATE COMMENT '到期日',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payable_no` (`payable_no`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_source` (`source_type`, `source_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应付账款';

-- 5. 应收账款表增强
CREATE TABLE IF NOT EXISTS `fin_receivable` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `receivable_no` VARCHAR(50) NOT NULL COMMENT '应收编号',
  `customer_id` BIGINT COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户名称',
  `source_type` VARCHAR(50) NOT NULL COMMENT '来源类型',
  `source_id` BIGINT NOT NULL COMMENT '来源单据ID',
  `source_no` VARCHAR(50) COMMENT '来源单据号',
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '应收金额',
  `received_amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '已收金额',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-未收, 2-部分收, 3-已收',
  `due_date` DATE COMMENT '到期日',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receivable_no` (`receivable_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_source` (`source_type`, `source_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应收账款';

-- 6. 付款记录表
CREATE TABLE IF NOT EXISTS `fin_payment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_no` VARCHAR(50) NOT NULL COMMENT '付款编号',
  `payable_id` BIGINT UNSIGNED NOT NULL COMMENT '关联应付ID',
  `amount` DECIMAL(14,2) NOT NULL COMMENT '付款金额',
  `payment_date` DATE NOT NULL COMMENT '付款日期',
  `payment_method` VARCHAR(50) COMMENT '付款方式',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_by` BIGINT COMMENT '创建人',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payable` (`payable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='付款记录';

-- 7. 收款记录表
CREATE TABLE IF NOT EXISTS `fin_receipt` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `receipt_no` VARCHAR(50) NOT NULL COMMENT '收款编号',
  `receivable_id` BIGINT UNSIGNED NOT NULL COMMENT '关联应收ID',
  `amount` DECIMAL(14,2) NOT NULL COMMENT '收款金额',
  `receipt_date` DATE NOT NULL COMMENT '收款日期',
  `receipt_method` VARCHAR(50) COMMENT '收款方式',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_by` BIGINT COMMENT '创建人',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_receivable` (`receivable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收款记录';

-- 8. 禁止负库存触发器（可配置开关）
DELIMITER //
CREATE TRIGGER IF NOT EXISTS `trg_prevent_negative_inventory`
BEFORE UPDATE ON `inv_inventory`
FOR EACH ROW
BEGIN
  IF NEW.quantity < 0 AND NEW.deleted = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = '库存数量不能为负数';
  END IF;
END//
DELIMITER ;
