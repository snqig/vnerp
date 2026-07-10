-- ============================================================================
-- 054: 生产管理模块增强 — 核心流程表
-- 功能: 工单状态增强、领料/退料/报工/完工入库表
-- ============================================================================

-- 1. 扩展 prod_work_order 表，增加工序和成本字段
ALTER TABLE `prod_work_order`
    ADD COLUMN `order_type` tinyint DEFAULT 0 COMMENT '工单类型: 0-正常 1-打样工单 2-返工' AFTER `product_name`,
    ADD COLUMN `approved_at` datetime DEFAULT NULL COMMENT '审核时间' AFTER `total_material_cost`,
    ADD COLUMN `approved_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID' AFTER `approved_at`,
    ADD COLUMN `cancelled_at` datetime DEFAULT NULL COMMENT '作废时间' AFTER `approved_by`,
    ADD COLUMN `cancelled_by` bigint unsigned DEFAULT NULL COMMENT '作废人ID' AFTER `cancelled_at`,
    ADD COLUMN `cancelled_reason` varchar(500) DEFAULT NULL COMMENT '作废原因' AFTER `cancelled_by`,
    ADD COLUMN `total_labor_cost` decimal(18,4) DEFAULT 0 COMMENT '人工成本合计' AFTER `total_material_cost`,
    ADD COLUMN `total_tool_cost` decimal(18,4) DEFAULT 0 COMMENT '工装分摊成本' AFTER `total_labor_cost`,
    ADD COLUMN `total_overhead_cost` decimal(18,4) DEFAULT 0 COMMENT '制造费用' AFTER `total_tool_cost`,
    ADD COLUMN `unit_cost` decimal(18,4) DEFAULT 0 COMMENT '单位成本' AFTER `total_overhead_cost`;

-- 2. 生产领料单主表
CREATE TABLE IF NOT EXISTS `prd_pick_order` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `pick_no` varchar(50) NOT NULL COMMENT '领料单号',
    `work_order_id` bigint unsigned NOT NULL COMMENT '关联工单ID',
    `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
    `picker_name` varchar(100) DEFAULT NULL COMMENT '领料人',
    `total_qty` decimal(18,4) DEFAULT 0 COMMENT '总数量',
    `status` tinyint DEFAULT 1 COMMENT '状态: 1-草稿 2-已审核 3-已作废',
    `remark` text COMMENT '备注',
    `create_by` bigint unsigned DEFAULT NULL,
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_pick_no` (`pick_no`),
    KEY `idx_work_order` (`work_order_id`),
    KEY `idx_warehouse` (`warehouse_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产领料单主表';

-- 3. 生产领料单明细
CREATE TABLE IF NOT EXISTS `prd_pick_order_item` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `pick_order_id` bigint unsigned NOT NULL COMMENT '关联领料单ID',
    `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
    `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
    `material_spec` varchar(200) DEFAULT NULL COMMENT '物料规格',
    `required_qty` decimal(18,4) DEFAULT 0 COMMENT '需求数量',
    `actual_qty` decimal(18,4) DEFAULT 0 COMMENT '实领数量',
    `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
    `unit_cost` decimal(18,4) DEFAULT 0 COMMENT '单位成本',
    `line_amount` decimal(18,4) DEFAULT 0 COMMENT '行金额',
    `unit` varchar(20) DEFAULT 'pcs' COMMENT '单位',
    `remark` text COMMENT '备注',
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_pick_order` (`pick_order_id`),
    KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产领料单明细';

-- 4. 生产退料单主表
CREATE TABLE IF NOT EXISTS `prd_return_order` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `return_no` varchar(50) NOT NULL COMMENT '退料单号',
    `work_order_id` bigint unsigned NOT NULL COMMENT '关联工单ID',
    `pick_order_id` bigint unsigned DEFAULT NULL COMMENT '原领料单ID',
    `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '退料仓库ID',
    `return_reason` varchar(500) DEFAULT NULL COMMENT '退料原因',
    `total_qty` decimal(18,4) DEFAULT 0 COMMENT '总数量',
    `status` tinyint DEFAULT 1 COMMENT '状态: 1-草稿 2-已审核 3-已作废',
    `create_by` bigint unsigned DEFAULT NULL,
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_return_no` (`return_no`),
    KEY `idx_work_order` (`work_order_id`),
    KEY `idx_pick_order` (`pick_order_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产退料单主表';

-- 5. 生产退料单明细
CREATE TABLE IF NOT EXISTS `prd_return_order_item` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `return_order_id` bigint unsigned NOT NULL COMMENT '关联退料单ID',
    `pick_order_item_id` bigint unsigned DEFAULT NULL COMMENT '原领料明细ID',
    `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
    `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
    `quantity` decimal(18,4) DEFAULT 0 COMMENT '退料数量',
    `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
    `unit_cost` decimal(18,4) DEFAULT 0 COMMENT '单位成本',
    `line_amount` decimal(18,4) DEFAULT 0 COMMENT '行金额',
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_return_order` (`return_order_id`),
    KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产退料单明细';

-- 6. 工序报工单
CREATE TABLE IF NOT EXISTS `prd_work_report` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `report_no` varchar(50) NOT NULL COMMENT '报工单号',
    `work_order_id` bigint unsigned NOT NULL COMMENT '关联工单ID',
    `process_name` varchar(100) DEFAULT NULL COMMENT '工序名称',
    `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
    `equipment_name` varchar(100) DEFAULT NULL COMMENT '设备名称',
    `shift` varchar(20) DEFAULT NULL COMMENT '班次',
    `operator_name` varchar(100) DEFAULT NULL COMMENT '操作人员',
    `qualified_qty` decimal(18,4) DEFAULT 0 COMMENT '合格数量',
    `defective_qty` decimal(18,4) DEFAULT 0 COMMENT '不良数量',
    `defect_reason` varchar(500) DEFAULT NULL COMMENT '不良原因',
    `work_hours` decimal(10,2) DEFAULT 0 COMMENT '工时(小时)',
    `report_date` date DEFAULT NULL COMMENT '报工日期',
    `status` tinyint DEFAULT 1 COMMENT '状态: 1-草稿 2-已审核 3-已作废',
    `create_by` bigint unsigned DEFAULT NULL,
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_report_no` (`report_no`),
    KEY `idx_work_order` (`work_order_id`),
    KEY `idx_equipment` (`equipment_id`),
    KEY `idx_report_date` (`report_date`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工序报工单';

-- 7. 完工入库单
CREATE TABLE IF NOT EXISTS `prd_finish_order` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `finish_no` varchar(50) NOT NULL COMMENT '完工单号',
    `work_order_id` bigint unsigned NOT NULL COMMENT '关联工单ID',
    `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '入库仓库ID',
    `qualified_qty` decimal(18,4) DEFAULT 0 COMMENT '合格数量',
    `defective_qty` decimal(18,4) DEFAULT 0 COMMENT '不合格数量',
    `status` tinyint DEFAULT 1 COMMENT '状态: 1-草稿 2-已审核 3-已作废',
    `create_by` bigint unsigned DEFAULT NULL,
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_finish_no` (`finish_no`),
    KEY `idx_work_order` (`work_order_id`),
    KEY `idx_warehouse` (`warehouse_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='完工入库单';
