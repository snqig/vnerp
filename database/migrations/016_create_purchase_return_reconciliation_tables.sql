-- ============================================================
-- Migration 016: 采购退货 + 采购对账表结构
-- 表名: pur_purchase_return, pur_purchase_return_line,
--       pur_purchase_reconciliation, pur_purchase_reconciliation_writeoff
-- 字符集: utf8mb4
-- ============================================================

-- --------------------------------------------------------
-- 1. 采购退货主表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pur_purchase_return` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `return_no` VARCHAR(32) NOT NULL COMMENT '退货单号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=待审核, 2=已审核, 3=已完成, 9=已取消',
  `order_id` BIGINT NOT NULL COMMENT '采购订单ID',
  `order_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '采购订单号',
  `supplier_id` BIGINT NOT NULL COMMENT '供应商ID',
  `supplier_name` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '供应商名称',
  `warehouse_id` BIGINT NOT NULL COMMENT '仓库ID',
  `receipt_id` BIGINT NULL COMMENT '收货单ID',
  `receipt_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '收货单号',
  `reason` VARCHAR(512) NOT NULL COMMENT '退货原因',
  `return_date` DATE NOT NULL COMMENT '退货日期',
  `total_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '退货总金额',
  `approve_by` BIGINT NULL COMMENT '审核人',
  `approve_time` DATETIME NULL COMMENT '审核时间',
  `complete_by` BIGINT NULL COMMENT '完成人',
  `complete_time` DATETIME NULL COMMENT '完成时间',
  `outbound_order_id` BIGINT NULL COMMENT '出库单ID',
  `outbound_order_no` VARCHAR(32) NULL COMMENT '出库单号',
  `payable_id` BIGINT NULL COMMENT '红字应付单ID',
  `payable_no` VARCHAR(32) NULL COMMENT '红字应付单号',
  `remark` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '备注',
  `create_by` BIGINT NULL COMMENT '创建人',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0=未删除, 1=已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_return_date` (`return_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购退货主表';

-- --------------------------------------------------------
-- 2. 采购退货明细表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pur_purchase_return_line` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `return_id` BIGINT NOT NULL COMMENT '退货单ID',
  `line_no` INT NOT NULL COMMENT '行号',
  `order_line_id` BIGINT NULL COMMENT '采购订单行ID',
  `material_id` BIGINT NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '物料编码',
  `material_name` VARCHAR(256) NOT NULL DEFAULT '' COMMENT '物料名称',
  `material_spec` VARCHAR(256) NOT NULL DEFAULT '' COMMENT '物料规格',
  `unit` VARCHAR(32) NOT NULL DEFAULT '件' COMMENT '单位',
  `quantity` DECIMAL(14,4) NOT NULL COMMENT '退货数量',
  `unit_price` DECIMAL(14,2) NOT NULL COMMENT '单价',
  `amount` DECIMAL(14,2) NOT NULL COMMENT '金额',
  `batch_no` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '批次号',
  `reason` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '退货原因',
  `remark` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_return_id` (`return_id`),
  KEY `idx_material_id` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购退货明细表';

-- --------------------------------------------------------
-- 3. 采购对账主表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pur_purchase_reconciliation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `reconciliation_no` VARCHAR(32) NOT NULL COMMENT '对账单号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=草稿, 2=已确认, 3=部分核销, 4=已核销完成, 9=已关闭',
  `supplier_id` BIGINT NOT NULL COMMENT '供应商ID',
  `supplier_name` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '供应商名称',
  `period_start` DATE NOT NULL COMMENT '对账开始日期',
  `period_end` DATE NOT NULL COMMENT '对账结束日期',
  `receipt_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '收货金额',
  `return_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '退货金额',
  `net_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '净额',
  `discount_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '折扣金额',
  `paid_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '已核销金额',
  `balance_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '余额',
  `remark` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '备注',
  `create_by` BIGINT NULL COMMENT '创建人',
  `confirm_by` BIGINT NULL COMMENT '确认人',
  `confirm_time` DATETIME NULL COMMENT '确认时间',
  `close_by` BIGINT NULL COMMENT '关闭人',
  `close_time` DATETIME NULL COMMENT '关闭时间',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0=未删除, 1=已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_no` (`reconciliation_no`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_period` (`period_start`, `period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购对账主表';

-- --------------------------------------------------------
-- 4. 采购对账核销记录表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pur_purchase_reconciliation_writeoff` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `reconciliation_id` BIGINT NOT NULL COMMENT '对账单ID',
  `payable_id` BIGINT NOT NULL COMMENT '应付单ID',
  `amount` DECIMAL(14,2) NOT NULL COMMENT '核销金额',
  `write_off_date` DATE NOT NULL COMMENT '核销日期',
  `remark` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '备注',
  `create_by` BIGINT NULL COMMENT '创建人',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_reconciliation_id` (`reconciliation_id`),
  KEY `idx_payable_id` (`payable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购对账核销记录表';

-- 验证
SELECT 'pur_purchase_return' AS table_name, COUNT(*) AS row_count FROM pur_purchase_return
UNION ALL
SELECT 'pur_purchase_return_line', COUNT(*) FROM pur_purchase_return_line
UNION ALL
SELECT 'pur_purchase_reconciliation', COUNT(*) FROM pur_purchase_reconciliation
UNION ALL
SELECT 'pur_purchase_reconciliation_writeoff', COUNT(*) FROM pur_purchase_reconciliation_writeoff;
