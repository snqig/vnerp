-- ============================================================================
-- 053: 打样订单模块增强
-- 功能: 增加工艺卡/生产工单/销售订单关联、打样费用管理、版本控制、
--       反馈管理和样品库存管理
-- ============================================================================

-- 1. 扩展 sal_sample_order 表，增加关联字段和业务字段
ALTER TABLE `sal_sample_order`
    ADD COLUMN `process_card_id` bigint unsigned DEFAULT NULL COMMENT '关联印前工艺卡ID' AFTER `create_by`,
    ADD COLUMN `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联生产工单ID' AFTER `process_card_id`,
    ADD COLUMN `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单ID' AFTER `work_order_id`,
    ADD COLUMN `sample_fee` decimal(18,4) DEFAULT 0 COMMENT '打样费用' AFTER `sales_order_id`,
    ADD COLUMN `fee_charged` tinyint DEFAULT 0 COMMENT '是否收取打样费: 0-否 1-是' AFTER `sample_fee`,
    ADD COLUMN `fee_deductible` tinyint DEFAULT 0 COMMENT '打样费是否可抵扣大货: 0-否 1-是' AFTER `fee_charged`,
    ADD COLUMN `fee_deducted` tinyint DEFAULT 0 COMMENT '打样费是否已抵扣: 0-否 1-是' AFTER `fee_deductible`,
    ADD COLUMN `sample_version` int DEFAULT 1 COMMENT '打样版本号(支持多轮改样)' AFTER `fee_deducted`,
    ADD COLUMN `parent_version_id` bigint unsigned DEFAULT NULL COMMENT '父版本打样单ID' AFTER `sample_version`,
    ADD COLUMN `converted_at` datetime DEFAULT NULL COMMENT '转大货时间' AFTER `parent_version_id`,
    ADD COLUMN `converted_by` bigint unsigned DEFAULT NULL COMMENT '转大货操作人' AFTER `converted_at`;

-- 2. 创建打样反馈表
CREATE TABLE IF NOT EXISTS `sal_sample_feedback` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `sample_order_id` bigint unsigned NOT NULL COMMENT '关联打样单ID',
    `round` int NOT NULL DEFAULT 1 COMMENT '反馈轮次',
    `feedback_content` text COMMENT '客户反馈意见',
    `modification_requirements` text COMMENT '修改要求',
    `confirmation_status` varchar(20) DEFAULT 'pending' COMMENT '确认状态: pending/approved/rejected',
    `feedback_by` varchar(100) COMMENT '反馈人',
    `feedback_time` datetime COMMENT '反馈时间',
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `deleted` tinyint DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_sample_order` (`sample_order_id`),
    KEY `idx_round` (`sample_order_id`, `round`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打样反馈表';

-- 3. 创建样品库存表
CREATE TABLE IF NOT EXISTS `sal_sample_inventory` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `sample_order_id` bigint unsigned COMMENT '关联打样单ID',
    `product_name` varchar(200) COMMENT '产品名称',
    `material_no` varchar(50) COMMENT '物料编号',
    `quantity` int DEFAULT 0 COMMENT '样品数量',
    `unit` varchar(20) DEFAULT 'pcs' COMMENT '单位',
    `warehouse_id` bigint unsigned COMMENT '仓库ID',
    `status` varchar(20) DEFAULT 'available' COMMENT '状态: available/used/scrapped/sent',
    `sent_to` varchar(200) COMMENT '寄送给谁',
    `sent_date` date COMMENT '寄送日期',
    `remark` text COMMENT '备注',
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_sample_order` (`sample_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='样品库存表';
