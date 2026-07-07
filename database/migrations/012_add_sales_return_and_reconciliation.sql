-- ========================================================
-- 012: 销售管理模块补全 — 退货单与对账单表
-- 目的：支撑 Phase 3-3 销售管理领域层落地
--   - sal_return              退货单主表（ReturnOrder 聚合）
--   - sal_return_detail       退货单明细表（ReturnOrderLine）
--   - sal_reconciliation      对账单主表（Reconciliation 聚合）
--   - sal_reconciliation_line 对账单明细表（发货/退货单关联）
--   - sal_reconciliation_writeoff 对账核销记录表（WriteOffRecord）
-- 说明：
--   1. 退货完成时通过回调复用仓储模块 inv_inbound_order 入库，
--      通过回调在财务模块 fin_receivable 创建红字应收单，
--      本表仅记录关联单号（inbound_order_id/no, receivable_id/no），
--      不复制入库/应收明细，保持单据单一数据源。
--   2. 对账单 lines 记录对账期间内的发货/退货单（source_type=1 发货/2 退货），
--      writeoff 表记录对账单对应收单的核销记录，支持一对多核销。
--   3. 使用 CREATE TABLE IF NOT EXISTS 实现幂等。
--   4. 跨模块引用（customer_id, order_id, warehouse_id, receivable_id 等）
--      仅建索引不加外键，避免跨模块迁移顺序依赖。
-- ========================================================

-- --------------------------------------------------------
-- 1. 退货单主表 sal_return
-- 对应 ReturnOrder 聚合根，状态：1-待审核, 2-已审核, 3-已完成, 9-已取消
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sal_return` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '退货单ID',
  `return_no` VARCHAR(50) NOT NULL COMMENT '退货单号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已完成, 9-已取消',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '销售订单ID',
  `order_no` VARCHAR(50) COMMENT '销售订单号（冗余）',
  `customer_id` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户名称（冗余）',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '入库仓库ID',
  `delivery_id` BIGINT UNSIGNED COMMENT '关联发货单ID',
  `delivery_no` VARCHAR(50) COMMENT '关联发货单号（冗余）',
  `reason` VARCHAR(500) NOT NULL COMMENT '退货原因',
  `return_date` DATE NOT NULL COMMENT '退货日期',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '退货总金额',
  `approve_by` BIGINT UNSIGNED COMMENT '审核人ID',
  `approve_time` DATETIME COMMENT '审核时间',
  `complete_by` BIGINT UNSIGNED COMMENT '完成人ID',
  `complete_time` DATETIME COMMENT '完成时间',
  `inbound_order_id` BIGINT UNSIGNED COMMENT '关联入库单ID（退货入库）',
  `inbound_order_no` VARCHAR(50) COMMENT '关联入库单号（冗余）',
  `receivable_id` BIGINT UNSIGNED COMMENT '关联红字应收单ID',
  `receivable_no` VARCHAR(50) COMMENT '关联红字应收单号（冗余）',
  `remark` VARCHAR(500) COMMENT '备注',
  `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`),
  KEY `idx_status` (`status`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_delivery` (`delivery_id`),
  KEY `idx_return_date` (`return_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单主表';

-- --------------------------------------------------------
-- 2. 退货单明细表 sal_return_detail
-- 对应 ReturnOrderLine 实体，记录退货物料明细
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sal_return_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `return_id` BIGINT UNSIGNED NOT NULL COMMENT '退货单ID',
  `line_no` INT NOT NULL COMMENT '行号',
  `delivery_detail_id` BIGINT UNSIGNED COMMENT '关联发货明细ID',
  `order_detail_id` BIGINT UNSIGNED COMMENT '关联订单明细ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码（冗余）',
  `material_name` VARCHAR(200) COMMENT '物料名称（冗余）',
  `material_spec` VARCHAR(100) COMMENT '物料规格（冗余）',
  `unit` VARCHAR(20) COMMENT '单位',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '退货数量',
  `unit_price` DECIMAL(18,4) DEFAULT 0 COMMENT '单价',
  `amount` DECIMAL(18,4) DEFAULT 0 COMMENT '金额',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `remark` VARCHAR(255) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_return` (`return_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_order_detail` (`order_detail_id`),
  KEY `idx_batch` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单明细表';

-- --------------------------------------------------------
-- 3. 对账单主表 sal_reconciliation
-- 对应 Reconciliation 聚合根
-- 状态：1-草稿, 2-已确认, 3-部分核销, 4-已核销, 9-已关闭
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sal_reconciliation` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '对账单ID',
  `reconciliation_no` VARCHAR(50) NOT NULL COMMENT '对账单号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-草稿, 2-已确认, 3-部分核销, 4-已核销, 9-已关闭',
  `customer_id` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户名称（冗余）',
  `period_start` DATE NOT NULL COMMENT '对账开始日期',
  `period_end` DATE NOT NULL COMMENT '对账结束日期',
  `delivery_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '发货总金额',
  `return_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '退货总金额',
  `net_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '净额（发货-退货）',
  `discount_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '折扣金额',
  `received_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '已核销金额',
  `balance_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '未核销余额',
  `confirm_by` BIGINT UNSIGNED COMMENT '确认人ID',
  `confirm_time` DATETIME COMMENT '确认时间',
  `close_by` BIGINT UNSIGNED COMMENT '关闭人ID',
  `close_time` DATETIME COMMENT '关闭时间',
  `remark` VARCHAR(500) COMMENT '备注',
  `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_no` (`reconciliation_no`),
  KEY `idx_status` (`status`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_period` (`period_start`, `period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='对账单主表';

-- --------------------------------------------------------
-- 4. 对账单明细表 sal_reconciliation_line
-- 对应 ReconciliationLineProps，记录对账期间内的发货/退货单
-- source_type: 1=发货单, 2=退货单
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sal_reconciliation_line` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `reconciliation_id` BIGINT UNSIGNED NOT NULL COMMENT '对账单ID',
  `source_type` TINYINT NOT NULL COMMENT '来源类型: 1-发货单, 2-退货单',
  `source_id` BIGINT UNSIGNED NOT NULL COMMENT '来源单据ID',
  `source_no` VARCHAR(50) NOT NULL COMMENT '来源单据号',
  `source_date` DATE NOT NULL COMMENT '来源单据日期',
  `amount` DECIMAL(18,4) NOT NULL COMMENT '单据金额',
  `remark` VARCHAR(255) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_reconciliation` (`reconciliation_id`),
  KEY `idx_source` (`source_type`, `source_id`),
  KEY `idx_source_no` (`source_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='对账单明细表';

-- --------------------------------------------------------
-- 5. 对账核销记录表 sal_reconciliation_writeoff
-- 对应 WriteOffRecord 实体，记录对账单对应收单的核销记录
-- 支持一对多核销：一张对账单可核销多张应收单
-- 支持多次部分核销：同一 receivable_id 可有多条记录
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sal_reconciliation_writeoff` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '核销记录ID',
  `reconciliation_id` BIGINT UNSIGNED NOT NULL COMMENT '对账单ID',
  `receivable_id` BIGINT UNSIGNED NOT NULL COMMENT '应收单ID',
  `amount` DECIMAL(18,4) NOT NULL COMMENT '核销金额',
  `write_off_date` DATE NOT NULL COMMENT '核销日期',
  `remark` VARCHAR(255) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  PRIMARY KEY (`id`),
  KEY `idx_reconciliation` (`reconciliation_id`),
  KEY `idx_receivable` (`receivable_id`),
  KEY `idx_write_off_date` (`write_off_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='对账核销记录表';
