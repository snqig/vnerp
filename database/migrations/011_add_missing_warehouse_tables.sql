-- ========================================================
-- 011: 补建缺失的仓储管理表
-- 问题：schema.sql 已定义但实际数据库未创建的表
--   - inv_transfer_order（调拨单主表）
--   - inv_transfer_item（调拨单明细表）
--   - inv_stock_adjust（库存调整单主表）
--   - inv_stock_adjust_item（库存调整单明细表）
-- 原因：旧版 schema.sql 未包含这些表，升级后未同步
-- 兼容：使用 CREATE TABLE IF NOT EXISTS 实现幂等
-- ========================================================

-- 调拨单主表
CREATE TABLE IF NOT EXISTS `inv_transfer_order` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '调拨单ID',
  `transfer_no` VARCHAR(30) NOT NULL COMMENT '调拨单号',
  `type` TINYINT NOT NULL COMMENT '1-库位调拨, 2-仓库调拨',
  `from_warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '源仓库ID',
  `to_warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '目标仓库ID',
  `from_location` VARCHAR(50) COMMENT '源库位',
  `to_location` VARCHAR(50) COMMENT '目标库位',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0-草稿, 1-待审批, 2-已出库, 3-已入库, 4-已取消',
  `applicant_id` BIGINT UNSIGNED COMMENT '申请人ID',
  `applicant_name` VARCHAR(50) COMMENT '申请人姓名',
  `approver_id` BIGINT UNSIGNED COMMENT '审批人ID',
  `approver_name` VARCHAR(50) COMMENT '审批人姓名',
  `operator_id` BIGINT UNSIGNED COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `out_time` DATETIME COMMENT '出库时间',
  `in_time` DATETIME COMMENT '入库时间',
  `total_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '总数量',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
  `remark` VARCHAR(500) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transfer_no` (`transfer_no`),
  KEY `idx_status` (`status`),
  KEY `idx_from_warehouse` (`from_warehouse_id`),
  KEY `idx_to_warehouse` (`to_warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='调拨单主表';

-- 调拨单明细表
CREATE TABLE IF NOT EXISTS `inv_transfer_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `transfer_id` BIGINT UNSIGNED NOT NULL COMMENT '调拨单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码（冗余）',
  `material_name` VARCHAR(200) COMMENT '物料名称（冗余）',
  `qr_code` VARCHAR(50) COMMENT '二维码',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '申请数量',
  `out_quantity` DECIMAL(18,4) DEFAULT 0 COMMENT '实际出库数量',
  `in_quantity` DECIMAL(18,4) DEFAULT 0 COMMENT '实际入库数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) DEFAULT 0 COMMENT '单价',
  `amount` DECIMAL(18,4) DEFAULT 0 COMMENT '金额',
  `remark` VARCHAR(255) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_transfer` (`transfer_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='调拨单明细表';

-- 库存调整单主表
CREATE TABLE IF NOT EXISTS `inv_stock_adjust` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '调整单ID',
  `adjust_no` VARCHAR(30) NOT NULL COMMENT '调整单号',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `adjust_date` DATE NOT NULL COMMENT '调整日期',
  `adjust_type` TINYINT NOT NULL DEFAULT 1 COMMENT '调整类型: 1-盘盈, 2-盘亏, 3-其他',
  `operator_id` BIGINT UNSIGNED COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `approver_id` BIGINT UNSIGNED COMMENT '审批人ID',
  `approver_name` VARCHAR(50) COMMENT '审批人姓名',
  `approve_time` DATETIME COMMENT '审批时间',
  `status` TINYINT DEFAULT 0 COMMENT '0-待审, 1-已审, 2-已驳回',
  `total_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '总数量',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
  `remark` VARCHAR(500) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_adjust_no` (`adjust_no`),
  KEY `idx_status` (`status`),
  KEY `idx_warehouse` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存调整单主表';

-- 库存调整单明细表
CREATE TABLE IF NOT EXISTS `inv_stock_adjust_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `adjust_id` BIGINT UNSIGNED NOT NULL COMMENT '调整单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码（冗余）',
  `material_name` VARCHAR(200) COMMENT '物料名称（冗余）',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `before_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '调整前数量',
  `adjust_qty` DECIMAL(18,4) NOT NULL COMMENT '调整数量（正/负）',
  `after_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '调整后数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) DEFAULT 0 COMMENT '单价',
  `amount` DECIMAL(18,4) DEFAULT 0 COMMENT '金额',
  `reason` VARCHAR(255) COMMENT '调整原因',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_adjust` (`adjust_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存调整单明细表';
