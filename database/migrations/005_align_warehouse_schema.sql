-- ==========================================
-- 迁移: 005_align_warehouse_schema
-- 用途: 仓储模块 schema 补全 + 列对齐
-- 关联代码: src/app/api/warehouse/**, src/application/handlers/InventorySyncHandler.ts
-- 说明:
--   1. 补齐 11 张代码已引用但 SQL 中缺失的表（inv_outbound_order/item, inv_transfer_order/item,
--      inv_stocktaking/item, inv_stock_adjust/item, inv_sales_outbound/item,
--      inv_production_inbound/item, inv_unit_conversion, inv_warehouse_log）
--   2. 为 inv_inventory_batch 追加代码引用的列（available_qty, material_code, material_name,
--      unit_price, locked_qty, produce_date, deleted, version, update_time）
--   3. 为 inv_inventory 追加 stocktaking_flag 列（盘点冻结出库用）
--   4. 将 inv_inventory_batch.status 注释更新为 1-normal 2-frozen 3-expired（语义不变，仅文档对齐代码）
-- 执行: mysql -u root -p vnerpdacahng < 005_align_warehouse_schema.sql
-- 注意: 本迁移幂等，可重复执行（使用 IF NOT EXISTS / 检查列存在）
-- ==========================================

-- ==========================================
-- 第 1 部分：修改已有表（inv_inventory_batch + inv_inventory）
-- ==========================================

-- 1.1 inv_inventory_batch 追加列（按代码引用对齐）
-- 注意：使用 PROCEDURE 检查列是否存在，避免 ALTER 重复执行报错
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_column_if_not_exists(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN col_def TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', col_def);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL add_column_if_not_exists('inv_inventory_batch', 'material_code', "VARCHAR(50) NULL COMMENT '物料编码（冗余，便于查询）' AFTER `material_id`");
CALL add_column_if_not_exists('inv_inventory_batch', 'material_name', "VARCHAR(200) NULL COMMENT '物料名称（冗余）' AFTER `material_code`");
CALL add_column_if_not_exists('inv_inventory_batch', 'available_qty', "DECIMAL(18,4) DEFAULT 0 COMMENT '可用数量（= quantity - locked_qty - 已出库）' AFTER `quantity`");
CALL add_column_if_not_exists('inv_inventory_batch', 'locked_qty', "DECIMAL(18,4) DEFAULT 0 COMMENT '锁定数量' AFTER `available_qty`");
CALL add_column_if_not_exists('inv_inventory_batch', 'unit_price', "DECIMAL(18,4) DEFAULT 0 COMMENT '入库单价（冗余，用于成本核算）' AFTER `unit_cost`");
CALL add_column_if_not_exists('inv_inventory_batch', 'produce_date', "DATE NULL COMMENT '生产日期' AFTER `inbound_date`");
CALL add_column_if_not_exists('inv_inventory_batch', 'deleted', "TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0-正常, 1-已删除' AFTER `status`");
CALL add_column_if_not_exists('inv_inventory_batch', 'version', "INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号' AFTER `deleted`");
CALL add_column_if_not_exists('inv_inventory_batch', 'update_time', "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间' AFTER `create_time`");

-- 1.2 inv_inventory 追加 stocktaking_flag 列
CALL add_column_if_not_exists('inv_inventory', 'stocktaking_flag', "TINYINT NOT NULL DEFAULT 0 COMMENT '0-正常 1-盘点中（冻结出库）' AFTER `available_qty`");

-- 1.3 更新 inv_inventory_batch.status 注释（语义不变，仅文档对齐代码）
ALTER TABLE `inv_inventory_batch`
  MODIFY COLUMN `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1-normal 可用, 2-frozen 冻结, 3-expired 过期';

-- 1.4 追加索引（IF NOT EXISTS 在 MySQL 8.0+ 支持）
ALTER TABLE `inv_inventory_batch`
  ADD INDEX IF NOT EXISTS `idx_warehouse` (`warehouse_id`);
ALTER TABLE `inv_inventory_batch`
  ADD INDEX IF NOT EXISTS `idx_status` (`status`);
ALTER TABLE `inv_inventory_batch`
  ADD INDEX IF NOT EXISTS `idx_material_warehouse_status` (`material_id`, `warehouse_id`, `status`, `deleted`);
ALTER TABLE `inv_inventory`
  ADD INDEX IF NOT EXISTS `idx_stocktaking_flag` (`stocktaking_flag`);

DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- ==========================================
-- 第 2 部分：创建 11 张缺失表（CREATE TABLE IF NOT EXISTS 保证幂等）
-- ==========================================

-- 出库单主表
CREATE TABLE IF NOT EXISTS `inv_outbound_order` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '出库单ID',
  `order_no` VARCHAR(30) NOT NULL COMMENT '出库单号',
  `order_date` DATE NOT NULL COMMENT '出库日期',
  `outbound_type` VARCHAR(20) NOT NULL DEFAULT 'production' COMMENT 'production-生产出库, sales-销售出库, return-退货出库, other-其他',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `warehouse_code` VARCHAR(50) COMMENT '仓库编码（冗余）',
  `warehouse_name` VARCHAR(100) COMMENT '仓库名称（冗余）',
  `customer_id` BIGINT UNSIGNED COMMENT '客户ID（销售出库用）',
  `customer_name` VARCHAR(100) COMMENT '客户名称（冗余）',
  `work_order_id` BIGINT UNSIGNED COMMENT '工单ID（生产出库用）',
  `work_order_no` VARCHAR(50) COMMENT '工单编号（冗余）',
  `total_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '总数量',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending-待审, approved-已审, completed-已完成, cancelled-已取消',
  `audit_status` TINYINT DEFAULT 0 COMMENT '0-待审, 1-通过, 2-驳回',
  `auditor_id` BIGINT UNSIGNED COMMENT '审核人ID',
  `auditor_name` VARCHAR(50) COMMENT '审核人姓名',
  `audit_time` DATETIME COMMENT '审核时间',
  `audit_remark` VARCHAR(500) COMMENT '审核备注',
  `operator_id` BIGINT UNSIGNED COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `finance_posted` TINYINT DEFAULT 0 COMMENT '是否已生成财务凭证: 0-否, 1-是',
  `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
  `remark` VARCHAR(500) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_status` (`status`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_outbound_type` (`outbound_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单主表';

-- 出库单明细表
CREATE TABLE IF NOT EXISTS `inv_outbound_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '出库单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码（冗余）',
  `material_name` VARCHAR(200) COMMENT '物料名称（冗余）',
  `material_spec` VARCHAR(200) COMMENT '物料规格',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `batch_id` BIGINT UNSIGNED COMMENT '批次ID',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) DEFAULT 0 COMMENT '单价',
  `amount` DECIMAL(18,4) DEFAULT 0 COMMENT '金额',
  `warehouse_location` VARCHAR(50) COMMENT '库位',
  `remark` VARCHAR(255) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单明细表';

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

-- 盘点单主表
CREATE TABLE IF NOT EXISTS `inv_stocktaking` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '盘点单ID',
  `check_no` VARCHAR(30) NOT NULL COMMENT '盘点单号',
  `type` TINYINT NOT NULL COMMENT '1-全仓, 2-部分, 3-抽样',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `warehouse_name` VARCHAR(100) COMMENT '仓库名称（冗余）',
  `scope` VARCHAR(500) COMMENT '盘点范围（物料ID列表或分类ID列表 JSON）',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0-草稿, 1-进行中, 2-待审批, 3-已审批, 4-已取消',
  `applicant_id` BIGINT UNSIGNED COMMENT '申请人ID',
  `applicant_name` VARCHAR(50) COMMENT '申请人姓名',
  `approver_id` BIGINT UNSIGNED COMMENT '审批人ID',
  `approver_name` VARCHAR(50) COMMENT '审批人姓名',
  `approve_time` DATETIME COMMENT '审批时间',
  `approve_remark` VARCHAR(500) COMMENT '审批备注',
  `total_items` INT DEFAULT 0 COMMENT '盘点项总数',
  `diff_items` INT DEFAULT 0 COMMENT '差异数',
  `total_diff_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '差异总金额',
  `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
  `remark` VARCHAR(500) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_check_no` (`check_no`),
  KEY `idx_status` (`status`),
  KEY `idx_warehouse` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='盘点单主表';

-- 盘点单明细表
CREATE TABLE IF NOT EXISTS `inv_stocktaking_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `taking_id` BIGINT UNSIGNED NOT NULL COMMENT '盘点单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码（冗余）',
  `material_name` VARCHAR(200) COMMENT '物料名称（冗余）',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `warehouse_id` BIGINT UNSIGNED COMMENT '仓库ID',
  `location` VARCHAR(50) COMMENT '库位',
  `book_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '账面数量',
  `actual_qty` DECIMAL(18,4) COMMENT '实盘数量',
  `diff_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '差异=实盘-账面',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) DEFAULT 0 COMMENT '单价',
  `diff_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '差异金额',
  `scan_time` DATETIME COMMENT '扫码时间',
  `scan_operator` VARCHAR(50) COMMENT '扫码操作员',
  `remark` VARCHAR(255) COMMENT '备注',
  `status` TINYINT DEFAULT 0 COMMENT '0-待盘, 1-已盘, 2-差异已处理',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_taking` (`taking_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='盘点单明细表';

-- 库存调整单主表
CREATE TABLE IF NOT EXISTS `inv_stock_adjust` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '调整单ID',
  `adjust_no` VARCHAR(30) NOT NULL COMMENT '调整单号',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `adjust_date` DATE NOT NULL COMMENT '调整日期',
  `adjust_type` VARCHAR(20) NOT NULL COMMENT 'damage-损坏, loss-盘亏, gain-盘盈, other-其他',
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

-- 销售出库单主表
CREATE TABLE IF NOT EXISTS `inv_sales_outbound` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '销售出库单ID',
  `outbound_no` VARCHAR(30) NOT NULL COMMENT '销售出库单号',
  `order_id` BIGINT UNSIGNED COMMENT '销售订单ID',
  `order_no` VARCHAR(50) COMMENT '销售订单号（冗余）',
  `customer_id` BIGINT UNSIGNED COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户名称（冗余）',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `warehouse_name` VARCHAR(100) COMMENT '仓库名称（冗余）',
  `outbound_date` DATE NOT NULL COMMENT '出库日期',
  `delivery_person` VARCHAR(50) COMMENT '配送人',
  `logistics_no` VARCHAR(100) COMMENT '物流单号',
  `status` TINYINT DEFAULT 1 COMMENT '1-待出库, 2-已出库, 3-已完成, 4-已取消',
  `finance_posted` TINYINT DEFAULT 0 COMMENT '是否已生成财务凭证: 0-否, 1-是',
  `operator_id` BIGINT UNSIGNED COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `total_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '总数量',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
  `remark` VARCHAR(500) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_outbound_no` (`outbound_no`),
  KEY `idx_status` (`status`),
  KEY `idx_order` (`order_id`),
  KEY `idx_warehouse` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库单主表';

-- 销售出库单明细表
CREATE TABLE IF NOT EXISTS `inv_sales_outbound_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `outbound_id` BIGINT UNSIGNED NOT NULL COMMENT '销售出库单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码（冗余）',
  `material_name` VARCHAR(200) COMMENT '物料名称（冗余）',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) DEFAULT 0 COMMENT '单价',
  `amount` DECIMAL(18,4) DEFAULT 0 COMMENT '金额',
  `remark` VARCHAR(255) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_outbound` (`outbound_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库单明细表';

-- 生产入库单主表
CREATE TABLE IF NOT EXISTS `inv_production_inbound` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '生产入库单ID',
  `inbound_no` VARCHAR(30) NOT NULL COMMENT '生产入库单号',
  `work_order_id` BIGINT UNSIGNED COMMENT '工单ID',
  `work_order_no` VARCHAR(50) COMMENT '工单编号（冗余）',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `warehouse_name` VARCHAR(100) COMMENT '仓库名称（冗余）',
  `inbound_date` DATE NOT NULL COMMENT '入库日期',
  `operator_id` BIGINT UNSIGNED COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `qc_status` VARCHAR(20) DEFAULT 'pending' COMMENT 'pending-待检, pass-合格, fail-不合格',
  `status` TINYINT DEFAULT 1 COMMENT '1-待入库, 2-已入库, 3-已完成, 4-已取消',
  `finance_posted` TINYINT DEFAULT 0 COMMENT '是否已生成财务凭证: 0-否, 1-是',
  `total_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '总数量',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `version` INT DEFAULT 0 COMMENT '乐观锁版本号',
  `remark` VARCHAR(500) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inbound_no` (`inbound_no`),
  KEY `idx_status` (`status`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_warehouse` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产入库单主表';

-- 生产入库单明细表
CREATE TABLE IF NOT EXISTS `inv_production_inbound_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `inbound_id` BIGINT UNSIGNED NOT NULL COMMENT '生产入库单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码（冗余）',
  `material_name` VARCHAR(200) COMMENT '物料名称（冗余）',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) DEFAULT 0 COMMENT '单价',
  `amount` DECIMAL(18,4) DEFAULT 0 COMMENT '金额',
  `remark` VARCHAR(255) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_inbound` (`inbound_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产入库单明细表';

-- 单位换算表
CREATE TABLE IF NOT EXISTS `inv_unit_conversion` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '换算ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `from_unit` VARCHAR(20) NOT NULL COMMENT '源单位',
  `to_unit` VARCHAR(20) NOT NULL COMMENT '目标单位',
  `ratio` DECIMAL(18,6) NOT NULL COMMENT '换算比率: from_unit * ratio = to_unit',
  `is_default` TINYINT DEFAULT 0 COMMENT '是否默认换算: 0-否, 1-是',
  `remark` VARCHAR(255) COMMENT '备注',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_units` (`material_id`, `from_unit`, `to_unit`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='单位换算表';

-- 仓库操作日志表
CREATE TABLE IF NOT EXISTS `inv_warehouse_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `operation_type` VARCHAR(30) NOT NULL COMMENT 'create-创建, update-更新, delete-删除, freeze-冻结, unfreeze-解冻',
  `operation_content` TEXT COMMENT '操作内容（JSON 或文本）',
  `operator_id` BIGINT UNSIGNED COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='仓库操作日志表';

-- ==========================================
-- 迁移完成
-- 验证: SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME LIKE 'inv_%';
-- 应返回 22 张表（原 11 张 + 新增 11 张）
-- ==========================================
