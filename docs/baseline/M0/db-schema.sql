
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `base_ink`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `base_ink` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ink_code` varchar(50) NOT NULL COMMENT '油墨编号',
  `ink_name` varchar(200) NOT NULL COMMENT '油墨名称',
  `color_code` varchar(50) DEFAULT NULL COMMENT '色号',
  `color_name` varchar(100) DEFAULT NULL COMMENT '颜色名称',
  `ink_type` varchar(20) DEFAULT NULL COMMENT '油墨类型: solvent-溶剂型, uv-UV型, water-水性',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(200) DEFAULT NULL COMMENT '供应商名称',
  `specification` varchar(200) DEFAULT NULL COMMENT '规格',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `stock_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '库存数量',
  `min_stock` decimal(18,4) DEFAULT '0.0000' COMMENT '最低库存',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-停用, 1-启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ink_code` (`ink_code`),
  KEY `idx_ink_type` (`ink_type`),
  KEY `idx_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='原油墨基础信息表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `biz_contract_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_contract_review` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `review_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评审编号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '订单ID',
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '订单编号',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '客户名称',
  `product_id` bigint unsigned DEFAULT NULL COMMENT '产品ID',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品编码',
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '产品名称',
  `quantity` decimal(12,2) DEFAULT '0.00' COMMENT '数量',
  `amount` decimal(12,2) DEFAULT '0.00' COMMENT '金额',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `sample_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '样品状态',
  `quality_requirement` text COLLATE utf8mb4_unicode_ci COMMENT '质量要求',
  `production_capacity` text COLLATE utf8mb4_unicode_ci COMMENT '产能评估',
  `material_availability` text COLLATE utf8mb4_unicode_ci COMMENT '物料可用性',
  `engineering_feasibility` text COLLATE utf8mb4_unicode_ci COMMENT '工程可行性',
  `biz_opinion` text COLLATE utf8mb4_unicode_ci COMMENT '商务意见',
  `eng_opinion` text COLLATE utf8mb4_unicode_ci COMMENT '工程意见',
  `quality_opinion` text COLLATE utf8mb4_unicode_ci COMMENT '质量意见',
  `prod_opinion` text COLLATE utf8mb4_unicode_ci COMMENT '生产意见',
  `purchase_opinion` text COLLATE utf8mb4_unicode_ci COMMENT '采购意见',
  `review_date` date DEFAULT NULL COMMENT '评审日期',
  `status` tinyint DEFAULT '0' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_review_no` (`review_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同评审表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bom_header`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_header` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_no` varchar(50) NOT NULL COMMENT 'BOM编号',
  `product_id` int DEFAULT NULL COMMENT '产品ID',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品编码',
  `product_name` varchar(200) DEFAULT NULL COMMENT '产品名称',
  `product_spec` varchar(200) DEFAULT NULL COMMENT '产品规格',
  `version` varchar(20) DEFAULT '1.0' COMMENT '版本号',
  `is_default` tinyint DEFAULT '1' COMMENT '是否默认BOM',
  `status` int DEFAULT '10' COMMENT '状态: 10-草稿 20-已审核 30-已发布 90-已停用',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `base_qty` decimal(12,2) DEFAULT '1.00' COMMENT '基本数量',
  `total_material_count` int DEFAULT '0' COMMENT '物料总数',
  `total_cost` decimal(12,2) DEFAULT '0.00' COMMENT '总成本',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint DEFAULT '0' COMMENT '软删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bom_no` (`bom_no`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM头表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bom_line`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_line` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_id` int NOT NULL COMMENT 'BOM头ID',
  `line_no` int NOT NULL COMMENT '行号',
  `material_id` int DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `material_spec` varchar(200) DEFAULT NULL COMMENT '物料规格',
  `material_unit` varchar(20) DEFAULT NULL COMMENT '物料单位',
  `usage_qty` decimal(12,4) NOT NULL DEFAULT '0.0000' COMMENT '用量',
  `loss_rate` decimal(5,2) DEFAULT '0.00' COMMENT '损耗率',
  `unit_cost` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `total_cost` decimal(12,2) DEFAULT '0.00' COMMENT '总成本',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bom_id` (`bom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM行表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `crm_customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) NOT NULL COMMENT '客户编码',
  `customer_name` varchar(100) NOT NULL COMMENT '客户名称',
  `short_name` varchar(50) DEFAULT NULL COMMENT '客户简称',
  `customer_type` tinyint DEFAULT NULL COMMENT '客户类型: 1-企业, 2-个人',
  `industry` varchar(50) DEFAULT NULL COMMENT '所属行业',
  `scale` varchar(50) DEFAULT NULL COMMENT '企业规模',
  `credit_level` varchar(20) DEFAULT NULL COMMENT '信用等级',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `district` varchar(50) DEFAULT NULL COMMENT '区县',
  `address` varchar(255) DEFAULT NULL COMMENT '详细地址',
  `contact_name` varchar(50) DEFAULT NULL COMMENT '联系人姓名',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系人电话',
  `contact_email` varchar(100) DEFAULT NULL COMMENT '联系人邮箱',
  `fax` varchar(20) DEFAULT NULL COMMENT '传真',
  `website` varchar(100) DEFAULT NULL COMMENT '网站',
  `business_license` varchar(50) DEFAULT NULL COMMENT '营业执照号',
  `tax_number` varchar(50) DEFAULT NULL COMMENT '税号',
  `bank_name` varchar(100) DEFAULT NULL COMMENT '开户银行',
  `bank_account` varchar(50) DEFAULT NULL COMMENT '银行账号',
  `salesman_id` bigint unsigned DEFAULT NULL COMMENT '业务员ID',
  `follow_up_status` tinyint DEFAULT '1' COMMENT '跟进状态: 1-潜在客户, 2-意向客户, 3-成交客户, 4-流失客户',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_code` (`customer_code`),
  KEY `idx_customer_code` (`customer_code`),
  KEY `idx_customer_status` (`status`,`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `crm_customer_analysis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer_analysis` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '客户名称',
  `analysis_period` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'month' COMMENT '分析周期',
  `period_start` date DEFAULT NULL COMMENT '周期开始',
  `period_end` date DEFAULT NULL COMMENT '周期结束',
  `order_count` int DEFAULT '0' COMMENT '订单数',
  `order_amount` decimal(12,2) DEFAULT '0.00' COMMENT '订单金额',
  `delivery_count` int DEFAULT '0' COMMENT '交付数',
  `return_count` int DEFAULT '0' COMMENT '退货数',
  `complaint_count` int DEFAULT '0' COMMENT '投诉数',
  `on_time_rate` decimal(5,2) DEFAULT NULL COMMENT '准时率',
  `satisfaction_score` decimal(3,1) DEFAULT NULL COMMENT '满意度',
  `customer_level` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT 'C' COMMENT '客户等级',
  `growth_rate` decimal(5,2) DEFAULT NULL COMMENT '增长率',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_period` (`analysis_period`),
  KEY `idx_level` (`customer_level`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分析表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `crm_customer_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer_contact` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `contact_name` varchar(50) NOT NULL COMMENT '联系人姓名',
  `position` varchar(50) DEFAULT NULL COMMENT '职位',
  `phone` varchar(20) DEFAULT NULL COMMENT '电话',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `is_primary` tinyint DEFAULT '0' COMMENT '是否主联系人: 0-否, 1-是',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户联系人表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `crm_customer_follow_up`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer_follow_up` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '跟进记录ID',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `follow_up_type` tinyint DEFAULT NULL COMMENT '跟进方式: 1-电话, 2-邮件, 3-拜访, 4-微信, 5-其他',
  `follow_up_content` text COMMENT '跟进内容',
  `follow_up_time` datetime DEFAULT NULL COMMENT '跟进时间',
  `next_follow_up_time` datetime DEFAULT NULL COMMENT '下次跟进时间',
  `follow_up_by` bigint unsigned DEFAULT NULL COMMENT '跟进人ID',
  `attachment` varchar(255) DEFAULT NULL COMMENT '附件',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_follow_up_time` (`follow_up_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户跟进记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `crm_follow_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_follow_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '客户名称',
  `follow_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'phone' COMMENT '跟进方式',
  `follow_content` text COLLATE utf8mb4_unicode_ci COMMENT '跟进内容',
  `contact_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系人',
  `salesman_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '业务员',
  `next_follow_date` date DEFAULT NULL COMMENT '下次跟进日期',
  `opportunity` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商机',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_follow_type` (`follow_type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户跟进记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `domain_event_outbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `domain_event_outbox` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '事件主键ID',
  `event_type` varchar(100) NOT NULL COMMENT '事件类型（如 InboundOrderCreated/SalesOrderApproved）',
  `aggregate_type` varchar(50) DEFAULT NULL COMMENT '聚合根类型（如 InboundOrder/SalesOrder）',
  `aggregate_id` bigint unsigned DEFAULT NULL COMMENT '聚合根ID',
  `payload` json NOT NULL COMMENT '事件完整内容（JSON 序列化的 DomainEvent 对象）',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending-待处理, processed-已处理, failed-失败',
  `retry_count` int NOT NULL DEFAULT '0' COMMENT '已重试次数（最大3次，超过标记死信）',
  `error_message` text COMMENT '最近一次失败的错误信息（截断500字符）',
  `next_execute_at` datetime DEFAULT NULL COMMENT '下次执行时间（指数退避: 1s/3s/9s；NULL 表示立即可执行）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '事件创建时间',
  `processed_at` datetime DEFAULT NULL COMMENT '处理完成时间（status=processed 时写入）',
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`,`created_at`) COMMENT '待处理事件查询索引',
  KEY `idx_status_next_execute` (`status`,`next_execute_at`) COMMENT '指数退避消费索引',
  KEY `idx_aggregate` (`aggregate_type`,`aggregate_id`) COMMENT '聚合根溯源索引'
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='领域事件持久化表（Outbox 模式）';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eqp_calibration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_calibration` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `calibration_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '校准单号',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
  `equipment_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '设备编码',
  `equipment_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '设备名称',
  `calibration_date` date DEFAULT NULL COMMENT '校准日期',
  `next_calibration_date` date DEFAULT NULL COMMENT '下次校准日期',
  `calibration_org` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '校准机构',
  `calibration_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'qualified' COMMENT '校准结果',
  `certificate_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '证书编号',
  `calibration_cost` decimal(12,2) DEFAULT '0.00' COMMENT '校准费用',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_calibration_no` (`calibration_no`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备校准表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eqp_equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_equipment` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `equipment_code` varchar(50) NOT NULL COMMENT '设备编码',
  `equipment_name` varchar(100) NOT NULL COMMENT '设备名称',
  `equipment_type` tinyint DEFAULT NULL COMMENT '设备类型: 1-印刷机, 2-覆膜机, 3-模切机, 4-全检机, 5-其他',
  `brand` varchar(50) DEFAULT NULL COMMENT '品牌',
  `model` varchar(50) DEFAULT NULL COMMENT '型号',
  `serial_no` varchar(50) DEFAULT NULL COMMENT '序列号',
  `workshop_id` bigint unsigned DEFAULT NULL COMMENT '车间ID',
  `location` varchar(100) DEFAULT NULL COMMENT '安装位置',
  `purchase_date` date DEFAULT NULL COMMENT '购入日期',
  `manufacturer` varchar(100) DEFAULT NULL COMMENT '制造商',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `warranty_expire` date DEFAULT NULL COMMENT '质保到期日',
  `rated_capacity` decimal(18,4) DEFAULT NULL COMMENT '额定产能',
  `current_status` tinyint DEFAULT '1' COMMENT '当前状态: 1-运行, 2-待机, 3-维修, 4-停机',
  `oee` decimal(5,2) DEFAULT '0.00' COMMENT 'OEE综合效率(%)',
  `availability` decimal(5,2) DEFAULT '0.00' COMMENT '可用率(%)',
  `performance` decimal(5,2) DEFAULT '0.00' COMMENT '性能率(%)',
  `quality_rate` decimal(5,2) DEFAULT '0.00' COMMENT '质量率(%)',
  `total_run_hours` decimal(10,2) DEFAULT '0.00' COMMENT '累计运行时长',
  `last_maintenance_date` date DEFAULT NULL COMMENT '上次维护日期',
  `next_maintenance_date` date DEFAULT NULL COMMENT '下次维护日期',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-停用, 1-启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_equipment_code` (`equipment_code`),
  KEY `idx_type` (`equipment_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备台账表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eqp_maintenance_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_maintenance_plan` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `plan_no` varchar(50) NOT NULL COMMENT '计划编号',
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `maintenance_type` tinyint DEFAULT NULL COMMENT '维护类型: 1-日常保养, 2-定期保养, 3-大修',
  `cycle_type` tinyint DEFAULT NULL COMMENT '周期类型: 1-按天, 2-按周, 3-按月, 4-按运行时长',
  `cycle_value` int DEFAULT NULL COMMENT '周期值',
  `plan_date` date DEFAULT NULL COMMENT '计划日期',
  `responsible_id` bigint unsigned DEFAULT NULL COMMENT '负责人ID',
  `content` text COMMENT '维护内容',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待执行, 2-执行中, 3-已完成, 4-已逾期',
  `complete_date` date DEFAULT NULL COMMENT '完成日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_no` (`plan_no`),
  KEY `idx_equipment` (`equipment_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备维护计划表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eqp_maintenance_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_maintenance_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `record_no` varchar(50) NOT NULL COMMENT '记录编号',
  `plan_id` bigint unsigned DEFAULT NULL COMMENT '维护计划ID',
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `maintenance_type` tinyint DEFAULT NULL COMMENT '维护类型: 1-日常保养, 2-定期保养, 3-大修, 4-故障维修',
  `fault_desc` text COMMENT '故障描述',
  `maintenance_content` text COMMENT '维护内容',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `downtime_hours` decimal(10,2) DEFAULT '0.00' COMMENT '停机时长',
  `cost` decimal(18,4) DEFAULT '0.0000' COMMENT '维护费用',
  `responsible_id` bigint unsigned DEFAULT NULL COMMENT '负责人ID',
  `result` tinyint DEFAULT NULL COMMENT '结果: 1-正常, 2-需跟踪',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_equipment` (`equipment_id`),
  KEY `idx_plan` (`plan_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备维护记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eqp_repair`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_repair` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `repair_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '维修单号',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
  `equipment_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '设备编码',
  `equipment_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '设备名称',
  `fault_date` date DEFAULT NULL COMMENT '故障日期',
  `fault_desc` text COLLATE utf8mb4_unicode_ci COMMENT '故障描述',
  `repair_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'corrective' COMMENT '维修类型',
  `repair_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '维修人',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_repair_no` (`repair_no`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备维修表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `eqp_scrap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_scrap` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `scrap_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '报废单号',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
  `equipment_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '设备编码',
  `equipment_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '设备名称',
  `scrap_date` date DEFAULT NULL COMMENT '报废日期',
  `scrap_reason` text COLLATE utf8mb4_unicode_ci COMMENT '报废原因',
  `original_value` decimal(12,2) DEFAULT '0.00' COMMENT '原值',
  `net_value` decimal(12,2) DEFAULT '0.00' COMMENT '净值',
  `approval_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '审批人',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scrap_no` (`scrap_no`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备报废表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fin_cost_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_cost_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cost_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '成本编号',
  `cost_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '成本类型',
  `cost_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '成本分类',
  `cost_date` date DEFAULT NULL COMMENT '成本日期',
  `amount` decimal(12,2) DEFAULT '0.00' COMMENT '金额',
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '关联订单',
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '产品名称',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '部门',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `status` tinyint DEFAULT '0' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cost_no` (`cost_no`),
  KEY `idx_cost_type` (`cost_type`),
  KEY `idx_cost_date` (`cost_date`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务成本记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fin_payable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_payable` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payable_no` varchar(50) NOT NULL COMMENT '应付单号',
  `source_type` tinyint DEFAULT '1' COMMENT '来源类型: 1-采购订单',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '应付金额',
  `paid_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '已付金额',
  `balance` decimal(18,4) DEFAULT '0.0000' COMMENT '未付余额',
  `due_date` date DEFAULT NULL COMMENT '到期日期',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-未付款, 2-部分付款, 3-已付款',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payable_no` (`payable_no`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_source` (`source_no`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='应付账款表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fin_payment_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_payment_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_no` varchar(50) NOT NULL COMMENT '付款单号',
  `payable_id` bigint unsigned DEFAULT NULL COMMENT '应付ID',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '付款金额',
  `payment_method` varchar(20) DEFAULT NULL COMMENT '付款方式',
  `payment_date` date DEFAULT NULL COMMENT '付款日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_payable` (`payable_id`),
  KEY `idx_supplier` (`supplier_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='付款记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fin_receipt_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_receipt_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receipt_no` varchar(50) NOT NULL COMMENT '收款单号',
  `receivable_id` bigint unsigned DEFAULT NULL COMMENT '应收ID',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '收款金额',
  `payment_method` varchar(20) DEFAULT NULL COMMENT '付款方式',
  `receipt_date` date DEFAULT NULL COMMENT '收款日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_receivable` (`receivable_id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='收款记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fin_receivable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_receivable` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receivable_no` varchar(50) NOT NULL COMMENT '应收单号',
  `source_type` tinyint DEFAULT '1' COMMENT '来源类型: 1-销售订单',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '应收金额',
  `received_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '已收金额',
  `balance` decimal(18,4) DEFAULT '0.0000' COMMENT '未收余额',
  `due_date` date DEFAULT NULL COMMENT '到期日期',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-未收款, 2-部分收款, 3-已收款',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receivable_no` (`receivable_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_source` (`source_no`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='应收账款表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hr_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_attendance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `attendance_date` date NOT NULL,
  `employee_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id_int` bigint unsigned DEFAULT NULL,
  `employee_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `check_in_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `check_out_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `working_hours` decimal(5,2) DEFAULT '0.00',
  `overtime_hours` decimal(5,2) DEFAULT '0.00',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_date` (`attendance_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hr_training`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_training` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `training_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '培训编号',
  `training_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '培训名称',
  `training_type` tinyint DEFAULT NULL COMMENT '培训类型',
  `training_date` date DEFAULT NULL COMMENT '培训日期',
  `training_hours` decimal(5,1) DEFAULT '0.0' COMMENT '培训学时',
  `trainer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '培训讲师',
  `training_content` text COLLATE utf8mb4_unicode_ci COMMENT '培训内容',
  `training_place` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '培训地点',
  `status` tinyint DEFAULT '0' COMMENT '状态 0-待开始 1-进行中 2-已完成',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_training_no` (`training_no`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='培训记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hr_training_participant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_training_participant` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `training_id` bigint unsigned NOT NULL COMMENT '培训ID',
  `employee_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '员工ID',
  `employee_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '员工姓名',
  `score` decimal(5,1) DEFAULT NULL COMMENT '成绩',
  `is_qualified` tinyint DEFAULT NULL COMMENT '是否合格',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training_id` (`training_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='培训参与人员表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ink_mixed_batch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ink_mixed_batch` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调墨批次号',
  `formula_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '配方编号',
  `formula_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '配方名称',
  `total_qty` decimal(12,2) DEFAULT '0.00' COMMENT '总数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '单位',
  `mixed_date` date DEFAULT NULL COMMENT '调墨日期',
  `expire_date` date DEFAULT NULL COMMENT '有效期',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_batch_no` (`batch_no`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调墨批次表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ink_mixed_batch_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ink_mixed_batch_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mixed_batch_id` bigint unsigned NOT NULL COMMENT '调墨批次ID',
  `source_batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '来源批次号',
  `source_label_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '来源标签号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料名称',
  `used_qty` decimal(12,2) DEFAULT '0.00' COMMENT '使用数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '单位',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调墨明细';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ink_mixed_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ink_mixed_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `record_no` varchar(50) NOT NULL COMMENT '记录单号',
  `base_ink_id` bigint unsigned NOT NULL COMMENT '原油墨ID',
  `base_ink_code` varchar(50) DEFAULT NULL COMMENT '原油墨编号',
  `base_ink_name` varchar(200) DEFAULT NULL COMMENT '原油墨名称',
  `mix_ratio` varchar(100) DEFAULT NULL COMMENT '调色比例',
  `color_name` varchar(100) DEFAULT NULL COMMENT '色彩名称',
  `color_code` varchar(50) DEFAULT NULL COMMENT '色彩编码',
  `company_id` bigint unsigned DEFAULT NULL COMMENT '使用公司/客户ID',
  `company_name` varchar(200) DEFAULT NULL COMMENT '使用公司/客户名称',
  `mix_time` datetime NOT NULL COMMENT '调色时间',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员名称',
  `quantity` decimal(18,4) DEFAULT NULL COMMENT '入库数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `location_id` bigint unsigned DEFAULT NULL COMMENT '库位ID',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-已入库, 2-已使用, 3-已过期',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_base_ink` (`base_ink_id`),
  KEY `idx_company` (`company_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='调色后油墨入库记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ink_opening_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ink_opening_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `record_no` varchar(50) NOT NULL COMMENT '记录单号',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `label_id` bigint unsigned DEFAULT NULL COMMENT '标签ID',
  `ink_type` varchar(20) DEFAULT NULL COMMENT '油墨类型: solvent-溶剂型, uv-UV型, water-水性',
  `open_time` datetime NOT NULL COMMENT '开罐时间',
  `expire_hours` int NOT NULL COMMENT '有效时长(小时)',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间',
  `remaining_qty` decimal(18,4) DEFAULT NULL COMMENT '剩余数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-使用中, 2-已过期, 3-已报废',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员名称',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_no`),
  KEY `idx_status` (`status`),
  KEY `idx_expire_time` (`expire_time`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨开罐记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_auxiliary_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_auxiliary_inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `aux_code` varchar(100) DEFAULT NULL,
  `aux_name` varchar(255) DEFAULT NULL,
  `specification` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `warehouse` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `opening_balance` decimal(18,4) DEFAULT '0.0000',
  `total_in` decimal(18,4) DEFAULT '0.0000',
  `total_out` decimal(18,4) DEFAULT '0.0000',
  `current_balance` decimal(18,4) DEFAULT '0.0000',
  `source_file` varchar(255) DEFAULT NULL,
  `source_sheet` varchar(100) DEFAULT NULL,
  `import_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `remarks` text,
  PRIMARY KEY (`id`),
  KEY `idx_aux_code` (`aux_code`),
  KEY `idx_aux_name` (`aux_name`),
  KEY `idx_supplier` (`supplier`)
) ENGINE=InnoDB AUTO_INCREMENT=740 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='辅料库存表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_cutting_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_cutting_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `record_id` bigint unsigned NOT NULL COMMENT '分切记录ID',
  `new_label_id` bigint unsigned NOT NULL COMMENT '新标签ID',
  `new_label_no` varchar(50) NOT NULL COMMENT '新标签编号',
  `cut_width` decimal(18,2) DEFAULT NULL COMMENT '分切宽幅',
  `sequence` int DEFAULT '0' COMMENT '分切序号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_new_label` (`new_label_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分切明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_cutting_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_cutting_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `record_no` varchar(50) NOT NULL COMMENT '分切单号',
  `source_label_id` bigint unsigned NOT NULL COMMENT '源标签ID',
  `source_label_no` varchar(50) NOT NULL COMMENT '源标签编号',
  `cut_width_str` varchar(200) DEFAULT NULL COMMENT '分切宽幅（如：10+20+30）',
  `original_width` decimal(18,2) DEFAULT NULL COMMENT '原宽幅',
  `cut_total_width` decimal(18,2) DEFAULT NULL COMMENT '分切总宽幅',
  `remain_width` decimal(18,2) DEFAULT NULL COMMENT '剩余宽幅',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员名称',
  `cut_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '分切时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-作废, 1-正常',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_source_label` (`source_label_id`),
  KEY `idx_cut_time` (`cut_time`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分切记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_fifo_override_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_fifo_override_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `recommended_batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '推荐批次号',
  `actual_batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '实际出库批次号',
  `requisition_id` bigint unsigned DEFAULT NULL COMMENT '领料单ID',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '异常原因',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `approve_id` bigint unsigned DEFAULT NULL COMMENT '审批人ID',
  `approve_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审批人姓名',
  `status` tinyint DEFAULT '0' COMMENT '状态：0=待审批，1=已批准，2=已拒绝',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_requisition` (`requisition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='FIFO异常覆盖记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_inbound_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inbound_item` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL COMMENT '入库订单ID',
  `material_id` int unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(200) DEFAULT NULL COMMENT '物料规格',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `quantity` decimal(12,3) DEFAULT '0.000' COMMENT '入库数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `total_price` decimal(12,2) DEFAULT '0.00' COMMENT '总价',
  `warehouse_location` varchar(50) DEFAULT NULL COMMENT '库位',
  `produce_date` date DEFAULT NULL COMMENT '生产日期',
  `expire_date` date DEFAULT NULL COMMENT '过期日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库订单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_inbound_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inbound_order` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '入库单号',
  `order_type` enum('purchase','return','transfer','other') DEFAULT 'purchase' COMMENT '入库类型',
  `warehouse_id` int unsigned NOT NULL COMMENT '仓库ID',
  `supplier_id` int unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) DEFAULT NULL COMMENT '供应商名称',
  `po_id` int unsigned DEFAULT NULL COMMENT '关联采购单ID',
  `po_no` varchar(50) DEFAULT NULL COMMENT '采购单号',
  `grn_type` enum('po','blind','return') DEFAULT 'po' COMMENT '入库类型',
  `total_amount` decimal(12,2) DEFAULT '0.00' COMMENT '总金额',
  `total_quantity` decimal(12,3) DEFAULT '0.000' COMMENT '总数量',
  `status` enum('draft','pending','approved','completed','cancelled') DEFAULT 'draft' COMMENT '状态',
  `qc_status` enum('pending','pass','fail','partial') DEFAULT 'pending' COMMENT '质检状态',
  `inbound_date` date DEFAULT NULL COMMENT '入库日期',
  `remark` text COMMENT '备注',
  `create_by` int unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_by` int unsigned DEFAULT NULL,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_po_id` (`po_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库订单主表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `warehouse_name` varchar(100) DEFAULT NULL COMMENT '仓库名称',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '库存数量',
  `available_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '可用数量',
  `locked_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '锁定数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `safety_stock` decimal(18,4) DEFAULT '0.0000' COMMENT '安全库存',
  `version` int unsigned DEFAULT '1' COMMENT '乐观锁版本号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_warehouse` (`material_id`,`warehouse_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_warehouse` (`warehouse_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_inventory_batch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inventory_batch` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `batch_no` varchar(50) NOT NULL COMMENT '批次号',
  `material_id` int unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `warehouse_id` int unsigned NOT NULL COMMENT '仓库ID',
  `warehouse_name` varchar(100) DEFAULT NULL COMMENT '仓库名称',
  `quantity` decimal(12,3) DEFAULT '0.000' COMMENT '总数量',
  `available_qty` decimal(12,3) DEFAULT '0.000' COMMENT '可用数量',
  `locked_qty` decimal(12,3) DEFAULT '0.000' COMMENT '锁定数量',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `unit_price` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `produce_date` date DEFAULT NULL COMMENT '生产日期',
  `expire_date` date DEFAULT NULL COMMENT '有效期至',
  `inbound_date` date DEFAULT NULL COMMENT '入库日期',
  `status` enum('normal','frozen','expired') DEFAULT 'normal' COMMENT '状态',
  `version` int unsigned DEFAULT '1' COMMENT '乐观锁版本号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_batch_no` (`batch_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存批次表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_inventory_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inventory_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_id` int unsigned DEFAULT NULL COMMENT '仓库ID',
  `material_id` int unsigned DEFAULT NULL COMMENT '物料ID',
  `change_type` varchar(20) DEFAULT NULL COMMENT '变动类型',
  `change_qty` decimal(12,3) DEFAULT '0.000' COMMENT '变动数量',
  `order_no` varchar(50) DEFAULT NULL COMMENT '关联单号',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存变动日志表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_inventory_transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inventory_transaction` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `trans_no` varchar(50) NOT NULL COMMENT '事务单号',
  `trans_type` enum('in','out','transfer','adjust','return') NOT NULL COMMENT '事务类型',
  `source_type` varchar(20) DEFAULT NULL COMMENT '来源类型',
  `source_id` bigint unsigned DEFAULT NULL COMMENT '来源单据ID',
  `source_line_id` bigint unsigned DEFAULT NULL COMMENT '来源单据行ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `location_id` bigint unsigned DEFAULT NULL COMMENT '库位ID',
  `quantity` decimal(14,3) DEFAULT '0.000' COMMENT '数量',
  `unit_cost` decimal(14,4) DEFAULT '0.0000' COMMENT '单位成本',
  `total_cost` decimal(14,2) DEFAULT '0.00' COMMENT '总成本',
  `unit_price` decimal(14,4) DEFAULT '0.0000' COMMENT '单价',
  `total_amount` decimal(14,2) DEFAULT '0.00' COMMENT '总金额',
  `reference_no` varchar(100) DEFAULT NULL COMMENT '参考单号',
  `remark` text COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trans_no` (`trans_no`),
  KEY `idx_trans_type` (`trans_type`),
  KEY `idx_source` (`source_type`,`source_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存事务表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_inventory_transaction_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inventory_transaction_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_type` varchar(50) DEFAULT NULL,
  `item_type` varchar(50) DEFAULT NULL,
  `item_id` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `item_name` varchar(255) DEFAULT NULL,
  `quantity` decimal(18,4) DEFAULT NULL,
  `transaction_date` date DEFAULT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `warehouse` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `operator` varchar(100) DEFAULT NULL,
  `source_file` varchar(255) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `remarks` text,
  PRIMARY KEY (`id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_item_type` (`item_type`),
  KEY `idx_transaction_date` (`transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存事务日志表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_location` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `location_code` varchar(50) NOT NULL COMMENT '库位编码',
  `location_name` varchar(100) NOT NULL COMMENT '库位名称',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `zone` varchar(50) DEFAULT NULL COMMENT '区域',
  `row_no` varchar(20) DEFAULT NULL COMMENT '排',
  `column_no` varchar(20) DEFAULT NULL COMMENT '列',
  `layer_no` varchar(20) DEFAULT NULL COMMENT '层',
  `location_type` tinyint DEFAULT '1' COMMENT '库位类型: 1-原料, 2-成品, 3-半成品, 4-余料, 5-网版/刀模专用',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_code` (`location_code`),
  KEY `idx_warehouse` (`warehouse_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库位表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `specification` varchar(255) DEFAULT NULL COMMENT '规格型号',
  `category_id` bigint unsigned DEFAULT NULL COMMENT '分类ID',
  `material_type` tinyint DEFAULT NULL COMMENT '物料类型: 1-原材料, 2-半成品, 3-成品, 4-辅料, 5-包材',
  `unit` varchar(20) DEFAULT NULL COMMENT '计量单位',
  `barcode` varchar(50) DEFAULT NULL COMMENT '条形码',
  `brand` varchar(50) DEFAULT NULL COMMENT '品牌',
  `safety_stock` decimal(18,4) DEFAULT '0.0000' COMMENT '安全库存',
  `max_stock` decimal(18,4) DEFAULT NULL COMMENT '最大库存',
  `min_stock` decimal(18,4) DEFAULT NULL COMMENT '最小库存',
  `purchase_price` decimal(18,4) DEFAULT NULL COMMENT '采购单价',
  `sale_price` decimal(18,4) DEFAULT NULL COMMENT '销售单价',
  `cost_price` decimal(18,4) DEFAULT NULL COMMENT '成本单价',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '默认仓库ID',
  `shelf_life` int DEFAULT NULL COMMENT '保质期(天)',
  `warning_days` int DEFAULT NULL COMMENT '预警天数',
  `is_batch_managed` tinyint DEFAULT '0' COMMENT '是否批次管理: 0-否, 1-是',
  `is_serial_managed` tinyint DEFAULT '0' COMMENT '是否序列号管理: 0-否, 1-是',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_code` (`material_code`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_material_type` (`material_type`,`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=4070 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_material_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_material_category` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `parent_id` bigint unsigned DEFAULT '0' COMMENT '父分类ID',
  `category_code` varchar(50) NOT NULL COMMENT '分类编码',
  `category_name` varchar(100) NOT NULL COMMENT '分类名称',
  `sort_order` int DEFAULT '0' COMMENT '排序序号',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`category_code`),
  KEY `idx_parent` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=199 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料分类表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_material_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_material_inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_code` varchar(100) DEFAULT NULL,
  `material_name` varchar(255) DEFAULT NULL,
  `specification` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `material_type` varchar(50) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `warehouse` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `opening_balance` decimal(18,4) DEFAULT '0.0000',
  `total_in` decimal(18,4) DEFAULT '0.0000',
  `total_out` decimal(18,4) DEFAULT '0.0000',
  `current_balance` decimal(18,4) DEFAULT '0.0000',
  `safety_stock` decimal(18,4) DEFAULT '0.0000',
  `source_file` varchar(255) DEFAULT NULL,
  `source_sheet` varchar(100) DEFAULT NULL,
  `import_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `remarks` text,
  PRIMARY KEY (`id`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_material_name` (`material_name`),
  KEY `idx_category` (`category`),
  KEY `idx_supplier` (`supplier`)
) ENGINE=InnoDB AUTO_INCREMENT=1848 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='原料库存表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_material_label`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_material_label` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `label_no` varchar(50) NOT NULL COMMENT '标签编号',
  `qr_code` varchar(255) DEFAULT NULL COMMENT '二维码内容',
  `purchase_order_no` varchar(50) DEFAULT NULL COMMENT '采购单号',
  `supplier_name` varchar(200) DEFAULT NULL COMMENT '供应商名称',
  `receive_date` date DEFAULT NULL COMMENT '进料日期',
  `material_code` varchar(50) NOT NULL COMMENT '物料代号',
  `material_name` varchar(200) DEFAULT NULL COMMENT '品名',
  `specification` varchar(200) DEFAULT NULL COMMENT '进料规格',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批号',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '数量',
  `package_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '包装量',
  `width` decimal(18,2) DEFAULT NULL COMMENT '宽幅',
  `length_per_roll` decimal(18,2) DEFAULT NULL COMMENT '每卷米数',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `color_code` varchar(50) DEFAULT NULL COMMENT '颜色代号',
  `mix_remark` varchar(500) DEFAULT NULL COMMENT '混料备注',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `location_id` bigint unsigned DEFAULT NULL COMMENT '库位ID',
  `is_main_material` tinyint DEFAULT '0' COMMENT '是否母材: 0-否, 1-是',
  `is_used` tinyint DEFAULT '0' COMMENT '是否已使用: 0-否, 1-是',
  `is_cut` tinyint DEFAULT '0' COMMENT '是否已分切: 0-否, 1-是',
  `parent_label_id` bigint unsigned DEFAULT NULL COMMENT '父标签ID（分切来源）',
  `label_type` tinyint DEFAULT '1' COMMENT '标签类型: 1-原材料, 2-分切子批, 3-余料',
  `remaining_width` decimal(18,2) DEFAULT NULL COMMENT '剩余宽幅（余料）',
  `remaining_length` decimal(18,2) DEFAULT NULL COMMENT '剩余长度（余料）',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用, 2-冻结, 3-已过期',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_label_no` (`label_no`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_parent_label` (`parent_label_id`),
  KEY `idx_label_type` (`label_type`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料标签表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_outbound_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_outbound_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '出库单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `material_spec` varchar(255) DEFAULT NULL COMMENT '规格型号',
  `quantity` decimal(18,4) NOT NULL COMMENT '出库数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_outbound_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_outbound_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '出库单号',
  `order_date` date DEFAULT NULL COMMENT '出库日期',
  `outbound_type` varchar(20) DEFAULT 'sale' COMMENT '出库类型: sale/transfer/production/other',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `warehouse_code` varchar(50) DEFAULT NULL COMMENT '仓库编码',
  `warehouse_name` varchar(100) DEFAULT NULL COMMENT '仓库名称',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `status` varchar(20) DEFAULT 'draft' COMMENT '状态: draft/pending/approved/completed/cancelled',
  `remark` text COMMENT '备注',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人',
  `audit_status` varchar(20) DEFAULT 'pending' COMMENT '审核状态',
  `auditor_name` varchar(50) DEFAULT NULL COMMENT '审核人',
  `audit_time` datetime DEFAULT NULL COMMENT '审核时间',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_product_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_product_inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(100) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `specification` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `customer` varchar(255) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `warehouse` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `opening_balance` decimal(18,4) DEFAULT '0.0000',
  `total_in` decimal(18,4) DEFAULT '0.0000',
  `total_out` decimal(18,4) DEFAULT '0.0000',
  `current_balance` decimal(18,4) DEFAULT '0.0000',
  `batch_no` varchar(100) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `source_file` varchar(255) DEFAULT NULL,
  `source_sheet` varchar(100) DEFAULT NULL,
  `import_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `remarks` text,
  PRIMARY KEY (`id`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_product_name` (`product_name`),
  KEY `idx_category` (`category`),
  KEY `idx_warehouse` (`warehouse`)
) ENGINE=InnoDB AUTO_INCREMENT=5604 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='成品库存表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_scan_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_scan_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `scan_type` varchar(50) NOT NULL COMMENT '扫码类型: cutting-分切, process-流程卡, trace-追溯',
  `qr_content` varchar(500) DEFAULT NULL COMMENT '二维码内容',
  `label_no` varchar(50) DEFAULT NULL COMMENT '标签编号',
  `operation` varchar(50) DEFAULT NULL COMMENT '操作类型',
  `result` tinyint DEFAULT '1' COMMENT '结果: 0-失败, 1-成功',
  `message` varchar(500) DEFAULT NULL COMMENT '结果消息',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员名称',
  `scan_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '扫码时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scan_type` (`scan_type`),
  KEY `idx_label_no` (`label_no`),
  KEY `idx_scan_time` (`scan_time`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='扫码操作日志表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_trace_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_trace_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `trace_id` bigint unsigned NOT NULL COMMENT '追溯记录ID',
  `label_id` bigint unsigned NOT NULL COMMENT '物料标签ID',
  `label_no` varchar(50) NOT NULL COMMENT '物料标签编号',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料代号',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `specification` varchar(200) DEFAULT NULL COMMENT '规格',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批号',
  `supplier_name` varchar(200) DEFAULT NULL COMMENT '供应商名称',
  `receive_date` date DEFAULT NULL COMMENT '进料日期',
  `material_type` tinyint DEFAULT '2' COMMENT '物料类型: 1-主材, 2-辅料',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_trace_id` (`trace_id`),
  KEY `idx_label_id` (`label_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='追溯明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_trace_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_trace_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `trace_no` varchar(50) NOT NULL COMMENT '追溯单号',
  `card_id` bigint unsigned DEFAULT NULL COMMENT '流程卡ID',
  `card_no` varchar(50) DEFAULT NULL COMMENT '流程卡卡号',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '工单号',
  `product_code` varchar(50) DEFAULT NULL COMMENT '成品料号',
  `main_label_id` bigint unsigned DEFAULT NULL COMMENT '主材标签ID',
  `trace_type` tinyint DEFAULT '1' COMMENT '追溯类型: 1-正向追溯, 2-反向追溯',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员名称',
  `trace_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '追溯时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trace_no` (`trace_no`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_main_label` (`main_label_id`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='追溯记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inv_warehouse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_warehouse` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_code` varchar(50) NOT NULL COMMENT '仓库编码',
  `warehouse_name` varchar(100) NOT NULL COMMENT '仓库名称',
  `warehouse_type` tinyint DEFAULT NULL COMMENT '仓库类型: 1-原材料仓, 2-半成品仓, 3-成品仓, 4-辅料仓',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `address` varchar(255) DEFAULT NULL COMMENT '详细地址',
  `manager_id` bigint unsigned DEFAULT NULL COMMENT '仓库负责人ID',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_warehouse_code` (`warehouse_code`),
  KEY `idx_warehouse_status` (`status`,`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='仓库表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material_batch_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_batch_costs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '成本ID',
  `qr_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '小料二维码编码',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料名称',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '批次号',
  `quantity` decimal(18,4) NOT NULL COMMENT '数量',
  `unit_cost` decimal(18,4) NOT NULL COMMENT '单位成本',
  `total_cost` decimal(18,4) NOT NULL COMMENT '总成本',
  `used_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '已使用数量',
  `remaining_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '剩余数量',
  `split_flag` tinyint DEFAULT '1' COMMENT '拆分标记：0-整料，1-小料，2-余料',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_qr_code` (`qr_code`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小料批次成本表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material_requisition_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_requisition_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `requisition_id` bigint unsigned NOT NULL COMMENT '领料单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料名称',
  `planned_quantity` decimal(18,4) NOT NULL COMMENT '计划数量（BOM计算）',
  `actual_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '实际领用数量',
  `issued_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '已出库数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '单位',
  `qr_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '小料二维码',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '批次号',
  `warehouse_location` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '库位',
  `fifo_recommended` tinyint DEFAULT '0' COMMENT '是否为FIFO推荐批次：0-否，1-是',
  `split_flag` tinyint DEFAULT '1' COMMENT '拆分标记：0-整料，1-小料，2-余料',
  `unit_cost` decimal(18,4) DEFAULT NULL COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT NULL COMMENT '总成本',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_requisition` (`requisition_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_qr_code` (`qr_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='领料单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material_requisitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_requisitions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '领料单ID',
  `requisition_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '领料单编号，格式：MR+YYYYMMDD+4位序号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '类型：normal-正常领料, over-超领, supplementary-补料',
  `status` tinyint DEFAULT '0' COMMENT '状态：0=待审批，1=待出库，2=已出库，3=已取消',
  `applicant_id` bigint unsigned DEFAULT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '申请人姓名',
  `approver_id` bigint unsigned DEFAULT NULL COMMENT '审批人ID',
  `approver_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审批人姓名',
  `approve_time` datetime DEFAULT NULL COMMENT '审批时间',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '领料总数量',
  `issued_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '已出库数量',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `original_requisition_id` bigint unsigned DEFAULT NULL COMMENT '原领料单ID（补料时关联）',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '超领/补料原因',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_requisition_no` (`requisition_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_applicant` (`applicant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='领料单主表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_return_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `return_id` bigint unsigned NOT NULL COMMENT '退料单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,4) NOT NULL COMMENT '退料数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '单位',
  `qr_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '小料二维码',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '批次号',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '退料原因',
  `unit_cost` decimal(18,4) DEFAULT NULL COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT NULL COMMENT '总成本',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_return` (`return_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退料单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_returns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '退料单ID',
  `return_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '退料单编号，格式：RT+YYYYMMDD+4位序号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联工单ID',
  `requisition_id` bigint unsigned DEFAULT NULL COMMENT '关联领料单ID',
  `status` tinyint DEFAULT '0' COMMENT '状态：0=待确认，1=已入库，2=已取消',
  `applicant_id` bigint unsigned DEFAULT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '申请人姓名',
  `confirm_id` bigint unsigned DEFAULT NULL COMMENT '确认人ID',
  `confirm_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '确认人姓名',
  `confirm_time` datetime DEFAULT NULL COMMENT '确认时间',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '退料总数量',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_requisition` (`requisition_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退料单主表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mdm_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mdm_product` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品编码',
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品名称',
  `short_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '简称',
  `specification` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '规格型号',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '件' COMMENT '计量单位',
  `category_id` bigint unsigned DEFAULT NULL COMMENT '分类ID',
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '分类名称',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '客户名称',
  `bom_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'V1.0' COMMENT 'BOM版本',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `cost_price` decimal(12,2) DEFAULT '0.00' COMMENT '成本价',
  `sale_price` decimal(12,2) DEFAULT '0.00' COMMENT '销售价',
  `min_stock` decimal(12,2) DEFAULT '0.00' COMMENT '最小库存',
  `max_stock` decimal(12,2) DEFAULT '0.00' COMMENT '最大库存',
  `safety_stock` decimal(12,2) DEFAULT '0.00' COMMENT '安全库存',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_code` (`product_code`),
  KEY `idx_category` (`category_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品主数据表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `outsource_issue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outsource_issue` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `issue_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发料单号',
  `outsource_order_id` bigint unsigned DEFAULT NULL COMMENT '委外订单ID',
  `outsource_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '委外单号',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `issue_date` date DEFAULT NULL COMMENT '发料日期',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_issue_no` (`issue_no`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外发料表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `outsource_issue_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outsource_issue_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `issue_id` bigint unsigned NOT NULL COMMENT '发料单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料编码',
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料名称',
  `quantity` decimal(12,2) DEFAULT '0.00' COMMENT '数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '单位',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '批次号',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外发料明细';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `outsource_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outsource_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '委外单号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '供应商名称',
  `product_id` bigint unsigned DEFAULT NULL COMMENT '产品ID',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '产品编码',
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '产品名称',
  `plan_qty` decimal(12,2) DEFAULT '0.00' COMMENT '计划数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '单位',
  `unit_price` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `total_amount` decimal(12,2) DEFAULT '0.00' COMMENT '总金额',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `outsource_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'process' COMMENT '委外类型',
  `process_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '工序名称',
  `status` tinyint DEFAULT '0' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外订单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `outsource_receive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outsource_receive` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receive_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '收货单号',
  `outsource_order_id` bigint unsigned DEFAULT NULL COMMENT '委外订单ID',
  `outsource_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '委外单号',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `receive_date` date DEFAULT NULL COMMENT '收货日期',
  `receive_qty` decimal(12,2) DEFAULT '0.00' COMMENT '收货数量',
  `qualified_qty` decimal(12,2) DEFAULT '0.00' COMMENT '合格数量',
  `defective_qty` decimal(12,2) DEFAULT '0.00' COMMENT '不良数量',
  `qc_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '质检状态',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receive_no` (`receive_no`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外收货表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `outsource_settlement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outsource_settlement` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `settlement_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '结算单号',
  `outsource_order_id` bigint unsigned DEFAULT NULL COMMENT '委外订单ID',
  `outsource_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '委外单号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '供应商名称',
  `settlement_date` date DEFAULT NULL COMMENT '结算日期',
  `settlement_qty` decimal(12,2) DEFAULT '0.00' COMMENT '结算数量',
  `unit_price` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `settlement_amount` decimal(12,2) DEFAULT '0.00' COMMENT '结算金额',
  `deduct_amount` decimal(12,2) DEFAULT '0.00' COMMENT '扣款金额',
  `actual_amount` decimal(12,2) DEFAULT '0.00' COMMENT '实付金额',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid' COMMENT '付款状态',
  `status` tinyint DEFAULT '0' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_settlement_no` (`settlement_no`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外结算表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_bom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_bom` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bom_name` varchar(200) NOT NULL COMMENT 'BOM名称',
  `product_id` bigint unsigned DEFAULT NULL COMMENT '产品ID',
  `version` varchar(20) DEFAULT '1.0' COMMENT '版本号',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_bom_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_bom_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bom_id` bigint unsigned NOT NULL COMMENT 'BOM ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `loss_rate` decimal(5,2) DEFAULT '0.00' COMMENT '损耗率(%)',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `item_type` tinyint DEFAULT '1' COMMENT '物料类型: 1-原材料, 2-半成品, 3-辅料',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bom` (`bom_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_die`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_die` (
  `id` int NOT NULL AUTO_INCREMENT,
  `die_code` varchar(50) NOT NULL,
  `die_name` varchar(100) DEFAULT NULL,
  `die_type` varchar(50) DEFAULT NULL,
  `size_spec` varchar(100) DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `max_use_count` int DEFAULT '0',
  `used_count` int DEFAULT '0',
  `remaining_count` int DEFAULT '0',
  `maintenance_days` int DEFAULT '180',
  `last_maintenance_date` date DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `warehouse_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `status` int DEFAULT '1',
  `remark` text,
  `deleted` tinyint NOT NULL DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_die_code` (`die_code`),
  KEY `idx_die_code` (`die_code`),
  KEY `idx_die_status` (`status`,`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_die_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_die_template` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `template_code` varchar(50) NOT NULL COMMENT '刀模板编号',
  `template_name` varchar(100) NOT NULL COMMENT '刀模板名称',
  `asset_type` varchar(20) DEFAULT 'die' COMMENT '资产类型: die-刀模, flexo_plate-柔印版, screen_mesh-丝网版',
  `layout_type` varchar(20) DEFAULT 'single_row' COMMENT '排版方式: single_row-单排, double_row-双排, triple_row-三排',
  `pieces_per_impression` int DEFAULT '1' COMMENT '每印件数',
  `template_type` tinyint DEFAULT NULL COMMENT '类型: 1-刀模, 2-丝网版',
  `specification` varchar(255) DEFAULT NULL COMMENT '规格尺寸',
  `material` varchar(50) DEFAULT NULL COMMENT '材质',
  `max_usage` int DEFAULT NULL COMMENT '最大使用次数',
  `current_usage` int DEFAULT '0' COMMENT '当前使用次数',
  `remaining_usage` int DEFAULT NULL COMMENT '剩余使用次数',
  `warning_usage` int DEFAULT NULL COMMENT '预警使用次数',
  `max_impressions` int DEFAULT '0' COMMENT '最大冲压次数',
  `cumulative_impressions` int DEFAULT '0' COMMENT '累计冲压次数',
  `warning_threshold` int DEFAULT '80' COMMENT '预警阈值(%)',
  `maintenance_interval` int DEFAULT '8000' COMMENT '保养间隔(次)',
  `maintenance_count` int DEFAULT '0' COMMENT '保养次数',
  `last_maintenance_impressions` int DEFAULT '0' COMMENT '上次保养时冲压次数',
  `last_maintenance_date` date DEFAULT NULL COMMENT '上次保养日期',
  `last_used_date` date DEFAULT NULL COMMENT '最后使用日期',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-在用, 2-待更换, 3-已报废',
  `die_status` varchar(30) DEFAULT 'available' COMMENT '刀模状态: available-可用, in_use-使用中, maintenance_needed-需保养, re_rule_needed-需重做, scrap-已报废',
  `storage_location` varchar(100) DEFAULT NULL COMMENT '存放位置',
  `purchase_date` date DEFAULT NULL COMMENT '购入日期',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `unit_price` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `qr_code` varchar(100) DEFAULT NULL COMMENT '二维码',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`),
  KEY `idx_type` (`template_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='刀模板/网版管理表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_ink`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_ink` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ink_code` varchar(50) NOT NULL,
  `ink_name` varchar(100) NOT NULL,
  `ink_type` int DEFAULT NULL,
  `color_name` varchar(50) DEFAULT NULL,
  `color_code` varchar(50) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'kg',
  `specification` varchar(200) DEFAULT NULL,
  `safety_stock` decimal(10,2) DEFAULT '0.00',
  `shelf_life` int DEFAULT NULL,
  `stock_qty` decimal(10,2) DEFAULT '0.00',
  `status` int DEFAULT '1',
  `remark` text,
  `deleted` tinyint NOT NULL DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ink_code` (`ink_code`),
  KEY `idx_ink_code` (`ink_code`),
  KEY `idx_ink_status` (`status`,`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_material_issue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_material_issue` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `issue_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '领料单号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `issue_date` date DEFAULT NULL COMMENT '领料日期',
  `issue_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '领料类型',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_issue_no` (`issue_no`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产领料单';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_material_issue_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_material_issue_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `issue_id` bigint unsigned NOT NULL COMMENT '领料单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料编码',
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料名称',
  `required_qty` decimal(12,2) DEFAULT '0.00' COMMENT '需求数量',
  `issued_qty` decimal(12,2) DEFAULT '0.00' COMMENT '已领数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '单位',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '批次号',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='领料明细';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_material_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_material_return` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `return_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '退料单号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `return_date` date DEFAULT NULL COMMENT '退料日期',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产退料单';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_material_return_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_material_return_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `return_id` bigint unsigned NOT NULL COMMENT '退料单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料编码',
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料名称',
  `return_qty` decimal(12,2) DEFAULT '0.00' COMMENT '退料数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '单位',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '批次号',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退料明细';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_process_card`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_process_card` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `card_no` varchar(50) NOT NULL COMMENT '流程卡卡号',
  `qr_code` varchar(255) DEFAULT NULL COMMENT '二维码内容',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '工单号',
  `product_code` varchar(50) DEFAULT NULL COMMENT '成品料号',
  `product_name` varchar(200) DEFAULT NULL COMMENT '成品品名',
  `material_spec` varchar(200) DEFAULT NULL COMMENT '材料规格',
  `work_order_date` date DEFAULT NULL COMMENT '工单日期',
  `plan_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '计划生产数量',
  `main_label_id` bigint unsigned DEFAULT NULL COMMENT '主材标签ID',
  `main_label_no` varchar(50) DEFAULT NULL COMMENT '主材标签编号',
  `burdening_status` tinyint DEFAULT '0' COMMENT '配料状态: 0-未配料, 1-已配料',
  `lock_status` tinyint DEFAULT '0' COMMENT '锁住状态: 0-未锁, 1-已锁',
  `create_user_id` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_user_name` varchar(50) DEFAULT NULL COMMENT '创建人名称',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_card_no` (`card_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_main_label` (`main_label_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产流程卡表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_process_card_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_process_card_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `card_id` bigint unsigned NOT NULL COMMENT '流程卡ID',
  `card_no` varchar(50) DEFAULT NULL COMMENT '流程卡卡号',
  `label_id` bigint unsigned NOT NULL COMMENT '物料标签ID',
  `label_no` varchar(50) NOT NULL COMMENT '物料标签编号',
  `material_type` tinyint DEFAULT '1' COMMENT '物料类型: 1-主材, 2-辅料',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料代号',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `specification` varchar(200) DEFAULT NULL COMMENT '规格',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批号',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '用量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_label_id` (`label_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='流程卡物料关联表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_process_route`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_process_route` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `route_code` varchar(50) NOT NULL COMMENT '工艺路线编码',
  `route_name` varchar(100) NOT NULL COMMENT '工艺路线名称',
  `product_id` bigint unsigned DEFAULT NULL COMMENT '产品ID',
  `version` varchar(10) DEFAULT '1.0' COMMENT '版本号',
  `is_default` tinyint DEFAULT '1' COMMENT '是否默认',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_route_code` (`route_code`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工艺路线表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_process_route_step`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_process_route_step` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `route_id` bigint unsigned NOT NULL COMMENT '工艺路线ID',
  `step_seq` int NOT NULL COMMENT '工序序号',
  `step_name` varchar(50) NOT NULL COMMENT '工序名称',
  `step_type` tinyint DEFAULT NULL COMMENT '工序类型: 1-印刷, 2-覆膜, 3-模切, 4-全检, 5-包装, 6-其他',
  `equipment_type` tinyint DEFAULT NULL COMMENT '所需设备类型',
  `standard_time` decimal(10,2) DEFAULT NULL COMMENT '标准工时(分钟)',
  `setup_time` decimal(10,2) DEFAULT NULL COMMENT '准备时间(分钟)',
  `is_key_process` tinyint DEFAULT '0' COMMENT '是否关键工序',
  `is_first_piece_required` tinyint DEFAULT '0' COMMENT '是否需要首件签样',
  `quality_check` tinyint DEFAULT '0' COMMENT '是否质检: 0-否, 1-是',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_route` (`route_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工艺路线工序表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_product_label`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_product_label` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `label_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签编号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料编码',
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '物料名称',
  `quantity` decimal(12,2) DEFAULT '0.00' COMMENT '数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '单位',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '批次号',
  `qc_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '质检结果',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_label_no` (`label_no`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品标签表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_schedule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '排程ID',
  `schedule_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '排产单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '销售订单ID',
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '销售订单号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '生产工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生产工单号',
  `product_id` bigint unsigned DEFAULT NULL COMMENT '产品ID',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品编码',
  `product_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品名称',
  `workshop` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '车间: die_cut, trademark, printing, packaging',
  `planned_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '计划数量',
  `completed_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已完成数量',
  `planned_start` datetime DEFAULT NULL COMMENT '计划开始时间',
  `planned_end` datetime DEFAULT NULL COMMENT '计划结束时间',
  `actual_start` datetime DEFAULT NULL COMMENT '实际开始时间',
  `actual_end` datetime DEFAULT NULL COMMENT '实际结束时间',
  `priority` tinyint DEFAULT '2' COMMENT '优先级: 1-紧急, 2-正常, 3-低',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待排产, 2-已排产, 3-生产中, 4-已完成, 5-已取消',
  `scheduler` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '排产人',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记: 0-未删除, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_schedule_no` (`schedule_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_workshop` (`workshop`),
  KEY `idx_status` (`status`),
  KEY `idx_planned_start` (`planned_start`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产排程主表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_schedule_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_schedule_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `schedule_id` bigint unsigned NOT NULL COMMENT '排程ID',
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `color_seq_no` int NOT NULL COMMENT '色序号',
  `color_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '颜色名称',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
  `equipment_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备名称',
  `planned_start` datetime DEFAULT NULL COMMENT '计划开始时间',
  `planned_end` datetime DEFAULT NULL COMMENT '计划结束时间',
  `actual_start` datetime DEFAULT NULL COMMENT '实际开始时间',
  `actual_end` datetime DEFAULT NULL COMMENT '实际结束时间',
  `duration_hours` decimal(8,2) DEFAULT NULL COMMENT '预计耗时（小时）',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待排, 2-已排, 3-生产中, 4-已完成',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_seq` (`work_order_id`,`color_seq_no`),
  KEY `idx_schedule` (`schedule_id`),
  KEY `idx_equipment` (`equipment_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排程明细表（色序级）';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_screen_plate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_screen_plate` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plate_code` varchar(50) NOT NULL,
  `plate_name` varchar(100) DEFAULT NULL,
  `plate_type` varchar(50) DEFAULT NULL,
  `mesh_count` varchar(50) DEFAULT NULL,
  `size_spec` varchar(100) DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `max_use_count` int DEFAULT '0',
  `used_count` int DEFAULT '0',
  `remaining_count` int DEFAULT '0',
  `maintenance_days` int DEFAULT '360',
  `last_maintenance_date` date DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `warehouse_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `storage_location` varchar(100) DEFAULT NULL,
  `status` int DEFAULT '1',
  `remark` text,
  `deleted` tinyint NOT NULL DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plate_code` (`plate_code`),
  KEY `idx_screen_plate_code` (`plate_code`),
  KEY `idx_screen_plate_status` (`status`,`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_standard_card`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_standard_card` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '标准卡ID',
  `card_no` varchar(50) NOT NULL COMMENT '标准卡编号',
  `name` varchar(200) DEFAULT NULL,
  `type` varchar(20) DEFAULT 'process',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称',
  `customer_code` varchar(50) DEFAULT NULL COMMENT '客户代码',
  `product_name` varchar(100) DEFAULT NULL COMMENT '产品名称',
  `version` varchar(10) DEFAULT NULL COMMENT '版本',
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `create_user` int DEFAULT NULL,
  `audit_user` int DEFAULT NULL,
  `date` date DEFAULT NULL COMMENT '日期',
  `document_code` varchar(50) DEFAULT NULL COMMENT '文件编号',
  `finished_size` varchar(50) DEFAULT NULL COMMENT '成品尺寸',
  `tolerance` varchar(50) DEFAULT NULL COMMENT '公差',
  `material_name` varchar(100) DEFAULT NULL COMMENT '材料名称',
  `material_type` varchar(20) DEFAULT NULL COMMENT '材料类型',
  `mold_type` varchar(100) DEFAULT '' COMMENT '模号/种类',
  `layout_type` varchar(50) DEFAULT NULL COMMENT '排版方式',
  `spacing` varchar(20) DEFAULT NULL COMMENT '间距',
  `spacing_value` varchar(20) DEFAULT NULL COMMENT '间距值',
  `sheet_width` varchar(20) DEFAULT NULL COMMENT '片材宽',
  `sheet_length` varchar(20) DEFAULT NULL COMMENT '片材长',
  `core_type` varchar(50) DEFAULT NULL COMMENT '纸芯类型',
  `paper_direction` varchar(20) DEFAULT NULL COMMENT '纸向',
  `roll_width` varchar(20) DEFAULT NULL COMMENT '料宽',
  `paper_edge` varchar(20) DEFAULT NULL COMMENT '纸边',
  `standard_usage` varchar(50) DEFAULT NULL COMMENT '标准用量',
  `jump_distance` varchar(20) DEFAULT NULL COMMENT '跳距',
  `process_flow1` varchar(100) DEFAULT NULL COMMENT '工艺流程1',
  `process_flow2` varchar(100) DEFAULT NULL COMMENT '工艺流程2',
  `print_type` varchar(50) DEFAULT NULL COMMENT '表面处理',
  `first_jump_distance` varchar(20) DEFAULT NULL COMMENT '第一跳距',
  `sequences` json DEFAULT NULL COMMENT '印序数据',
  `film_manufacturer` varchar(100) DEFAULT NULL COMMENT '膜厂商',
  `film_code` varchar(50) DEFAULT NULL COMMENT '膜编号',
  `film_size` varchar(50) DEFAULT NULL COMMENT '膜规格',
  `process_method` varchar(50) DEFAULT NULL COMMENT '工艺方式',
  `stamping_method` varchar(50) DEFAULT NULL COMMENT '冲压方法',
  `mold_code` varchar(50) DEFAULT NULL COMMENT '模具编号',
  `back_mold_code` varchar(50) DEFAULT NULL COMMENT '模具编号(选择)',
  `layout_method` varchar(50) DEFAULT NULL COMMENT '排版方式',
  `layout_way` varchar(50) DEFAULT NULL COMMENT '排版方向',
  `jump_distance2` varchar(20) DEFAULT NULL COMMENT '跳距2',
  `mylar_material` varchar(100) DEFAULT NULL COMMENT '麦拉材料',
  `mylar_specs` varchar(50) DEFAULT NULL COMMENT '麦拉规格',
  `mylar_layout` varchar(50) DEFAULT NULL COMMENT '麦拉排版',
  `mylar_jump` varchar(20) DEFAULT NULL COMMENT '麦拉跳距',
  `adhesive_type` varchar(50) DEFAULT NULL COMMENT '背胶种类',
  `adhesive_manufacturer` varchar(100) DEFAULT NULL COMMENT '背胶厂商',
  `adhesive_code` varchar(50) DEFAULT NULL COMMENT '背胶编号',
  `adhesive_size` varchar(50) DEFAULT NULL COMMENT '背胶尺寸',
  `adhesive_specs` varchar(50) DEFAULT NULL COMMENT '背胶规格',
  `dashed_knife` tinyint DEFAULT '0' COMMENT '加虚线刀: 0-否, 1-是',
  `slice_per_row` varchar(20) DEFAULT NULL COMMENT 'PCS/排',
  `slice_per_roll` varchar(20) DEFAULT NULL COMMENT 'PCS/卷',
  `slice_per_bundle` varchar(20) DEFAULT NULL COMMENT 'PCS/扎',
  `slice_per_bag` varchar(20) DEFAULT NULL COMMENT 'PCS/袋',
  `slice_per_box` varchar(20) DEFAULT NULL COMMENT 'PCS/箱',
  `packing_qty` varchar(20) DEFAULT NULL COMMENT '包装数量(PCS/袋)',
  `back_knife_mold` varchar(50) DEFAULT NULL COMMENT '背胶刀模存放',
  `back_mylar_mold` varchar(50) DEFAULT NULL COMMENT '背麦拉刀模存放',
  `etch_mold` varchar(100) DEFAULT '' COMMENT '腐蚀刀模',
  `storage_location` varchar(100) DEFAULT '' COMMENT '存放位置',
  `extra_field` varchar(100) DEFAULT '' COMMENT '额外字段',
  `release_paper_code` varchar(50) DEFAULT NULL COMMENT '离型纸编号',
  `release_paper_type` varchar(50) DEFAULT NULL COMMENT '离型纸种类',
  `release_paper_category` varchar(50) DEFAULT NULL COMMENT '离型纸类别',
  `release_paper_specs` varchar(50) DEFAULT NULL COMMENT '离型纸规格',
  `padding_material` varchar(100) DEFAULT NULL COMMENT '填充材料',
  `packing_material` varchar(100) DEFAULT NULL COMMENT '包装材料',
  `special_color` varchar(200) DEFAULT NULL COMMENT '专色配比',
  `color_formula` varchar(200) DEFAULT NULL COMMENT '颜色配方',
  `file_path` varchar(200) DEFAULT NULL COMMENT '电脑图档存储路径',
  `sample_info` varchar(200) DEFAULT NULL COMMENT '样品信息',
  `notes` text COMMENT '注意事项',
  `remark` text,
  `glue_type` varchar(50) DEFAULT NULL COMMENT '滴胶类型',
  `packing_type` varchar(50) DEFAULT NULL COMMENT '包装类型',
  `creator` varchar(50) DEFAULT NULL COMMENT '制作',
  `reviewer` varchar(50) DEFAULT NULL COMMENT '审核',
  `factory_manager` varchar(50) DEFAULT NULL COMMENT '厂长',
  `quality_manager` varchar(50) DEFAULT NULL COMMENT '品管',
  `sales` varchar(50) DEFAULT NULL COMMENT '业务',
  `approver` varchar(50) DEFAULT NULL COMMENT '核准',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-草稿, 2-待审核, 3-已启用, 4-已归档',
  `creator_id` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `reviewer_id` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_card_no` (`card_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_standard_card_customer` (`customer_id`),
  KEY `idx_standard_card_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准卡表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_work_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_work_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '工单ID',
  `work_order_no` varchar(50) NOT NULL COMMENT '工单编号',
  `work_order_date` date DEFAULT NULL COMMENT '工单日期',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '销售订单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '产品ID',
  `plan_qty` decimal(18,4) NOT NULL COMMENT '计划数量',
  `completed_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已完成数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `plan_start_date` date DEFAULT NULL COMMENT '计划开工日期',
  `plan_end_date` date DEFAULT NULL COMMENT '计划完工日期',
  `actual_start_date` date DEFAULT NULL COMMENT '实际开工日期',
  `actual_end_date` date DEFAULT NULL COMMENT '实际完工日期',
  `workshop_id` bigint unsigned DEFAULT NULL COMMENT '车间ID',
  `workcenter_id` bigint unsigned DEFAULT NULL COMMENT '工作中心ID',
  `priority` tinyint DEFAULT '1' COMMENT '优先级: 1-低, 2-中, 3-高, 4-紧急',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待开工, 2-生产中, 3-已完成, 4-已关闭',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_no` (`work_order_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产工单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_work_order_color_seq`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_work_order_color_seq` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `seq_no` int NOT NULL COMMENT '色序号: 1,2,3...',
  `color_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '颜色名称: 红,黄,蓝,黑...',
  `screen_plate_id` bigint unsigned DEFAULT NULL COMMENT '网版ID',
  `ink_formula_id` bigint unsigned DEFAULT NULL COMMENT '油墨配方ID',
  `estimated_duration_hours` decimal(8,2) DEFAULT '4.00' COMMENT '预计耗时（小时）',
  `equipment_type_required` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '所需设备类型: printing, die_cut...',
  `depends_on_seq` int DEFAULT NULL COMMENT '依赖前序色序号（前序完成后才能开始）',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_seq` (`work_order_id`,`seq_no`),
  KEY `idx_work_order` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单色序表（多色套印）';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prd_work_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_work_report` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `report_no` varchar(50) NOT NULL COMMENT '报工单号',
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '工单编号',
  `process_name` varchar(50) DEFAULT NULL COMMENT '工序名称',
  `process_seq` int DEFAULT NULL COMMENT '工序序号',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员姓名',
  `plan_qty` decimal(18,4) DEFAULT NULL COMMENT '计划数量',
  `completed_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '完成数量',
  `qualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '合格数量',
  `defective_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '不良数量',
  `scrap_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '报废数量',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `work_hours` decimal(10,2) DEFAULT '0.00' COMMENT '工时',
  `is_first_piece` tinyint DEFAULT '0' COMMENT '是否首件: 0-否, 1-是',
  `first_piece_status` tinyint DEFAULT NULL COMMENT '首件签样: 1-待签样, 2-已签样, 3-不合格',
  `first_piece_inspector` varchar(50) DEFAULT NULL COMMENT '首件签样人',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_no` (`report_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产报工表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prod_work_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_no` varchar(50) NOT NULL COMMENT '工单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单ID',
  `order_no` varchar(50) DEFAULT NULL COMMENT '关联销售订单号',
  `bom_id` bigint unsigned DEFAULT NULL COMMENT '关联BOM ID',
  `customer_name` varchar(200) DEFAULT NULL COMMENT '客户名称',
  `product_name` varchar(200) DEFAULT NULL COMMENT '产品名称',
  `quantity` decimal(15,2) DEFAULT '0.00' COMMENT '生产数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `status` varchar(20) DEFAULT 'pending' COMMENT '状态: pending/confirmed/producing/completed/cancelled',
  `priority` varchar(20) DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `plan_start_date` date DEFAULT NULL COMMENT '计划开始日期',
  `plan_end_date` date DEFAULT NULL COMMENT '计划完成日期',
  `actual_start_date` date DEFAULT NULL COMMENT '实际开始日期',
  `actual_end_date` date DEFAULT NULL COMMENT '实际完成日期',
  `remark` text COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_no` (`work_order_no`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产工单主表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prod_work_order_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `line_no` int DEFAULT '0' COMMENT '行号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(15,2) DEFAULT '0.00' COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(15,2) DEFAULT '0.00' COMMENT '单价',
  `total_price` decimal(15,2) DEFAULT '0.00' COMMENT '总价',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_work_order_id` (`work_order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产工单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prod_work_order_material_req`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order_material_req` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `bom_line_id` bigint unsigned DEFAULT NULL COMMENT 'BOM行ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `required_qty` decimal(14,3) DEFAULT '0.000' COMMENT '需求数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单物料需求表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '订单编号',
  `order_date` date DEFAULT NULL COMMENT '订单日期',
  `supplier_id` bigint unsigned NOT NULL COMMENT '供应商ID',
  `contact_name` varchar(50) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `delivery_address` varchar(255) DEFAULT NULL COMMENT '送货地址',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `total_with_tax` decimal(18,4) DEFAULT '0.0000' COMMENT '含税总额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(10,4) DEFAULT '1.0000' COMMENT '汇率',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT '付款条件',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `settlement_method` varchar(50) DEFAULT NULL COMMENT '结算方式',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待确认, 2-已确认, 3-部分到货, 4-已完成, 5-已取消',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购订单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_order_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_order_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '订单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `quantity` decimal(18,4) NOT NULL COMMENT '采购数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `tax_rate` decimal(5,2) DEFAULT '0.00' COMMENT '税率(%)',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `tax_amount` decimal(18,4) DEFAULT NULL COMMENT '税额',
  `total_amount` decimal(18,4) DEFAULT NULL COMMENT '含税金额',
  `received_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已到货数量',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购订单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_purchase_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_order` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `po_no` varchar(50) NOT NULL COMMENT '采购单号',
  `supplier_id` int unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) NOT NULL COMMENT '供应商名称',
  `supplier_code` varchar(50) DEFAULT NULL COMMENT '供应商编码',
  `order_date` date NOT NULL COMMENT '订单日期',
  `delivery_date` date DEFAULT NULL COMMENT '预计交货日期',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(10,4) DEFAULT '1.0000' COMMENT '汇率',
  `total_amount` decimal(14,2) DEFAULT '0.00' COMMENT '订单总金额',
  `total_quantity` decimal(14,3) DEFAULT '0.000' COMMENT '订单总数量',
  `tax_rate` decimal(5,2) DEFAULT '13.00' COMMENT '税率%',
  `tax_amount` decimal(14,2) DEFAULT '0.00' COMMENT '税额',
  `grand_total` decimal(14,2) DEFAULT '0.00' COMMENT '含税总金额',
  `status` tinyint unsigned DEFAULT '10' COMMENT '状态: 10-草稿,20-待审批,30-已审批,40-部分收货,50-已完成,90-已关闭',
  `over_receipt_tolerance` decimal(5,2) DEFAULT '5.00' COMMENT '超收容差率%',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT '付款条款',
  `delivery_address` text COMMENT '送货地址',
  `contact_person` varchar(50) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `remark` text COMMENT '备注',
  `create_by` int unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` int unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `audit_by` int unsigned DEFAULT NULL COMMENT '审批人ID',
  `audit_time` datetime DEFAULT NULL COMMENT '审批时间',
  `close_by` int unsigned DEFAULT NULL COMMENT '关闭人ID',
  `close_time` datetime DEFAULT NULL COMMENT '关闭时间',
  `close_reason` varchar(200) DEFAULT NULL COMMENT '关闭原因',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_no` (`po_no`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_date` (`order_date`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购单主表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_purchase_order_line`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_order_line` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `po_id` int unsigned NOT NULL COMMENT '采购单ID',
  `line_no` int unsigned NOT NULL COMMENT '行号',
  `material_id` int unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(500) DEFAULT NULL COMMENT '物料规格',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `order_qty` decimal(14,3) NOT NULL DEFAULT '0.000' COMMENT '订购数量',
  `received_qty` decimal(14,3) DEFAULT '0.000' COMMENT '累计入库数量',
  `returned_qty` decimal(14,3) DEFAULT '0.000' COMMENT '累计退货数量',
  `unit_price` decimal(14,4) NOT NULL DEFAULT '0.0000' COMMENT '单价',
  `amount` decimal(14,2) DEFAULT '0.00' COMMENT '金额',
  `tax_rate` decimal(5,2) DEFAULT '13.00' COMMENT '税率%',
  `tax_amount` decimal(14,2) DEFAULT '0.00' COMMENT '税额',
  `line_total` decimal(14,2) DEFAULT '0.00' COMMENT '行合计',
  `require_date` date DEFAULT NULL COMMENT '需求日期',
  `closed_flag` tinyint(1) DEFAULT '0' COMMENT '行关闭标志',
  `closed_reason` varchar(200) DEFAULT NULL COMMENT '关闭原因',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_line` (`po_id`,`line_no`),
  KEY `idx_material` (`material_id`),
  CONSTRAINT `pur_purchase_order_line_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `pur_purchase_order` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购单行表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_request` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `request_no` varchar(50) NOT NULL COMMENT '申请单号',
  `request_date` date DEFAULT NULL COMMENT '申请日期',
  `request_type` varchar(20) DEFAULT 'material' COMMENT '申请类型',
  `request_dept` varchar(100) DEFAULT NULL COMMENT '申请部门',
  `requester_name` varchar(50) DEFAULT NULL COMMENT '申请人',
  `total_amount` decimal(14,2) DEFAULT '0.00' COMMENT '总金额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `status` tinyint DEFAULT '0' COMMENT '状态: 0-草稿, 1-待审批, 2-已审批, 3-已转采购, 9-已关闭',
  `priority` tinyint DEFAULT '1' COMMENT '优先级',
  `expected_date` date DEFAULT NULL COMMENT '期望交期',
  `supplier_name` varchar(100) DEFAULT NULL COMMENT '供应商名称',
  `remark` text COMMENT '备注',
  `create_by` int unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_by` int unsigned DEFAULT NULL,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_request_no` (`request_no`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购申请主表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_request_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_request_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `request_id` bigint unsigned NOT NULL COMMENT '申请单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `quantity` decimal(18,4) NOT NULL COMMENT '申请数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `required_date` date DEFAULT NULL COMMENT '需求日期',
  `purpose` varchar(255) DEFAULT NULL COMMENT '用途说明',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_request` (`request_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购申请明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_request_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_request_item` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `request_id` int unsigned NOT NULL COMMENT '申请ID',
  `line_no` int unsigned NOT NULL COMMENT '行号',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `material_spec` varchar(500) DEFAULT NULL COMMENT '物料规格',
  `material_unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `quantity` decimal(14,3) DEFAULT '0.000' COMMENT '数量',
  `price` decimal(14,4) DEFAULT '0.0000' COMMENT '单价',
  `amount` decimal(14,2) DEFAULT '0.00' COMMENT '金额',
  `supplier_name` varchar(100) DEFAULT NULL COMMENT '供应商名称',
  `expected_date` date DEFAULT NULL COMMENT '期望交期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_request` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购申请明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_supplier` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(50) NOT NULL COMMENT '供应商编码',
  `supplier_name` varchar(100) NOT NULL COMMENT '供应商名称',
  `short_name` varchar(50) DEFAULT NULL COMMENT '供应商简称',
  `supplier_type` tinyint DEFAULT NULL COMMENT '供应商类型: 1-原材料, 2-辅料, 3-设备, 4-服务',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `address` varchar(255) DEFAULT NULL COMMENT '详细地址',
  `contact_name` varchar(50) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `contact_email` varchar(100) DEFAULT NULL COMMENT '联系邮箱',
  `business_license` varchar(50) DEFAULT NULL COMMENT '营业执照号',
  `tax_number` varchar(50) DEFAULT NULL COMMENT '税号',
  `bank_name` varchar(100) DEFAULT NULL COMMENT '开户银行',
  `bank_account` varchar(50) DEFAULT NULL COMMENT '银行账号',
  `credit_level` varchar(20) DEFAULT NULL COMMENT '信用等级',
  `cooperation_status` tinyint DEFAULT '1' COMMENT '合作状态: 1-合作中, 2-暂停合作, 3-终止合作',
  `settlement_method` varchar(50) DEFAULT NULL COMMENT '结算方式',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT '付款条件',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_code` (`supplier_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pur_supplier_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_supplier_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `supplier_id` bigint unsigned NOT NULL COMMENT '供应商ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `supply_price` decimal(18,4) DEFAULT NULL COMMENT '供应价格',
  `min_order_qty` decimal(18,4) DEFAULT NULL COMMENT '最小订购量',
  `lead_time` int DEFAULT NULL COMMENT '交货周期(天)',
  `is_default` tinyint DEFAULT '0' COMMENT '是否默认供应商: 0-否, 1-是',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_material` (`supplier_id`,`material_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商物料关联表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `qc_inspection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_inspection` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inspection_no` varchar(50) NOT NULL COMMENT '质检单号',
  `inspection_type` tinyint DEFAULT NULL COMMENT '质检类型: 1-来料检验, 2-过程检验, 3-成品检验, 4-出货检验',
  `source_type` varchar(50) DEFAULT NULL COMMENT '来源类型',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `inspection_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '检验数量',
  `qualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '合格数量',
  `unqualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '不合格数量',
  `inspection_result` tinyint DEFAULT NULL COMMENT '检验结果: 1-合格, 2-不合格, 3-让步接收',
  `inspector` varchar(50) DEFAULT NULL COMMENT '检验员',
  `inspection_date` date DEFAULT NULL COMMENT '检验日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspection_no` (`inspection_no`),
  KEY `idx_source` (`source_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_type` (`inspection_type`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='质检记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `qc_unqualified`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_unqualified` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `unqualified_no` varchar(50) NOT NULL COMMENT '不合格品单号',
  `inspection_id` bigint unsigned DEFAULT NULL COMMENT '关联质检ID',
  `source_type` varchar(50) DEFAULT NULL COMMENT '来源类型',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '不合格数量',
  `defect_type` varchar(50) DEFAULT NULL COMMENT '缺陷类型',
  `defect_desc` text COMMENT '缺陷描述',
  `handle_type` tinyint DEFAULT NULL COMMENT '处理方式: 1-返工, 2-报废, 3-特采',
  `handle_result` tinyint DEFAULT NULL COMMENT '处理结果: 1-已处理, 2-处理中',
  `handler` varchar(50) DEFAULT NULL COMMENT '处理人',
  `handle_date` date DEFAULT NULL COMMENT '处理日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_unqualified_no` (`unqualified_no`),
  KEY `idx_inspection` (`inspection_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='不合格品处理表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_delivery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_delivery` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '出库单ID',
  `delivery_no` varchar(50) NOT NULL COMMENT '出库单号',
  `delivery_date` date DEFAULT NULL COMMENT '出库日期',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '销售订单ID',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `logistics_company` varchar(100) DEFAULT NULL COMMENT '物流公司',
  `tracking_no` varchar(50) DEFAULT NULL COMMENT '物流单号',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待发货, 2-已发货, 3-已签收',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_delivery_no` (`delivery_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_delivery_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_delivery_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `delivery_id` bigint unsigned NOT NULL COMMENT '出库单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `order_detail_id` bigint unsigned DEFAULT NULL COMMENT '订单明细ID',
  `quantity` decimal(18,4) NOT NULL COMMENT '出库数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_delivery` (`delivery_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_delivery_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_delivery_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `delivery_no` varchar(50) NOT NULL COMMENT '送货单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '销售订单ID',
  `order_no` varchar(50) DEFAULT NULL COMMENT '销售订单编号',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称',
  `delivery_date` date DEFAULT NULL COMMENT '送货日期',
  `contact_name` varchar(50) DEFAULT NULL COMMENT '收货联系人',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `delivery_address` varchar(255) DEFAULT NULL COMMENT '送货地址',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '发货仓库ID',
  `logistics_company` varchar(100) DEFAULT NULL COMMENT '物流公司',
  `tracking_no` varchar(50) DEFAULT NULL COMMENT '物流单号',
  `driver_name` varchar(50) DEFAULT NULL COMMENT '司机姓名',
  `vehicle_no` varchar(20) DEFAULT NULL COMMENT '车牌号',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `sign_status` tinyint DEFAULT '0' COMMENT '签收状态: 0-未签收, 1-已签收, 2-部分签收, 3-拒收',
  `sign_person` varchar(50) DEFAULT NULL COMMENT '签收人',
  `sign_time` datetime DEFAULT NULL COMMENT '签收时间',
  `sign_remark` varchar(255) DEFAULT NULL COMMENT '签收备注',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待发货, 2-已发货, 3-已签收, 4-已取消',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_delivery_no` (`delivery_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='送货单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_delivery_order_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_delivery_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `delivery_id` bigint unsigned NOT NULL COMMENT '送货单ID',
  `order_detail_id` bigint unsigned DEFAULT NULL COMMENT '订单明细ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `material_spec` varchar(255) DEFAULT NULL COMMENT '规格型号',
  `quantity` decimal(18,4) NOT NULL COMMENT '送货数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `sign_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '签收数量',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_delivery` (`delivery_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='送货单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '订单编号',
  `order_date` date DEFAULT NULL COMMENT '订单日期',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `contact_name` varchar(50) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `delivery_address` varchar(255) DEFAULT NULL COMMENT '送货地址',
  `salesman_id` bigint unsigned DEFAULT NULL COMMENT '业务员ID',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `total_with_tax` decimal(18,4) DEFAULT '0.0000' COMMENT '含税总额',
  `discount_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '折扣金额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(10,4) DEFAULT '1.0000' COMMENT '汇率',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT '付款条件',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `contract_no` varchar(50) DEFAULT NULL COMMENT '合同编号',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待确认, 2-已确认, 3-部分发货, 4-已完成, 5-已取消',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_order_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_order_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '订单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `quantity` decimal(18,4) NOT NULL COMMENT '销售数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `tax_rate` decimal(5,2) DEFAULT '0.00' COMMENT '税率(%)',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `tax_amount` decimal(18,4) DEFAULT NULL COMMENT '税额',
  `total_amount` decimal(18,4) DEFAULT NULL COMMENT '含税金额',
  `delivered_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已发货数量',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_order_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '订单ID',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(14,3) DEFAULT '0.000' COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(14,4) DEFAULT '0.0000' COMMENT '单价',
  `total_price` decimal(14,2) DEFAULT '0.00' COMMENT '总价',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单明细表(API)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_reconciliation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_reconciliation` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reconciliation_no` varchar(50) NOT NULL COMMENT '对账单号',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称',
  `period_start` date NOT NULL COMMENT '对账期间开始',
  `period_end` date NOT NULL COMMENT '对账期间结束',
  `delivery_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '送货金额',
  `return_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '退货金额',
  `discount_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '折扣金额',
  `net_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '对账净额',
  `received_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '已收金额',
  `balance_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '未收余额',
  `confirm_status` tinyint DEFAULT '0' COMMENT '客户确认: 0-未确认, 1-已确认, 2-有异议',
  `confirm_person` varchar(50) DEFAULT NULL COMMENT '确认人',
  `confirm_time` datetime DEFAULT NULL COMMENT '确认时间',
  `confirm_remark` varchar(255) DEFAULT NULL COMMENT '确认备注',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-草稿, 2-已发送, 3-已确认, 4-已关闭',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_no` (`reconciliation_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_period` (`period_start`,`period_end`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售对账表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_reconciliation_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_reconciliation_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reconciliation_id` bigint unsigned NOT NULL COMMENT '对账单ID',
  `source_type` tinyint NOT NULL COMMENT '来源类型: 1-送货单, 2-退货单',
  `source_id` bigint unsigned DEFAULT NULL COMMENT '来源单据ID',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `source_date` date DEFAULT NULL COMMENT '单据日期',
  `amount` decimal(18,4) NOT NULL COMMENT '金额',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reconciliation` (`reconciliation_id`),
  KEY `idx_source` (`source_type`,`source_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售对账明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_return_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_return_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `return_no` varchar(50) NOT NULL COMMENT '退货单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '原销售订单ID',
  `order_no` varchar(50) DEFAULT NULL COMMENT '原销售订单编号',
  `delivery_id` bigint unsigned DEFAULT NULL COMMENT '原送货单ID',
  `delivery_no` varchar(50) DEFAULT NULL COMMENT '原送货单号',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称',
  `return_date` date DEFAULT NULL COMMENT '退货日期',
  `return_type` tinyint DEFAULT '1' COMMENT '退货类型: 1-质量退货, 2-数量差异, 3-规格不符, 4-其他',
  `return_reason` text COMMENT '退货原因',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '退货总数量',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '退货总金额',
  `inspection_status` tinyint DEFAULT '0' COMMENT '质检状态: 0-未质检, 1-质检中, 2-已质检',
  `inspection_result` tinyint DEFAULT NULL COMMENT '质检结果: 1-合格, 2-不合格, 3-部分合格',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '退货入库仓库ID',
  `inbound_status` tinyint DEFAULT '0' COMMENT '入库状态: 0-未入库, 1-已入库',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待审核, 2-已审核, 3-已退货, 4-已拒绝',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_return_order_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_return_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `return_id` bigint unsigned NOT NULL COMMENT '退货单ID',
  `delivery_item_id` bigint unsigned DEFAULT NULL COMMENT '送货单明细ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `material_spec` varchar(255) DEFAULT NULL COMMENT '规格型号',
  `quantity` decimal(18,4) NOT NULL COMMENT '退货数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `inspection_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '质检数量',
  `qualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '合格数量',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_return` (`return_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sal_sample_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_sample_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) NOT NULL COMMENT '打样订单号',
  `notify_date` date DEFAULT NULL COMMENT '通知日期',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称',
  `product_name` varchar(200) DEFAULT NULL COMMENT '产品名称',
  `material_no` varchar(50) DEFAULT NULL COMMENT '物料编号',
  `version` varchar(20) DEFAULT 'A' COMMENT '版本',
  `size_spec` varchar(200) DEFAULT NULL COMMENT '尺寸规格',
  `material_spec` varchar(200) DEFAULT NULL COMMENT '材料规格',
  `specification` varchar(200) DEFAULT NULL COMMENT '规格型号',
  `quantity` int DEFAULT '0' COMMENT '数量',
  `order_date` date DEFAULT NULL COMMENT '订单日期',
  `customer_require_date` date DEFAULT NULL COMMENT '客户需求日期',
  `delivery_date` date DEFAULT NULL COMMENT '交付日期',
  `actual_delivery_date` date DEFAULT NULL COMMENT '实际交付日期',
  `delivery_status` varchar(20) DEFAULT 'pending' COMMENT '交付状态',
  `status` varchar(20) DEFAULT 'pending' COMMENT '状态: pending/producing/completed/cancelled',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_notify_date` (`notify_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='打样订单表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `srm_supplier_eval`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `srm_supplier_eval` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `eval_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评估编号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '供应商名称',
  `eval_period` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'month' COMMENT '评估周期',
  `period_start` date DEFAULT NULL COMMENT '周期开始',
  `period_end` date DEFAULT NULL COMMENT '周期结束',
  `quality_score` decimal(5,2) DEFAULT '0.00' COMMENT '质量分',
  `delivery_score` decimal(5,2) DEFAULT '0.00' COMMENT '交付分',
  `price_score` decimal(5,2) DEFAULT '0.00' COMMENT '价格分',
  `service_score` decimal(5,2) DEFAULT '0.00' COMMENT '服务分',
  `total_score` decimal(5,2) DEFAULT '0.00' COMMENT '总分',
  `quality_rate` decimal(5,2) DEFAULT '0.00' COMMENT '合格率',
  `on_time_rate` decimal(5,2) DEFAULT '0.00' COMMENT '准时率',
  `order_count` int DEFAULT '0' COMMENT '订单数',
  `defect_count` int DEFAULT '0' COMMENT '缺陷数',
  `supplier_level` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT 'C' COMMENT '供应商等级',
  `status` tinyint DEFAULT '0' COMMENT '状态',
  `evaluator` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '评估人',
  `eval_time` datetime DEFAULT NULL COMMENT '评估时间',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_eval_no` (`eval_no`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商评估表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `srm_supplier_eval_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `srm_supplier_eval_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `eval_id` bigint unsigned NOT NULL COMMENT '评估ID',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '分类',
  `item_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '项目名称',
  `weight` decimal(5,2) DEFAULT '0.00' COMMENT '权重',
  `score` decimal(5,2) DEFAULT '0.00' COMMENT '得分',
  `actual_value` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '实际值',
  `target_value` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '目标值',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商评估明细';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_company` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_config` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_name` varchar(50) NOT NULL COMMENT '配置名称',
  `config_key` varchar(50) NOT NULL COMMENT '配置键名',
  `config_value` varchar(500) NOT NULL COMMENT '配置值',
  `config_type` tinyint DEFAULT '1' COMMENT '配置类型: 1-系统, 2-业务',
  `description` varchar(255) DEFAULT NULL COMMENT '描述',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `config_type_enum` varchar(20) DEFAULT 'string' COMMENT '值类型: string/number/boolean/json',
  `category` varchar(50) DEFAULT '系统基础配置' COMMENT '配置分类',
  `display_name` varchar(100) DEFAULT NULL COMMENT '显示名称',
  `sort_order` int DEFAULT '0' COMMENT '排序号',
  `is_required` tinyint DEFAULT '0' COMMENT '是否必填: 1-是, 0-否',
  `approval_required` tinyint DEFAULT '0' COMMENT '是否需要审批: 1-是, 0-否',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-启用, 0-禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统配置表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_department` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '部门ID',
  `parent_id` bigint unsigned DEFAULT '0' COMMENT '父部门ID, 0为顶级部门',
  `dept_name` varchar(100) NOT NULL COMMENT '部门名称',
  `dept_code` varchar(50) DEFAULT NULL COMMENT '部门编码',
  `sort_order` int DEFAULT '0' COMMENT '排序序号',
  `leader_id` bigint unsigned DEFAULT NULL COMMENT '部门负责人ID',
  `phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='部门表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_dict_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_dict_data` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '字典数据ID',
  `dict_type_id` bigint unsigned NOT NULL COMMENT '字典类型ID',
  `dict_label` varchar(50) NOT NULL COMMENT '字典标签',
  `dict_value` varchar(100) NOT NULL COMMENT '字典键值',
  `sort_order` int DEFAULT '0' COMMENT '排序序号',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_dict_type` (`dict_type_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='字典数据表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_dict_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_dict_type` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '字典类型ID',
  `dict_name` varchar(50) NOT NULL COMMENT '字典名称',
  `dict_code` varchar(50) NOT NULL COMMENT '字典编码',
  `description` varchar(255) DEFAULT NULL COMMENT '描述',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='字典类型表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_employee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_no` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `gender` int DEFAULT '1',
  `age` int DEFAULT NULL,
  `id_card` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `dept_id` int DEFAULT NULL,
  `dept_name` varchar(100) DEFAULT NULL,
  `section` varchar(100) DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `role_name` varchar(100) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `entry_date` date DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `native_place` varchar(100) DEFAULT NULL,
  `home_address` varchar(255) DEFAULT NULL,
  `current_address` varchar(255) DEFAULT NULL,
  `birth_month` varchar(10) DEFAULT NULL,
  `id_card_expiry` date DEFAULT NULL,
  `education` varchar(50) DEFAULT NULL,
  `remark` text,
  `status` int DEFAULT '1',
  `photo` varchar(500) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_no` (`employee_no`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_login_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_login_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` bigint unsigned DEFAULT NULL COMMENT '用户ID',
  `username` varchar(50) DEFAULT NULL COMMENT '用户名',
  `login_type` tinyint DEFAULT NULL COMMENT '登录类型: 1-账号密码, 2-手机验证码',
  `ip` varchar(50) DEFAULT NULL COMMENT 'IP地址',
  `location` varchar(100) DEFAULT NULL COMMENT '登录地点',
  `user_agent` varchar(500) DEFAULT NULL COMMENT '浏览器UA',
  `status` tinyint DEFAULT NULL COMMENT '登录状态: 0-失败, 1-成功',
  `error_msg` varchar(255) DEFAULT NULL COMMENT '错误信息',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='登录日志表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_menu` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `parent_id` bigint unsigned DEFAULT '0' COMMENT '父菜单ID',
  `menu_name` varchar(50) NOT NULL COMMENT '菜单名称',
  `menu_code` varchar(50) DEFAULT NULL,
  `menu_type` tinyint NOT NULL COMMENT '菜单类型: 1-目录, 2-菜单, 3-按钮',
  `icon` varchar(50) DEFAULT NULL COMMENT '菜单图标',
  `path` varchar(200) DEFAULT NULL COMMENT '路由路径',
  `component` varchar(255) DEFAULT NULL COMMENT '组件路径',
  `permission` varchar(100) DEFAULT NULL COMMENT '权限标识',
  `sort_order` int DEFAULT '0' COMMENT '排序序号',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `visible` tinyint DEFAULT '1' COMMENT '是否可见: 0-隐藏, 1-显示',
  `is_external` tinyint DEFAULT '0',
  `is_cache` tinyint DEFAULT '1',
  `is_visible` tinyint DEFAULT '1',
  `keep_alive` tinyint DEFAULT '0' COMMENT '是否缓存: 0-否, 1-是',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_menu_code` (`menu_code`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_type` (`menu_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='菜单权限表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_notice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_notice` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `notice_title` varchar(200) NOT NULL COMMENT '公告标题',
  `notice_type` tinyint NOT NULL COMMENT '公告类型: 1-通知, 2-公告',
  `notice_content` text COMMENT '公告内容',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-关闭, 1-正常',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通知公告表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_oper_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_oper_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(50) DEFAULT NULL COMMENT '操作模块',
  `business_type` tinyint DEFAULT '0' COMMENT '业务类型: 0-其它, 1-新增, 2-修改, 3-删除',
  `method` varchar(200) DEFAULT NULL COMMENT '方法名称',
  `request_method` varchar(10) DEFAULT NULL COMMENT '请求方式',
  `operator_type` tinyint DEFAULT '0' COMMENT '操作类别: 0-其它, 1-后台用户',
  `oper_name` varchar(50) DEFAULT NULL COMMENT '操作人员',
  `oper_url` varchar(500) DEFAULT NULL COMMENT '请求URL',
  `oper_ip` varchar(128) DEFAULT NULL COMMENT '主机地址',
  `oper_param` text COMMENT '请求参数',
  `json_result` text COMMENT '返回参数',
  `status` tinyint DEFAULT '1' COMMENT '操作状态: 1-正常, 0-异常',
  `error_msg` text COMMENT '错误消息',
  `oper_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `cost_time` bigint DEFAULT '0' COMMENT '消耗时间(毫秒)',
  PRIMARY KEY (`id`),
  KEY `idx_business_type` (`business_type`),
  KEY `idx_oper_time` (`oper_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='操作日志记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_operation_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_operation_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` bigint unsigned DEFAULT NULL COMMENT '用户ID',
  `username` varchar(50) DEFAULT NULL COMMENT '用户名',
  `operation` varchar(100) DEFAULT NULL COMMENT '操作描述',
  `method` varchar(10) DEFAULT NULL COMMENT '请求方法',
  `request_url` varchar(500) DEFAULT NULL COMMENT '请求URL',
  `request_params` text COMMENT '请求参数',
  `response_data` text COMMENT '响应数据',
  `ip` varchar(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) DEFAULT NULL COMMENT '浏览器UA',
  `execute_time` int DEFAULT NULL COMMENT '执行时长(ms)',
  `status` tinyint DEFAULT NULL COMMENT '操作状态: 0-失败, 1-成功',
  `error_msg` text COMMENT '错误信息',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_oper_log_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='操作日志表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_name` varchar(50) NOT NULL COMMENT '角色名称',
  `role_code` varchar(50) NOT NULL COMMENT '角色编码',
  `description` varchar(255) DEFAULT NULL COMMENT '角色描述',
  `data_scope` tinyint DEFAULT '1' COMMENT '数据范围: 1-全部, 2-本部门, 3-本部门及下级, 4-仅本人',
  `permissions` json DEFAULT NULL,
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_role_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role_menu` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `role_id` bigint unsigned NOT NULL COMMENT '角色ID',
  `menu_id` bigint unsigned NOT NULL COMMENT '菜单ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_menu` (`role_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色菜单关联表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_salary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_salary` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `month` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `basic_salary` decimal(12,2) DEFAULT '0.00' COMMENT '基本工资',
  `position_allowance` decimal(12,2) DEFAULT '0.00' COMMENT '岗位津贴',
  `performance_bonus` decimal(12,2) DEFAULT '0.00' COMMENT '绩效奖金',
  `overtime_pay` decimal(12,2) DEFAULT '0.00' COMMENT '加班费',
  `other_bonus` decimal(12,2) DEFAULT '0.00' COMMENT '其他奖金',
  `social_security` decimal(12,2) DEFAULT '0.00' COMMENT '社保',
  `housing_fund` decimal(12,2) DEFAULT '0.00' COMMENT '公积金',
  `personal_tax` decimal(12,2) DEFAULT '0.00' COMMENT '个人所得税',
  `other_deduction` decimal(12,2) DEFAULT '0.00' COMMENT '其他扣款',
  `actual_salary` decimal(12,2) DEFAULT '0.00' COMMENT '实发工资',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_month` (`employee_id`,`month`),
  KEY `idx_month` (`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='薪资表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(255) NOT NULL COMMENT '密码(加密存储)',
  `real_name` varchar(50) DEFAULT NULL COMMENT '真实姓名',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `department_id` bigint unsigned DEFAULT NULL COMMENT '部门ID',
  `position` varchar(50) DEFAULT NULL COMMENT '职位',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `first_login` tinyint DEFAULT '1',
  `pwd_update_time` datetime DEFAULT NULL COMMENT '密码更新时间',
  `login_fail_count` int DEFAULT '0',
  `lock_time` datetime DEFAULT NULL,
  `last_login_time` datetime DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(50) DEFAULT NULL COMMENT '最后登录IP',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记: 0-未删除, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_department` (`department_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统用户表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user_role` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint unsigned NOT NULL COMMENT '用户ID',
  `role_id` bigint unsigned NOT NULL COMMENT '角色ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`,`role_id`),
  KEY `idx_role` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色关联表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sys_warehouse_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_warehouse_category` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `work_order_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_costs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '成本ID',
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号',
  `material_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '原材料成本',
  `labor_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '人工成本',
  `manufacturing_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '制造费用',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '完工数量',
  `calculate_time` datetime DEFAULT NULL COMMENT '成本计算时间',
  `status` tinyint DEFAULT '0' COMMENT '状态：0=未计算，1=已计算，2=已结转',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order` (`work_order_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单成本表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

