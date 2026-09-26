-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: vnerpdacahng
-- ------------------------------------------------------
-- Server version	8.0.40

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

--
-- Current Database: `vnerpdacahng`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `vnerpdacahng` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `vnerpdacahng`;

--
-- Table structure for table `_cat_cleanup_bak`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_cat_cleanup_bak` (
  `category_id` bigint unsigned NOT NULL,
  `old_deleted` tinyint DEFAULT NULL,
  `backed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_cat_l2_v2_bak`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_cat_l2_v2_bak` (
  `id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `category_code` varchar(64) DEFAULT NULL,
  `old_name` varchar(255) DEFAULT NULL,
  `action` varchar(16) DEFAULT NULL,
  `bak_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_cat_reorg_backup`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_cat_reorg_backup` (
  `material_id` bigint unsigned NOT NULL,
  `old_category_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_cat_reorg_delcat`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_cat_reorg_delcat` (
  `category_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_mat_uncat_bak`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_mat_uncat_bak` (
  `material_id` bigint unsigned NOT NULL,
  `old_category_id` bigint unsigned DEFAULT NULL,
  `backed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_sys_calc_param_bak`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_sys_calc_param_bak` (
  `param_key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_param_value` text COLLATE utf8mb4_unicode_ci,
  `old_default_value` text COLLATE utf8mb4_unicode_ci,
  `old_description` text COLLATE utf8mb4_unicode_ci,
  `backed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`param_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `base_ink`
--

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
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_base_ink_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_base_ink_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `pur_supplier` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='原油墨基础信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `biz_consumption`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_consumption` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id` int unsigned NOT NULL COMMENT '业务订单ID',
  `order_line_id` int unsigned NOT NULL COMMENT '业务订单行ID',
  `material_id` int unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `consumption_type` enum('ISSUE','DELIVERY','RETURN') DEFAULT 'ISSUE' COMMENT '消耗类型',
  `consumption_qty` decimal(14,3) NOT NULL DEFAULT '0.000' COMMENT '消耗数量',
  `source_grn_id` int unsigned DEFAULT NULL COMMENT '来源入库单ID',
  `source_grn_line_id` int unsigned DEFAULT NULL COMMENT '来源入库单行ID',
  `warehouse_id` int unsigned DEFAULT NULL COMMENT '仓库ID',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `reference_no` varchar(100) DEFAULT NULL COMMENT '参考单号',
  `remark` text COMMENT '备注',
  `create_by` int unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`,`order_line_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_grn` (`source_grn_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='业务订单消耗记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `biz_contract_review`
--

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
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT 'total_amount',
  `final_result` tinyint DEFAULT NULL COMMENT 'final_result',
  `final_reviewer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'final_reviewer',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_review_no` (`review_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同评审表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `biz_contract_review_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_contract_review_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
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
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT 'total_amount',
  `final_result` tinyint DEFAULT NULL COMMENT 'final_result',
  `final_reviewer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'final_reviewer'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `biz_order_header`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_order_header` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_no` varchar(50) NOT NULL COMMENT '业务订单号',
  `order_type` enum('SALE','MFG','SUB','STOCK') NOT NULL COMMENT '订单类型',
  `order_category` varchar(50) DEFAULT NULL COMMENT '订单类别',
  `customer_id` int unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称',
  `product_id` int unsigned DEFAULT NULL COMMENT '产品ID',
  `product_name` varchar(200) DEFAULT NULL COMMENT '产品名称',
  `product_spec` varchar(500) DEFAULT NULL COMMENT '产品规格',
  `status` tinyint unsigned DEFAULT '10' COMMENT '状态',
  `req_qty` decimal(14,3) DEFAULT '0.000' COMMENT '需求数量',
  `ordered_qty` decimal(14,3) DEFAULT '0.000' COMMENT '已转采购数量',
  `received_qty` decimal(14,3) DEFAULT '0.000' COMMENT '已收货数量',
  `consumed_qty` decimal(14,3) DEFAULT '0.000' COMMENT '已消耗数量',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `priority` tinyint unsigned DEFAULT '5' COMMENT '优先级',
  `is_strict_by_order` tinyint(1) DEFAULT '1' COMMENT '是否严格按单',
  `tolerance_percent` decimal(5,2) DEFAULT '5.00' COMMENT '容差百分比',
  `remark` text COMMENT '备注',
  `create_by` int unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` int unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `confirm_by` int unsigned DEFAULT NULL COMMENT '确认人ID',
  `confirm_time` datetime DEFAULT NULL COMMENT '确认时间',
  `close_by` int unsigned DEFAULT NULL COMMENT '关闭人ID',
  `close_time` datetime DEFAULT NULL COMMENT '关闭时间',
  `close_reason` varchar(200) DEFAULT NULL COMMENT '关闭原因',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_order_type` (`order_type`),
  KEY `idx_status` (`status`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_order_header_deleted_time` (`deleted`,`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='业务订单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `biz_order_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_order_line` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id` int unsigned NOT NULL COMMENT '业务订单ID',
  `line_no` int unsigned NOT NULL COMMENT '行号',
  `material_id` int unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(500) DEFAULT NULL COMMENT '物料规格',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `req_qty` decimal(14,3) NOT NULL DEFAULT '0.000' COMMENT '需求数量',
  `ordered_qty` decimal(14,3) DEFAULT '0.000' COMMENT '已转采购数量',
  `received_qty` decimal(14,3) DEFAULT '0.000' COMMENT '已收货数量',
  `consumed_qty` decimal(14,3) DEFAULT '0.000' COMMENT '已消耗数量',
  `available_to_receive` decimal(14,3) DEFAULT '0.000' COMMENT '已收货待消耗',
  `require_date` date DEFAULT NULL COMMENT '需求日期',
  `is_strict_by_order` tinyint(1) DEFAULT '1' COMMENT '是否严格按单',
  `closed_flag` tinyint(1) DEFAULT '0' COMMENT '行关闭标志',
  `closed_reason` varchar(200) DEFAULT NULL COMMENT '关闭原因',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_line` (`order_id`,`line_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_require_date` (`require_date`),
  KEY `idx_order_line_order_id` (`order_id`),
  CONSTRAINT `biz_order_line_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `biz_order_header` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='业务订单行表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bom_alternative`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_alternative` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `bom_id` int NOT NULL COMMENT 'BOM主表ID',
  `bom_line_id` int NOT NULL COMMENT 'BOM行ID',
  `priority` int unsigned DEFAULT '1' COMMENT '优先级',
  `material_id` int unsigned NOT NULL COMMENT '替代物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '替代物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '替代物料名称',
  `conversion_rate` decimal(10,6) DEFAULT '1.000000' COMMENT '转换比率',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_bom_line` (`bom_line_id`),
  KEY `idx_material` (`material_id`),
  KEY `fk_bom_alt_header` (`bom_id`),
  KEY `idx_bom_alt_material` (`material_id`),
  CONSTRAINT `bom_alternative_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `bom_header` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bom_alternative_ibfk_2` FOREIGN KEY (`bom_line_id`) REFERENCES `bom_line` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bom_alt_header` FOREIGN KEY (`bom_id`) REFERENCES `bom_header` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bom_alt_line` FOREIGN KEY (`bom_line_id`) REFERENCES `bom_line` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bom_alt_material` FOREIGN KEY (`material_id`) REFERENCES `bom_material` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM替代料表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bom_header`
--

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
  `create_by` varchar(100) DEFAULT NULL COMMENT 'create_by',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bom_no` (`bom_no`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM头表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bom_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_line` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_id` int NOT NULL COMMENT 'BOM头ID',
  `line_no` int NOT NULL COMMENT '行号',
  `material_id` bigint unsigned DEFAULT NULL,
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
  `parent_line_id` bigint unsigned DEFAULT NULL COMMENT 'parent_line_id',
  `level` tinyint DEFAULT NULL COMMENT 'level',
  `unit` varchar(100) DEFAULT NULL COMMENT 'unit',
  `consumption_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'consumption_qty',
  `actual_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'actual_qty',
  `material_type` tinyint DEFAULT NULL COMMENT 'material_type',
  `is_key_material` varchar(100) DEFAULT NULL COMMENT 'is_key_material',
  `position_no` varchar(50) DEFAULT NULL COMMENT 'position_no',
  `process_seq` varchar(50) DEFAULT NULL COMMENT 'process_seq',
  `process_name` varchar(50) DEFAULT NULL COMMENT 'process_name',
  PRIMARY KEY (`id`),
  KEY `idx_bom_id` (`bom_id`),
  KEY `idx_bom_line_material_id` (`material_id`),
  KEY `idx_bom_line_material` (`material_id`),
  CONSTRAINT `fk_bom_line_header` FOREIGN KEY (`bom_id`) REFERENCES `bom_header` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bom_line_material` FOREIGN KEY (`material_id`) REFERENCES `std_material` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM行表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bom_material`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_material` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(500) DEFAULT NULL COMMENT '物料规格',
  `material_type` enum('RAW','SEMI','FINISHED','SUB','PKG','OTHER') DEFAULT 'RAW' COMMENT '物料类型',
  `category_id` int unsigned DEFAULT NULL COMMENT '分类ID',
  `category_name` varchar(100) DEFAULT NULL COMMENT '分类名称',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `unit_cost` decimal(14,4) DEFAULT '0.0000' COMMENT '参考成本',
  `safety_stock` decimal(14,3) DEFAULT '0.000' COMMENT '安全库存',
  `default_supplier_id` int unsigned DEFAULT NULL COMMENT '默认供应商ID',
  `default_supplier_name` varchar(100) DEFAULT NULL COMMENT '默认供应商',
  `shelf_life_days` int unsigned DEFAULT NULL COMMENT '保质期',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_code` (`material_code`),
  KEY `idx_material_name` (`material_name`),
  KEY `idx_material_type` (`material_type`),
  KEY `idx_category` (`category_id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料基础信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bom_material_category`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_material_category` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category_code` varchar(50) NOT NULL COMMENT '分类编码',
  `category_name` varchar(100) NOT NULL COMMENT '分类名称',
  `parent_id` int unsigned DEFAULT NULL COMMENT '父分类ID',
  `level` int unsigned DEFAULT '1' COMMENT '层级',
  `sort_order` int unsigned DEFAULT '0' COMMENT '排序',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`category_code`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料分类表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bom_version_history`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_version_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `bom_id` int NOT NULL COMMENT 'BOM主表ID',
  `version` varchar(20) NOT NULL COMMENT '版本号',
  `change_type` enum('CREATE','UPDATE','DELETE','PUBLISH','DISABLE') NOT NULL COMMENT '变更类型',
  `change_content` text COMMENT '变更内容',
  `change_reason` varchar(200) DEFAULT NULL COMMENT '变更原因',
  `operator_id` int unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(100) DEFAULT NULL COMMENT '操作人',
  `operate_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_bom_id` (`bom_id`),
  KEY `idx_version` (`version`),
  KEY `idx_operate_time` (`operate_time`),
  CONSTRAINT `bom_version_history_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `bom_header` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bom_history_header` FOREIGN KEY (`bom_id`) REFERENCES `bom_header` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM版本历史表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_code` (`customer_code`),
  KEY `idx_customer_code` (`customer_code`),
  KEY `idx_customer_status` (`status`,`deleted`),
  KEY `fk_crm_customer_salesman` (`salesman_id`),
  CONSTRAINT `fk_crm_customer_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer_analysis`
--

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
  KEY `idx_level` (`customer_level`),
  CONSTRAINT `fk_crm_customer_analysis_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分析表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer_analysis_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer_analysis_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
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
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `customer_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '客户编码',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '客户名称',
  `short_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户简称',
  `customer_type` tinyint DEFAULT NULL COMMENT '客户类型: 1-企业, 2-个人',
  `industry` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '所属行业',
  `scale` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '企业规模',
  `credit_level` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '信用等级',
  `province` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '省份',
  `city` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '城市',
  `district` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '区县',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '详细地址',
  `contact_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '联系人姓名',
  `contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '联系人电话',
  `contact_email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '联系人邮箱',
  `fax` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '传真',
  `website` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '网站',
  `business_license` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '营业执照号',
  `tax_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '税号',
  `bank_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '开户银行',
  `bank_account` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '银行账号',
  `salesman_id` bigint unsigned DEFAULT NULL COMMENT '业务员ID',
  `follow_up_status` tinyint DEFAULT '1' COMMENT '跟进状态: 1-潜在客户, 2-意向客户, 3-成交客户, 4-流失客户',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `customer_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '客户编码',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '客户名称',
  `short_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户简称',
  `customer_type` tinyint DEFAULT NULL COMMENT '客户类型: 1-企业, 2-个人',
  `industry` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '所属行业',
  `scale` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '企业规模',
  `credit_level` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '信用等级',
  `province` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '省份',
  `city` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '城市',
  `district` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '区县',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '详细地址',
  `contact_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '联系人姓名',
  `contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '联系人电话',
  `contact_email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '联系人邮箱',
  `fax` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '传真',
  `website` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '网站',
  `business_license` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '营业执照号',
  `tax_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '税号',
  `bank_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '开户银行',
  `bank_account` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '银行账号',
  `salesman_id` bigint unsigned DEFAULT NULL COMMENT '业务员ID',
  `follow_up_status` tinyint DEFAULT '1' COMMENT '跟进状态: 1-潜在客户, 2-意向客户, 3-成交客户, 4-流失客户',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer_contact`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `fk_customer_contact_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户联系人表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer_contact_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer_contact_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `contact_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '联系人姓名',
  `position` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '职位',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '电话',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '邮箱',
  `is_primary` tinyint DEFAULT '0' COMMENT '是否主联系人: 0-否, 1-是',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer_follow_up`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户跟进记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_customer_follow_up_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_customer_follow_up_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '跟进记录ID',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `follow_up_type` tinyint DEFAULT NULL COMMENT '跟进方式: 1-电话, 2-邮件, 3-拜访, 4-微信, 5-其他',
  `follow_up_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '跟进内容',
  `follow_up_time` datetime DEFAULT NULL COMMENT '跟进时间',
  `next_follow_up_time` datetime DEFAULT NULL COMMENT '下次跟进时间',
  `follow_up_by` bigint unsigned DEFAULT NULL COMMENT '跟进人ID',
  `attachment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '附件',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_follow_record`
--

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
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_follow_type` (`follow_type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户跟进记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crm_follow_record_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_follow_record_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
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
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_ink_color`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_ink_color` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `color_code` varchar(50) NOT NULL COMMENT '色号编码（唯一）',
  `color_name` varchar(100) NOT NULL COMMENT '色号名称',
  `color_series` varchar(50) DEFAULT NULL COMMENT '色系（红/蓝/绿...）',
  `base_ink_type` varchar(50) DEFAULT NULL COMMENT '基墨类型（UV/solvent/water）',
  `pantone_code` varchar(50) DEFAULT NULL COMMENT 'Pantone 色号',
  `remark` text COMMENT '备注',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1-启用 2-停用',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_color_code` (`color_code`),
  KEY `idx_color_name` (`color_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨色号基础档案表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_ink_formula_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_ink_formula_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `version_id` bigint unsigned NOT NULL COMMENT '版本ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID（base_ink.id）',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `ink_type` varchar(20) DEFAULT NULL COMMENT '油墨类型',
  `brand` varchar(100) DEFAULT NULL COMMENT '品牌',
  `ratio` decimal(8,4) NOT NULL DEFAULT '0.0000' COMMENT '配比百分比',
  `weight` decimal(10,3) DEFAULT NULL COMMENT '重量',
  `unit` varchar(10) DEFAULT 'kg' COMMENT '单位',
  `add_order` int NOT NULL DEFAULT '0' COMMENT '加料顺序',
  `process_remark` varchar(255) DEFAULT NULL COMMENT '工艺备注',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `is_base` tinyint NOT NULL DEFAULT '0' COMMENT '是否基墨',
  `snapshot_unit_cost` decimal(12,4) DEFAULT NULL COMMENT '快照单位成本',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_version_id` (`version_id`),
  KEY `idx_material_id` (`material_id`),
  CONSTRAINT `fk_formula_item_version` FOREIGN KEY (`version_id`) REFERENCES `dcprint_ink_formula_version` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨配方明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_ink_formula_version`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_ink_formula_version` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `color_id` bigint unsigned NOT NULL COMMENT '色号ID',
  `version_no` varchar(20) NOT NULL COMMENT '版本号 V1.0',
  `version_name` varchar(100) DEFAULT NULL COMMENT '版本名称',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1-草稿 2-已生效 3-已作废',
  `change_reason` text COMMENT '变更原因',
  `source_version_id` bigint unsigned DEFAULT NULL COMMENT '源版本ID（一键复用来源）',
  `process_note` text COMMENT '工艺说明',
  `total_weight` decimal(10,3) DEFAULT NULL COMMENT '配方总重量',
  `unit` varchar(10) DEFAULT 'kg' COMMENT '单位',
  `shelf_life_hours` int DEFAULT '168' COMMENT '保质期(小时)',
  `theoretical_cost` decimal(12,4) DEFAULT NULL COMMENT '理论成本',
  `cost_snapshot_time` datetime DEFAULT NULL COMMENT '成本快照时间',
  `cost_calc_status` tinyint NOT NULL DEFAULT '0' COMMENT '0-未计算 1-完成 2-部分缺失',
  `cost_warning` varchar(255) DEFAULT NULL COMMENT '成本缺失警告',
  `activate_by` bigint unsigned DEFAULT NULL COMMENT '生效操作人ID',
  `activate_time` datetime DEFAULT NULL COMMENT '生效时间',
  `cancel_by` bigint unsigned DEFAULT NULL COMMENT '作废操作人ID',
  `cancel_reason` text COMMENT '作废原因',
  `cancel_time` datetime DEFAULT NULL COMMENT '作废时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_color_version` (`color_id`,`version_no`),
  KEY `idx_color_id` (`color_id`),
  KEY `idx_status` (`status`),
  KEY `idx_source_version` (`source_version_id`),
  CONSTRAINT `fk_formula_version_color` FOREIGN KEY (`color_id`) REFERENCES `dcprint_ink_color` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨配方版本主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_sample_process_card`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_sample_process_card` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sample_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '打样编号（唯一）',
  `sample_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '打样名称',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户名称（冗余）',
  `product_id` bigint unsigned DEFAULT NULL COMMENT '产品ID',
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品名称',
  `version_no` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'V1.0' COMMENT '版本号',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1-草稿 2-打样中 3-已确认 4-已作废',
  `substrate_material_id` bigint unsigned DEFAULT NULL COMMENT '基材物料ID',
  `substrate_material_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '基材名称（冗余）',
  `spec` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规格',
  `print_color` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '印刷颜色描述',
  `ink_color_id` bigint unsigned DEFAULT NULL COMMENT '油墨色号ID',
  `screen_plate_id` bigint unsigned DEFAULT NULL COMMENT '网版工装ID',
  `die_tool_id` bigint unsigned DEFAULT NULL COMMENT '刀模工装ID',
  `material_loss_rate` decimal(5,2) DEFAULT '5.00' COMMENT '物料损耗率(%)',
  `estimated_hour` decimal(6,2) DEFAULT NULL COMMENT '预估工时',
  `sample_work_order_id` bigint unsigned DEFAULT NULL COMMENT '打样工单ID',
  `sample_work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '打样工单号',
  `quote_id` bigint unsigned DEFAULT NULL COMMENT '报价单ID',
  `formal_work_order_id` bigint unsigned DEFAULT NULL COMMENT '正式工单ID',
  `source_version_id` bigint unsigned DEFAULT NULL COMMENT '源版本ID（复制来源）',
  `confirm_by` bigint unsigned DEFAULT NULL COMMENT '确认人ID',
  `confirm_time` datetime DEFAULT NULL COMMENT '确认时间',
  `total_material_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '物料总成本快照',
  `total_labor_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '人工总成本快照',
  `total_tool_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '工装总成本快照',
  `total_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '总成本快照',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `diagram_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工艺图示URL',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sample_no` (`sample_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_ink_color` (`ink_color_id`),
  KEY `idx_die_tool` (`die_tool_id`),
  KEY `idx_screen_plate` (`screen_plate_id`),
  KEY `idx_source_version` (`source_version_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打样工艺卡主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_sample_process_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_sample_process_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `card_id` bigint unsigned NOT NULL COMMENT '工艺卡ID',
  `item_type` tinyint NOT NULL DEFAULT '1' COMMENT '1-主料 2-油墨 3-辅料',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID（inv_material.id）',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物料编码',
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物料名称',
  `specification` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规格',
  `unit_dosage` decimal(10,4) NOT NULL COMMENT '单耗',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '单位',
  `unit_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '单价快照',
  `line_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '行成本快照',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_material_id` (`material_id`),
  CONSTRAINT `fk_sample_item_card` FOREIGN KEY (`card_id`) REFERENCES `dcprint_sample_process_card` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打样工艺卡物料明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_sample_process_step`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_sample_process_step` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `card_id` bigint unsigned NOT NULL COMMENT '工艺卡ID',
  `process_id` bigint unsigned DEFAULT NULL COMMENT '标准工序ID（prd_process_route_step.id）',
  `process_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '工序名称',
  `work_hour` decimal(6,2) NOT NULL COMMENT '工时',
  `hourly_rate` decimal(10,2) DEFAULT '0.00' COMMENT '工时单价快照',
  `line_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '行成本快照',
  `process_param` text COLLATE utf8mb4_unicode_ci COMMENT '工艺参数',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_process_id` (`process_id`),
  CONSTRAINT `fk_sample_step_card` FOREIGN KEY (`card_id`) REFERENCES `dcprint_sample_process_card` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打样工艺卡工序明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_sample_process_template`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_sample_process_template` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `template_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板编号',
  `template_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板名称',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类（如:标签/软包装/纸盒）',
  `tags` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标签（逗号分隔）',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '模板描述',
  `source_card_id` bigint unsigned DEFAULT NULL COMMENT '来源工艺卡ID',
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `substrate_material_id` bigint unsigned DEFAULT NULL,
  `substrate_material_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spec` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `print_color` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ink_color_id` bigint unsigned DEFAULT NULL,
  `screen_plate_id` bigint unsigned DEFAULT NULL,
  `die_tool_id` bigint unsigned DEFAULT NULL,
  `material_loss_rate` decimal(5,2) DEFAULT '5.00',
  `estimated_hour` decimal(6,2) DEFAULT NULL,
  `diagram_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工艺图示URL',
  `total_material_cost` decimal(12,4) DEFAULT '0.0000',
  `total_labor_cost` decimal(12,4) DEFAULT '0.0000',
  `total_tool_cost` decimal(12,4) DEFAULT '0.0000',
  `total_cost` decimal(12,4) DEFAULT '0.0000',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1-启用 2-停用',
  `usage_count` int NOT NULL DEFAULT '0' COMMENT '使用次数',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_by` bigint unsigned DEFAULT NULL,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_no` (`template_no`),
  KEY `idx_category` (`category`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准工艺模板主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_sample_process_template_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_sample_process_template_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `template_id` bigint unsigned NOT NULL COMMENT '模板ID',
  `item_type` tinyint NOT NULL DEFAULT '1' COMMENT '1-主料 2-油墨 3-辅料',
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `specification` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_dosage` decimal(10,4) NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_cost` decimal(12,4) DEFAULT '0.0000',
  `line_cost` decimal(12,4) DEFAULT '0.0000',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort` int NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_material_id` (`material_id`),
  CONSTRAINT `fk_tpl_item_card` FOREIGN KEY (`template_id`) REFERENCES `dcprint_sample_process_template` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准工艺模板物料明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_sample_process_template_step`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_sample_process_template_step` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `template_id` bigint unsigned NOT NULL COMMENT '模板ID',
  `process_id` bigint unsigned DEFAULT NULL,
  `process_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_hour` decimal(6,2) NOT NULL,
  `hourly_rate` decimal(10,2) DEFAULT '0.00',
  `line_cost` decimal(12,4) DEFAULT '0.0000',
  `process_param` text COLLATE utf8mb4_unicode_ci,
  `sort` int NOT NULL DEFAULT '0',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`),
  CONSTRAINT `fk_tpl_step_card` FOREIGN KEY (`template_id`) REFERENCES `dcprint_sample_process_template` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准工艺模板工序明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_tool`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_tool` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tool_type` tinyint NOT NULL COMMENT '1-刀模 2-网版',
  `tool_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '工装编码',
  `tool_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '工装名称',
  `spec` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规格',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '关联物料ID',
  `total_life` int NOT NULL COMMENT '额定总寿命(次数)',
  `warning_threshold` int NOT NULL COMMENT '预警阈值(次数)',
  `used_count` int NOT NULL DEFAULT '0' COMMENT '已使用次数',
  `remain_life` int NOT NULL COMMENT '剩余寿命',
  `original_cost` decimal(10,2) NOT NULL COMMENT '原值',
  `accumulated_cost` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '累计分摊成本',
  `net_value` decimal(10,2) NOT NULL COMMENT '账面净值',
  `unit_cost` decimal(10,4) NOT NULL COMMENT '单次分摊成本',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1-待用 2-在用 3-维修中 4-预警 5-已报废',
  `manufacture_date` date DEFAULT NULL COMMENT '制作日期',
  `warehouse_location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '存放位置',
  `asset_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资产类型',
  `layout_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '版面类型',
  `pieces_per_impression` int DEFAULT NULL COMMENT '每版印张数',
  `material` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '材质',
  `qr_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '二维码',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `maintenance_interval` int DEFAULT NULL COMMENT '保养间隔(印数)',
  `maintenance_count` int DEFAULT '0' COMMENT '保养次数',
  `last_maintenance_date` date DEFAULT NULL COMMENT '上次保养日期',
  `last_maintenance_impressions` int DEFAULT NULL COMMENT '上次保养印数',
  `last_used_date` date DEFAULT NULL COMMENT '上次使用日期',
  `mesh_count` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目数',
  `mesh_material` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '丝网材质',
  `size` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '尺寸',
  `tension_value` decimal(5,1) DEFAULT NULL COMMENT '张力值',
  `frame_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '网框类型',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `reclaim_count` int DEFAULT '0' COMMENT '回用次数',
  `exposure_date` date DEFAULT NULL COMMENT '曝光日期',
  `last_clean_date` date DEFAULT NULL COMMENT '上次清洗日期',
  `last_reclaim_date` date DEFAULT NULL COMMENT '上次回用日期',
  `tension_date` date DEFAULT NULL COMMENT '张力检测日期',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `scrap_reason` text COLLATE utf8mb4_unicode_ci COMMENT '报废原因',
  `scrap_time` datetime DEFAULT NULL COMMENT '报废时间',
  `scrap_by` bigint unsigned DEFAULT NULL COMMENT '报废人',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_by` bigint unsigned DEFAULT NULL,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` tinyint NOT NULL DEFAULT '0',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tool_code` (`tool_code`),
  KEY `type_status_idx` (`tool_type`,`status`),
  KEY `idx_material` (`material_id`),
  KEY `idx_customer_id` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刀模/网版工装主档案表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_tool_maintenance`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_tool_maintenance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tool_id` bigint unsigned NOT NULL COMMENT '工装ID',
  `maintenance_type` tinyint NOT NULL DEFAULT '1' COMMENT '1-维修 2-保养',
  `maintenance_cost` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '维修费用',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '维修内容',
  `life_before` int NOT NULL COMMENT '维修前剩余寿命',
  `life_after` int NOT NULL COMMENT '维修后剩余寿命(手动调整)',
  `life_adjustment` int NOT NULL DEFAULT '0' COMMENT '寿命调整量',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1-进行中 2-已完成',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '完成时间',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '维修人ID',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '维修人姓名',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tool` (`tool_id`),
  KEY `idx_status` (`status`),
  KEY `idx_operator_id` (`operator_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工装维修记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dcprint_tool_usage`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dcprint_tool_usage` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tool_id` bigint unsigned NOT NULL COMMENT '工装ID',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联工单号',
  `process_id` bigint unsigned DEFAULT NULL COMMENT '工序ID',
  `process_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工序名称',
  `use_count` int NOT NULL DEFAULT '1' COMMENT '本次使用次数(=报工数量)',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人员ID',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人员姓名',
  `amortized_cost` decimal(10,4) NOT NULL DEFAULT '0.0000' COMMENT '本次分摊成本快照',
  `use_time` datetime NOT NULL COMMENT '使用时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tool` (`tool_id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_use_time` (`use_time`),
  KEY `idx_operator_id` (`operator_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工装使用记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `delivery_driver`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_driver` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_no` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `id_card` varchar(18) DEFAULT NULL,
  `license_type` varchar(20) DEFAULT NULL,
  `license_no` varchar(50) DEFAULT NULL,
  `license_expire` date DEFAULT NULL,
  `entry_date` date DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_driver_no` (`driver_no`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `delivery_vehicle`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_vehicle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_no` varchar(50) NOT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `engine_no` varchar(100) DEFAULT NULL,
  `frame_no` varchar(100) DEFAULT NULL,
  `buy_date` date DEFAULT NULL,
  `mileage` int DEFAULT '0',
  `fuel_type` varchar(50) DEFAULT NULL,
  `capacity` decimal(10,2) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `driver_id` int DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `driver_phone` varchar(20) DEFAULT NULL,
  `insurance_expire` date DEFAULT NULL,
  `annual_inspect_expire` date DEFAULT NULL,
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_no` (`vehicle_no`),
  KEY `idx_status` (`status`),
  KEY `idx_driver_id` (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `delivery_vehicle_cost`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_vehicle_cost` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `cost_date` date NOT NULL,
  `cost_type` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `mileage` int DEFAULT NULL,
  `fuel_volume` decimal(10,2) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `operator` varchar(100) DEFAULT NULL,
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_id` (`vehicle_id`),
  KEY `idx_cost_date` (`cost_date`),
  KEY `idx_cost_type` (`cost_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `delivery_vehicle_repair`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_vehicle_repair` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `repair_date` date NOT NULL,
  `repair_type` varchar(50) DEFAULT NULL,
  `mileage` int DEFAULT NULL,
  `repair_content` text,
  `repair_cost` decimal(10,2) DEFAULT NULL,
  `repair_shop` varchar(200) DEFAULT NULL,
  `next_maintain_mileage` int DEFAULT NULL,
  `next_maintain_date` date DEFAULT NULL,
  `operator` varchar(100) DEFAULT NULL,
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_id` (`vehicle_id`),
  KEY `idx_repair_date` (`repair_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `domain_event_outbox`
--

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
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '事件创建时间',
  `processed_at` datetime DEFAULT NULL COMMENT '处理完成时间（status=processed 时写入）',
  `claimed_at` datetime DEFAULT NULL COMMENT '最近一次被 claim 的时间（status=dispatching 时写入）',
  `dispatched_at` datetime DEFAULT NULL COMMENT '成功分发到 Stream 的时间（status=processed 前置）',
  PRIMARY KEY (`id`),
  KEY `idx_status_next_execute` (`status`,`next_execute_at`) COMMENT '指数退避消费索引',
  KEY `idx_aggregate` (`aggregate_type`,`aggregate_id`) COMMENT '聚合根溯源索引',
  KEY `idx_status_created` (`status`,`create_time`) COMMENT '待处理事件查询索引'
) ENGINE=InnoDB AUTO_INCREMENT=9002735 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='领域事件持久化表（Outbox 模式）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eng_sample_to_mass`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eng_sample_to_mass` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sample_order_id` bigint unsigned DEFAULT NULL COMMENT '样品订单ID',
  `sample_order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `standard_card_id` bigint unsigned DEFAULT NULL,
  `standard_card_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `process_card_id` bigint unsigned DEFAULT NULL,
  `process_card_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `transfer_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '转移单号',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品编码',
  `sample_params` text COLLATE utf8mb4_unicode_ci COMMENT '打样参数(JSON)',
  `mass_params` text COLLATE utf8mb4_unicode_ci COMMENT '量产参数(JSON)',
  `sop_file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SOP文件路径',
  `bom_id` bigint unsigned DEFAULT NULL COMMENT '关联BOM ID',
  `bom_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'BOM版本',
  `process_route` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工艺路线',
  `check_standard` text COLLATE utf8mb4_unicode_ci COMMENT '检验标准',
  `special_note` text COLLATE utf8mb4_unicode_ci COMMENT '特别注意事项',
  `sample_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '打样确认人',
  `sample_confirm_date` date DEFAULT NULL COMMENT '打样确认日期',
  `eng_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工程确认人',
  `eng_confirm_date` date DEFAULT NULL COMMENT '工程确认日期',
  `prod_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生产确认人',
  `prod_confirm_date` date DEFAULT NULL COMMENT '生产确认日期',
  `quality_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '品质确认人',
  `quality_confirm_date` date DEFAULT NULL COMMENT '品质确认日期',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `workorder_id` bigint unsigned DEFAULT NULL COMMENT '量产工单ID',
  `workorder_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '量产工单号',
  `conversion_date` date DEFAULT NULL COMMENT '转量产日期',
  `approved_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审批人',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eng_sample_to_mass_bak_20260924_stm`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eng_sample_to_mass_bak_20260924_stm` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `sample_order_id` bigint unsigned DEFAULT NULL COMMENT '样品订单ID',
  `sample_order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `standard_card_id` bigint unsigned DEFAULT NULL,
  `standard_card_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `process_card_id` bigint unsigned DEFAULT NULL,
  `process_card_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `transfer_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '转移单号',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品编码',
  `sample_params` text COLLATE utf8mb4_unicode_ci COMMENT '打样参数(JSON)',
  `mass_params` text COLLATE utf8mb4_unicode_ci COMMENT '量产参数(JSON)',
  `sop_file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SOP文件路径',
  `bom_id` bigint unsigned DEFAULT NULL COMMENT '关联BOM ID',
  `bom_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'BOM版本',
  `process_route` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工艺路线',
  `check_standard` text COLLATE utf8mb4_unicode_ci COMMENT '检验标准',
  `special_note` text COLLATE utf8mb4_unicode_ci COMMENT '特别注意事项',
  `sample_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '打样确认人',
  `sample_confirm_date` date DEFAULT NULL COMMENT '打样确认日期',
  `eng_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工程确认人',
  `eng_confirm_date` date DEFAULT NULL COMMENT '工程确认日期',
  `prod_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生产确认人',
  `prod_confirm_date` date DEFAULT NULL COMMENT '生产确认日期',
  `quality_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '品质确认人',
  `quality_confirm_date` date DEFAULT NULL COMMENT '品质确认日期',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `workorder_id` bigint unsigned DEFAULT NULL COMMENT '量产工单ID',
  `workorder_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '量产工单号',
  `conversion_date` date DEFAULT NULL COMMENT '转量产日期',
  `approved_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审批人'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eng_sample_to_mass_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eng_sample_to_mass_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `sample_order_id` bigint unsigned DEFAULT NULL COMMENT '样品订单ID',
  `sample_order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `standard_card_id` bigint unsigned DEFAULT NULL,
  `standard_card_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `process_card_id` bigint unsigned DEFAULT NULL,
  `process_card_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `transfer_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '转移单号',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品编码',
  `sample_params` text COLLATE utf8mb4_unicode_ci COMMENT '打样参数(JSON)',
  `mass_params` text COLLATE utf8mb4_unicode_ci COMMENT '量产参数(JSON)',
  `sop_file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SOP文件路径',
  `bom_id` bigint unsigned DEFAULT NULL COMMENT '关联BOM ID',
  `bom_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'BOM版本',
  `process_route` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工艺路线',
  `check_standard` text COLLATE utf8mb4_unicode_ci COMMENT '检验标准',
  `special_note` text COLLATE utf8mb4_unicode_ci COMMENT '特别注意事项',
  `sample_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '打样确认人',
  `sample_confirm_date` date DEFAULT NULL COMMENT '打样确认日期',
  `eng_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工程确认人',
  `eng_confirm_date` date DEFAULT NULL COMMENT '工程确认日期',
  `prod_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生产确认人',
  `prod_confirm_date` date DEFAULT NULL COMMENT '生产确认日期',
  `quality_confirmer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '品质确认人',
  `quality_confirm_date` date DEFAULT NULL COMMENT '品质确认日期',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `workorder_id` bigint unsigned DEFAULT NULL COMMENT '量产工单ID',
  `workorder_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '量产工单号',
  `conversion_date` date DEFAULT NULL COMMENT '转量产日期',
  `approved_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审批人'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eng_sop`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eng_sop` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sop_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sop_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `process_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `process_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'V1.0',
  `sop_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'printing',
  `content` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workshop` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_eng_sop_effective_date` (`effective_date`),
  KEY `idx_eng_sop_deleted_time` (`deleted`,`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eq_equipment_deprecated`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eq_equipment_deprecated` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '设备ID',
  `equipment_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备编号（唯一）',
  `equipment_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备名称',
  `equipment_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other' COMMENT '设备类型：printing/die_cutting/laminating/slitting/other',
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '型号规格',
  `manufacturer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '制造商',
  `workshop` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属车间',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '安装位置',
  `purchase_date` date DEFAULT NULL COMMENT '购置日期',
  `install_date` date DEFAULT NULL COMMENT '安装日期',
  `purchase_price` decimal(12,2) DEFAULT '0.00' COMMENT '购置价格',
  `expected_life_years` int DEFAULT '10' COMMENT '预计使用年限（年）',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1=运行中 2=停机 3=维修中 4=报废',
  `cumulative_run_hours` decimal(10,2) DEFAULT '0.00' COMMENT '累计运行时长（小时）',
  `cumulative_print_count` bigint DEFAULT '0' COMMENT '累计印刷次数',
  `last_maintenance_date` date DEFAULT NULL COMMENT '上次维保日期',
  `next_maintenance_date` date DEFAULT NULL COMMENT '下次维保日期',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除：0=正常 1=已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人',
  `rated_capacity` decimal(12,2) DEFAULT NULL COMMENT '额定产能',
  `oee` decimal(5,2) DEFAULT NULL COMMENT '设备综合效率OEE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_equipment_code` (`equipment_code`),
  KEY `idx_equipment_type` (`equipment_type`),
  KEY `idx_equipment_status` (`status`),
  KEY `idx_equipment_workshop` (`workshop`),
  KEY `idx_equipment_next_maintenance` (`next_maintenance_date`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备台账表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eq_maintenance_plan_deprecated`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eq_maintenance_plan_deprecated` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '计划ID',
  `plan_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '计划编号（唯一）',
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `plan_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '计划名称',
  `maintenance_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'routine' COMMENT '维保类型：routine=日常保养/periodic=定期维保/major=大修',
  `cycle_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly' COMMENT '周期类型：daily/weekly/monthly/quarterly/yearly/custom',
  `cycle_days` int DEFAULT '30' COMMENT '自定义周期天数（cycle_type=custom 时使用）',
  `lead_days` int DEFAULT '7' COMMENT '提前提醒天数',
  `estimated_hours` decimal(5,2) DEFAULT '4.00' COMMENT '预计耗时（小时）',
  `estimated_cost` decimal(10,2) DEFAULT '0.00' COMMENT '预计费用',
  `checklist` json DEFAULT NULL COMMENT '检查项目清单（JSON 数组）',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1=启用 2=停用',
  `last_executed_date` date DEFAULT NULL COMMENT '上次执行日期',
  `next_execute_date` date DEFAULT NULL COMMENT '下次执行日期',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除：0=正常 1=已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_no` (`plan_no`),
  KEY `idx_plan_equipment` (`equipment_id`),
  KEY `idx_plan_status` (`status`),
  KEY `idx_plan_next_execute` (`next_execute_date`),
  CONSTRAINT `fk_plan_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `eq_equipment_deprecated` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='维保计划表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eq_maintenance_record_deprecated`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eq_maintenance_record_deprecated` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `record_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记录编号（唯一）',
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `plan_id` bigint unsigned DEFAULT NULL COMMENT '关联计划ID（自主维保为 NULL）',
  `maintenance_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'routine' COMMENT '维保类型：routine=日常保养/periodic=定期维保/major=大修/emergency=紧急维修',
  `maintenance_date` date NOT NULL COMMENT '维保日期',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `actual_hours` decimal(5,2) DEFAULT '0.00' COMMENT '实际耗时（小时）',
  `actual_cost` decimal(10,2) DEFAULT '0.00' COMMENT '实际费用',
  `technician_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '技术员',
  `run_hours_before` decimal(10,2) DEFAULT NULL COMMENT '维保前运行时长',
  `run_hours_after` decimal(10,2) DEFAULT NULL COMMENT '维保后运行时长',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '维保内容描述',
  `parts_replaced` json DEFAULT NULL COMMENT '更换配件清单（JSON 数组）',
  `result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed' COMMENT '维保结果：completed=完成/partial=部分完成/failed=失败',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1=已完成 2=进行中 3=已取消',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除：0=正常 1=已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_record_equipment` (`equipment_id`),
  KEY `idx_record_plan` (`plan_id`),
  KEY `idx_record_date` (`maintenance_date`),
  KEY `idx_record_status` (`status`),
  CONSTRAINT `fk_record_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `eq_equipment_deprecated` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_record_plan` FOREIGN KEY (`plan_id`) REFERENCES `eq_maintenance_plan_deprecated` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='维保记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_calibration`
--

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
  `status` tinyint DEFAULT NULL COMMENT 'status',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_calibration_no` (`calibration_no`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备校准表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_document`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_document` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `doc_type` varchar(50) NOT NULL COMMENT '文档类型',
  `doc_name` varchar(200) NOT NULL COMMENT '文档名称',
  `doc_no` varchar(50) DEFAULT NULL COMMENT '文档编号',
  `file_path` varchar(500) DEFAULT NULL COMMENT '文件路径',
  `file_name` varchar(200) DEFAULT NULL COMMENT '原始文件名',
  `file_size` bigint DEFAULT NULL COMMENT '文件大小(字节)',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_equipment` (`equipment_id`),
  KEY `idx_doc_type` (`doc_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备文档管理表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_equipment`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `workshop` varchar(50) DEFAULT NULL COMMENT '所属车间',
  `capacity_per_hour` decimal(10,2) DEFAULT '100.00' COMMENT '每小时产能',
  `max_colors` int DEFAULT '1' COMMENT '最大支持色数',
  `setup_time_minutes` int DEFAULT '30' COMMENT '换型准备时间',
  `install_date` date DEFAULT NULL COMMENT '安装日期',
  `purchase_price` decimal(12,2) DEFAULT '0.00' COMMENT '购置价格',
  `expected_life_years` int DEFAULT '10' COMMENT '预计使用年限（年）',
  `cumulative_run_hours` decimal(10,2) DEFAULT '0.00' COMMENT '累计运行时长（小时）',
  `cumulative_print_count` bigint DEFAULT '0' COMMENT '累计产量',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_equipment_code` (`equipment_code`),
  KEY `idx_type` (`equipment_type`),
  KEY `idx_status` (`status`),
  KEY `idx_equipment_status_maintenance` (`status`,`next_maintenance_date`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备台账表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_inspection`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_inspection` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '点检记录ID',
  `inspection_no` varchar(50) NOT NULL COMMENT '点检单号',
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `inspection_type` tinyint NOT NULL COMMENT '类型：1=日检 2=周检 3=月检',
  `inspector_id` bigint unsigned DEFAULT NULL COMMENT '点检人ID',
  `inspector_name` varchar(50) DEFAULT NULL COMMENT '点检人姓名',
  `inspection_date` date NOT NULL COMMENT '点检日期',
  `items` json NOT NULL COMMENT '点检项目及结果（JSON 数组）',
  `result` tinyint DEFAULT '1' COMMENT '结果：1=正常 2=异常',
  `abnormal_desc` text COMMENT '异常描述',
  `status` tinyint DEFAULT '1' COMMENT '状态：1=待执行 2=已完成 3=已跳过',
  `remark` text COMMENT '备注',
  `deleted` tinyint DEFAULT '0' COMMENT '软删除：0=正常 1=已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `temperature` decimal(6,2) DEFAULT NULL COMMENT '温度（℃）',
  `vibration` decimal(8,3) DEFAULT NULL COMMENT '振动值（mm/s）',
  `pressure` decimal(8,2) DEFAULT NULL COMMENT '压力（MPa）',
  `noise_level` decimal(5,1) DEFAULT NULL COMMENT '噪声等级（dB）',
  `oil_level` decimal(5,2) DEFAULT NULL COMMENT '油位（%）',
  `belt_tension` decimal(6,2) DEFAULT NULL COMMENT '皮带张力（N）',
  `handling_advice` varchar(500) DEFAULT NULL COMMENT '处理建议',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspection_no` (`inspection_no`),
  KEY `idx_inspection_equipment` (`equipment_id`),
  KEY `idx_inspection_date` (`inspection_date`),
  KEY `idx_inspection_type` (`inspection_type`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备点检记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_maintenance_plan`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_maintenance_plan` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `plan_no` varchar(50) NOT NULL COMMENT '计划编号',
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `maintenance_type` varchar(20) NOT NULL DEFAULT 'routine' COMMENT '维保类型',
  `cycle_type` varchar(20) NOT NULL DEFAULT 'monthly' COMMENT '周期类型',
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
  `plan_name` varchar(100) NOT NULL COMMENT '计划名称',
  `estimated_hours` decimal(5,2) DEFAULT '4.00' COMMENT '预计耗时（小时）',
  `estimated_cost` decimal(10,2) DEFAULT '0.00' COMMENT '预计费用',
  `lead_days` int DEFAULT '7' COMMENT '提前提醒天数',
  `checklist` json DEFAULT NULL COMMENT '检查项目清单（JSON 数组）',
  `last_executed_date` date DEFAULT NULL COMMENT '上次执行日期',
  `next_execute_date` date DEFAULT NULL COMMENT '下次执行日期',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_no` (`plan_no`),
  KEY `idx_equipment` (`equipment_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备维护计划表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_maintenance_record`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_maintenance_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `record_no` varchar(50) NOT NULL COMMENT '记录编号',
  `plan_id` bigint unsigned DEFAULT NULL COMMENT '维护计划ID',
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `maintenance_type` varchar(20) NOT NULL DEFAULT 'routine' COMMENT '维保类型：routine=日常保养/periodic=定期维保/major=大修',
  `fault_desc` text COMMENT '故障描述',
  `maintenance_content` text COMMENT '维护内容',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `downtime_hours` decimal(5,2) DEFAULT '0.00' COMMENT '停机时长（小时）',
  `cost` decimal(10,2) DEFAULT '0.00' COMMENT '费用',
  `responsible_id` bigint unsigned DEFAULT NULL COMMENT '负责人ID',
  `result` varchar(20) NOT NULL DEFAULT 'completed' COMMENT '维保结果：completed=完成/partial=部分完成/failed=失败',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `technician_name` varchar(50) DEFAULT NULL COMMENT '技术员姓名',
  `run_hours_before` decimal(10,2) DEFAULT NULL COMMENT '维保前运行时长',
  `run_hours_after` decimal(10,2) DEFAULT NULL COMMENT '维保后运行时长',
  `description` text COMMENT '维保内容描述',
  `parts_replaced` json DEFAULT NULL COMMENT '更换配件清单（JSON 数组）',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1=已完成 2=进行中 3=已取消',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人',
  `maintenance_date` date NOT NULL DEFAULT (curdate()) COMMENT '维保日期',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_equipment` (`equipment_id`),
  KEY `idx_plan` (`plan_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备维护记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_repair`
--

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
  `status` tinyint DEFAULT '0' COMMENT '维修状态 0待修1维修中2已完成3已关闭',
  `repair_start_time` datetime DEFAULT NULL COMMENT '维修开始时间',
  `repair_end_time` datetime DEFAULT NULL COMMENT '维修结束时间',
  `repair_cost` decimal(12,2) DEFAULT '0.00' COMMENT '维修成本',
  `repair_result` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '维修结果',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_repair_no` (`repair_no`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备维修表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_scrap`
--

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
  `status` tinyint DEFAULT NULL COMMENT 'status',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scrap_no` (`scrap_no`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备报废表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_spare_issue`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_spare_issue` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '领用记录ID',
  `issue_no` varchar(50) NOT NULL COMMENT '领用单号',
  `spare_part_id` bigint unsigned NOT NULL COMMENT '备件ID',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '领用数量',
  `applicant_id` bigint unsigned DEFAULT NULL COMMENT '领用人ID',
  `applicant_name` varchar(50) DEFAULT NULL COMMENT '领用人姓名',
  `issue_date` date NOT NULL COMMENT '领用日期',
  `reason` varchar(200) DEFAULT NULL COMMENT '领用原因',
  `status` tinyint DEFAULT '1' COMMENT '状态：1=待确认 2=已确认 3=已撤销',
  `remark` text COMMENT '备注',
  `deleted` tinyint DEFAULT '0' COMMENT '软删除：0=正常 1=已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spare_issue_no` (`issue_no`),
  KEY `idx_spare_issue_part` (`spare_part_id`),
  KEY `idx_spare_issue_equipment` (`equipment_id`),
  KEY `idx_spare_issue_date` (`issue_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='备件领用记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_spare_part`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_spare_part` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '备件ID',
  `part_code` varchar(50) NOT NULL COMMENT '备件编码',
  `part_name` varchar(100) NOT NULL COMMENT '备件名称',
  `specification` varchar(200) DEFAULT NULL COMMENT '规格型号',
  `unit` varchar(20) DEFAULT '个' COMMENT '单位',
  `stock_qty` int DEFAULT '0' COMMENT '当前库存数量',
  `safety_stock` int DEFAULT '0' COMMENT '安全库存阈值',
  `unit_price` decimal(10,2) DEFAULT '0.00' COMMENT '单价（元）',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `location` varchar(100) DEFAULT NULL COMMENT '存放位置',
  `status` tinyint DEFAULT '1' COMMENT '状态：1=正常 0=停用',
  `remark` text COMMENT '备注',
  `deleted` tinyint DEFAULT '0' COMMENT '软删除：0=正常 1=已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spare_part_code` (`part_code`),
  KEY `idx_spare_status` (`status`),
  KEY `idx_spare_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备备件表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eqp_status_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eqp_status_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `equipment_id` bigint unsigned NOT NULL COMMENT '设备ID',
  `equipment_code` varchar(50) DEFAULT NULL COMMENT '设备编码',
  `equipment_name` varchar(100) DEFAULT NULL COMMENT '设备名称',
  `from_status` tinyint DEFAULT NULL COMMENT '变更前状态: 1-运行, 2-待机, 3-维修, 4-停机',
  `to_status` tinyint NOT NULL COMMENT '变更后状态: 1-运行, 2-待机, 3-维修, 4-停机',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `remark` varchar(500) DEFAULT NULL COMMENT '变更原因/备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_equipment` (`equipment_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备状态变更日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_account`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_account` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '科目ID',
  `account_code` varchar(20) NOT NULL COMMENT '科目编码',
  `account_name` varchar(100) NOT NULL COMMENT '科目名称',
  `full_name` varchar(200) DEFAULT NULL COMMENT '全称（含父级）',
  `parent_id` bigint unsigned DEFAULT NULL COMMENT '父级科目ID',
  `level` tinyint DEFAULT '1' COMMENT '层级（1=一级）',
  `account_type` tinyint NOT NULL COMMENT '类型: 1=资产, 2=负债, 3=权益, 4=成本, 5=损益',
  `balance_direction` tinyint NOT NULL COMMENT '余额方向: 1=借, 2=贷',
  `is_leaf` tinyint DEFAULT '1' COMMENT '是否末级: 0=否, 1=是',
  `assist_types` varchar(200) DEFAULT NULL COMMENT '辅助核算类型（JSON 数组）',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0=禁用, 1=启用',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account_code` (`account_code`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_type` (`account_type`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='会计科目表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_account_balance`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_account_balance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '余额ID',
  `period_code` varchar(10) NOT NULL COMMENT '期间编码',
  `account_id` bigint unsigned NOT NULL COMMENT '科目ID',
  `account_code` varchar(20) DEFAULT NULL COMMENT '科目编码（冗余）',
  `begin_debit` decimal(18,4) DEFAULT '0.0000' COMMENT '期初借方',
  `begin_credit` decimal(18,4) DEFAULT '0.0000' COMMENT '期初贷方',
  `current_debit` decimal(18,4) DEFAULT '0.0000' COMMENT '本期借方发生',
  `current_credit` decimal(18,4) DEFAULT '0.0000' COMMENT '本期贷方发生',
  `year_debit` decimal(18,4) DEFAULT '0.0000' COMMENT '本年累计借方',
  `year_credit` decimal(18,4) DEFAULT '0.0000' COMMENT '本年累计贷方',
  `end_debit` decimal(18,4) DEFAULT '0.0000' COMMENT '期末借方',
  `end_credit` decimal(18,4) DEFAULT '0.0000' COMMENT '期末贷方',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_account` (`period_code`,`account_id`),
  KEY `idx_account` (`account_id`),
  CONSTRAINT `fk_fin_account_balance_account` FOREIGN KEY (`account_id`) REFERENCES `fin_account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_fin_account_balance_period` FOREIGN KEY (`period_code`) REFERENCES `fin_period` (`period_code`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='科目余额表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_cost_record`
--

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
  `source_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'source_type',
  `source_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'source_no',
  `source_id` bigint unsigned DEFAULT NULL COMMENT 'source_id',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cost_no` (`cost_no`),
  KEY `idx_cost_type` (`cost_type`),
  KEY `idx_cost_date` (`cost_date`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务成本记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_payable`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_payable` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payable_no` varchar(50) NOT NULL COMMENT '应付单号',
  `source_type` tinyint DEFAULT '1' COMMENT '来源类型: 1-采购订单',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `po_id` bigint unsigned DEFAULT NULL COMMENT '来源采购订单id',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '应付金额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,6) DEFAULT '1.000000' COMMENT '汇率',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `paid_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '已付金额',
  `balance` decimal(18,4) DEFAULT '0.0000' COMMENT '未付余额',
  `due_date` date DEFAULT NULL COMMENT '到期日期',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-未付款, 2-部分付款, 3-已付款',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `source_currency` varchar(10) NOT NULL DEFAULT 'CNY' COMMENT '来源币种',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payable_no` (`payable_no`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_source` (`source_no`),
  KEY `idx_status` (`status`),
  KEY `idx_due_date` (`due_date`),
  KEY `fk_payable_purchase_order` (`po_id`),
  KEY `idx_payable_status_due` (`status`,`due_date`),
  CONSTRAINT `fk_fin_payable_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `pur_supplier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payable_purchase_order` FOREIGN KEY (`po_id`) REFERENCES `pur_purchase_order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=192 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='应付账款表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_payable_bak_20260925fk`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_payable_bak_20260925fk` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `payable_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '应付单号',
  `source_type` tinyint DEFAULT '1' COMMENT '来源类型: 1-采购订单',
  `source_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '来源单号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '应付金额',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,6) DEFAULT '1.000000' COMMENT '汇率',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `paid_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '已付金额',
  `balance` decimal(18,4) DEFAULT '0.0000' COMMENT '未付余额',
  `due_date` date DEFAULT NULL COMMENT '到期日期',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-未付款, 2-部分付款, 3-已付款',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `source_currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'CNY' COMMENT '来源币种'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_payment_record`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_payment_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_no` varchar(50) NOT NULL COMMENT '付款单号',
  `payable_id` bigint unsigned DEFAULT NULL COMMENT '应付ID',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '付款金额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,6) DEFAULT '1.000000' COMMENT '汇率',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `payment_method` varchar(20) DEFAULT NULL COMMENT '付款方式',
  `payment_date` date DEFAULT NULL COMMENT '付款日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  KEY `idx_payable` (`payable_id`),
  KEY `idx_supplier` (`supplier_id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='付款记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_period`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_period` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '期间ID',
  `period_code` varchar(10) NOT NULL COMMENT '期间编码（如 2026-07）',
  `period_name` varchar(20) DEFAULT NULL COMMENT '期间名称（如 2026年7月）',
  `start_date` date NOT NULL COMMENT '开始日期',
  `end_date` date NOT NULL COMMENT '结束日期',
  `is_closed` tinyint DEFAULT '0' COMMENT '是否已结账: 0=否, 1=是',
  `status` tinyint DEFAULT '0' COMMENT '状态: 0=开放, 1=结账中, 2=已关闭',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_code` (`period_code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='会计期间表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_receipt_record`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_receipt_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receipt_no` varchar(50) NOT NULL COMMENT '收款单号',
  `receivable_id` bigint unsigned DEFAULT NULL COMMENT '应收ID',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '收款金额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,6) DEFAULT '1.000000' COMMENT '汇率',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
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

--
-- Table structure for table `fin_receipt_record_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_receipt_record_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `receipt_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '收款单号',
  `receivable_id` bigint unsigned DEFAULT NULL COMMENT '应收ID',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '收款金额',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,6) DEFAULT '1.000000' COMMENT '汇率',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `payment_method` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '付款方式',
  `receipt_date` date DEFAULT NULL COMMENT '收款日期',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_receivable`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_receivable` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receivable_no` varchar(50) NOT NULL COMMENT '应收单号',
  `source_type` tinyint DEFAULT '1' COMMENT '来源类型: 1-销售订单',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '关联订单ID',
  `order_type` varchar(20) DEFAULT NULL COMMENT '订单类型',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '应收金额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,6) DEFAULT '1.000000' COMMENT '汇率',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `received_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '已收金额',
  `balance` decimal(18,4) DEFAULT '0.0000' COMMENT '未收余额',
  `due_date` date DEFAULT NULL COMMENT '到期日期',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-未收款, 2-部分收款, 3-已收款',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `customer_name` varchar(128) DEFAULT NULL COMMENT '客户名称',
  `source_id` bigint DEFAULT NULL COMMENT '来源单ID',
  `source_currency` varchar(10) NOT NULL DEFAULT 'CNY' COMMENT '来源币种',
  `source_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '来源金额',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receivable_no` (`receivable_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_source` (`source_no`),
  KEY `idx_status` (`status`),
  KEY `idx_due_date` (`due_date`),
  KEY `fk_receivable_sales_order` (`order_id`),
  KEY `idx_receivable_status_due` (`status`,`due_date`),
  CONSTRAINT `fk_fin_receivable_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_receivable_sales_order` FOREIGN KEY (`order_id`) REFERENCES `sal_order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='应收账款表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_receivable_bak_20260925fk`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_receivable_bak_20260925fk` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `receivable_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '应收单号',
  `source_type` tinyint DEFAULT '1' COMMENT '来源类型: 1-销售订单',
  `source_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '来源单号',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '关联订单ID',
  `order_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '订单类型',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '应收金额',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,6) DEFAULT '1.000000' COMMENT '汇率',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `received_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '已收金额',
  `balance` decimal(18,4) DEFAULT '0.0000' COMMENT '未收余额',
  `due_date` date DEFAULT NULL COMMENT '到期日期',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-未收款, 2-部分收款, 3-已收款',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `customer_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `source_id` bigint DEFAULT NULL COMMENT '来源单ID',
  `source_currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'CNY' COMMENT '来源币种',
  `source_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '来源金额'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_receivable_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_receivable_line` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receivable_id` bigint unsigned NOT NULL,
  `line_no` int DEFAULT NULL,
  `sales_order_id` bigint unsigned DEFAULT NULL,
  `sales_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `tax_amount` decimal(12,2) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_voucher`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_voucher` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '凭证ID',
  `voucher_no` varchar(50) NOT NULL COMMENT '凭证编号',
  `period_code` varchar(10) NOT NULL COMMENT '所属期间',
  `voucher_date` date NOT NULL COMMENT '凭证日期',
  `voucher_type` tinyint NOT NULL COMMENT '类型: 1=收, 2=付, 3=转, 4=调整',
  `source_type` varchar(50) DEFAULT NULL COMMENT '来源类型（sale/purchase/payment/receipt/cost 等）',
  `source_id` bigint unsigned DEFAULT NULL COMMENT '来源单据ID',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单据号',
  `total_debit` decimal(18,4) DEFAULT '0.0000' COMMENT '借方合计',
  `total_credit` decimal(18,4) DEFAULT '0.0000' COMMENT '贷方合计',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '凭证总额（旧版兼容）',
  `status` tinyint DEFAULT '0' COMMENT '状态: 0=草稿, 1=已提交, 2=已审核, 3=已记账, 4=已作废',
  `summary` text COMMENT '摘要（新版总账）',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注（旧版 FinanceVoucherHandler 兼容）',
  `attachment_count` int DEFAULT '0' COMMENT '附件数',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` varchar(50) DEFAULT NULL COMMENT '制单人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（旧版兼容）',
  `audited_by` varchar(50) DEFAULT NULL COMMENT '审核人',
  `audited_at` datetime DEFAULT NULL COMMENT '审核时间',
  `posted_by` varchar(50) DEFAULT NULL COMMENT '记账人',
  `posted_at` datetime DEFAULT NULL COMMENT '记账时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_voucher_no` (`voucher_no`),
  KEY `idx_period` (`period_code`),
  KEY `idx_source` (`source_type`,`source_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_fin_voucher_period` FOREIGN KEY (`period_code`) REFERENCES `fin_period` (`period_code`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='会计凭证主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fin_voucher_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fin_voucher_line` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `voucher_id` bigint unsigned NOT NULL COMMENT '凭证ID',
  `line_no` int NOT NULL COMMENT '行号',
  `account_id` bigint unsigned NOT NULL COMMENT '科目ID',
  `account_code` varchar(20) DEFAULT NULL COMMENT '科目编码（冗余）',
  `account_name` varchar(100) DEFAULT NULL COMMENT '科目名称（冗余）',
  `summary` varchar(500) DEFAULT NULL COMMENT '摘要（新版总账）',
  `debit_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '借方金额',
  `credit_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '贷方金额',
  `debit_account` varchar(100) DEFAULT NULL COMMENT '借方科目名称（旧版 FinanceVoucherHandler 兼容）',
  `credit_account` varchar(100) DEFAULT NULL COMMENT '贷方科目名称（旧版 FinanceVoucherHandler 兼容）',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '金额（旧版兼容）',
  `description` varchar(500) DEFAULT NULL COMMENT '描述（旧版 FinanceVoucherHandler 兼容）',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（旧版兼容）',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID（辅助核算）',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID（辅助核算）',
  `department_id` int unsigned DEFAULT NULL COMMENT '部门ID（辅助核算）',
  `project_id` int unsigned DEFAULT NULL COMMENT '项目ID（辅助核算）',
  PRIMARY KEY (`id`),
  KEY `idx_voucher` (`voucher_id`),
  KEY `idx_account` (`account_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_department` (`department_id`),
  KEY `idx_project` (`project_id`),
  CONSTRAINT `fk_fin_voucher_line_account` FOREIGN KEY (`account_id`) REFERENCES `fin_account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_fin_voucher_line_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_fin_voucher_line_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `pur_supplier` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_voucher_line_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `fin_voucher` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='会计凭证明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_expense`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_expense` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `expense_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `applicant_id` bigint DEFAULT NULL,
  `expense_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `amount` decimal(18,2) DEFAULT '0.00',
  `expense_date` date DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approve_by` bigint DEFAULT NULL,
  `approve_time` datetime DEFAULT NULL,
  `reject_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_expense_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_expense_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `expense_id` bigint DEFAULT NULL,
  `line_no` int DEFAULT '0',
  `expense_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `amount` decimal(18,2) DEFAULT '0.00',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_flow`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_flow` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `flow_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_no` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_id` bigint DEFAULT NULL,
  `customer_id` bigint DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_id` bigint DEFAULT NULL,
  `supplier_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `balance_before` decimal(14,2) DEFAULT '0.00',
  `balance_after` decimal(14,2) DEFAULT '0.00',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'CNY',
  `exchange_rate` decimal(10,6) DEFAULT '1.000000',
  `account_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voucher_no` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `period` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_by_id` bigint DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_flow_no` (`flow_no`),
  KEY `idx_type` (`type`),
  KEY `idx_source` (`source_type`,`source_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_voucher` (`voucher_no`),
  KEY `idx_period` (`period`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_create_by` (`create_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_invoice`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_invoice` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `invoice_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `source_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_id` bigint DEFAULT NULL,
  `source_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `partner_id` bigint DEFAULT NULL,
  `partner_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `invoice_date` date DEFAULT NULL,
  `tax_rate` decimal(10,2) DEFAULT '13.00',
  `total_amount` decimal(18,2) DEFAULT '0.00',
  `tax_amount` decimal(18,2) DEFAULT '0.00',
  `grand_total` decimal(18,2) DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `audit_by` bigint DEFAULT NULL,
  `audit_time` datetime DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1024 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_invoice_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_invoice_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `invoice_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `source_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_id` bigint DEFAULT NULL,
  `source_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `partner_id` bigint DEFAULT NULL,
  `partner_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `invoice_date` date DEFAULT NULL,
  `tax_rate` decimal(10,2) DEFAULT '13.00',
  `total_amount` decimal(18,2) DEFAULT '0.00',
  `tax_amount` decimal(18,2) DEFAULT '0.00',
  `grand_total` decimal(18,2) DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `audit_by` bigint DEFAULT NULL,
  `audit_time` datetime DEFAULT NULL,
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_invoice_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_invoice_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint DEFAULT NULL,
  `line_no` int DEFAULT '0',
  `material_id` bigint DEFAULT NULL,
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `material_spec` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `quantity` decimal(18,2) DEFAULT '0.00',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '件',
  `unit_price` decimal(18,2) DEFAULT '0.00',
  `amount` decimal(18,2) DEFAULT '0.00',
  `tax_rate` decimal(10,2) DEFAULT '13.00',
  `tax_amount` decimal(18,2) DEFAULT '0.00',
  `line_total` decimal(18,2) DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_write_off`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_write_off` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint DEFAULT NULL,
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `invoice_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `payable_id` bigint DEFAULT NULL,
  `receivable_id` bigint DEFAULT NULL,
  `write_off_amount` decimal(18,2) DEFAULT '0.00',
  `write_off_by` bigint DEFAULT NULL,
  `write_off_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finance_write_off_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_write_off_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `invoice_id` bigint DEFAULT NULL,
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `invoice_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `payable_id` bigint DEFAULT NULL,
  `receivable_id` bigint DEFAULT NULL,
  `write_off_amount` decimal(18,2) DEFAULT '0.00',
  `write_off_by` bigint DEFAULT NULL,
  `write_off_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_attendance`
--

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
  `emp_id` int unsigned DEFAULT NULL COMMENT '关联员工ID',
  PRIMARY KEY (`id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_date` (`attendance_date`),
  KEY `idx_status` (`status`),
  KEY `idx_hr_attendance_employee_id_int` (`employee_id_int`),
  KEY `idx_hr_attendance_emp_id` (`emp_id`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_attendance_exception`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_attendance_exception` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `exception_date` date NOT NULL,
  `exception_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minutes` int DEFAULT '0',
  `deduction_amount` decimal(10,2) DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `handler_id` bigint unsigned DEFAULT NULL,
  `handle_time` datetime DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ae_emp_date` (`employee_id`,`exception_date`),
  KEY `idx_ae_type` (`exception_type`),
  KEY `idx_ae_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤异常';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_certificate`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_certificate` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `cert_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cert_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cert_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_authority` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `remind_days` int DEFAULT '30',
  `status` tinyint DEFAULT '1',
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_ce_employee` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_employee_position`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_employee_position` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `position_id` bigint unsigned NOT NULL,
  `is_primary` tinyint DEFAULT '0',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hep_employee` (`employee_id`),
  KEY `idx_hep_position` (`position_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工岗位';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_mes_sync`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_mes_sync` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `employee_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sync_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sync_data` text COLLATE utf8mb4_unicode_ci,
  `sync_status` tinyint DEFAULT '1',
  `last_sync_time` datetime DEFAULT NULL,
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_organization`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_organization` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `org_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` bigint unsigned DEFAULT '0',
  `org_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_payroll_snapshot`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_payroll_snapshot` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payroll_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `period_month` varchar(7) NOT NULL,
  `source_type` varchar(20) DEFAULT NULL,
  `source_id` bigint unsigned DEFAULT NULL,
  `payload` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ps_payroll` (`payroll_id`),
  KEY `idx_ps_employee_period` (`employee_id`,`period_month`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='薪资计算快照表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_performance`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_performance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL COMMENT '员工ID (sys_employee.id)',
  `employee_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '员工姓名（保存时快照）',
  `employee_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '员工编号（保存时快照）',
  `output_rate` decimal(6,2) NOT NULL DEFAULT '0.00' COMMENT '产量得分(权重40%)',
  `quality_rate` decimal(6,2) NOT NULL DEFAULT '0.00' COMMENT '质量得分(权重30%)',
  `equipment_rate` decimal(6,2) NOT NULL DEFAULT '0.00' COMMENT '设备得分(权重15%)',
  `site_management` decimal(6,2) NOT NULL DEFAULT '0.00' COMMENT '现场管理得分(权重15%)',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_hr_performance_employee` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='HR绩效考核表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_piece_rate`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_piece_rate` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `process_code` varchar(50) NOT NULL COMMENT '工序代码',
  `product_type` varchar(50) DEFAULT NULL COMMENT '产品类型',
  `unit_price` decimal(10,4) NOT NULL DEFAULT '0.0000' COMMENT '计件单价',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `quality_threshold` decimal(5,2) DEFAULT '0.00' COMMENT '质量阈值',
  `effective_date` date NOT NULL COMMENT '生效日期',
  `factory_id` bigint unsigned DEFAULT NULL COMMENT '工厂ID',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-启用, 0-禁用',
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_pr_process` (`process_code`),
  KEY `idx_pr_product` (`product_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='HR计件单价表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_piece_work_detail`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_piece_work_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL COMMENT '员工ID',
  `work_date` date NOT NULL COMMENT '工作日期',
  `process_code` varchar(50) NOT NULL COMMENT '工序代码',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品代码',
  `quantity` int DEFAULT '0' COMMENT '合格数量',
  `defective_quantity` int DEFAULT '0' COMMENT '不合格数量',
  `unit_price` decimal(10,4) NOT NULL DEFAULT '0.0000' COMMENT '计件单价',
  `amount` decimal(10,2) DEFAULT NULL COMMENT '计件金额',
  `machine_id` varchar(50) DEFAULT NULL COMMENT '机台号',
  `mes_sync_id` varchar(50) DEFAULT NULL COMMENT 'MES同步ID',
  `sync_status` tinyint DEFAULT '0' COMMENT '同步状态',
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pw_emp_date` (`employee_id`,`work_date`),
  KEY `idx_pw_date` (`work_date`),
  KEY `idx_pw_process` (`process_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='HR计件明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_salary_calculation`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_salary_calculation` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `calc_month` varchar(7) NOT NULL,
  `base_salary` decimal(10,2) DEFAULT '0.00',
  `piece_salary` decimal(10,2) DEFAULT '0.00',
  `overtime_salary` decimal(10,2) DEFAULT '0.00',
  `performance_salary` decimal(10,2) DEFAULT '0.00',
  `allowances` decimal(10,2) DEFAULT '0.00',
  `social_insurance_personal` decimal(10,2) DEFAULT '0.00',
  `housing_fund_personal` decimal(10,2) DEFAULT '0.00',
  `individual_tax` decimal(10,2) DEFAULT '0.00',
  `attendance_deduction` decimal(10,2) DEFAULT '0.00',
  `other_deduction` decimal(10,2) DEFAULT '0.00',
  `gross_pay` decimal(10,2) DEFAULT '0.00',
  `total_deduction` decimal(10,2) DEFAULT '0.00',
  `net_pay` decimal(10,2) DEFAULT '0.00',
  `status` varchar(20) DEFAULT 'draft',
  `calc_log` text,
  `confirm_time` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sc_employee_month` (`employee_id`,`calc_month`),
  KEY `idx_sc_employee` (`employee_id`),
  KEY `idx_sc_month` (`calc_month`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_salary_profile`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_salary_profile` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `salary_type` varchar(20) DEFAULT 'mixed',
  `base_salary` decimal(10,2) DEFAULT '0.00',
  `social_insurance_base` decimal(10,2) DEFAULT '0.00',
  `housing_fund_rate` decimal(5,2) DEFAULT '0.00',
  `tax_deduction` decimal(10,2) DEFAULT '0.00',
  `bank_account` varchar(50) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `effective_date` date NOT NULL,
  `status` tinyint DEFAULT '1',
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sp_employee` (`employee_id`),
  KEY `idx_sp_effective` (`effective_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_salary_standard`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_salary_standard` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `position_code` varchar(50) NOT NULL COMMENT '岗位代码',
  `skill_level` int DEFAULT '1' COMMENT '技能等级',
  `base_salary` decimal(10,2) DEFAULT '0.00' COMMENT '基本工资',
  `piece_rate_type` varchar(20) DEFAULT NULL COMMENT '计件类型',
  `performance_base` decimal(10,2) DEFAULT '0.00' COMMENT '绩效基数',
  `allowance_night` decimal(10,2) DEFAULT '0.00' COMMENT '夜班补贴',
  `allowance_high_temp` decimal(10,2) DEFAULT '0.00' COMMENT '高温补贴',
  `effective_date` date NOT NULL COMMENT '生效日期',
  `factory_id` bigint unsigned DEFAULT NULL COMMENT '工厂ID',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-启用, 0-禁用',
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_ss_position` (`position_code`),
  KEY `idx_ss_effective` (`effective_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='HR薪资标准表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_schedule`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_schedule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `schedule_date` date NOT NULL,
  `shift_id` bigint unsigned DEFAULT NULL,
  `schedule_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `source` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sc_emp_date` (`employee_id`,`schedule_date`),
  KEY `idx_sc_date` (`schedule_date`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_shift`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_shift` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shift_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allow_overtime` tinyint DEFAULT '1',
  `overtime_rate` decimal(3,1) DEFAULT '1.5',
  `night_allowance` decimal(10,2) DEFAULT '0.00',
  `late_threshold` int DEFAULT '15',
  `early_leave_threshold` int DEFAULT '15',
  `working_hours` decimal(4,1) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_skill_matrix`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_skill_matrix` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `skill_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_level` tinyint DEFAULT '1',
  `certified` tinyint DEFAULT '0',
  `certificate_id` bigint unsigned DEFAULT NULL,
  `assessor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assess_date` date DEFAULT NULL,
  `next_assess_date` date DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_sk_employee` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_skills`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_skills` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `skill_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_training`
--

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
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_training_no` (`training_no`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='培训记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hr_training_participant`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='培训参与人员表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ink_dispatch`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ink_dispatch` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dispatch_no` varchar(50) DEFAULT NULL,
  `batch_no` varchar(50) DEFAULT NULL,
  `workorder_id` bigint unsigned DEFAULT NULL,
  `workorder_no` varchar(50) DEFAULT NULL,
  `formula_id` bigint unsigned DEFAULT NULL,
  `formula_no` varchar(50) DEFAULT NULL,
  `color_name` varchar(100) DEFAULT NULL,
  `color_code` varchar(50) DEFAULT NULL,
  `pantone_code` varchar(50) DEFAULT NULL,
  `total_weight` decimal(12,3) DEFAULT NULL,
  `unit` varchar(10) DEFAULT NULL,
  `tare_weight` decimal(12,3) DEFAULT '0.000',
  `net_weight` decimal(12,3) DEFAULT NULL,
  `gross_weight` decimal(12,3) DEFAULT NULL,
  `operator_id` bigint unsigned DEFAULT NULL,
  `operator_name` varchar(100) DEFAULT NULL,
  `machine_id` bigint unsigned DEFAULT NULL,
  `machine_name` varchar(100) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `remark` varchar(255) DEFAULT NULL,
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dispatch_no` (`dispatch_no`),
  KEY `idx_workorder_no` (`workorder_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='调色配料记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ink_dispatch_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ink_dispatch_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dispatch_id` bigint unsigned DEFAULT NULL,
  `sort_order` int DEFAULT NULL,
  `source_type` varchar(20) DEFAULT NULL,
  `source_batch_no` varchar(50) DEFAULT NULL,
  `source_label_no` varchar(50) DEFAULT NULL,
  `ink_id` bigint unsigned DEFAULT NULL,
  `ink_code` varchar(50) DEFAULT NULL,
  `ink_name` varchar(100) DEFAULT NULL,
  `ink_type` varchar(20) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `formula_weight` decimal(12,3) DEFAULT NULL,
  `actual_weight` decimal(12,3) DEFAULT NULL,
  `unit` varchar(10) DEFAULT NULL,
  `is_surplus` tinyint DEFAULT '0',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_dispatch_id` (`dispatch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='调色配料明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ink_formula_workorder`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ink_formula_workorder` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `formula_id` bigint unsigned DEFAULT NULL,
  `workorder_id` bigint unsigned DEFAULT NULL,
  `workorder_no` varchar(50) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_formula_id` (`formula_id`),
  KEY `idx_workorder_id` (`workorder_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='配方-工单关联';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ink_mixed_batch`
--

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

--
-- Table structure for table `ink_mixed_batch_detail`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调墨明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ink_mixed_record`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='调色后油墨入库记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ink_opening_record`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨开罐记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ink_usage`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ink_usage` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usage_no` varchar(50) NOT NULL COMMENT '使用记录号',
  `usage_type` varchar(20) NOT NULL COMMENT '类型',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '油墨批次号',
  `qr_code` varchar(100) DEFAULT NULL COMMENT '二维码',
  `workorder_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `workorder_no` varchar(50) DEFAULT NULL COMMENT '工单号',
  `formula_id` bigint unsigned DEFAULT NULL COMMENT '配方ID',
  `formula_no` varchar(50) DEFAULT NULL COMMENT '配方编号',
  `color_name` varchar(100) DEFAULT NULL COMMENT '颜色名称',
  `weight` decimal(10,3) NOT NULL COMMENT '重量',
  `unit` varchar(10) DEFAULT 'kg' COMMENT '单位',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员',
  `machine_id` bigint unsigned DEFAULT NULL COMMENT '机台ID',
  `machine_name` varchar(100) DEFAULT NULL COMMENT '机台名称',
  `location_id` bigint unsigned DEFAULT NULL COMMENT '库位ID',
  `location_name` varchar(100) DEFAULT NULL COMMENT '库位名称',
  `status` tinyint DEFAULT '1' COMMENT '1-有效',
  `remark` text COMMENT '备注',
  `usage_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '使用时间',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `ink_id` bigint unsigned DEFAULT NULL COMMENT '油墨ID(base_ink)',
  `screen_plate_id` bigint unsigned DEFAULT NULL COMMENT '网版ID(prd_screen_plate)',
  `usage_date` datetime DEFAULT NULL COMMENT '耗用日期',
  `usage_qty` decimal(10,3) DEFAULT NULL COMMENT '耗用量',
  `ink_code` varchar(50) DEFAULT NULL COMMENT '油墨编码',
  `ink_name` varchar(100) DEFAULT NULL COMMENT '油墨名称',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT 'work_order_id',
  `update_time` datetime DEFAULT NULL COMMENT 'update_time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usage_no` (`usage_no`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_workorder` (`workorder_no`),
  KEY `idx_usage_type` (`usage_type`),
  KEY `idx_usage_time` (`usage_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='油墨使用记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_alert_rule`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_alert_rule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(100) DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `warehouse_id` bigint unsigned DEFAULT NULL,
  `alert_type` varchar(20) DEFAULT NULL,
  `threshold` decimal(18,4) DEFAULT NULL,
  `notify_method` varchar(20) DEFAULT NULL,
  `notify_users` varchar(255) DEFAULT NULL,
  `enabled` tinyint DEFAULT '1',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_cutting_detail`
--

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
  KEY `idx_new_label` (`new_label_id`),
  CONSTRAINT `fk_inv_cutting_detail_new_label` FOREIGN KEY (`new_label_id`) REFERENCES `inv_material_label` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_cutting_detail_record` FOREIGN KEY (`record_id`) REFERENCES `inv_cutting_record` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分切明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_cutting_detail_bak_20260925b`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_cutting_detail_bak_20260925b` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `record_id` bigint unsigned NOT NULL COMMENT '分切记录ID',
  `new_label_id` bigint unsigned NOT NULL COMMENT '新标签ID',
  `new_label_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '新标签编号',
  `cut_width` decimal(18,2) DEFAULT NULL COMMENT '分切宽幅',
  `sequence` int DEFAULT '0' COMMENT '分切序号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_cutting_record`
--

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
  KEY `idx_cut_time` (`cut_time`),
  CONSTRAINT `fk_inv_cutting_record_source_label` FOREIGN KEY (`source_label_id`) REFERENCES `inv_material_label` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分切记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_cutting_record_bak_20260925b`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_cutting_record_bak_20260925b` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `record_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '分切单号',
  `source_label_id` bigint unsigned NOT NULL COMMENT '源标签ID',
  `source_label_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '源标签编号',
  `cut_width_str` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '分切宽幅（如：10+20+30）',
  `original_width` decimal(18,2) DEFAULT NULL COMMENT '原宽幅',
  `cut_total_width` decimal(18,2) DEFAULT NULL COMMENT '分切总宽幅',
  `remain_width` decimal(18,2) DEFAULT NULL COMMENT '剩余宽幅',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '操作员名称',
  `cut_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '分切时间',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '备注',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-作废, 1-正常',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_fifo_override_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_fifo_override_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `recommended_batch_no` varchar(50) DEFAULT NULL COMMENT '推荐批次号',
  `actual_batch_no` varchar(50) DEFAULT NULL COMMENT '实际出库批次号',
  `requisition_id` bigint unsigned DEFAULT NULL COMMENT '领料单ID',
  `reason` varchar(255) NOT NULL COMMENT '异常原因',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `approve_id` bigint unsigned DEFAULT NULL COMMENT '审批人ID',
  `approve_name` varchar(50) DEFAULT NULL COMMENT '审批人姓名',
  `status` tinyint DEFAULT '0' COMMENT '状态：0=待审批，1=已批准，2=已拒绝',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_requisition` (`requisition_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_approve` (`approve_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='FIFO异常覆盖记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inbound_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inbound_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id` bigint unsigned NOT NULL COMMENT '入库单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码（冗余，便于查询）',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(200) DEFAULT NULL COMMENT '物料规格',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `quantity` decimal(18,4) DEFAULT NULL COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `total_price` decimal(18,4) DEFAULT NULL COMMENT '总价',
  `warehouse_location` varchar(50) DEFAULT NULL COMMENT '库位',
  `produce_date` date DEFAULT NULL COMMENT '生产日期',
  `expire_date` date DEFAULT NULL COMMENT '过期日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0' COMMENT '软删除',
  `base_unit_price` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币单价',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `purchase_order_item_id` bigint unsigned DEFAULT NULL COMMENT '采购订单明细ID(pur_purchase_order_line.id)',
  `purchase_order_line_no` int unsigned DEFAULT NULL COMMENT '采购订单行号(pur_purchase_order_line.line_no)',
  `batch_id` bigint unsigned DEFAULT NULL,
  `original_inbound_date` date DEFAULT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  `qr_code` varchar(255) DEFAULT NULL,
  `po_line_id` int unsigned DEFAULT NULL COMMENT '关联采购单行ID',
  `line_no` int unsigned DEFAULT NULL COMMENT '行号',
  `accepted_qty` decimal(14,3) DEFAULT '0.000' COMMENT '合格数量',
  `rejected_qty` decimal(14,3) DEFAULT '0.000' COMMENT '不良数量',
  `qc_result` enum('pending','pass','fail','partial') DEFAULT 'pending' COMMENT '质检结果',
  `qc_inspector_id` int unsigned DEFAULT NULL COMMENT '质检员ID',
  `qc_time` datetime DEFAULT NULL COMMENT '质检时间',
  `supplier_batch_no` varchar(100) DEFAULT NULL COMMENT '供应商批次号',
  `warehouse_id` int unsigned DEFAULT NULL COMMENT '仓库ID',
  `putaway_status` enum('pending','done') DEFAULT 'pending' COMMENT '上架状态',
  `source_order_id` int unsigned DEFAULT NULL COMMENT '来源业务订单ID',
  `source_order_line_id` int unsigned DEFAULT NULL COMMENT '来源业务订单行ID',
  `is_consumed` tinyint(1) DEFAULT '0' COMMENT '是否已关联消耗',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inbound_order_line` (`order_id`,`material_id`,`batch_no`,`deleted`),
  KEY `idx_order` (`order_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_source_order_item` (`source_order_id`,`source_order_line_id`),
  CONSTRAINT `fk_inv_inbound_item_order` FOREIGN KEY (`order_id`) REFERENCES `inv_inbound_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=930 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库订单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inbound_item_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inbound_item_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '主键ID',
  `order_id` bigint unsigned NOT NULL COMMENT '入库单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料编码（冗余，便于查询）',
  `material_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '物料名称',
  `material_spec` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料规格',
  `batch_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '批次号',
  `quantity` decimal(18,4) DEFAULT NULL COMMENT '数量',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `total_price` decimal(18,4) DEFAULT NULL COMMENT '总价',
  `warehouse_location` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '库位',
  `produce_date` date DEFAULT NULL COMMENT '生产日期',
  `expire_date` date DEFAULT NULL COMMENT '过期日期',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0' COMMENT '软删除',
  `base_unit_price` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币单价',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `purchase_order_item_id` bigint unsigned DEFAULT NULL COMMENT '采购订单明细ID(pur_purchase_order_line.id)',
  `purchase_order_line_no` int unsigned DEFAULT NULL COMMENT '采购订单行号(pur_purchase_order_line.line_no)',
  `batch_id` bigint unsigned DEFAULT NULL,
  `original_inbound_date` date DEFAULT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  `qr_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `po_line_id` int unsigned DEFAULT NULL COMMENT '关联采购单行ID',
  `line_no` int unsigned DEFAULT NULL COMMENT '行号',
  `accepted_qty` decimal(14,3) DEFAULT '0.000' COMMENT '合格数量',
  `rejected_qty` decimal(14,3) DEFAULT '0.000' COMMENT '不良数量',
  `qc_result` enum('pending','pass','fail','partial') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '质检结果',
  `qc_inspector_id` int unsigned DEFAULT NULL COMMENT '质检员ID',
  `qc_time` datetime DEFAULT NULL COMMENT '质检时间',
  `supplier_batch_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '供应商批次号',
  `warehouse_id` int unsigned DEFAULT NULL COMMENT '仓库ID',
  `putaway_status` enum('pending','done') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '上架状态',
  `source_order_id` int unsigned DEFAULT NULL COMMENT '来源业务订单ID',
  `source_order_line_id` int unsigned DEFAULT NULL COMMENT '来源业务订单行ID',
  `is_consumed` tinyint(1) DEFAULT '0' COMMENT '是否已关联消耗'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inbound_label`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inbound_label` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `label_id` varchar(50) NOT NULL COMMENT '标签唯一编号',
  `order_id` bigint DEFAULT NULL COMMENT '入库单ID',
  `order_no` varchar(50) DEFAULT NULL COMMENT '入库单号',
  `item_id` bigint DEFAULT NULL COMMENT '入库明细ID',
  `purchase_order_no` varchar(50) DEFAULT NULL COMMENT '采购单号',
  `supplier_name` varchar(200) DEFAULT NULL COMMENT '供应商名称',
  `inbound_date` date DEFAULT NULL COMMENT '入库日期',
  `warehouse_code` varchar(50) DEFAULT NULL COMMENT '仓库编码',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '物料名称',
  `specification` varchar(200) DEFAULT NULL COMMENT '规格',
  `width` decimal(18,4) DEFAULT '0.0000' COMMENT '幅宽',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '数量',
  `unit` varchar(20) NOT NULL DEFAULT '件' COMMENT '单位',
  `is_raw_material` tinyint NOT NULL DEFAULT '0' COMMENT '是否原料: 0=否, 1=是',
  `package_qty` int DEFAULT '0' COMMENT '包装数量',
  `label_qty` int DEFAULT '1' COMMENT '标签数量',
  `label_status` varchar(20) NOT NULL DEFAULT 'generated' COMMENT '标签状态: generated|used|split|void',
  `audit_status` tinyint DEFAULT '0' COMMENT '审核状态: 0=未审核, 1=已审核',
  `operator_id` bigint DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员姓名',
  `auditor_id` bigint DEFAULT NULL COMMENT '审核员ID',
  `auditor_name` varchar(50) DEFAULT NULL COMMENT '审核员姓名',
  `audit_time` datetime DEFAULT NULL COMMENT '审核时间',
  `color_code` varchar(50) DEFAULT NULL COMMENT '色号',
  `mixed_material_remark` varchar(500) DEFAULT NULL COMMENT '混料备注',
  `machine_no` varchar(50) DEFAULT NULL COMMENT '机台号',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0=正常, 1=已删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_label_id` (`label_id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_label_status` (`label_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库物料标签';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inbound_order`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inbound_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_no` varchar(50) NOT NULL COMMENT '入库单号',
  `order_type` enum('purchase','return','transfer','other') DEFAULT 'purchase' COMMENT '入库类型',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '入库仓库ID',
  `warehouse_code` varchar(50) DEFAULT NULL COMMENT '仓库编码',
  `warehouse_name` varchar(100) DEFAULT NULL COMMENT '仓库名称',
  `supplier_id` int unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) DEFAULT NULL COMMENT '供应商名称',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员姓名',
  `po_id` bigint unsigned DEFAULT NULL,
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联生产工单 prod_work_order.id',
  `po_no` varchar(50) DEFAULT NULL COMMENT '采购单号',
  `grn_type` enum('po','blind','return') DEFAULT 'po' COMMENT '入库类型',
  `total_amount` decimal(18,4) DEFAULT NULL COMMENT '总金额',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `status` enum('draft','pending','approved','completed','cancelled','rejected') NOT NULL DEFAULT 'draft',
  `status_new` tinyint NOT NULL DEFAULT '1' COMMENT '状态(新)',
  `mandatory_qc` tinyint NOT NULL DEFAULT '0' COMMENT '是否强制质检: 0-否, 1-是',
  `qc_status` enum('pending','pass','fail','partial') DEFAULT 'pending' COMMENT '质检状态',
  `qc_status_new` tinyint NOT NULL DEFAULT '0' COMMENT '质检状态(新)',
  `inbound_date` date DEFAULT NULL COMMENT '入库日期',
  `remark` text COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,4) DEFAULT '1.0000' COMMENT '汇率',
  `base_total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币总金额',
  `source_type` varchar(20) DEFAULT NULL COMMENT '来源类型: purchase_order-采购订单',
  `source_order_id` bigint unsigned DEFAULT NULL COMMENT '来源单据ID（如采购订单ID）',
  `asn_no` varchar(50) DEFAULT NULL COMMENT '到货通知单号',
  `delivery_no` varchar(100) DEFAULT NULL COMMENT '送货单号/快递单号',
  `qc_remark` text COMMENT '质检备注',
  `post_time` datetime DEFAULT NULL COMMENT '过账时间',
  `post_by` int unsigned DEFAULT NULL COMMENT '过账人ID',
  `inspection_status` int DEFAULT '0' COMMENT '质检状态:0未检验 1检验中 2不合格 3已检验',
  `finance_posted` tinyint DEFAULT '0' COMMENT '是否已记账:0否 1是',
  `inspection_id` int DEFAULT NULL COMMENT '关联质检单ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inbound_order_no` (`order_no`,`deleted`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_po_id` (`po_id`),
  KEY `idx_source_order` (`source_type`,`source_order_id`),
  KEY `idx_po_no` (`po_no`),
  KEY `idx_grn_type` (`grn_type`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_inspection_status` (`inspection_status`),
  KEY `idx_finance_posted` (`finance_posted`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_inbound_deleted_time` (`deleted`,`create_time`),
  KEY `idx_inbound_status_deleted` (`status`,`deleted`,`create_time`),
  CONSTRAINT `fk_inv_inbound_order_po` FOREIGN KEY (`po_id`) REFERENCES `pur_purchase_order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_inbound_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=925 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='入库订单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inbound_order_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inbound_order_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '主键ID',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '入库单号',
  `order_type` enum('purchase','return','transfer','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'purchase' COMMENT '入库类型',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '入库仓库ID',
  `warehouse_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '仓库编码',
  `warehouse_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '仓库名称',
  `supplier_id` int unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '供应商名称',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '操作员姓名',
  `po_id` bigint unsigned DEFAULT NULL,
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联生产工单 prod_work_order.id',
  `po_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '采购单号',
  `grn_type` enum('po','blind','return') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'po' COMMENT '入库类型',
  `total_amount` decimal(18,4) DEFAULT NULL COMMENT '总金额',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `status` enum('draft','pending','approved','completed','cancelled','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'draft',
  `status_new` tinyint NOT NULL DEFAULT '1' COMMENT '状态(新)',
  `mandatory_qc` tinyint NOT NULL DEFAULT '0' COMMENT '是否强制质检: 0-否, 1-是',
  `qc_status` enum('pending','pass','fail','partial') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '质检状态',
  `qc_status_new` tinyint NOT NULL DEFAULT '0' COMMENT '质检状态(新)',
  `inbound_date` date DEFAULT NULL COMMENT '入库日期',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,4) DEFAULT '1.0000' COMMENT '汇率',
  `base_total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币总金额',
  `source_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '来源类型: purchase_order-采购订单',
  `source_order_id` bigint unsigned DEFAULT NULL COMMENT '来源单据ID（如采购订单ID）',
  `asn_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '到货通知单号',
  `delivery_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '送货单号/快递单号',
  `qc_remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '质检备注',
  `post_time` datetime DEFAULT NULL COMMENT '过账时间',
  `post_by` int unsigned DEFAULT NULL COMMENT '过账人ID',
  `inspection_status` int DEFAULT '0' COMMENT '质检状态:0未检验 1检验中 2不合格 3已检验',
  `finance_posted` tinyint DEFAULT '0' COMMENT '是否已记账:0否 1是',
  `inspection_id` int DEFAULT NULL COMMENT '关联质检单ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inventory`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码（冗余，便于查询）',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `warehouse_name` varchar(100) DEFAULT NULL COMMENT '仓库名称',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '库存数量',
  `available_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '可用数量',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `locked_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '锁定数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `safety_stock` decimal(18,4) DEFAULT '0.0000' COMMENT '安全库存',
  `version` int unsigned DEFAULT '1' COMMENT '乐观锁版本号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `area` decimal(18,4) DEFAULT NULL COMMENT '面积汇总(派生自批次)',
  `available_area` decimal(18,4) DEFAULT NULL COMMENT '可用面积汇总',
  `cost_price` decimal(18,4) DEFAULT '0.0000',
  `frozen_qty` decimal(18,4) DEFAULT '0.0000',
  `turnover_rate` decimal(18,4) DEFAULT '0.0000',
  `stocktaking_flag` tinyint(1) NOT NULL DEFAULT '0' COMMENT '盘点锁库标记',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'total_qty',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_warehouse` (`material_id`,`warehouse_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_inv_inventory_deleted_time` (`deleted`,`create_time`),
  CONSTRAINT `fk_inv_inventory_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_inventory_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1556 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inventory_batch`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_inventory_batch` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `batch_no` varchar(50) NOT NULL COMMENT '批次号',
  `inbound_no` varchar(50) DEFAULT NULL COMMENT '入库单号',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `specification` varchar(200) DEFAULT NULL COMMENT '规格',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) DEFAULT NULL COMMENT '供应商名称',
  `warehouse_name` varchar(100) DEFAULT NULL COMMENT '仓库名称',
  `quantity` decimal(12,3) DEFAULT '0.000' COMMENT '总数量',
  `available_qty` decimal(12,3) DEFAULT '0.000' COMMENT '可用数量',
  `locked_qty` decimal(12,3) DEFAULT '0.000' COMMENT '锁定数量',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `unit_price` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `produce_date` date DEFAULT NULL COMMENT '生产日期',
  `expire_date` date DEFAULT NULL COMMENT '有效期至',
  `inbound_date` date DEFAULT NULL COMMENT '入库日期',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1-normal 可用, 2-frozen 冻结, 3-expired 过期',
  `inspection_id` bigint unsigned DEFAULT NULL COMMENT '关联检验单ID',
  `version` int unsigned DEFAULT '1' COMMENT '乐观锁版本号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `alert_level` varchar(20) DEFAULT 'normal' COMMENT '库存告警级别: normal/warning/critical',
  `last_alert_time` timestamp NULL DEFAULT NULL COMMENT '最后告警时间',
  `inspection_status` varchar(20) DEFAULT 'pending' COMMENT '检验状态: pending/pass/fail',
  `qc_status` varchar(20) DEFAULT 'pending' COMMENT '质检状态',
  `quarantine_status` varchar(20) DEFAULT 'none' COMMENT '隔离状态: none/quarantined/released',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `width` decimal(18,2) DEFAULT NULL COMMENT '宽幅',
  `length` decimal(18,2) DEFAULT NULL COMMENT '长度',
  `batch_type` tinyint DEFAULT '0' COMMENT '0普通 1子批',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `parent_batch_id` bigint unsigned DEFAULT NULL COMMENT '母批ID',
  `area` decimal(18,4) DEFAULT NULL COMMENT '面积(宽×长×数量)，长度类物料计量用',
  `available_area` decimal(18,4) DEFAULT NULL COMMENT '可用面积',
  `split_flag` tinyint DEFAULT '0' COMMENT '拆分标记: 0-整料, 1-小料, 2-余料（余料优先出库）',
  `opened_at` datetime DEFAULT NULL COMMENT '开封时间，已开封批次优先出库',
  `qr_code` varchar(100) DEFAULT NULL COMMENT '批次二维码',
  `location` varchar(50) DEFAULT NULL COMMENT '库位',
  `current_weight` decimal(18,4) DEFAULT '0.0000',
  `surplus_status` varchar(20) DEFAULT 'available',
  `is_surplus` tinyint DEFAULT '0',
  `remaining_qty` decimal(18,2) DEFAULT '0.00',
  `inbound_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT 'inbound_quantity',
  `outbound_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT 'outbound_quantity',
  `available_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT 'available_quantity',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_warehouse_material_batch` (`warehouse_id`,`material_id`,`batch_no`,`deleted`),
  KEY `idx_material` (`material_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_alert_level` (`alert_level`),
  KEY `idx_split_flag` (`split_flag`),
  KEY `idx_qr_code` (`qr_code`),
  KEY `idx_inv_batch_mat_wh` (`material_id`,`warehouse_id`,`deleted`),
  KEY `idx_inv_batch_status` (`status`,`deleted`),
  KEY `idx_inv_batch_deleted_time` (`deleted`,`create_time`),
  CONSTRAINT `fk_inv_inventory_batch_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_inventory_batch_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=300713 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存批次表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inventory_log`
--

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
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `trans_type` varchar(20) DEFAULT NULL COMMENT '交易类型',
  `quantity` decimal(18,4) DEFAULT NULL COMMENT '变动数量',
  `before_qty` decimal(18,4) DEFAULT NULL COMMENT '变动前数量',
  `after_qty` decimal(18,4) DEFAULT NULL COMMENT '变动后数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `source_type` varchar(50) DEFAULT NULL COMMENT '来源类型',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `operation_type` tinyint DEFAULT NULL COMMENT '操作类型 1入 2出 3损耗',
  `operation_qty` decimal(18,4) DEFAULT NULL COMMENT '操作数量',
  `business_type` varchar(50) DEFAULT NULL COMMENT '业务类型',
  `business_no` varchar(50) DEFAULT NULL COMMENT '业务单号',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `batch_type` tinyint DEFAULT '0',
  `supplier_id` bigint unsigned DEFAULT NULL,
  `unit_price` decimal(18,4) DEFAULT '0.0000',
  PRIMARY KEY (`id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1236 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存变动日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inventory_transaction`
--

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
  `account_dr` varchar(50) DEFAULT NULL COMMENT '财务借方科目',
  `account_cr` varchar(50) DEFAULT NULL COMMENT '财务贷方科目',
  `source_no` varchar(100) DEFAULT '' COMMENT '来源单号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trans_no` (`trans_no`),
  KEY `idx_trans_type` (`trans_type`),
  KEY `idx_source` (`source_type`,`source_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=936 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存事务表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_inventory_transaction_log`
--

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

--
-- Table structure for table `inv_location`
--

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库位表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_material`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `width` decimal(18,2) DEFAULT NULL COMMENT '宽幅',
  `is_splittable` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否允许分切',
  `length` decimal(18,4) DEFAULT '0.0000',
  `weighted_avg_cost` decimal(18,4) DEFAULT NULL COMMENT '移动加权平均成本（由 inv_inventory.unit_cost 按物料数量加权聚合同步）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_code` (`material_code`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_material_type` (`material_type`,`deleted`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `fk_material_category` (`category_id`),
  KEY `idx_inv_material_is_splittable` (`is_splittable`,`deleted`),
  KEY `idx_inv_material_deleted_time` (`deleted`,`create_time`),
  KEY `idx_inv_material_status_time` (`status`,`create_time`),
  CONSTRAINT `fk_material_category` FOREIGN KEY (`category_id`) REFERENCES `inv_material_category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=99577 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_material_category`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_material_category` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `parent_id` bigint unsigned DEFAULT NULL COMMENT '父分类ID, NULL为顶级分类',
  `category_code` varchar(50) NOT NULL COMMENT '分类编码',
  `category_name` varchar(100) NOT NULL COMMENT '分类名称',
  `sort_order` int DEFAULT '0' COMMENT '排序序号',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `category_type` tinyint DEFAULT NULL COMMENT '分类类型: 1-原材料,2-半成品,3-成品,4-辅料,5-包材,6-油墨,7-溶剂,8-网版,9-刀具,10-设备配件',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `is_splittable` tinyint NOT NULL DEFAULT '0' COMMENT '该分类物料是否可分切（母材分切/分条）',
  `typical_examples` varchar(600) DEFAULT NULL COMMENT '典型品名/代号举例（用于人工归类参照）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`category_code`),
  KEY `idx_parent` (`parent_id`),
  CONSTRAINT `fk_material_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `inv_material_category` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=310 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料分类表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_material_label`
--

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
  KEY `idx_label_type` (`label_type`),
  KEY `fk_label_location` (`location_id`),
  KEY `idx_inv_material_label_parent_id` (`parent_label_id`),
  KEY `idx_inv_material_label_label_no` (`label_no`),
  KEY `idx_inv_material_label_material_code` (`material_code`),
  CONSTRAINT `fk_label_location` FOREIGN KEY (`location_id`) REFERENCES `inv_location` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_label_parent` FOREIGN KEY (`parent_label_id`) REFERENCES `inv_material_label` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_label_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=148 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料标签表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_material_label_bak_20260925b`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_material_label_bak_20260925b` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `label_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '标签编号',
  `qr_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '二维码内容',
  `purchase_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '采购单号',
  `supplier_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '供应商名称',
  `receive_date` date DEFAULT NULL COMMENT '进料日期',
  `material_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '物料代号',
  `material_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '品名',
  `specification` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '进料规格',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '单位',
  `batch_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '批号',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '数量',
  `package_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '包装量',
  `width` decimal(18,2) DEFAULT NULL COMMENT '宽幅',
  `length_per_roll` decimal(18,2) DEFAULT NULL COMMENT '每卷米数',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '备注',
  `color_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '颜色代号',
  `mix_remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '混料备注',
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
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_material_std`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_material_std` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(200) DEFAULT NULL COMMENT '规格型号',
  `unit` varchar(20) NOT NULL COMMENT '计量单位',
  `material_type` tinyint NOT NULL DEFAULT '1' COMMENT '1原材料 2半成品 3成品 4辅料 5包材',
  `category_id` bigint unsigned DEFAULT NULL COMMENT '分类ID',
  `is_batch` tinyint NOT NULL DEFAULT '1' COMMENT '是否批次管理',
  `is_expire` tinyint NOT NULL DEFAULT '0' COMMENT '是否效期管理',
  `safe_stock` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '安全库存',
  `standard_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '标准成本',
  `shelf_life_days` int DEFAULT NULL COMMENT '保质期天数',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0禁用 1启用（route.ts 遗漏，测试与生产查询需要）',
  `remark` text COMMENT '备注',
  `legacy_source` varchar(30) DEFAULT NULL COMMENT '旧表来源: inv_material/bom_material/mdm_material',
  `legacy_id` bigint unsigned DEFAULT NULL COMMENT '旧表原始ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_code` (`material_code`),
  KEY `idx_material_type` (`material_type`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_legacy` (`legacy_source`,`legacy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4183 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准物料主档';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_outbound_batch_allocation`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_outbound_batch_allocation` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `source_type` varchar(30) NOT NULL COMMENT '来源类型: outbound_order/material_issue/outsource_issue',
  `source_id` bigint unsigned NOT NULL COMMENT '来源单据ID',
  `source_no` varchar(50) NOT NULL COMMENT '来源单据号',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `batch_id` bigint unsigned NOT NULL COMMENT '批次ID',
  `batch_no` varchar(50) NOT NULL COMMENT '批次号',
  `allocated_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '分配数量',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `fifo_mode` varchar(20) DEFAULT 'fifo_auto' COMMENT 'FIFO模式: fifo_auto/specified_batch/manual_override',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_source` (`source_type`,`source_id`),
  KEY `idx_source_no` (`source_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_fifo_mode` (`fifo_mode`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库批次分配明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_outbound_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_outbound_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '出库单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `batch_id` int unsigned DEFAULT NULL COMMENT '批次ID',
  `original_inbound_date` date DEFAULT NULL COMMENT '原始入库日期',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `material_spec` varchar(255) DEFAULT NULL COMMENT '规格型号',
  `quantity` decimal(18,4) NOT NULL COMMENT '出库数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `width` decimal(18,4) DEFAULT NULL COMMENT '需求宽度(mm)，长度类物料按此宽度做 FIFO 横切',
  `is_raw_material` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否原料出库',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_outbound_order_line` (`order_id`,`material_id`,`batch_no`,`deleted`),
  KEY `idx_order` (`order_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_outbound_item_order` (`order_id`,`deleted`),
  KEY `idx_outbound_item_deleted_time` (`deleted`,`create_time`),
  CONSTRAINT `fk_inv_outbound_item_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_outbound_item_order` FOREIGN KEY (`order_id`) REFERENCES `inv_outbound_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_outbound_item_order` FOREIGN KEY (`order_id`) REFERENCES `inv_outbound_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1056 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_outbound_item_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_outbound_item_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `order_id` bigint unsigned NOT NULL COMMENT '出库单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `batch_id` int unsigned DEFAULT NULL COMMENT '批次ID',
  `original_inbound_date` date DEFAULT NULL COMMENT '原始入库日期',
  `material_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料名称',
  `material_spec` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '规格型号',
  `quantity` decimal(18,4) NOT NULL COMMENT '出库数量',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `batch_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '批次号',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `width` decimal(18,4) DEFAULT NULL COMMENT '需求宽度(mm)，长度类物料按此宽度做 FIFO 横切',
  `is_raw_material` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否原料出库'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_outbound_order`
--

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
  `status_new` tinyint NOT NULL DEFAULT '1' COMMENT '状态(新)',
  `remark` text COMMENT '备注',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `audit_status` varchar(20) DEFAULT 'pending' COMMENT '审核状态',
  `audit_status_new` tinyint NOT NULL DEFAULT '0' COMMENT '审核状态(新)',
  `auditor_name` varchar(50) DEFAULT NULL COMMENT '审核人',
  `audit_time` datetime DEFAULT NULL COMMENT '审核时间',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `version` int DEFAULT '0' COMMENT '乐观锁版本号',
  `auditor_id` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `audit_remark` varchar(512) DEFAULT NULL COMMENT '审核备注',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单 sal_order.id',
  `customer_name` varchar(128) DEFAULT NULL COMMENT '客户名称',
  `sales_order_no` varchar(50) DEFAULT NULL COMMENT '销售单号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_outbound_order_status` (`status`,`deleted`),
  KEY `idx_sales_order` (`sales_order_id`),
  KEY `fk_inv_outbound_order_customer` (`customer_id`),
  KEY `idx_outbound_deleted_time` (`deleted`,`create_time`),
  CONSTRAINT `fk_inv_outbound_operator` FOREIGN KEY (`operator_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_outbound_order_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`),
  CONSTRAINT `fk_inv_outbound_order_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_outbound_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1287 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='出库单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_outbound_order_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_outbound_order_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '出库单号',
  `order_date` date DEFAULT NULL COMMENT '出库日期',
  `outbound_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'sale' COMMENT '出库类型: sale/transfer/production/other',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `warehouse_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '仓库编码',
  `warehouse_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '仓库名称',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CNY' COMMENT '币种',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'draft' COMMENT '状态: draft/pending/approved/completed/cancelled',
  `status_new` tinyint NOT NULL DEFAULT '1' COMMENT '状态(新)',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `operator_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '操作人',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `audit_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '审核状态',
  `audit_status_new` tinyint NOT NULL DEFAULT '0' COMMENT '审核状态(新)',
  `auditor_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '审核人',
  `audit_time` datetime DEFAULT NULL COMMENT '审核时间',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `version` int DEFAULT '0' COMMENT '乐观锁版本号',
  `auditor_id` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `audit_remark` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '审核备注',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单 sal_order.id',
  `customer_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `sales_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '销售单号'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_outbound_order_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_outbound_order_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '出库单号',
  `order_date` date DEFAULT NULL COMMENT '出库日期',
  `outbound_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'sale' COMMENT '出库类型: sale/transfer/production/other',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `warehouse_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '仓库编码',
  `warehouse_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '仓库名称',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CNY' COMMENT '币种',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'draft' COMMENT '状态: draft/pending/approved/completed/cancelled',
  `status_new` tinyint NOT NULL DEFAULT '1' COMMENT '状态(新)',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `operator_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '操作人',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `audit_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '审核状态',
  `audit_status_new` tinyint NOT NULL DEFAULT '0' COMMENT '审核状态(新)',
  `auditor_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '审核人',
  `audit_time` datetime DEFAULT NULL COMMENT '审核时间',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `version` int DEFAULT '0' COMMENT '乐观锁版本号',
  `auditor_id` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `audit_remark` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '审核备注',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单 sal_order.id',
  `customer_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `sales_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '销售单号'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_production_inbound`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_production_inbound` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inbound_no` varchar(50) NOT NULL COMMENT '入库单号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '工单号',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `inbound_date` date DEFAULT NULL COMMENT '入库日期',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人',
  `qc_status` varchar(20) DEFAULT 'pass' COMMENT '质检状态: pass/fail/pending',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待入库, 2-入库中, 3-已完成',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT 'operator_id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inbound_no` (`inbound_no`),
  KEY `idx_work_order_id` (`work_order_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  CONSTRAINT `fk_inv_prod_inbound_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_prod_inbound_workorder` FOREIGN KEY (`work_order_id`) REFERENCES `prod_work_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产入库单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_production_inbound_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_production_inbound_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inbound_id` bigint unsigned NOT NULL COMMENT '入库单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,3) NOT NULL COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `remaining_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'remaining_qty',
  `remark` varchar(100) DEFAULT NULL COMMENT 'remark',
  PRIMARY KEY (`id`),
  KEY `idx_inbound_id` (`inbound_id`),
  KEY `fk_inv_prod_inbound_item_material` (`material_id`),
  CONSTRAINT `fk_inv_prod_inbound_item_inbound` FOREIGN KEY (`inbound_id`) REFERENCES `inv_production_inbound` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_prod_inbound_item_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产入库单明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_sales_outbound`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_sales_outbound` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `outbound_no` varchar(50) NOT NULL COMMENT '出库单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '销售订单ID',
  `order_no` varchar(50) DEFAULT NULL COMMENT '销售订单号',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `outbound_date` date DEFAULT NULL COMMENT '出库日期',
  `delivery_person` varchar(50) DEFAULT NULL COMMENT '发货人',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待出库, 2-出库中, 3-已完成',
  `finance_posted` tinyint DEFAULT '0' COMMENT '财务过账: 0-未过账, 1-已过账',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_outbound_no` (`outbound_no`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `fk_inv_sales_outbound_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_sales_outbound_order` FOREIGN KEY (`order_id`) REFERENCES `sal_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_sales_outbound_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_sales_outbound_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_sales_outbound_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `outbound_id` bigint unsigned NOT NULL COMMENT '出库单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,3) NOT NULL COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `batch_inventory_id` bigint unsigned DEFAULT NULL COMMENT 'batch_inventory_id',
  `remark` varchar(100) DEFAULT NULL COMMENT 'remark',
  `batch_id` bigint unsigned DEFAULT NULL COMMENT 'batch_id',
  `original_inbound_date` datetime DEFAULT NULL COMMENT 'original_inbound_date',
  `location_id` bigint unsigned DEFAULT NULL COMMENT 'location_id',
  `qr_code` varchar(50) DEFAULT NULL COMMENT 'qr_code',
  PRIMARY KEY (`id`),
  KEY `idx_outbound_id` (`outbound_id`),
  KEY `fk_inv_sales_outbound_item_material` (`material_id`),
  CONSTRAINT `fk_inv_sales_outbound_item_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_sales_outbound_item_outbound` FOREIGN KEY (`outbound_id`) REFERENCES `inv_sales_outbound` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库单明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_scan_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_scan_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `scan_type` varchar(50) NOT NULL COMMENT '扫码类型: cutting-分切, process-流程卡, trace-追溯',
  `qr_content` varchar(500) DEFAULT NULL COMMENT '二维码内容',
  `qr_type` varchar(20) DEFAULT NULL COMMENT '二维码类型',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `workorder_no` varchar(50) DEFAULT NULL COMMENT '工单编号',
  `scan_result` varchar(20) DEFAULT NULL COMMENT '扫码结果',
  `result_message` varchar(500) DEFAULT NULL COMMENT '结果描述',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='扫码操作日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_stock_adjust`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_stock_adjust` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '调整单ID',
  `adjust_no` varchar(30) NOT NULL COMMENT '调整单号',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `adjust_date` date NOT NULL COMMENT '调整日期',
  `adjust_type` tinyint NOT NULL DEFAULT '1' COMMENT '调整类型: 1-盘盈, 2-盘亏, 3-其他',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `approver_id` bigint unsigned DEFAULT NULL COMMENT '审批人ID',
  `approver_name` varchar(50) DEFAULT NULL COMMENT '审批人姓名',
  `approve_time` datetime DEFAULT NULL COMMENT '审批时间',
  `status` tinyint DEFAULT '0' COMMENT '0-待审, 1-已审, 2-已驳回',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `version` int DEFAULT '0' COMMENT '乐观锁版本号',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_adjust_no` (`adjust_no`),
  KEY `idx_status` (`status`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_approver` (`approver_id`),
  CONSTRAINT `fk_inv_adjust_approver` FOREIGN KEY (`approver_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_adjust_operator` FOREIGN KEY (`operator_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_adjust_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存调整单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_stock_adjust_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_stock_adjust_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `adjust_id` bigint unsigned NOT NULL COMMENT '调整单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `batch_id` int unsigned DEFAULT NULL COMMENT '批次ID',
  `location_id` bigint unsigned DEFAULT NULL COMMENT '库位ID',
  `original_inbound_date` date DEFAULT NULL COMMENT '原始入库日期',
  `qr_code` varchar(100) DEFAULT NULL COMMENT '二维码',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码（冗余）',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称（冗余）',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `before_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '调整前数量',
  `adjust_qty` decimal(18,4) NOT NULL COMMENT '调整数量（正/负）',
  `after_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '调整后数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT '0.0000' COMMENT '单价',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '金额',
  `reason` varchar(255) DEFAULT NULL COMMENT '调整原因',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_adjust` (`adjust_id`),
  KEY `idx_material` (`material_id`),
  CONSTRAINT `fk_inv_adjust_item_adjust` FOREIGN KEY (`adjust_id`) REFERENCES `inv_stock_adjust` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_adjust_item_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存调整单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_stock_freeze`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_stock_freeze` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned DEFAULT NULL,
  `warehouse_id` bigint unsigned DEFAULT NULL,
  `freeze_quantity` decimal(18,4) DEFAULT '0.0000',
  `freeze_type` varchar(20) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `source_type` varchar(20) DEFAULT NULL,
  `source_id` bigint unsigned DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `release_time` datetime DEFAULT NULL,
  `release_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_stocktaking`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_stocktaking` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `taking_no` varchar(50) NOT NULL COMMENT '盘点单号',
  `taking_type` tinyint DEFAULT '1' COMMENT '盘点类型: 1-全盘, 2-部分盘',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待盘点, 2-盘点中, 3-待审批, 4-已审批, 9-已取消',
  `taking_date` date DEFAULT NULL COMMENT '盘点日期',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员姓名',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `approver_id` bigint unsigned DEFAULT NULL COMMENT '审批人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `total_items` int NOT NULL DEFAULT '0' COMMENT '盘点项数（建单时回填，列表也可子查询计算）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_taking_no` (`taking_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_operator_id` (`operator_id`),
  KEY `idx_taking_date` (`taking_date`),
  KEY `idx_stocktaking_deleted_time` (`deleted`,`create_time`),
  CONSTRAINT `fk_inv_stocktaking_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=595 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='盘点单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_stocktaking_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_stocktaking_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `taking_id` bigint unsigned NOT NULL COMMENT '盘点单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `system_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '系统数量',
  `actual_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '实盘数量',
  `diff_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '差异数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `difference` decimal(18,4) DEFAULT '0.0000',
  `diff_status` varchar(20) DEFAULT 'pending',
  `check_by` bigint unsigned DEFAULT NULL,
  `diff_approver` bigint unsigned DEFAULT NULL,
  `diff_reason` varchar(255) DEFAULT NULL,
  `diff_approve_time` datetime DEFAULT NULL,
  `process_time` datetime DEFAULT NULL,
  `qr_code` varchar(100) DEFAULT NULL COMMENT '物料/批次二维码',
  `batch_id` int unsigned DEFAULT NULL COMMENT '批次ID→inv_inventory_batch.id',
  `location_id` bigint unsigned DEFAULT NULL COMMENT '库位ID→inv_location.id',
  `original_inbound_date` date DEFAULT NULL COMMENT '原始入库日期',
  `split_flag` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否拆批子件',
  `parent_qr_code` varchar(100) DEFAULT NULL COMMENT '拆批父件二维码',
  PRIMARY KEY (`id`),
  KEY `idx_taking` (`taking_id`),
  KEY `idx_material` (`material_id`),
  CONSTRAINT `fk_inv_stocktaking_item_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stocktaking_item_taking` FOREIGN KEY (`taking_id`) REFERENCES `inv_stocktaking` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=664 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='盘点单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_trace_detail`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='追溯明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_trace_record`
--

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
  `trace_type` varchar(20) DEFAULT 'production',
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
  KEY `idx_deleted` (`deleted`),
  KEY `idx_trace_record_deleted_time` (`deleted`,`create_time`),
  KEY `idx_trace_record_trace_time` (`trace_time`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='追溯记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_transfer_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_transfer_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `transfer_id` bigint unsigned NOT NULL COMMENT '调拨单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `batch_id` int unsigned DEFAULT NULL COMMENT '批次ID',
  `original_inbound_date` date DEFAULT NULL COMMENT '原始入库日期',
  `location_id` bigint unsigned DEFAULT NULL COMMENT '库位ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码（冗余）',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称（冗余）',
  `qr_code` varchar(50) DEFAULT NULL COMMENT '二维码',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `quantity` decimal(18,4) NOT NULL COMMENT '申请数量',
  `out_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '实际出库数量',
  `in_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '实际入库数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT '0.0000' COMMENT '单价',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '金额',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_transfer` (`transfer_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_no`),
  CONSTRAINT `fk_inv_transfer_item_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transfer_item_order` FOREIGN KEY (`transfer_id`) REFERENCES `inv_transfer_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='调拨单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_transfer_order`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_transfer_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '调拨单ID',
  `transfer_no` varchar(30) NOT NULL COMMENT '调拨单号',
  `type` tinyint NOT NULL COMMENT '1-库位调拨, 2-仓库调拨',
  `from_warehouse_id` bigint unsigned NOT NULL COMMENT '源仓库ID',
  `to_warehouse_id` bigint unsigned NOT NULL COMMENT '目标仓库ID',
  `from_location` varchar(50) DEFAULT NULL COMMENT '源库位',
  `to_location` varchar(50) DEFAULT NULL COMMENT '目标库位',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0-草稿, 1-待审批, 2-已出库, 3-已入库, 4-已取消',
  `applicant_id` bigint unsigned DEFAULT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) DEFAULT NULL COMMENT '申请人姓名',
  `approver_id` bigint unsigned DEFAULT NULL COMMENT '审批人ID',
  `approver_name` varchar(50) DEFAULT NULL COMMENT '审批人姓名',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `out_time` datetime DEFAULT NULL COMMENT '出库时间',
  `in_time` datetime DEFAULT NULL COMMENT '入库时间',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `version` int DEFAULT '0' COMMENT '乐观锁版本号',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transfer_no` (`transfer_no`),
  KEY `idx_status` (`status`),
  KEY `idx_from_warehouse` (`from_warehouse_id`),
  KEY `idx_to_warehouse` (`to_warehouse_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_applicant` (`applicant_id`),
  KEY `idx_approver` (`approver_id`),
  CONSTRAINT `fk_inv_transfer_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_transfer_approver` FOREIGN KEY (`approver_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_transfer_from_wh` FOREIGN KEY (`from_warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_transfer_operator` FOREIGN KEY (`operator_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inv_transfer_to_wh` FOREIGN KEY (`to_warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='调拨单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_unit_conversion`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_unit_conversion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '换算ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `from_unit` varchar(20) NOT NULL COMMENT '源单位',
  `to_unit` varchar(20) NOT NULL COMMENT '目标单位',
  `ratio` decimal(18,4) NOT NULL COMMENT '换算比率: from_unit * ratio = to_unit',
  `is_default` tinyint DEFAULT '0' COMMENT '是否默认换算: 0-否, 1-是',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_units` (`material_id`,`from_unit`,`to_unit`),
  KEY `idx_material` (`material_id`),
  CONSTRAINT `fk_inv_unit_conv_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='单位换算表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_warehouse`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_warehouse` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_code` varchar(50) NOT NULL COMMENT '仓库编码',
  `warehouse_name` varchar(100) NOT NULL COMMENT '仓库名称',
  `warehouse_type` tinyint DEFAULT NULL COMMENT '仓库类型: 1-原材料仓, 2-半成品仓, 3-成品仓, 4-辅料仓',
  `category_id` bigint unsigned DEFAULT NULL,
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `address` varchar(255) DEFAULT NULL COMMENT '详细地址',
  `manager_id` bigint unsigned DEFAULT NULL COMMENT '仓库负责人ID',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `nature` varchar(50) DEFAULT '' COMMENT '仓库性质(自有/租赁/外协)',
  `include_in_calculation` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否计入核算 1是 0否',
  `capacity` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '仓库容量',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_warehouse_code` (`warehouse_code`),
  KEY `idx_warehouse_status` (`status`,`deleted`),
  KEY `idx_manager` (`manager_id`),
  KEY `idx_warehouse_category_id` (`category_id`),
  CONSTRAINT `fk_warehouse_manager` FOREIGN KEY (`manager_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=568 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='仓库表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inv_warehouse_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inv_warehouse_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `operation_type` varchar(30) NOT NULL COMMENT 'create-创建, update-更新, delete-删除, freeze-冻结, unfreeze-解冻',
  `operation_content` text COMMENT '操作内容（JSON 或文本）',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_operator` (`operator_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='仓库操作日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `label_template`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `label_template` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '模板名称',
  `scenario` varchar(30) NOT NULL COMMENT '使用场景',
  `html_template` text NOT NULL COMMENT 'HTML模板内容',
  `width_mm` int DEFAULT '60' COMMENT '标签宽度(mm)',
  `height_mm` int DEFAULT '40' COMMENT '标签高度(mm)',
  `qr_size_mm` int DEFAULT '20' COMMENT '二维码尺寸(mm)',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-启用, 0-停用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scenario` (`scenario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标签模板表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `link_order_po`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `link_order_po` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id` int unsigned NOT NULL COMMENT '业务订单ID',
  `order_line_id` int unsigned NOT NULL COMMENT '业务订单行ID',
  `po_id` bigint unsigned NOT NULL COMMENT '采购订单ID',
  `po_line_id` bigint unsigned NOT NULL COMMENT '采购订单行ID',
  `link_type` enum('DIRECT','MERGE','SPLIT') DEFAULT 'DIRECT' COMMENT '关联类型',
  `link_qty` decimal(14,3) NOT NULL DEFAULT '0.000' COMMENT '关联数量',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_link` (`order_line_id`,`po_line_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_po` (`po_id`),
  CONSTRAINT `link_order_po_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `biz_order_header` (`id`) ON DELETE CASCADE,
  CONSTRAINT `link_order_po_ibfk_2` FOREIGN KEY (`po_id`) REFERENCES `pur_purchase_order` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='业务订单与PO关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_batch_costs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_batch_costs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '成本ID',
  `qr_code` varchar(50) NOT NULL COMMENT '小料二维码编码',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `quantity` decimal(18,4) NOT NULL COMMENT '数量',
  `unit_cost` decimal(18,4) NOT NULL COMMENT '单位成本',
  `total_cost` decimal(18,4) NOT NULL COMMENT '总成本',
  `used_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '已使用数量',
  `remaining_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '剩余数量',
  `split_flag` tinyint DEFAULT '1' COMMENT '拆分标记：0-整料，1-小料，2-余料',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_qr_code` (`qr_code`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_mat_batch_cost_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_mat_batch_cost_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='小料批次成本表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_requisition_items`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_requisition_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `requisition_id` bigint unsigned NOT NULL COMMENT '领料单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `planned_quantity` decimal(18,4) NOT NULL COMMENT '计划数量（BOM计算）',
  `actual_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '实际领用数量',
  `issued_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '已出库数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `qr_code` varchar(50) DEFAULT NULL COMMENT '小料二维码',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `warehouse_location` varchar(50) DEFAULT NULL COMMENT '库位',
  `fifo_recommended` tinyint DEFAULT '0' COMMENT '是否为FIFO推荐批次：0-否，1-是',
  `split_flag` tinyint DEFAULT '1' COMMENT '拆分标记：0-整料，1-小料，2-余料',
  `unit_cost` decimal(18,4) DEFAULT NULL COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT NULL COMMENT '总成本',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_requisition` (`requisition_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_qr_code` (`qr_code`),
  CONSTRAINT `fk_mat_req_item_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_req_items_requisition` FOREIGN KEY (`requisition_id`) REFERENCES `material_requisitions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='领料单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_requisitions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_requisitions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '领料单ID',
  `requisition_no` varchar(50) NOT NULL COMMENT '领料单编号，格式：MR+YYYYMMDD+4位序号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联工单ID',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '工单编号',
  `type` varchar(20) NOT NULL COMMENT '类型：normal-正常领料, over-超领, supplementary-补料',
  `status` tinyint DEFAULT '0' COMMENT '状态：0=待审批，1=待出库，2=已出库，3=已取消',
  `applicant_id` bigint unsigned DEFAULT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) DEFAULT NULL COMMENT '申请人姓名',
  `approver_id` bigint unsigned DEFAULT NULL COMMENT '审批人ID',
  `approver_name` varchar(50) DEFAULT NULL COMMENT '审批人姓名',
  `approve_time` datetime DEFAULT NULL COMMENT '审批时间',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '领料总数量',
  `issued_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '已出库数量',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `original_requisition_id` bigint unsigned DEFAULT NULL COMMENT '原领料单ID（补料时关联）',
  `reason` varchar(255) DEFAULT NULL COMMENT '超领/补料原因',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` text COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_requisition_no` (`requisition_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_applicant` (`applicant_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_approver` (`approver_id`),
  KEY `idx_original_requisition` (`original_requisition_id`),
  CONSTRAINT `fk_mat_req_original` FOREIGN KEY (`original_requisition_id`) REFERENCES `material_requisitions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_mat_req_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_mat_req_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `prod_work_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='领料单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_return_items`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_return_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `return_id` bigint unsigned NOT NULL COMMENT '退料单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,4) NOT NULL COMMENT '退料数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `qr_code` varchar(50) DEFAULT NULL COMMENT '小料二维码',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `reason` varchar(255) DEFAULT NULL COMMENT '退料原因',
  `unit_cost` decimal(18,4) DEFAULT NULL COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT NULL COMMENT '总成本',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_return` (`return_id`),
  KEY `idx_material` (`material_id`),
  CONSTRAINT `fk_mat_ret_item_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ret_items_return` FOREIGN KEY (`return_id`) REFERENCES `material_returns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退料单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_returns`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_returns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '退料单ID',
  `return_no` varchar(50) NOT NULL COMMENT '退料单编号，格式：RT+YYYYMMDD+4位序号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联工单ID',
  `requisition_id` bigint unsigned DEFAULT NULL COMMENT '关联领料单ID',
  `status` tinyint DEFAULT '0' COMMENT '状态：0=待确认，1=已入库，2=已取消',
  `applicant_id` bigint unsigned DEFAULT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) DEFAULT NULL COMMENT '申请人姓名',
  `confirm_id` bigint unsigned DEFAULT NULL COMMENT '确认人ID',
  `confirm_name` varchar(50) DEFAULT NULL COMMENT '确认人姓名',
  `confirm_time` datetime DEFAULT NULL COMMENT '确认时间',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '退料总数量',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` text COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_requisition` (`requisition_id`),
  KEY `idx_status` (`status`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_applicant` (`applicant_id`),
  KEY `idx_confirm` (`confirm_id`),
  CONSTRAINT `fk_mat_ret_requisition` FOREIGN KEY (`requisition_id`) REFERENCES `material_requisitions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_mat_ret_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_mat_ret_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `prod_work_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退料单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mdm_product`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mdm_product` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned DEFAULT NULL COMMENT '对应 inv_material.id（产品域↔物料域显式对位，② 主数据打通；NULL=待人工确认）',
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
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_code` (`product_code`),
  KEY `idx_category` (`category_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_mdm_product_material_id` (`material_id`),
  CONSTRAINT `fk_mdm_product_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品主数据表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mdm_product_bak_20260923_material_bridge`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mdm_product_bak_20260923_material_bridge` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
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
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mdm_product_bom`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mdm_product_bom` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `product_id` int unsigned NOT NULL COMMENT '产品ID',
  `version` varchar(20) DEFAULT 'V1.0' COMMENT 'BOM版本',
  `material_id` int unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `specification` varchar(200) DEFAULT NULL COMMENT '规格',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `quantity` decimal(12,3) DEFAULT '1.000' COMMENT '用量',
  `loss_rate` decimal(5,2) DEFAULT '0.00' COMMENT '损耗率(%)',
  `sort_order` int DEFAULT '0' COMMENT '排序号',
  `remark` text COMMENT '备注',
  `is_key_material` tinyint(1) DEFAULT '0' COMMENT '是否关键物料',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_version` (`version`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='产品BOM表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mdm_product_category`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mdm_product_category` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category_code` varchar(50) NOT NULL COMMENT '分类编码',
  `category_name` varchar(100) NOT NULL COMMENT '分类名称',
  `parent_id` int unsigned DEFAULT '0' COMMENT '父分类ID',
  `level` tinyint unsigned DEFAULT '1' COMMENT '层级',
  `sort_order` int DEFAULT '0' COMMENT '排序号',
  `description` text COMMENT '分类描述',
  `status` tinyint(1) DEFAULT '1' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`category_code`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='产品分类表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mdm_product_route`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mdm_product_route` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `product_id` int unsigned NOT NULL COMMENT '产品ID',
  `route_version` varchar(20) DEFAULT 'V1.0' COMMENT '工艺版本',
  `process_seq` int unsigned NOT NULL COMMENT '工序序号',
  `process_code` varchar(50) NOT NULL COMMENT '工序编码',
  `process_name` varchar(100) NOT NULL COMMENT '工序名称',
  `work_center_id` int unsigned DEFAULT NULL COMMENT '工作中心ID',
  `work_center_name` varchar(100) DEFAULT NULL COMMENT '工作中心名称',
  `standard_time` decimal(10,2) DEFAULT '0.00' COMMENT '标准工时(分钟)',
  `setup_time` decimal(10,2) DEFAULT '0.00' COMMENT '准备时间(分钟)',
  `description` text COMMENT '工序说明',
  `is_key_process` tinyint(1) DEFAULT '0' COMMENT '是否关键工序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_version` (`route_version`),
  KEY `idx_process_seq` (`process_seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='产品工艺路线表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_status_history`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_type` enum('BIZ','PR','PO','GRN') NOT NULL COMMENT '订单类型',
  `order_id` int unsigned NOT NULL COMMENT '订单ID',
  `order_no` varchar(50) NOT NULL COMMENT '订单号',
  `old_status` varchar(50) NOT NULL COMMENT '原状态',
  `new_status` varchar(50) NOT NULL COMMENT '新状态',
  `change_reason` varchar(200) DEFAULT NULL COMMENT '变更原因',
  `trigger_by` varchar(50) DEFAULT NULL COMMENT '触发来源',
  `operator_id` int unsigned DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(100) DEFAULT NULL COMMENT '操作人',
  `operate_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_type`,`order_id`),
  KEY `idx_operate_time` (`operate_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='状态变更历史表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_tolerance_config`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_tolerance_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `material_id` int unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `order_type` varchar(20) DEFAULT 'PURCHASE' COMMENT '订单类型',
  `over_delivery_tolerance` decimal(5,2) DEFAULT '5.00' COMMENT '超交容差%',
  `under_delivery_tolerance` decimal(5,2) DEFAULT '5.00' COMMENT '短交容差%',
  `price_tolerance` decimal(5,2) DEFAULT '2.00' COMMENT '价格容差%',
  `action_on_exceed` enum('BLOCK','WARNING','APPROVAL') DEFAULT 'WARNING' COMMENT '超额处理',
  `is_default` tinyint(1) DEFAULT '0' COMMENT '是否默认配置',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config` (`material_id`,`order_type`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='容差配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_factory`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_factory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `legal_entity_id` bigint unsigned NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_person` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_legal_entity_id` (`legal_entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_group`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_group` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_legal_entity`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_legal_entity` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_id` bigint unsigned NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `legal_person` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_position`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_position` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `team_id` bigint unsigned DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_level` int DEFAULT '1',
  `base_salary_range` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_team_id` (`team_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_team`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_team` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `workshop_id` bigint unsigned NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_leader` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_workshop_id` (`workshop_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `org_workshop`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_workshop` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `factory_id` bigint unsigned NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_factory_id` (`factory_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outsource_issue`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外发料表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outsource_issue_item`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外发料明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outsource_order`
--

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
  `issued_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已发数量',
  `received_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已收数量',
  `qualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '合格数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '单位',
  `unit_price` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `total_amount` decimal(12,2) DEFAULT '0.00' COMMENT '总金额',
  `settled_amount` decimal(18,2) DEFAULT '0.00' COMMENT '已结算金额',
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

--
-- Table structure for table `outsource_receive`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外收货表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outsource_settlement`
--

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
  `payment_date` datetime DEFAULT NULL COMMENT 'payment_date',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_settlement_no` (`settlement_no`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外结算表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plm_eco`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plm_eco` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `eco_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eco_title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  `eco_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_name',
  `old_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'old_version',
  `new_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'new_version',
  `change_reason` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'change_reason',
  `change_content` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'change_content',
  `impact_analysis` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'impact_analysis',
  `applicant` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'applicant',
  `apply_time` datetime DEFAULT NULL COMMENT 'apply_time',
  `approver` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'approver',
  `approve_time` datetime DEFAULT NULL COMMENT 'approve_time',
  `remark` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'remark',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plm_lifecycle`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plm_lifecycle` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lifecycle_phase` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phase_description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plm_product_lifecycle`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plm_product_lifecycle` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lifecycle_stage` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stage_status` tinyint DEFAULT '1',
  `version` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'V1.0',
  `change_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_desc` text COLLATE utf8mb4_unicode_ci,
  `effective_date` date DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `approver` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'approver',
  `approve_time` datetime DEFAULT NULL COMMENT 'approve_time',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_bom`
--

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
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_bom_detail`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_bom_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bom_id` bigint unsigned NOT NULL COMMENT 'BOM ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `loss_rate` decimal(18,4) DEFAULT '0.0000' COMMENT '损耗率(%)',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `item_type` tinyint DEFAULT '1' COMMENT '物料类型: 1-原材料, 2-半成品, 3-辅料',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bom` (`bom_id`),
  KEY `idx_material` (`material_id`),
  CONSTRAINT `fk_bom_detail_bom` FOREIGN KEY (`bom_id`) REFERENCES `prd_bom` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_prd_bom_detail_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_bom_line_std`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_bom_line_std` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'BOM行ID',
  `bom_id` bigint unsigned NOT NULL COMMENT 'BOM头ID',
  `line_no` int NOT NULL DEFAULT '1' COMMENT '行号',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `consumption_qty` decimal(18,4) NOT NULL COMMENT '单耗',
  `waste_rate` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '损耗率%',
  `material_type` tinyint DEFAULT '1' COMMENT '1原材料 2半成品 3辅料 4包材 5其他',
  `remark` varchar(200) DEFAULT NULL COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  KEY `idx_bom_id` (`bom_id`),
  KEY `idx_material_id` (`material_id`),
  CONSTRAINT `fk_bom_line_std_bom` FOREIGN KEY (`bom_id`) REFERENCES `prd_bom_std` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=564 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准BOM行';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_bom_std`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_bom_std` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'BOM ID',
  `bom_code` varchar(50) NOT NULL COMMENT 'BOM编码',
  `product_id` bigint unsigned NOT NULL COMMENT '成品ID',
  `product_name` varchar(100) DEFAULT NULL COMMENT '成品名称',
  `version` varchar(20) NOT NULL DEFAULT 'V1.0' COMMENT '版本',
  `effective_date` date NOT NULL COMMENT '生效日期',
  `obsolete_date` date DEFAULT NULL COMMENT '失效日期',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0草稿 1生效 2作废',
  `remark` text COMMENT '备注',
  `legacy_source` varchar(30) DEFAULT NULL COMMENT '旧表来源',
  `legacy_id` bigint unsigned DEFAULT NULL COMMENT '旧表原始ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bom_code` (`bom_code`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_status` (`status`),
  KEY `idx_effective_date` (`effective_date`),
  KEY `idx_legacy` (`legacy_source`,`legacy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准BOM头';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_die`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_die_maintenance`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_die_maintenance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `maintenance_no` varchar(50) NOT NULL COMMENT '保养单号',
  `die_id` bigint unsigned DEFAULT NULL COMMENT '刀模/网版ID',
  `maintenance_type` varchar(30) DEFAULT NULL COMMENT '保养类型 routine/grinding',
  `impressions_before` bigint DEFAULT '0' COMMENT '保养前印次',
  `impressions_after` bigint DEFAULT '0' COMMENT '保养后印次',
  `maintenance_date` date DEFAULT NULL COMMENT '保养日期',
  `cost` decimal(14,2) DEFAULT '0.00' COMMENT '保养费用',
  `technician_name` varchar(50) DEFAULT NULL COMMENT '技师',
  `status` tinyint DEFAULT '0' COMMENT '状态',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  `die_code` varchar(50) DEFAULT NULL COMMENT 'die_code',
  `next_maintenance_date` datetime DEFAULT NULL COMMENT 'next_maintenance_date',
  `technician_id` bigint unsigned DEFAULT NULL COMMENT 'technician_id',
  PRIMARY KEY (`id`),
  KEY `idx_die_id` (`die_id`),
  KEY `idx_maintenance_no` (`maintenance_no`),
  CONSTRAINT `fk_die_maint_template` FOREIGN KEY (`die_id`) REFERENCES `prd_die_template` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='刀模/网版保养记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_die_template`
--

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
  `category` varchar(64) DEFAULT NULL COMMENT '模板分类',
  `tags` json DEFAULT NULL COMMENT '标签列表',
  `purchase_date` date DEFAULT NULL COMMENT '购入日期',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `unit_price` decimal(12,2) DEFAULT '0.00' COMMENT '单价',
  `qr_code` varchar(100) DEFAULT NULL COMMENT '二维码',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  `factory_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`),
  UNIQUE KEY `uk_factory_die_no` (`factory_id`,`template_code`),
  KEY `idx_type` (`template_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='刀模板/网版管理表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_die_usage_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_die_usage_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `die_id` bigint unsigned DEFAULT NULL COMMENT '刀模/网版ID',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '工单号',
  `process_name` varchar(50) DEFAULT NULL COMMENT '工序',
  `impressions` bigint DEFAULT '0' COMMENT '印次',
  `cumulative_after` bigint DEFAULT '0' COMMENT '累计印次',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作员',
  `usage_date` date DEFAULT NULL COMMENT '使用日期',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  `die_code` varchar(50) DEFAULT NULL COMMENT 'die_code',
  `work_report_id` bigint unsigned DEFAULT NULL COMMENT 'work_report_id',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT 'operator_id',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT 'equipment_id',
  `remark` varchar(100) DEFAULT NULL COMMENT 'remark',
  PRIMARY KEY (`id`),
  KEY `idx_die_id` (`die_id`),
  KEY `idx_work_order_id` (`work_order_id`),
  CONSTRAINT `fk_die_usage_template` FOREIGN KEY (`die_id`) REFERENCES `prd_die_template` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='刀模/网版使用记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_finish_order`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_finish_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `finish_no` varchar(50) NOT NULL COMMENT '完工单号',
  `work_order_id` bigint unsigned NOT NULL COMMENT '关联工单ID',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '入库仓库ID',
  `qualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '合格数量',
  `defective_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '不合格数量',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-草稿 2-已审核 3-已作废',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_finish_no` (`finish_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=118 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='完工入库单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_finish_order_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_finish_order_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `finish_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '完工单号',
  `work_order_id` bigint unsigned NOT NULL COMMENT '关联工单ID',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '入库仓库ID',
  `qualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '合格数量',
  `defective_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '不合格数量',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-草稿 2-已审核 3-已作废',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_ink`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_ink_bak_20260924_ink`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_ink_bak_20260924_ink` (
  `id` int NOT NULL DEFAULT '0',
  `ink_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ink_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ink_type` int DEFAULT NULL,
  `color_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `color_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'kg',
  `specification` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `safety_stock` decimal(10,2) DEFAULT '0.00',
  `shelf_life` int DEFAULT NULL,
  `stock_qty` decimal(10,2) DEFAULT '0.00',
  `status` int DEFAULT '1',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `deleted` tinyint NOT NULL DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_material_issue`
--

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
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_issue_no` (`issue_no`),
  KEY `fk_prd_material_issue_work_order` (`work_order_id`),
  KEY `idx_material_issue_deleted_time` (`deleted`,`create_time`),
  CONSTRAINT `fk_prd_material_issue_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `prod_work_order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=660 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产领料单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_material_issue_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_material_issue_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `issue_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '领料单号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `issue_date` date DEFAULT NULL COMMENT '领料日期',
  `issue_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '领料类型',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `status` tinyint DEFAULT '1' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_material_issue_item`
--

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
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `original_inbound_date` date DEFAULT NULL COMMENT '原始入库日期',
  PRIMARY KEY (`id`),
  KEY `idx_material_issue_item_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=597 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='领料明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_material_return`
--

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
  `operator_id` bigint unsigned DEFAULT NULL COMMENT 'operator_id',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `return_reason` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'return_reason',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产退料单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_material_return_item`
--

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
  `remark` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'remark',
  `create_time` datetime DEFAULT NULL COMMENT 'create_time',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退料明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_pick_order`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_pick_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pick_no` varchar(50) NOT NULL COMMENT '领料单号',
  `work_order_id` bigint unsigned NOT NULL COMMENT '关联工单ID',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `picker_name` varchar(100) DEFAULT NULL COMMENT '领料人',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-草稿 2-已审核 3-已作废',
  `remark` text COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pick_no` (`pick_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产领料单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_pick_order_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_pick_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pick_order_id` bigint unsigned NOT NULL COMMENT '关联领料单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `material_spec` varchar(200) DEFAULT NULL COMMENT '物料规格',
  `required_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '需求数量',
  `actual_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '实领数量',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `line_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '行金额',
  `unit` varchar(20) DEFAULT 'pcs' COMMENT '单位',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pick_order` (`pick_order_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产领料单明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_process_card`
--

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
  `factory_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_card_no` (`card_no`),
  UNIQUE KEY `uk_factory_card_no` (`factory_id`,`card_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_main_label` (`main_label_id`),
  KEY `idx_prd_process_card_main_label` (`main_label_id`),
  CONSTRAINT `fk_process_card_main_label` FOREIGN KEY (`main_label_id`) REFERENCES `inv_material_label` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产流程卡表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_process_card_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_process_card_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `card_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '流程卡卡号',
  `qr_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '二维码内容',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工单号',
  `product_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '成品料号',
  `product_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '成品品名',
  `material_spec` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '材料规格',
  `work_order_date` date DEFAULT NULL COMMENT '工单日期',
  `plan_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '计划生产数量',
  `main_label_id` bigint unsigned DEFAULT NULL COMMENT '主材标签ID',
  `main_label_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '主材标签编号',
  `burdening_status` tinyint DEFAULT '0' COMMENT '配料状态: 0-未配料, 1-已配料',
  `lock_status` tinyint DEFAULT '0' COMMENT '锁住状态: 0-未锁, 1-已锁',
  `create_user_id` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_user_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '创建人名称',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `factory_id` bigint unsigned DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_process_card_material`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='流程卡物料关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_process_route`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工艺路线表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_process_route_step`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工艺路线工序表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_product_label`
--

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
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1待打印 2已打印 3已贴标',
  `print_count` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'print_count',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `print_time` datetime DEFAULT NULL COMMENT 'print_time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_label_no` (`label_no`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品标签表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_return_order`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_return_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `return_no` varchar(50) NOT NULL COMMENT '退料单号',
  `work_order_id` bigint unsigned NOT NULL COMMENT '关联工单ID',
  `pick_order_id` bigint unsigned DEFAULT NULL COMMENT '原领料单ID',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '退料仓库ID',
  `return_reason` varchar(500) DEFAULT NULL COMMENT '退料原因',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-草稿 2-已审核 3-已作废',
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_pick_order` (`pick_order_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产退料单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_return_order_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_return_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `return_order_id` bigint unsigned NOT NULL COMMENT '关联退料单ID',
  `pick_order_item_id` bigint unsigned DEFAULT NULL COMMENT '原领料明细ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '退料数量',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `line_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '行金额',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_return_order` (`return_order_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产退料单明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_schedule`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_schedule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '排程ID',
  `schedule_no` varchar(50) NOT NULL COMMENT '排产单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '销售订单ID',
  `order_no` varchar(50) DEFAULT NULL COMMENT '销售订单号',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '生产工单ID',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '生产工单号',
  `product_id` bigint unsigned DEFAULT NULL COMMENT '产品ID',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品编码',
  `product_name` varchar(100) NOT NULL COMMENT '产品名称',
  `workshop` varchar(50) NOT NULL COMMENT '车间: die_cut, trademark, printing, packaging',
  `planned_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '计划数量',
  `completed_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已完成数量',
  `planned_start` datetime DEFAULT NULL COMMENT '计划开始时间',
  `planned_end` datetime DEFAULT NULL COMMENT '计划结束时间',
  `actual_start` datetime DEFAULT NULL COMMENT '实际开始时间',
  `actual_end` datetime DEFAULT NULL COMMENT '实际结束时间',
  `priority` tinyint DEFAULT '2' COMMENT '优先级: 1-紧急, 2-正常, 3-低',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待排产, 2-已排产, 3-生产中, 4-已完成, 5-已取消',
  `scheduler` varchar(50) DEFAULT NULL COMMENT '排产人',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_schedule_no` (`schedule_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_workshop` (`workshop`),
  KEY `idx_status` (`status`),
  KEY `idx_planned_start` (`planned_start`),
  KEY `idx_order` (`order_id`),
  KEY `idx_schedule_work_order` (`work_order_id`),
  KEY `idx_schedule_planned_start` (`planned_start`),
  CONSTRAINT `fk_prd_schedule_product` FOREIGN KEY (`product_id`) REFERENCES `inv_material` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_prd_schedule_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `prod_work_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产排程主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_schedule_detail`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_schedule_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `schedule_id` bigint unsigned NOT NULL COMMENT '排程ID',
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `color_seq_no` int NOT NULL COMMENT '色序号',
  `color_name` varchar(50) DEFAULT NULL COMMENT '颜色名称',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
  `equipment_name` varchar(100) DEFAULT NULL COMMENT '设备名称',
  `planned_start` datetime DEFAULT NULL COMMENT '计划开始时间',
  `planned_end` datetime DEFAULT NULL COMMENT '计划结束时间',
  `actual_start` datetime DEFAULT NULL COMMENT '实际开始时间',
  `actual_end` datetime DEFAULT NULL COMMENT '实际结束时间',
  `duration_hours` decimal(18,4) DEFAULT NULL COMMENT '预计耗时（小时）',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待排, 2-已排, 3-生产中, 4-已完成',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_seq` (`work_order_id`,`color_seq_no`),
  KEY `idx_schedule` (`schedule_id`),
  KEY `idx_equipment` (`equipment_id`),
  KEY `idx_status` (`status`),
  KEY `idx_detail_schedule` (`schedule_id`),
  KEY `idx_detail_work_order` (`work_order_id`),
  CONSTRAINT `fk_prd_schedule_detail_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `eqp_equipment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_prd_schedule_detail_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `prod_work_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_schedule_detail_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `prd_schedule` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='排程明细表（色序级）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_screen_plate`
--

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
  `mesh_material` varchar(30) DEFAULT NULL COMMENT '丝网材质',
  `size` varchar(50) DEFAULT NULL COMMENT '网版尺寸',
  `tension_value` decimal(6,2) DEFAULT NULL COMMENT '张力值(N/cm)',
  `tension_date` datetime DEFAULT NULL COMMENT '最后测张力时间',
  `life_count` int unsigned DEFAULT '0' COMMENT '已印刷次数',
  `max_life_count` int unsigned DEFAULT '800' COMMENT '最大寿命',
  `reclaim_count` int unsigned DEFAULT '0' COMMENT '已再生次数',
  `exposure_date` datetime DEFAULT NULL COMMENT '曝光日期',
  `last_used_date` datetime DEFAULT NULL COMMENT '最后使用日期',
  `last_clean_date` datetime DEFAULT NULL COMMENT '最后清洗日期',
  `last_reclaim_date` datetime DEFAULT NULL COMMENT '最后再生日期',
  `scrap_reason` varchar(200) DEFAULT NULL COMMENT '报废原因',
  `frame_type` varchar(30) DEFAULT NULL COMMENT '框类型',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plate_code` (`plate_code`),
  KEY `idx_screen_plate_code` (`plate_code`),
  KEY `idx_screen_plate_status` (`status`,`deleted`),
  KEY `idx_prd_screen_plate_customer_id` (`customer_id`),
  KEY `idx_prd_screen_plate_plate_code` (`plate_code`),
  CONSTRAINT `fk_screen_plate_customer` FOREIGN KEY (`customer_id`) REFERENCES `mdm_customer` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_standard_card`
--

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
  `template_category` varchar(64) DEFAULT NULL COMMENT '模板分类',
  `tags` json DEFAULT NULL COMMENT '标签列表',
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
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `reviewer_id` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '关联物料ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_card_no` (`card_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_standard_card_customer` (`customer_id`),
  KEY `idx_standard_card_status` (`status`),
  KEY `idx_creator` (`create_by`),
  KEY `idx_reviewer` (`reviewer_id`),
  KEY `idx_std_card_material` (`material_id`),
  CONSTRAINT `fk_prd_std_card_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准卡表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_standard_card_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_standard_card_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '标准卡ID',
  `card_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '标准卡编号',
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'process',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `customer_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户代码',
  `product_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '产品名称',
  `version` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '版本',
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `create_user` int DEFAULT NULL,
  `audit_user` int DEFAULT NULL,
  `date` date DEFAULT NULL COMMENT '日期',
  `document_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '文件编号',
  `finished_size` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '成品尺寸',
  `tolerance` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '公差',
  `material_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '材料名称',
  `material_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '材料类型',
  `mold_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '' COMMENT '模号/种类',
  `layout_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '排版方式',
  `spacing` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '间距',
  `spacing_value` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '间距值',
  `sheet_width` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '片材宽',
  `sheet_length` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '片材长',
  `core_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '纸芯类型',
  `paper_direction` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '纸向',
  `roll_width` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '料宽',
  `paper_edge` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '纸边',
  `standard_usage` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '标准用量',
  `jump_distance` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '跳距',
  `process_flow1` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工艺流程1',
  `process_flow2` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工艺流程2',
  `print_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '表面处理',
  `first_jump_distance` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '第一跳距',
  `sequences` json DEFAULT NULL COMMENT '印序数据',
  `film_manufacturer` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '膜厂商',
  `film_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '膜编号',
  `film_size` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '膜规格',
  `process_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工艺方式',
  `stamping_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '冲压方法',
  `mold_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '模具编号',
  `back_mold_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '模具编号(选择)',
  `layout_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '排版方式',
  `layout_way` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '排版方向',
  `jump_distance2` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '跳距2',
  `mylar_material` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '麦拉材料',
  `mylar_specs` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '麦拉规格',
  `mylar_layout` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '麦拉排版',
  `mylar_jump` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '麦拉跳距',
  `adhesive_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '背胶种类',
  `adhesive_manufacturer` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '背胶厂商',
  `adhesive_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '背胶编号',
  `adhesive_size` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '背胶尺寸',
  `adhesive_specs` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '背胶规格',
  `dashed_knife` tinyint DEFAULT '0' COMMENT '加虚线刀: 0-否, 1-是',
  `slice_per_row` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'PCS/排',
  `slice_per_roll` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'PCS/卷',
  `slice_per_bundle` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'PCS/扎',
  `slice_per_bag` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'PCS/袋',
  `slice_per_box` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'PCS/箱',
  `packing_qty` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '包装数量(PCS/袋)',
  `back_knife_mold` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '背胶刀模存放',
  `back_mylar_mold` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '背麦拉刀模存放',
  `etch_mold` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '' COMMENT '腐蚀刀模',
  `storage_location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '' COMMENT '存放位置',
  `extra_field` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '' COMMENT '额外字段',
  `release_paper_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '离型纸编号',
  `release_paper_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '离型纸种类',
  `release_paper_category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '离型纸类别',
  `release_paper_specs` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '离型纸规格',
  `padding_material` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '填充材料',
  `packing_material` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '包装材料',
  `special_color` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '专色配比',
  `color_formula` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '颜色配方',
  `file_path` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '电脑图档存储路径',
  `sample_info` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '样品信息',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '注意事项',
  `template_category` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '模板分类',
  `tags` json DEFAULT NULL COMMENT '标签列表',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `glue_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '滴胶类型',
  `packing_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '包装类型',
  `creator` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '制作',
  `reviewer` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '审核',
  `factory_manager` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '厂长',
  `quality_manager` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '品管',
  `sales` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '业务',
  `approver` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '核准',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-草稿, 2-待审核, 3-已启用, 4-已归档',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `reviewer_id` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '关联物料ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_work_order_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_work_order_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '工单ID',
  `work_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '工单编号',
  `work_order_date` date DEFAULT NULL COMMENT '工单日期',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '销售订单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '产品ID',
  `plan_qty` decimal(18,4) NOT NULL COMMENT '计划数量',
  `completed_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已完成数量',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '单位',
  `plan_start_date` date DEFAULT NULL COMMENT '计划开工日期',
  `plan_end_date` date DEFAULT NULL COMMENT '计划完工日期',
  `actual_start_date` date DEFAULT NULL COMMENT '实际开工日期',
  `actual_end_date` date DEFAULT NULL COMMENT '实际完工日期',
  `workshop_id` bigint unsigned DEFAULT NULL COMMENT '车间ID',
  `workcenter_id` bigint unsigned DEFAULT NULL COMMENT '工作中心ID',
  `priority` tinyint DEFAULT '1' COMMENT '优先级: 1-低, 2-中, 3-高, 4-紧急',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待开工, 2-生产中, 3-已完成, 4-已关闭',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `workshop` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `standard_cost` decimal(18,2) DEFAULT '0.00',
  `actual_cost` decimal(18,2) DEFAULT '0.00',
  `material_cost` decimal(18,2) DEFAULT '0.00',
  `labor_cost` decimal(18,2) DEFAULT '0.00',
  `overhead_cost` decimal(18,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_work_order_color_seq`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_work_order_color_seq` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `seq_no` int NOT NULL COMMENT '色序号',
  `color_name` varchar(50) DEFAULT NULL COMMENT '颜色名称',
  `screen_plate_id` bigint unsigned DEFAULT NULL COMMENT '网版ID',
  `ink_formula_id` bigint unsigned DEFAULT NULL COMMENT '油墨配方ID',
  `estimated_duration_hours` decimal(18,4) DEFAULT '4.0000' COMMENT '预计耗时（小时）',
  `equipment_type_required` varchar(50) DEFAULT NULL COMMENT '所需设备类型',
  `depends_on_seq` int DEFAULT NULL COMMENT '依赖工序',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_screen_plate` (`screen_plate_id`),
  KEY `idx_ink_formula` (`ink_formula_id`),
  CONSTRAINT `fk_prd_wo_color_seq_workorder` FOREIGN KEY (`work_order_id`) REFERENCES `prod_work_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单色序表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_work_report`
--

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
  `tool_id` bigint unsigned DEFAULT NULL COMMENT '关联刀模工装ID（dcprint_tool.id）',
  `screen_plate_id` bigint unsigned DEFAULT NULL COMMENT '关联网版工装ID（dcprint_tool.id）',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `equipment_name` varchar(100) DEFAULT NULL COMMENT '设备名称',
  `shift` varchar(20) DEFAULT NULL COMMENT '班次',
  `defect_reason` varchar(500) DEFAULT NULL COMMENT '缺陷原因',
  `report_date` date DEFAULT NULL COMMENT '报工日期',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1草稿 2已审核 3已取消',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_no` (`report_no`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_tool_id` (`tool_id`),
  KEY `idx_screen_plate_id` (`screen_plate_id`)
) ENGINE=InnoDB AUTO_INCREMENT=205 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产报工表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prd_work_report_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prd_work_report_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `report_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '报工单号',
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工单编号',
  `process_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '工序名称',
  `process_seq` int DEFAULT NULL COMMENT '工序序号',
  `equipment_id` bigint unsigned DEFAULT NULL COMMENT '设备ID',
  `operator_id` bigint unsigned DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '操作员姓名',
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
  `first_piece_inspector` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '首件签样人',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `tool_id` bigint unsigned DEFAULT NULL COMMENT '关联刀模工装ID（dcprint_tool.id）',
  `screen_plate_id` bigint unsigned DEFAULT NULL COMMENT '关联网版工装ID（dcprint_tool.id）',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `print_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `print_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `qr_id` bigint unsigned NOT NULL,
  `template_id` bigint unsigned DEFAULT NULL,
  `print_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `operator` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paper_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'thermal',
  `print_count` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_pl_qr` (`qr_id`),
  KEY `idx_pl_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打印日志';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prod_work_order`
--

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
  `order_type` tinyint DEFAULT '0' COMMENT '工单类型: 0-正常 1-打样工单 2-返工',
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
  `picked_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计已领数量（按BOM折算）',
  `finished_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计完工合格数量',
  `returned_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计退料数量',
  `total_material_cost` decimal(12,2) DEFAULT '0.00' COMMENT '累计材料成本',
  `total_labor_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '人工成本合计',
  `total_tool_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '工装分摊成本',
  `total_overhead_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '制造费用',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `approved_at` datetime DEFAULT NULL COMMENT '审核时间',
  `approved_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `cancelled_at` datetime DEFAULT NULL COMMENT '作废时间',
  `cancelled_by` bigint unsigned DEFAULT NULL COMMENT '作废人ID',
  `cancelled_reason` varchar(500) DEFAULT NULL COMMENT '作废原因',
  `product_id` int NOT NULL DEFAULT '0' COMMENT '产品ID(mdm_product.id)',
  `product_code` varchar(64) NOT NULL DEFAULT '' COMMENT '产品编码',
  `planned_qty` decimal(18,3) NOT NULL DEFAULT '0.000' COMMENT '计划数量',
  `completed_qty` decimal(18,3) NOT NULL DEFAULT '0.000' COMMENT '已完成数量',
  `process_id` int DEFAULT NULL COMMENT '工艺路线ID',
  `process_name` varchar(128) NOT NULL DEFAULT '' COMMENT '工艺路线名称',
  `warehouse_id` int NOT NULL DEFAULT '1' COMMENT '仓库ID',
  `legacy_material_id` bigint unsigned DEFAULT NULL COMMENT '遗留 prd_work_order.material_id（NEW-P0-1 迁移保留，指向 inv_material.id）',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT 'sales_order_id',
  `standard_card_id` bigint unsigned DEFAULT NULL COMMENT 'standard_card_id',
  `process_card_id` bigint unsigned DEFAULT NULL COMMENT 'process_card_id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_no` (`work_order_no`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_sales_order` (`sales_order_id`),
  KEY `idx_wo_legacy_material` (`legacy_material_id`),
  KEY `idx_wo_deleted_time` (`deleted`,`create_time`),
  CONSTRAINT `fk_work_order_sales_order` FOREIGN KEY (`sales_order_id`) REFERENCES `sal_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9395 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产工单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prod_work_order_bak_20260925fk`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order_bak_20260925fk` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `work_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '工单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单ID',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '关联销售订单号',
  `bom_id` bigint unsigned DEFAULT NULL COMMENT '关联BOM ID',
  `customer_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `product_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '产品名称',
  `order_type` tinyint DEFAULT '0' COMMENT '工单类型: 0-正常 1-打样工单 2-返工',
  `quantity` decimal(15,2) DEFAULT '0.00' COMMENT '生产数量',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '单位',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '状态: pending/confirmed/producing/completed/cancelled',
  `priority` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `plan_start_date` date DEFAULT NULL COMMENT '计划开始日期',
  `plan_end_date` date DEFAULT NULL COMMENT '计划完成日期',
  `actual_start_date` date DEFAULT NULL COMMENT '实际开始日期',
  `actual_end_date` date DEFAULT NULL COMMENT '实际完成日期',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  `picked_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计已领数量（按BOM折算）',
  `finished_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计完工合格数量',
  `returned_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计退料数量',
  `total_material_cost` decimal(12,2) DEFAULT '0.00' COMMENT '累计材料成本',
  `total_labor_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '人工成本合计',
  `total_tool_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '工装分摊成本',
  `total_overhead_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '制造费用',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `approved_at` datetime DEFAULT NULL COMMENT '审核时间',
  `approved_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `cancelled_at` datetime DEFAULT NULL COMMENT '作废时间',
  `cancelled_by` bigint unsigned DEFAULT NULL COMMENT '作废人ID',
  `cancelled_reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '作废原因',
  `product_id` int NOT NULL DEFAULT '0' COMMENT '产品ID(mdm_product.id)',
  `product_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '产品编码',
  `planned_qty` decimal(18,3) NOT NULL DEFAULT '0.000' COMMENT '计划数量',
  `completed_qty` decimal(18,3) NOT NULL DEFAULT '0.000' COMMENT '已完成数量',
  `process_id` int DEFAULT NULL COMMENT '工艺路线ID',
  `process_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '工艺路线名称',
  `warehouse_id` int NOT NULL DEFAULT '1' COMMENT '仓库ID',
  `legacy_material_id` bigint unsigned DEFAULT NULL COMMENT '遗留 prd_work_order.material_id（NEW-P0-1 迁移保留，指向 inv_material.id）',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT 'sales_order_id',
  `standard_card_id` bigint unsigned DEFAULT NULL COMMENT 'standard_card_id',
  `process_card_id` bigint unsigned DEFAULT NULL COMMENT 'process_card_id'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prod_work_order_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `work_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '工单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单ID',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '关联销售订单号',
  `bom_id` bigint unsigned DEFAULT NULL COMMENT '关联BOM ID',
  `customer_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `product_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '产品名称',
  `order_type` tinyint DEFAULT '0' COMMENT '工单类型: 0-正常 1-打样工单 2-返工',
  `quantity` decimal(15,2) DEFAULT '0.00' COMMENT '生产数量',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '单位',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '状态: pending/confirmed/producing/completed/cancelled',
  `priority` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `plan_start_date` date DEFAULT NULL COMMENT '计划开始日期',
  `plan_end_date` date DEFAULT NULL COMMENT '计划完成日期',
  `actual_start_date` date DEFAULT NULL COMMENT '实际开始日期',
  `actual_end_date` date DEFAULT NULL COMMENT '实际完成日期',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  `picked_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计已领数量（按BOM折算）',
  `finished_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计完工合格数量',
  `returned_qty` decimal(10,2) DEFAULT '0.00' COMMENT '累计退料数量',
  `total_material_cost` decimal(12,2) DEFAULT '0.00' COMMENT '累计材料成本',
  `total_labor_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '人工成本合计',
  `total_tool_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '工装分摊成本',
  `total_overhead_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '制造费用',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `approved_at` datetime DEFAULT NULL COMMENT '审核时间',
  `approved_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `cancelled_at` datetime DEFAULT NULL COMMENT '作废时间',
  `cancelled_by` bigint unsigned DEFAULT NULL COMMENT '作废人ID',
  `cancelled_reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '作废原因',
  `product_id` int NOT NULL DEFAULT '0' COMMENT '产品ID(mdm_product.id)',
  `product_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '产品编码',
  `planned_qty` decimal(18,3) NOT NULL DEFAULT '0.000' COMMENT '计划数量',
  `completed_qty` decimal(18,3) NOT NULL DEFAULT '0.000' COMMENT '已完成数量',
  `process_id` int DEFAULT NULL COMMENT '工艺路线ID',
  `process_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '工艺路线名称',
  `warehouse_id` int NOT NULL DEFAULT '1' COMMENT '仓库ID',
  `legacy_material_id` bigint unsigned DEFAULT NULL COMMENT '遗留 prd_work_order.material_id（NEW-P0-1 迁移保留，指向 inv_material.id）',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT 'sales_order_id',
  `standard_card_id` bigint unsigned DEFAULT NULL COMMENT 'standard_card_id',
  `process_card_id` bigint unsigned DEFAULT NULL COMMENT 'process_card_id'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prod_work_order_item`
--

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
  KEY `idx_work_order_id` (`work_order_id`),
  KEY `idx_material_id` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产工单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prod_work_order_material_req`
--

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

--
-- Table structure for table `prod_work_order_process_step`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order_process_step` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `step_no` int NOT NULL,
  `step_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `process_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `estimated_duration` decimal(10,2) DEFAULT NULL,
  `actual_duration` decimal(10,2) DEFAULT NULL,
  `equipment_id` int DEFAULT NULL,
  `equipment_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  `active_key` int GENERATED ALWAYS AS ((case when (`deleted` = 0) then `work_order_id` else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wo_step_active` (`active_key`,`step_no`),
  KEY `idx_work_order_id` (`work_order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2503 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prod_work_order_status_legacy_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order_status_legacy_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `work_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '工单号',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '状态: pending/confirmed/producing/completed/cancelled',
  `deleted` tinyint DEFAULT '0' COMMENT '删除标记',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prod_work_order_status_migrated_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order_status_migrated_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `work_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '工单号',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '关联销售订单号',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '状态: pending/confirmed/producing/completed/cancelled',
  `planned_qty` decimal(18,3) NOT NULL DEFAULT '0.000' COMMENT '计划数量',
  `completed_qty` decimal(18,3) NOT NULL DEFAULT '0.000' COMMENT '已完成数量',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prod_work_order_status_new_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prod_work_order_status_new_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `work_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '工单号',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '状态: pending/confirmed/producing/completed/cancelled',
  `status_new` tinyint NOT NULL DEFAULT '1' COMMENT '状态(新)',
  `priority` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `priority_new` tinyint NOT NULL DEFAULT '2' COMMENT '优先级(新)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_order_line_std`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_order_line_std` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '采购订单行ID',
  `po_id` bigint unsigned NOT NULL COMMENT '采购订单头ID',
  `line_no` int NOT NULL COMMENT '行号',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(100) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(200) DEFAULT NULL COMMENT '规格型号',
  `order_qty` decimal(18,4) NOT NULL COMMENT '订购数量',
  `price` decimal(18,4) NOT NULL COMMENT '单价',
  `amount` decimal(18,2) NOT NULL COMMENT '金额',
  `received_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '已收数量',
  `remark` varchar(200) DEFAULT NULL COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  KEY `idx_po_id` (`po_id`),
  KEY `idx_material_id` (`material_id`),
  CONSTRAINT `fk_po_line_std_po` FOREIGN KEY (`po_id`) REFERENCES `pur_order_std` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=609 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准采购订单行';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_order_std`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_order_std` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '采购订单ID',
  `po_code` varchar(50) NOT NULL COMMENT '采购单号',
  `request_id` bigint unsigned DEFAULT NULL COMMENT '请购单ID',
  `supplier_id` bigint unsigned NOT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) DEFAULT NULL COMMENT '供应商名称',
  `order_date` date NOT NULL COMMENT '订单日期',
  `delivery_date` date DEFAULT NULL COMMENT '预计交货日期',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(10,4) DEFAULT '1.0000' COMMENT '汇率',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00' COMMENT '订单总金额',
  `tax_rate` decimal(5,2) DEFAULT '13.00' COMMENT '税率%',
  `tax_amount` decimal(18,2) DEFAULT '0.00' COMMENT '税额',
  `grand_total` decimal(18,2) DEFAULT '0.00' COMMENT '含税总金额',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0草稿 1已提交 2审批中 3通过 4驳回 5部分入库 6全部入库 9关闭',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT '付款条款',
  `delivery_address` text COMMENT '送货地址',
  `contact_person` varchar(50) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `remark` text COMMENT '备注',
  `legacy_source` varchar(30) DEFAULT NULL COMMENT '旧表来源: pur_order/pur_purchase_order',
  `legacy_id` bigint unsigned DEFAULT NULL COMMENT '旧表原始ID',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `approve_by` bigint unsigned DEFAULT NULL COMMENT '批准人ID',
  `approve_time` datetime DEFAULT NULL COMMENT '批准时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_code` (`po_code`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_legacy` (`legacy_source`,`legacy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准采购订单';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_purchase_order`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `po_no` varchar(50) NOT NULL COMMENT '采购单号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) NOT NULL COMMENT '供应商名称',
  `supplier_code` varchar(50) DEFAULT NULL COMMENT '供应商编码',
  `order_date` date NOT NULL COMMENT '订单日期',
  `delivery_date` date DEFAULT NULL COMMENT '预计交货日期',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,4) DEFAULT '1.0000' COMMENT '汇率',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '订单总金额',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '订单总数量',
  `tax_rate` decimal(18,4) DEFAULT '13.0000' COMMENT '税率%',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `grand_total` decimal(18,4) DEFAULT '0.0000' COMMENT '含税总金额',
  `status` tinyint unsigned DEFAULT '10' COMMENT '状态: 10-草稿,20-待审批,30-已审批,40-部分收货,50-已完成,90-已关闭',
  `over_receipt_tolerance` decimal(18,4) DEFAULT '5.0000' COMMENT '超收容差率%',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT '付款条款',
  `delivery_address` text COMMENT '送货地址',
  `contact_person` varchar(50) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `remark` text COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `audit_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `audit_time` datetime DEFAULT NULL COMMENT '审批时间',
  `close_by` bigint unsigned DEFAULT NULL COMMENT '关闭人ID',
  `close_time` datetime DEFAULT NULL COMMENT '关闭时间',
  `close_reason` varchar(200) DEFAULT NULL COMMENT '关闭原因',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `base_total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币合计金额',
  `base_tax_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币税额',
  `base_grand_total` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币价税合计',
  `received_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '已收数量汇总（由明细 received_qty 汇总）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_no` (`po_no`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_create_by` (`create_by`),
  KEY `idx_purchase_deleted_time` (`deleted`,`create_time`),
  KEY `idx_purchase_status_deleted` (`status`,`deleted`,`create_time`),
  CONSTRAINT `fk_pur_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `pur_supplier` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=707 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_purchase_order_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_order_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '主键ID',
  `po_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '采购单号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '供应商名称',
  `supplier_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '供应商编码',
  `order_date` date NOT NULL COMMENT '订单日期',
  `delivery_date` date DEFAULT NULL COMMENT '预计交货日期',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,4) DEFAULT '1.0000' COMMENT '汇率',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '订单总金额',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '订单总数量',
  `tax_rate` decimal(18,4) DEFAULT '13.0000' COMMENT '税率%',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `grand_total` decimal(18,4) DEFAULT '0.0000' COMMENT '含税总金额',
  `status` tinyint unsigned DEFAULT '10' COMMENT '状态: 10-草稿,20-待审批,30-已审批,40-部分收货,50-已完成,90-已关闭',
  `over_receipt_tolerance` decimal(18,4) DEFAULT '5.0000' COMMENT '超收容差率%',
  `payment_terms` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '付款条款',
  `delivery_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '送货地址',
  `contact_person` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '联系电话',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `audit_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `audit_time` datetime DEFAULT NULL COMMENT '审批时间',
  `close_by` bigint unsigned DEFAULT NULL COMMENT '关闭人ID',
  `close_time` datetime DEFAULT NULL COMMENT '关闭时间',
  `close_reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '关闭原因',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `base_total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币合计金额',
  `base_tax_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币税额',
  `base_grand_total` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币价税合计',
  `received_quantity` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '已收数量汇总（由明细 received_qty 汇总）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_purchase_order_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_order_line` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `po_id` bigint unsigned NOT NULL COMMENT '采购单ID',
  `line_no` int unsigned NOT NULL COMMENT '行号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(500) DEFAULT NULL COMMENT '物料规格',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `order_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '订购数量',
  `received_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '累计入库数量',
  `returned_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '累计退货数量',
  `unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '单价',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '金额',
  `tax_rate` decimal(18,4) DEFAULT '13.0000' COMMENT '税率%',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `line_total` decimal(18,4) DEFAULT '0.0000' COMMENT '行合计',
  `require_date` date DEFAULT NULL COMMENT '需求日期',
  `closed_flag` tinyint(1) DEFAULT '0' COMMENT '行关闭标志',
  `closed_reason` varchar(200) DEFAULT NULL COMMENT '关闭原因',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `base_unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币单价',
  `base_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币金额',
  `base_tax_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币税额',
  `base_line_total` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币价税合计',
  `source_order_id` int unsigned DEFAULT NULL COMMENT '来源业务订单ID',
  `source_order_line_id` int unsigned DEFAULT NULL COMMENT '来源业务订单行ID',
  `source_order_no` varchar(50) DEFAULT NULL COMMENT '来源业务订单号',
  `pr_id` int unsigned DEFAULT NULL COMMENT '来源采购申请ID',
  `pr_line_id` int unsigned DEFAULT NULL COMMENT '来源采购申请行ID',
  `is_strict_by_order` tinyint(1) DEFAULT '1' COMMENT '是否严格按单',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_line` (`po_id`,`line_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_source_order` (`source_order_id`,`source_order_line_id`),
  KEY `idx_pr` (`pr_id`,`pr_line_id`),
  CONSTRAINT `fk_pur_line_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pur_line_po` FOREIGN KEY (`po_id`) REFERENCES `pur_purchase_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=705 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购单行表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_purchase_order_line_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_order_line_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '主键ID',
  `po_id` bigint unsigned NOT NULL COMMENT '采购单ID',
  `line_no` int unsigned NOT NULL COMMENT '行号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '物料名称',
  `material_spec` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料规格',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '件' COMMENT '单位',
  `order_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '订购数量',
  `received_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '累计入库数量',
  `returned_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '累计退货数量',
  `unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '单价',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '金额',
  `tax_rate` decimal(18,4) DEFAULT '13.0000' COMMENT '税率%',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `line_total` decimal(18,4) DEFAULT '0.0000' COMMENT '行合计',
  `require_date` date DEFAULT NULL COMMENT '需求日期',
  `closed_flag` tinyint(1) DEFAULT '0' COMMENT '行关闭标志',
  `closed_reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '关闭原因',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `base_unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币单价',
  `base_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币金额',
  `base_tax_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币税额',
  `base_line_total` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币价税合计',
  `source_order_id` int unsigned DEFAULT NULL COMMENT '来源业务订单ID',
  `source_order_line_id` int unsigned DEFAULT NULL COMMENT '来源业务订单行ID',
  `source_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '来源业务订单号',
  `pr_id` int unsigned DEFAULT NULL COMMENT '来源采购申请ID',
  `pr_line_id` int unsigned DEFAULT NULL COMMENT '来源采购申请行ID',
  `is_strict_by_order` tinyint(1) DEFAULT '1' COMMENT '是否严格按单'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_purchase_reconciliation`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_reconciliation` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `reconciliation_no` varchar(32) NOT NULL COMMENT '对账单号',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态: 1=草稿, 2=已确认, 3=部分核销, 4=已核销完成, 9=已关闭',
  `supplier_id` bigint NOT NULL COMMENT '供应商ID',
  `supplier_name` varchar(128) NOT NULL DEFAULT '' COMMENT '供应商名称',
  `period_start` date NOT NULL COMMENT '对账开始日期',
  `period_end` date NOT NULL COMMENT '对账结束日期',
  `receipt_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '收货金额',
  `return_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '退货金额',
  `net_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '净额',
  `discount_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '折扣金额',
  `paid_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '已核销金额',
  `balance_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '余额',
  `remark` varchar(512) NOT NULL DEFAULT '' COMMENT '备注',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `confirm_by` bigint DEFAULT NULL COMMENT '确认人',
  `confirm_time` datetime DEFAULT NULL COMMENT '确认时间',
  `close_by` bigint DEFAULT NULL COMMENT '关闭人',
  `close_time` datetime DEFAULT NULL COMMENT '关闭时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0=未删除, 1=已删除',
  `currency` varchar(8) DEFAULT 'CNY',
  `exchange_rate` decimal(18,4) DEFAULT '1.0000',
  `base_receipt_amount` decimal(18,2) DEFAULT '0.00',
  `base_return_amount` decimal(18,2) DEFAULT '0.00',
  `base_net_amount` decimal(18,2) DEFAULT '0.00',
  `base_discount_amount` decimal(18,2) DEFAULT '0.00',
  `base_paid_amount` decimal(18,2) DEFAULT '0.00',
  `base_balance_amount` decimal(18,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_no` (`reconciliation_no`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_period` (`period_start`,`period_end`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购对账主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_purchase_reconciliation_writeoff`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_reconciliation_writeoff` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reconciliation_id` bigint NOT NULL COMMENT '对账单ID',
  `payable_id` bigint NOT NULL COMMENT '应付单ID',
  `amount` decimal(14,2) NOT NULL COMMENT '核销金额',
  `write_off_date` date NOT NULL COMMENT '核销日期',
  `remark` varchar(512) NOT NULL DEFAULT '' COMMENT '备注',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_reconciliation_id` (`reconciliation_id`),
  KEY `idx_payable_id` (`payable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购对账核销记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_purchase_return`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_return` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `return_no` varchar(32) NOT NULL COMMENT '退货单号',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态: 1=待审核, 2=已审核, 3=已完成, 9=已取消',
  `order_id` bigint NOT NULL COMMENT '采购订单ID',
  `order_no` varchar(32) NOT NULL DEFAULT '' COMMENT '采购订单号',
  `supplier_id` bigint NOT NULL COMMENT '供应商ID',
  `supplier_name` varchar(128) NOT NULL DEFAULT '' COMMENT '供应商名称',
  `warehouse_id` bigint NOT NULL COMMENT '仓库ID',
  `receipt_id` bigint DEFAULT NULL COMMENT '收货单ID',
  `receipt_no` varchar(32) NOT NULL DEFAULT '' COMMENT '收货单号',
  `reason` varchar(512) NOT NULL COMMENT '退货原因',
  `return_date` date NOT NULL COMMENT '退货日期',
  `total_amount` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT '退货总金额',
  `approve_by` bigint DEFAULT NULL COMMENT '审核人',
  `approve_time` datetime DEFAULT NULL COMMENT '审核时间',
  `complete_by` bigint DEFAULT NULL COMMENT '完成人',
  `complete_time` datetime DEFAULT NULL COMMENT '完成时间',
  `outbound_order_id` bigint DEFAULT NULL COMMENT '出库单ID',
  `outbound_order_no` varchar(32) DEFAULT NULL COMMENT '出库单号',
  `payable_id` bigint DEFAULT NULL COMMENT '红字应付单ID',
  `payable_no` varchar(32) DEFAULT NULL COMMENT '红字应付单号',
  `remark` varchar(512) NOT NULL DEFAULT '' COMMENT '备注',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0=未删除, 1=已删除',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(10,4) DEFAULT '1.0000' COMMENT '汇率',
  `base_total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  `base_currency` varchar(10) DEFAULT 'CNY' COMMENT '本位币',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_return_date` (`return_date`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购退货主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_purchase_return_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_purchase_return_line` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `return_id` bigint NOT NULL COMMENT '退货单ID',
  `line_no` int NOT NULL COMMENT '行号',
  `order_line_id` bigint DEFAULT NULL COMMENT '采购订单行ID',
  `material_id` bigint NOT NULL COMMENT '物料ID',
  `material_code` varchar(64) NOT NULL DEFAULT '' COMMENT '物料编码',
  `material_name` varchar(256) NOT NULL DEFAULT '' COMMENT '物料名称',
  `material_spec` varchar(256) NOT NULL DEFAULT '' COMMENT '物料规格',
  `unit` varchar(32) NOT NULL DEFAULT '件' COMMENT '单位',
  `quantity` decimal(14,4) NOT NULL COMMENT '退货数量',
  `unit_price` decimal(14,2) NOT NULL COMMENT '单价',
  `amount` decimal(14,2) NOT NULL COMMENT '金额',
  `batch_no` varchar(64) NOT NULL DEFAULT '' COMMENT '批次号',
  `reason` varchar(512) NOT NULL DEFAULT '' COMMENT '退货原因',
  `remark` varchar(512) NOT NULL DEFAULT '' COMMENT '备注',
  `base_unit_price` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币单价',
  `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额',
  PRIMARY KEY (`id`),
  KEY `idx_return_id` (`return_id`),
  KEY `idx_material_id` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购退货明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_request`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_request` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `request_no` varchar(50) NOT NULL COMMENT '申请单号',
  `request_date` date DEFAULT NULL COMMENT '申请日期',
  `request_type` varchar(20) DEFAULT 'material' COMMENT '申请类型',
  `request_dept_id` int unsigned DEFAULT NULL COMMENT '申请部门ID',
  `request_dept` varchar(100) DEFAULT NULL COMMENT '申请部门',
  `requester_id` bigint unsigned DEFAULT NULL COMMENT '申请人ID',
  `requester_name` varchar(50) DEFAULT NULL COMMENT '申请人',
  `reviewer_id` int unsigned DEFAULT NULL COMMENT '审校人ID',
  `reviewer_name` varchar(50) DEFAULT NULL COMMENT '审校人姓名',
  `approver_id` bigint unsigned DEFAULT NULL COMMENT '审批人ID',
  `approver_name` varchar(50) DEFAULT NULL COMMENT '批准人姓名',
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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_request_no` (`request_no`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  KEY `idx_request_dept` (`request_dept_id`),
  KEY `idx_requester` (`requester_id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购申请主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_request_detail`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购申请明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_request_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pur_request_item` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `request_id` int unsigned NOT NULL COMMENT '申请ID',
  `line_no` int unsigned NOT NULL COMMENT '行号',
  `material_id` int unsigned DEFAULT NULL COMMENT '物料ID',
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
  KEY `idx_request` (`request_id`),
  KEY `idx_material_id` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购申请明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_supplier`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `default_currency` varchar(10) NOT NULL DEFAULT 'CNY' COMMENT '默认币种',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_code` (`supplier_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pur_supplier_material`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商物料关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_aql_sampling_plan`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_aql_sampling_plan` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `lot_size_min` int NOT NULL COMMENT '批量下限',
  `lot_size_max` int NOT NULL COMMENT '批量上限',
  `sample_size_code` varchar(5) NOT NULL COMMENT '样本量字码: A,B,C,D,E,F,G,H,J,K,L',
  `sample_size` int NOT NULL COMMENT '样本量 n',
  `aql_level` varchar(10) NOT NULL COMMENT 'AQL水平: 0.65/1.0/1.5/2.5/4.0',
  `accept_qty` int NOT NULL COMMENT '合格判定数 Ac',
  `reject_qty` int NOT NULL COMMENT '不合格判定数 Re',
  `inspection_level` varchar(10) NOT NULL DEFAULT 'II' COMMENT '检验水平: I/II/III',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan` (`lot_size_min`,`lot_size_max`,`aql_level`,`inspection_level`),
  KEY `idx_aql_level` (`aql_level`),
  KEY `idx_lot_size` (`lot_size_min`,`lot_size_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AQL抽样方案表(GB/T 2828.1)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_final_inspection`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_final_inspection` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inspection_no` varchar(50) NOT NULL COMMENT '终检单号',
  `inspection_date` date DEFAULT NULL COMMENT '检验日期',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '工单号',
  `card_id` bigint unsigned DEFAULT NULL,
  `card_no` varchar(50) DEFAULT NULL,
  `product_id` bigint unsigned DEFAULT NULL COMMENT '产品ID',
  `product_code` varchar(50) DEFAULT NULL COMMENT '产品编码',
  `product_name` varchar(200) DEFAULT NULL COMMENT '产品名称',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `inspection_qty` int DEFAULT '0' COMMENT '检验数量',
  `qualified_qty` int DEFAULT '0' COMMENT '合格数',
  `unqualified_qty` int DEFAULT '0' COMMENT '不合格数',
  `inspection_result` tinyint DEFAULT '0' COMMENT '结果 1合格 2不合格',
  `inspector_name` varchar(50) DEFAULT NULL COMMENT '检验员',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  `defect_reason` varchar(255) DEFAULT NULL,
  `pack_method` varchar(100) DEFAULT NULL,
  `remark` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order_id` (`work_order_id`),
  KEY `idx_inspection_no` (`inspection_no`),
  CONSTRAINT `fk_qc_final_pc` FOREIGN KEY (`work_order_id`) REFERENCES `prd_process_card` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='终检记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_incoming_inspection`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_incoming_inspection` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inbound_order_id` bigint unsigned DEFAULT NULL COMMENT '关联入库单 inv_inbound_order.id',
  `inbound_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联入库单号',
  `inspection_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验单号',
  `inspection_date` date NOT NULL COMMENT '检验日期',
  `supplier_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '供应商',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物料名称',
  `specification` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规格',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '批次号',
  `quantity` decimal(10,2) NOT NULL COMMENT '数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单位',
  `inspection_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验类型',
  `inspection_result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验结果',
  `inspector_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验员',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除状态',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT 'supplier_id',
  `material_id` bigint unsigned DEFAULT NULL COMMENT 'material_id',
  `qualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'qualified_qty',
  `unqualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'unqualified_qty',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspection_no` (`inspection_no`),
  KEY `idx_inspection_date` (`inspection_date`),
  KEY `idx_supplier_name` (`supplier_name`),
  KEY `idx_material_name` (`material_name`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_inspection_result` (`inspection_result`),
  KEY `idx_inbound` (`inbound_order_id`),
  KEY `idx_inbound_order_id` (`inbound_order_id`),
  CONSTRAINT `fk_qc_inbound_order` FOREIGN KEY (`inbound_order_id`) REFERENCES `inv_inbound_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='进料检验主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_incoming_inspection_bak_20260925fk`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_incoming_inspection_bak_20260925fk` (
  `id` int NOT NULL DEFAULT '0',
  `inbound_order_id` bigint unsigned DEFAULT NULL COMMENT '关联入库单 inv_inbound_order.id',
  `inbound_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联入库单号',
  `inspection_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验单号',
  `inspection_date` date NOT NULL COMMENT '检验日期',
  `supplier_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '供应商',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物料名称',
  `specification` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规格',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '批次号',
  `quantity` decimal(10,2) NOT NULL COMMENT '数量',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单位',
  `inspection_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验类型',
  `inspection_result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验结果',
  `inspector_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验员',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除状态',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT 'supplier_id',
  `material_id` bigint unsigned DEFAULT NULL COMMENT 'material_id',
  `qualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'qualified_qty',
  `unqualified_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'unqualified_qty'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_incoming_inspection_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_incoming_inspection_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspection_id` int NOT NULL COMMENT '检验单ID',
  `inspection_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验单号',
  `item_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验项目',
  `standard` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标准要求',
  `actual_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '实际值',
  `result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检验结果',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_inspection_id` (`inspection_id`),
  KEY `idx_inspection_no` (`inspection_no`),
  KEY `idx_item_name` (`item_name`),
  KEY `idx_result` (`result`),
  CONSTRAINT `fk_qc_incoming_item_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `qc_incoming_inspection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='进料检验明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_inspection`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspection_no` (`inspection_no`),
  KEY `idx_source` (`source_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_type` (`inspection_type`),
  KEY `idx_qc_inspection_material_date` (`material_id`,`inspection_date`),
  CONSTRAINT `fk_qc_inspection_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='质检记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_unqualified`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_unqualified` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `unqualified_no` varchar(50) NOT NULL COMMENT '不合格品单号',
  `handle_no` varchar(50) DEFAULT NULL COMMENT '处理单号',
  `inspection_id` bigint unsigned DEFAULT NULL COMMENT '关联质检ID',
  `source_type` varchar(50) DEFAULT NULL COMMENT '来源类型',
  `source_no` varchar(50) DEFAULT NULL COMMENT '来源单号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '不合格数量',
  `defect_type` varchar(50) DEFAULT NULL COMMENT '缺陷类型',
  `defect_desc` text COMMENT '缺陷描述',
  `handle_type` tinyint DEFAULT NULL COMMENT '处置方式: 1-返工, 2-报废, 3-让步接收, 4-退货',
  `handle_status` tinyint NOT NULL DEFAULT '1' COMMENT '处理状态: 1-待处理, 2-处理中, 3-已完成',
  `responsible_dept` varchar(100) DEFAULT NULL COMMENT '责任部门',
  `responsible_person` varchar(50) DEFAULT NULL COMMENT '责任人',
  `handle_result` tinyint DEFAULT NULL COMMENT '处理结果: 1-已处理, 2-处理中',
  `cost_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '损失金额',
  `handler` varchar(50) DEFAULT NULL COMMENT '处理人',
  `handle_date` date DEFAULT NULL COMMENT '处理日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_unqualified_no` (`unqualified_no`),
  UNIQUE KEY `uk_handle_no` (`handle_no`),
  KEY `idx_inspection` (`inspection_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_handle_status` (`handle_status`),
  KEY `idx_material_id` (`material_id`),
  KEY `idx_source` (`source_type`,`source_no`),
  KEY `fk_qc_unqualified_create_by` (`create_by`),
  KEY `fk_qc_unqualified_update_by` (`update_by`),
  CONSTRAINT `fk_qc_unqualified_create_by` FOREIGN KEY (`create_by`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_qc_unqualified_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_qc_unqualified_update_by` FOREIGN KEY (`update_by`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='不合格品处理表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_complaint`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_complaint` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `complaint_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complaint_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complaint_desc` text COLLATE utf8mb4_unicode_ci,
  `complaint_date` date DEFAULT NULL,
  `status` tinyint DEFAULT '0',
  `handler_id` bigint unsigned DEFAULT NULL,
  `handler_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删标记',
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'order_no',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_code',
  `product_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_name',
  `complaint_level` tinyint DEFAULT NULL COMMENT 'complaint_level',
  `defect_desc` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'defect_desc',
  `defect_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'defect_qty',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'total_qty',
  `defect_rate` decimal(18,4) DEFAULT '0.0000' COMMENT 'defect_rate',
  `reporter` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'reporter',
  `report_time` datetime DEFAULT NULL COMMENT 'report_time',
  `handler` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'handler',
  `contain_action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'contain_action',
  `root_cause` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'root_cause',
  `corrective_action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'corrective_action',
  `preventive_action` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'preventive_action',
  `verify_result` tinyint DEFAULT NULL COMMENT 'verify_result',
  `verifier` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'verifier',
  `verify_time` datetime DEFAULT NULL COMMENT 'verify_time',
  `close_time` datetime DEFAULT NULL COMMENT 'close_time',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `complaint_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'complaint_source',
  `product_id` bigint unsigned DEFAULT NULL COMMENT 'product_id',
  `defect_date` datetime DEFAULT NULL COMMENT 'defect_date',
  `severity` tinyint DEFAULT NULL COMMENT 'severity',
  `report_date` datetime DEFAULT NULL COMMENT 'report_date',
  `d1_team` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D1 成立小组',
  `d1_date` datetime DEFAULT NULL COMMENT 'D1 日期',
  `d2_desc` text COLLATE utf8mb4_unicode_ci COMMENT 'D2 问题描述',
  `d2_date` datetime DEFAULT NULL COMMENT 'D2 日期',
  `d3_interim_action` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D3 临时措施',
  `d3_date` datetime DEFAULT NULL COMMENT 'D3 日期',
  `d4_root_cause` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D4 根因',
  `d4_date` datetime DEFAULT NULL COMMENT 'D4 日期',
  `d5_corrective_action` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D5 纠正措施',
  `d5_date` datetime DEFAULT NULL COMMENT 'D5 日期',
  `d6_implement_verify` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D6 实施验证',
  `d6_date` datetime DEFAULT NULL COMMENT 'D6 日期',
  `d7_preventive_action` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D7 预防措施',
  `d7_date` datetime DEFAULT NULL COMMENT 'D7 日期',
  `d8_congratulations` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D8 团队祝贺',
  `d8_date` datetime DEFAULT NULL COMMENT 'D8 日期',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_complaint_bak2_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_complaint_bak2_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `complaint_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complaint_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complaint_desc` text COLLATE utf8mb4_unicode_ci,
  `complaint_date` date DEFAULT NULL,
  `status` tinyint DEFAULT '0',
  `handler_id` bigint unsigned DEFAULT NULL,
  `handler_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删标记',
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'order_no',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_code',
  `product_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_name',
  `complaint_level` tinyint DEFAULT NULL COMMENT 'complaint_level',
  `defect_desc` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'defect_desc',
  `defect_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'defect_qty',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'total_qty',
  `defect_rate` decimal(18,4) DEFAULT '0.0000' COMMENT 'defect_rate',
  `reporter` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'reporter',
  `report_time` datetime DEFAULT NULL COMMENT 'report_time',
  `handler` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'handler',
  `contain_action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'contain_action',
  `root_cause` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'root_cause',
  `corrective_action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'corrective_action',
  `preventive_action` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'preventive_action',
  `verify_result` tinyint DEFAULT NULL COMMENT 'verify_result',
  `verifier` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'verifier',
  `verify_time` datetime DEFAULT NULL COMMENT 'verify_time',
  `close_time` datetime DEFAULT NULL COMMENT 'close_time',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `complaint_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'complaint_source',
  `product_id` bigint unsigned DEFAULT NULL COMMENT 'product_id',
  `defect_date` datetime DEFAULT NULL COMMENT 'defect_date',
  `severity` tinyint DEFAULT NULL COMMENT 'severity',
  `report_date` datetime DEFAULT NULL COMMENT 'report_date',
  `d1_team` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D1 成立小组',
  `d1_date` datetime DEFAULT NULL COMMENT 'D1 日期',
  `d2_desc` text COLLATE utf8mb4_unicode_ci COMMENT 'D2 问题描述',
  `d2_date` datetime DEFAULT NULL COMMENT 'D2 日期',
  `d3_interim_action` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D3 临时措施',
  `d3_date` datetime DEFAULT NULL COMMENT 'D3 日期',
  `d4_root_cause` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D4 根因',
  `d4_date` datetime DEFAULT NULL COMMENT 'D4 日期',
  `d5_corrective_action` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D5 纠正措施',
  `d5_date` datetime DEFAULT NULL COMMENT 'D5 日期',
  `d6_implement_verify` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D6 实施验证',
  `d6_date` datetime DEFAULT NULL COMMENT 'D6 日期',
  `d7_preventive_action` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D7 预防措施',
  `d7_date` datetime DEFAULT NULL COMMENT 'D7 日期',
  `d8_congratulations` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'D8 团队祝贺',
  `d8_date` datetime DEFAULT NULL COMMENT 'D8 日期'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_complaint_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_complaint_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `complaint_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complaint_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complaint_desc` text COLLATE utf8mb4_unicode_ci,
  `complaint_date` date DEFAULT NULL,
  `status` tinyint DEFAULT '0',
  `handler_id` bigint unsigned DEFAULT NULL,
  `handler_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删标记',
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'order_no',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_code',
  `product_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_name',
  `complaint_level` tinyint DEFAULT NULL COMMENT 'complaint_level',
  `defect_desc` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'defect_desc',
  `defect_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'defect_qty',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'total_qty',
  `defect_rate` decimal(18,4) DEFAULT '0.0000' COMMENT 'defect_rate',
  `reporter` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'reporter',
  `report_time` datetime DEFAULT NULL COMMENT 'report_time',
  `handler` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'handler',
  `contain_action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'contain_action',
  `root_cause` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'root_cause',
  `corrective_action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'corrective_action',
  `preventive_action` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'preventive_action',
  `verify_result` tinyint DEFAULT NULL COMMENT 'verify_result',
  `verifier` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'verifier',
  `verify_time` datetime DEFAULT NULL COMMENT 'verify_time',
  `close_time` datetime DEFAULT NULL COMMENT 'close_time',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `complaint_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'complaint_source',
  `product_id` bigint unsigned DEFAULT NULL COMMENT 'product_id',
  `defect_date` datetime DEFAULT NULL COMMENT 'defect_date',
  `severity` tinyint DEFAULT NULL COMMENT 'severity',
  `report_date` datetime DEFAULT NULL COMMENT 'report_date'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_complaint_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_complaint_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `complaint_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complaint_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complaint_desc` text COLLATE utf8mb4_unicode_ci,
  `complaint_date` date DEFAULT NULL,
  `status` tinyint DEFAULT '0',
  `handler_id` bigint unsigned DEFAULT NULL,
  `handler_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删标记',
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'order_no',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_code',
  `product_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_name',
  `complaint_level` tinyint DEFAULT NULL COMMENT 'complaint_level',
  `defect_desc` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'defect_desc',
  `defect_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'defect_qty',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'total_qty',
  `defect_rate` decimal(18,4) DEFAULT '0.0000' COMMENT 'defect_rate',
  `reporter` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'reporter',
  `report_time` datetime DEFAULT NULL COMMENT 'report_time',
  `handler` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'handler',
  `contain_action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'contain_action',
  `root_cause` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'root_cause',
  `corrective_action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'corrective_action',
  `preventive_action` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'preventive_action',
  `verify_result` tinyint DEFAULT NULL COMMENT 'verify_result',
  `verifier` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'verifier',
  `verify_time` datetime DEFAULT NULL COMMENT 'verify_time',
  `close_time` datetime DEFAULT NULL COMMENT 'close_time',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `complaint_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'complaint_source',
  `product_id` bigint unsigned DEFAULT NULL COMMENT 'product_id',
  `defect_date` datetime DEFAULT NULL COMMENT 'defect_date',
  `severity` tinyint DEFAULT NULL COMMENT 'severity',
  `report_date` datetime DEFAULT NULL COMMENT 'report_date'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_lab_test`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_lab_test` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `test_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_items` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_method` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_date` date DEFAULT NULL,
  `test_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `tester_id` bigint unsigned DEFAULT NULL,
  `tester_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删标记',
  `product_id` bigint unsigned DEFAULT NULL COMMENT 'product_id',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_code',
  `product_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_name',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'batch_no',
  `sample_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'sample_source',
  `overall_result` tinyint DEFAULT NULL COMMENT 'overall_result',
  `tester` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'tester',
  `test_time` datetime DEFAULT NULL COMMENT 'test_time',
  `reviewer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'reviewer',
  `review_time` datetime DEFAULT NULL COMMENT 'review_time',
  `equipment_used` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'equipment_used',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `lab_test_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'lab_test_no',
  `inspection_type` tinyint DEFAULT NULL COMMENT 'inspection_type',
  `sample_size` decimal(18,4) DEFAULT '0.0000' COMMENT 'sample_size',
  `accept_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'accept_qty',
  `reject_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'reject_qty',
  `aql_level` tinyint DEFAULT NULL COMMENT 'aql_level',
  `inspection_standard` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'inspection_standard',
  `inspection_id` bigint unsigned DEFAULT NULL COMMENT 'inspection_id',
  `update_time` datetime DEFAULT NULL COMMENT 'update_time',
  `test_standard` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'test_standard',
  `test_equipment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'test_equipment',
  `result_summary` tinyint DEFAULT NULL COMMENT 'result_summary',
  `detail_data` json DEFAULT NULL COMMENT 'detail_data',
  `conclusion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'conclusion',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_lab_test_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_lab_test_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `test_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_items` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_method` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_date` date DEFAULT NULL,
  `test_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `tester_id` bigint unsigned DEFAULT NULL,
  `tester_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删标记',
  `product_id` bigint unsigned DEFAULT NULL COMMENT 'product_id',
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_code',
  `product_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product_name',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'batch_no',
  `sample_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'sample_source',
  `overall_result` tinyint DEFAULT NULL COMMENT 'overall_result',
  `tester` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'tester',
  `test_time` datetime DEFAULT NULL COMMENT 'test_time',
  `reviewer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'reviewer',
  `review_time` datetime DEFAULT NULL COMMENT 'review_time',
  `equipment_used` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'equipment_used',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `lab_test_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'lab_test_no',
  `inspection_type` tinyint DEFAULT NULL COMMENT 'inspection_type',
  `sample_size` decimal(18,4) DEFAULT '0.0000' COMMENT 'sample_size',
  `accept_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'accept_qty',
  `reject_qty` decimal(18,4) DEFAULT '0.0000' COMMENT 'reject_qty',
  `aql_level` tinyint DEFAULT NULL COMMENT 'aql_level',
  `inspection_standard` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'inspection_standard',
  `inspection_id` bigint unsigned DEFAULT NULL COMMENT 'inspection_id',
  `update_time` datetime DEFAULT NULL COMMENT 'update_time',
  `test_standard` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'test_standard',
  `test_equipment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'test_equipment',
  `result_summary` tinyint DEFAULT NULL COMMENT 'result_summary',
  `detail_data` json DEFAULT NULL COMMENT 'detail_data',
  `conclusion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'conclusion'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_sgs_cert`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_sgs_cert` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cert_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `supplier_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cert_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_items` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_report_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_org` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expire_date` date DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `deleted` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_sgs_cert_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_sgs_cert_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cert_id` bigint unsigned NOT NULL,
  `item_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `limit_value` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_value` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删标记',
  `test_item_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'test_item_name',
  `test_standard` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'test_standard',
  `unit` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'unit',
  `sort_order` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'sort_order',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qms_supplier_audit`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qms_supplier_audit` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `audit_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `supplier_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `audit_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `audit_date` date DEFAULT NULL,
  `audit_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `auditor_id` bigint unsigned DEFAULT NULL,
  `auditor_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删标记',
  `audit_scope` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'audit_scope',
  `auditor` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'auditor',
  `audit_items` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'audit_items',
  `audit_scores` decimal(18,4) DEFAULT '0.0000' COMMENT 'audit_scores',
  `total_score` decimal(18,4) DEFAULT '0.0000' COMMENT 'total_score',
  `conclusion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'conclusion',
  `nonconformities` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'nonconformities',
  `corrective_request` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'corrective_request',
  `deadline` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'deadline',
  `create_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'create_by',
  `quality_system_score` decimal(18,4) DEFAULT '0.0000' COMMENT 'quality_system_score',
  `delivery_score` decimal(18,4) DEFAULT '0.0000' COMMENT 'delivery_score',
  `price_score` decimal(18,4) DEFAULT '0.0000' COMMENT 'price_score',
  `service_score` decimal(18,4) DEFAULT '0.0000' COMMENT 'service_score',
  `improvement_items` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'improvement_items',
  `follow_up_date` datetime DEFAULT NULL COMMENT 'follow_up_date',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qr_code_record`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_code_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_data` text COLLATE utf8mb4_unicode_ci,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qrcode_record`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qrcode_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qr_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ref_id` bigint unsigned DEFAULT NULL,
  `ref_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_qr_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `split_flag` tinyint NOT NULL DEFAULT '0',
  `split_index` int NOT NULL DEFAULT '0',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specification` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(18,4) DEFAULT '0.0000',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warehouse_id` bigint unsigned DEFAULT NULL,
  `warehouse_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `supplier_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `work_order_id` bigint unsigned DEFAULT NULL,
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `extra_data` json DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  `print_count` int NOT NULL DEFAULT '0' COMMENT '打印次数',
  `last_print_time` datetime DEFAULT NULL COMMENT '最后打印时间',
  `scan_count` int NOT NULL DEFAULT '0' COMMENT '扫描次数',
  `last_scan_time` datetime DEFAULT NULL COMMENT '最后扫描时间',
  `qr_image_url` text COLLATE utf8mb4_unicode_ci COMMENT '二维码图片(data URL)',
  `trace_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '追溯链接',
  `shipped_at` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'shipped_at',
  `shipment_id` bigint unsigned DEFAULT NULL COMMENT 'shipment_id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_qr_code` (`qr_code`),
  KEY `idx_qrcode_deleted_time` (`deleted`,`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=297 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qrcode_record_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qrcode_record_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `qr_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qr_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ref_id` bigint unsigned DEFAULT NULL,
  `ref_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_qr_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `split_flag` tinyint NOT NULL DEFAULT '0',
  `split_index` int NOT NULL DEFAULT '0',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specification` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(18,4) DEFAULT '0.0000',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warehouse_id` bigint unsigned DEFAULT NULL,
  `warehouse_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_id` bigint unsigned DEFAULT NULL,
  `supplier_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `work_order_id` bigint unsigned DEFAULT NULL,
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `extra_data` json DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  `print_count` int NOT NULL DEFAULT '0' COMMENT '打印次数',
  `last_print_time` datetime DEFAULT NULL COMMENT '最后打印时间',
  `scan_count` int NOT NULL DEFAULT '0' COMMENT '扫描次数',
  `last_scan_time` datetime DEFAULT NULL COMMENT '最后扫描时间',
  `qr_image_url` text COLLATE utf8mb4_unicode_ci COMMENT '二维码图片(data URL)',
  `trace_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '追溯链接',
  `shipped_at` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'shipped_at',
  `shipment_id` bigint unsigned DEFAULT NULL COMMENT 'shipment_id'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qrcode_scan_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qrcode_scan_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '二维码编码',
  `qr_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '二维码类型',
  `scan_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '扫描类型',
  `ref_id` bigint DEFAULT NULL COMMENT '关联ID',
  `ref_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联单号',
  `operator_id` bigint DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人',
  `scan_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'success' COMMENT '扫描结果',
  `scan_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '扫描消息',
  `scan_data` text COLLATE utf8mb4_unicode_ci COMMENT '扫描数据JSON',
  `device_info` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备信息',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_qr_code` (`qr_code`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='二维码扫描日志';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `report_user_config`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_user_config` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `report_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `selected_fields` json DEFAULT NULL,
  `selected_categories` json DEFAULT NULL,
  `date_range` json DEFAULT NULL,
  `view_mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'all',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ruc_user` (`user_id`),
  KEY `idx_ruc_key` (`report_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报表用户配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `saga_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saga_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `saga_id` varchar(64) NOT NULL,
  `saga_type` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `payload` text,
  `steps` text,
  `error_message` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_saga_id` (`saga_id`),
  KEY `idx_saga_type` (`saga_type`),
  KEY `idx_saga_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=339 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Saga 事务日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_delivery`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_delivery` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '出库单ID',
  `delivery_no` varchar(50) NOT NULL COMMENT '出库单号',
  `delivery_date` date DEFAULT NULL COMMENT '出库日期',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '销售订单ID',
  `order_no` varchar(50) DEFAULT NULL COMMENT '销售订单号（冗余）',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称（冗余）',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '仓库ID',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '总金额',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '总数量（明细数量合计）',
  `logistics_company` varchar(100) DEFAULT NULL COMMENT '物流公司',
  `tracking_no` varchar(50) DEFAULT NULL COMMENT '物流单号',
  `contact_name` varchar(50) DEFAULT NULL COMMENT '收货人姓名',
  `contact_phone` varchar(30) DEFAULT NULL COMMENT '收货人电话',
  `delivery_address` varchar(500) DEFAULT NULL COMMENT '配送地址',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待发货, 2-已发货, 3-已签收',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `ship_by` bigint unsigned DEFAULT NULL COMMENT '发货人ID',
  `ship_time` datetime DEFAULT NULL COMMENT '发货时间',
  `sign_by` bigint unsigned DEFAULT NULL COMMENT '签收人ID',
  `sign_time` datetime DEFAULT NULL COMMENT '签收时间',
  `sign_status` tinyint DEFAULT '0' COMMENT '签收状态: 0-未签收, 1-已签收',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记',
  `version` int DEFAULT '0' COMMENT '乐观锁版本号',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `currency` varchar(10) NOT NULL DEFAULT 'CNY' COMMENT '币种',
  `base_total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币金额',
  `base_currency` varchar(10) NOT NULL DEFAULT 'CNY' COMMENT '本位币',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_delivery_no` (`delivery_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_delivery_customer_status` (`customer_id`,`status`),
  CONSTRAINT `fk_sal_delivery_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_delivery_order` FOREIGN KEY (`order_id`) REFERENCES `sal_order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_delivery_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_delivery_detail`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_delivery_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `delivery_id` bigint unsigned NOT NULL COMMENT '出库单ID',
  `line_no` int DEFAULT NULL COMMENT '行号',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码（冗余）',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称（冗余）',
  `material_spec` varchar(100) DEFAULT NULL COMMENT '物料规格（冗余）',
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
  KEY `idx_material` (`material_id`),
  KEY `idx_order_detail` (`order_detail_id`),
  CONSTRAINT `fk_delivery_detail_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `sal_delivery` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_delivery_detail_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `sal_delivery` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_delivery_detail_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_delivery_detail_order_detail` FOREIGN KEY (`order_detail_id`) REFERENCES `sal_order_detail` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_delivery_order`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='送货单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_delivery_order_item`
--

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

--
-- Table structure for table `sal_order`
--

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
  `shipped_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已发货数量',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `total_with_tax` decimal(18,4) DEFAULT '0.0000' COMMENT '含税总额',
  `discount_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '折扣金额',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,4) DEFAULT '1.0000' COMMENT '汇率',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT '付款条件',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `contract_no` varchar(50) DEFAULT NULL COMMENT '合同编号',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待确认, 2-已确认, 3-部分发货, 4-已完成, 5-已取消',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `base_total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币合计金额',
  `base_tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币税额',
  `base_grand_total` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币价税合计',
  `actual_delivery_date` datetime DEFAULT NULL COMMENT '实际交付日期',
  `amount` decimal(18,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `fk_sal_order_customer` (`customer_id`),
  KEY `fk_sal_order_salesman` (`salesman_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_sal_order_deleted_time` (`deleted`,`create_time`),
  CONSTRAINT `fk_sal_order_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_order_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=152 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_order_detail`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_order_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '订单ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_name` varchar(100) DEFAULT NULL COMMENT '物料名称（冗余）',
  `quantity` decimal(18,4) NOT NULL COMMENT '销售数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(18,4) DEFAULT NULL COMMENT '单价',
  `tax_rate` decimal(18,4) DEFAULT '0.0000' COMMENT '税率(%)',
  `amount` decimal(18,4) DEFAULT NULL COMMENT '金额',
  `tax_amount` decimal(18,4) DEFAULT NULL COMMENT '税额',
  `total_amount` decimal(18,4) DEFAULT NULL COMMENT '含税金额',
  `delivered_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '已发货数量',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标记',
  `base_unit_price` decimal(18,4) DEFAULT NULL COMMENT '本币单价',
  `base_amount` decimal(18,4) DEFAULT NULL COMMENT '本币金额',
  `base_tax_amount` decimal(18,4) DEFAULT NULL COMMENT '本币税额',
  `base_line_total` decimal(18,4) DEFAULT NULL COMMENT '本价合计（漂移脚本漏项）',
  `shipped_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '已发货数量',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `specification` varchar(255) DEFAULT NULL COMMENT '规格',
  PRIMARY KEY (`id`),
  KEY `idx_material_name` (`material_name`),
  KEY `fk_sal_order_detail_order` (`order_id`),
  KEY `fk_sal_order_detail_material` (`material_id`),
  CONSTRAINT `fk_sal_order_detail_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_order_detail_order` FOREIGN KEY (`order_id`) REFERENCES `sal_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=160 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_order_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_order_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL COMMENT '订单ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称',
  `quantity` decimal(14,3) DEFAULT '0.000' COMMENT '数量',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `unit_price` decimal(14,4) DEFAULT '0.0000' COMMENT '单价',
  `total_price` decimal(14,2) DEFAULT '0.00' COMMENT '总价',
  `remark` text COMMENT '备注',
  `deleted` tinyint(1) DEFAULT '0' COMMENT '软删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单明细表(API)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_quote`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_quote` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `quote_no` varchar(50) NOT NULL COMMENT '报价单号',
  `quote_date` date NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `sample_card_id` bigint unsigned DEFAULT NULL COMMENT '来源工艺卡ID',
  `sample_no` varchar(50) DEFAULT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit` varchar(20) DEFAULT 'pcs',
  `material_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '物料成本快照',
  `labor_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '人工成本快照',
  `tool_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '工装成本快照',
  `total_cost` decimal(12,4) DEFAULT '0.0000' COMMENT '成本合计快照',
  `markup_rate` decimal(5,2) DEFAULT '30.00' COMMENT '加价率(%)',
  `quoted_price` decimal(12,4) DEFAULT '0.0000' COMMENT '报价金额',
  `currency` varchar(10) DEFAULT 'CNY',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1-草稿 2-已发送 3-已接受 4-已拒绝 5-已作废',
  `valid_until` date DEFAULT NULL,
  `remark` text,
  `create_by` bigint unsigned DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_by` bigint unsigned DEFAULT NULL,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_quote_no` (`quote_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_sample_card` (`sample_card_id`),
  KEY `idx_status` (`status`),
  KEY `idx_quote_date` (`quote_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='报价单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_quote_item`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_quote_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `quote_id` bigint unsigned NOT NULL,
  `line_no` int NOT NULL DEFAULT '1',
  `item_name` varchar(200) NOT NULL,
  `quantity` decimal(10,4) NOT NULL DEFAULT '1.0000',
  `unit` varchar(20) DEFAULT 'pcs',
  `unit_cost` decimal(12,4) DEFAULT '0.0000',
  `unit_price` decimal(12,4) DEFAULT '0.0000',
  `total_price` decimal(12,4) DEFAULT '0.0000',
  `remark` varchar(255) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quote_id` (`quote_id`),
  CONSTRAINT `fk_quote_item_quote` FOREIGN KEY (`quote_id`) REFERENCES `sal_quote` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='报价单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_reconciliation`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `currency` varchar(10) NOT NULL DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(18,4) NOT NULL DEFAULT '1.0000' COMMENT '汇率',
  `base_delivery_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本币送货金额',
  `base_return_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本币退货金额',
  `base_net_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本币净额',
  `base_discount_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本币折扣额',
  `base_received_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本币已收金额',
  `base_balance_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本币余额',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_no` (`reconciliation_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_period` (`period_start`,`period_end`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_sal_recon_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售对账表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_reconciliation_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_reconciliation_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `reconciliation_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '对账单号',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `period_start` date NOT NULL COMMENT '对账期间开始',
  `period_end` date NOT NULL COMMENT '对账期间结束',
  `delivery_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '送货金额',
  `return_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '退货金额',
  `discount_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '折扣金额',
  `net_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '对账净额',
  `received_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '已收金额',
  `balance_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '未收余额',
  `confirm_status` tinyint DEFAULT '0' COMMENT '客户确认: 0-未确认, 1-已确认, 2-有异议',
  `confirm_person` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '确认人',
  `confirm_time` datetime DEFAULT NULL COMMENT '确认时间',
  `confirm_remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '确认备注',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-草稿, 2-已发送, 3-已确认, 4-已关闭',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'CNY' COMMENT '币种'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_reconciliation_detail`
--

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

--
-- Table structure for table `sal_reconciliation_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_reconciliation_line` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `reconciliation_id` bigint unsigned NOT NULL COMMENT '对账单ID',
  `source_type` tinyint NOT NULL COMMENT '来源类型: 1-发货单, 2-退货单',
  `source_id` bigint unsigned NOT NULL COMMENT '来源单据ID',
  `source_no` varchar(50) NOT NULL COMMENT '来源单据号',
  `source_date` date NOT NULL COMMENT '来源单据日期',
  `amount` decimal(18,4) NOT NULL COMMENT '单据金额',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_reconciliation` (`reconciliation_id`),
  KEY `idx_source` (`source_type`,`source_id`),
  KEY `idx_source_no` (`source_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='对账单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_reconciliation_writeoff`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_reconciliation_writeoff` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '核销记录ID',
  `reconciliation_id` bigint unsigned NOT NULL COMMENT '对账单ID',
  `receivable_id` bigint unsigned NOT NULL COMMENT '应收单ID',
  `amount` decimal(18,4) NOT NULL COMMENT '核销金额',
  `write_off_date` date NOT NULL COMMENT '核销日期',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  PRIMARY KEY (`id`),
  KEY `idx_reconciliation` (`reconciliation_id`),
  KEY `idx_receivable` (`receivable_id`),
  KEY `idx_write_off_date` (`write_off_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='对账核销记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_return`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_return` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '退货单ID',
  `return_no` varchar(50) NOT NULL COMMENT '退货单号',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态: 1-待审核, 2-已审核, 3-已完成, 9-已取消',
  `order_id` bigint unsigned NOT NULL COMMENT '销售订单ID',
  `order_no` varchar(50) DEFAULT NULL COMMENT '销售订单号（冗余）',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称（冗余）',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '入库仓库ID',
  `delivery_id` bigint unsigned DEFAULT NULL COMMENT '关联发货单ID',
  `delivery_no` varchar(50) DEFAULT NULL COMMENT '关联发货单号（冗余）',
  `reason` varchar(500) NOT NULL COMMENT '退货原因',
  `return_date` date NOT NULL COMMENT '退货日期',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '退货总金额',
  `approve_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `approve_time` datetime DEFAULT NULL COMMENT '审核时间',
  `complete_by` bigint unsigned DEFAULT NULL COMMENT '完成人ID',
  `complete_time` datetime DEFAULT NULL COMMENT '完成时间',
  `inbound_order_id` bigint unsigned DEFAULT NULL COMMENT '关联入库单ID（退货入库）',
  `inbound_order_no` varchar(50) DEFAULT NULL COMMENT '关联入库单号（冗余）',
  `receivable_id` bigint unsigned DEFAULT NULL COMMENT '关联红字应收单ID',
  `receivable_no` varchar(50) DEFAULT NULL COMMENT '关联红字应收单号（冗余）',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `version` int DEFAULT '0' COMMENT '乐观锁版本号',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `return_type` tinyint NOT NULL DEFAULT '1' COMMENT '退货类型 1质量 2数量 3规格 4其他',
  `total_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '退货数量',
  `currency` varchar(10) NOT NULL DEFAULT 'CNY' COMMENT '币种',
  `base_total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币金额',
  `base_currency` varchar(10) NOT NULL DEFAULT 'CNY' COMMENT '本位币',
  `inspection_status` tinyint NOT NULL DEFAULT '0' COMMENT '验货状态 0未验 1验货中 2已验',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_return_no` (`return_no`),
  KEY `idx_status` (`status`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_delivery` (`delivery_id`),
  KEY `idx_return_date` (`return_date`),
  KEY `idx_inbound_order` (`inbound_order_id`),
  KEY `idx_receivable` (`receivable_id`),
  KEY `idx_return_customer_status` (`customer_id`,`status`),
  CONSTRAINT `fk_sal_return_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_return_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `sal_delivery` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_return_order` FOREIGN KEY (`order_id`) REFERENCES `sal_order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_return_receivable` FOREIGN KEY (`receivable_id`) REFERENCES `fin_receivable` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_return_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_return_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_return_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '退货单ID',
  `return_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '退货单号',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态: 1-待审核, 2-已审核, 3-已完成, 9-已取消',
  `order_id` bigint unsigned NOT NULL COMMENT '销售订单ID',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '销售订单号（冗余）',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称（冗余）',
  `warehouse_id` bigint unsigned NOT NULL COMMENT '入库仓库ID',
  `delivery_id` bigint unsigned DEFAULT NULL COMMENT '关联发货单ID',
  `delivery_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '关联发货单号（冗余）',
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '退货原因',
  `return_date` date NOT NULL COMMENT '退货日期',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '退货总金额',
  `approve_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `approve_time` datetime DEFAULT NULL COMMENT '审核时间',
  `complete_by` bigint unsigned DEFAULT NULL COMMENT '完成人ID',
  `complete_time` datetime DEFAULT NULL COMMENT '完成时间',
  `inbound_order_id` bigint unsigned DEFAULT NULL COMMENT '关联入库单ID（退货入库）',
  `inbound_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '关联入库单号（冗余）',
  `receivable_id` bigint unsigned DEFAULT NULL COMMENT '关联红字应收单ID',
  `receivable_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '关联红字应收单号（冗余）',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '备注',
  `version` int DEFAULT '0' COMMENT '乐观锁版本号',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `return_type` tinyint NOT NULL DEFAULT '1' COMMENT '退货类型 1质量 2数量 3规格 4其他',
  `total_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '退货数量',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'CNY' COMMENT '币种',
  `base_total_amount` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '本位币金额',
  `base_currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'CNY' COMMENT '本位币',
  `inspection_status` tinyint NOT NULL DEFAULT '0' COMMENT '验货状态 0未验 1验货中 2已验'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_return_detail`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_return_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `return_id` bigint unsigned NOT NULL COMMENT '退货单ID',
  `line_no` int NOT NULL COMMENT '行号',
  `delivery_detail_id` bigint unsigned DEFAULT NULL COMMENT '关联发货明细ID',
  `order_detail_id` bigint unsigned DEFAULT NULL COMMENT '关联订单明细ID',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) DEFAULT NULL COMMENT '物料编码（冗余）',
  `material_name` varchar(200) DEFAULT NULL COMMENT '物料名称（冗余）',
  `material_spec` varchar(100) DEFAULT NULL COMMENT '物料规格（冗余）',
  `unit` varchar(20) DEFAULT NULL COMMENT '单位',
  `quantity` decimal(18,4) NOT NULL COMMENT '退货数量',
  `unit_price` decimal(18,4) DEFAULT '0.0000' COMMENT '单价',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '金额',
  `batch_no` varchar(50) DEFAULT NULL COMMENT '批次号',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_return` (`return_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_order_detail` (`order_detail_id`),
  KEY `idx_batch` (`batch_no`),
  KEY `idx_delivery_detail` (`delivery_detail_id`),
  CONSTRAINT `fk_return_detail_return` FOREIGN KEY (`return_id`) REFERENCES `sal_return` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_return_detail_delivery_detail` FOREIGN KEY (`delivery_detail_id`) REFERENCES `sal_delivery_detail` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_return_detail_material` FOREIGN KEY (`material_id`) REFERENCES `inv_material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sal_return_detail_order_detail` FOREIGN KEY (`order_detail_id`) REFERENCES `sal_order_detail` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_return_order`
--

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
  KEY `idx_status` (`status`),
  KEY `idx_delivery_id` (`delivery_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  CONSTRAINT `fk_sal_return_order_order` FOREIGN KEY (`order_id`) REFERENCES `sal_order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_return_order_bak_20260923`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_return_order_bak_20260923` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `return_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '退货单号',
  `order_id` bigint unsigned DEFAULT NULL COMMENT '原销售订单ID',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '原销售订单编号',
  `delivery_id` bigint unsigned DEFAULT NULL COMMENT '原送货单ID',
  `delivery_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '原送货单号',
  `customer_id` bigint unsigned NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `return_date` date DEFAULT NULL COMMENT '退货日期',
  `return_type` tinyint DEFAULT '1' COMMENT '退货类型: 1-质量退货, 2-数量差异, 3-规格不符, 4-其他',
  `return_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '退货原因',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '退货总数量',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '退货总金额',
  `inspection_status` tinyint DEFAULT '0' COMMENT '质检状态: 0-未质检, 1-质检中, 2-已质检',
  `inspection_result` tinyint DEFAULT NULL COMMENT '质检结果: 1-合格, 2-不合格, 3-部分合格',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '退货入库仓库ID',
  `inbound_status` tinyint DEFAULT '0' COMMENT '入库状态: 0-未入库, 1-已入库',
  `status` tinyint DEFAULT '1' COMMENT '状态: 1-待审核, 2-已审核, 3-已退货, 4-已拒绝',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_return_order_item`
--

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
  KEY `idx_material` (`material_id`),
  CONSTRAINT `fk_sal_return_order_item_return` FOREIGN KEY (`return_id`) REFERENCES `sal_return_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退货单明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_sample_feedback`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_sample_feedback` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sample_order_id` bigint unsigned NOT NULL COMMENT '关联打样单ID',
  `round` int NOT NULL DEFAULT '1' COMMENT '反馈轮次',
  `feedback_content` text COMMENT '客户反馈意见',
  `modification_requirements` text COMMENT '修改要求',
  `confirmation_status` varchar(20) DEFAULT 'pending' COMMENT '确认状态: pending/approved/rejected',
  `feedback_by` varchar(100) DEFAULT NULL COMMENT '反馈人',
  `feedback_time` datetime DEFAULT NULL COMMENT '反馈时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_sample_order` (`sample_order_id`),
  KEY `idx_round` (`sample_order_id`,`round`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='打样反馈表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_sample_inventory`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_sample_inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sample_order_id` bigint unsigned DEFAULT NULL COMMENT '关联打样单ID',
  `product_name` varchar(200) DEFAULT NULL COMMENT '产品名称',
  `material_no` varchar(50) DEFAULT NULL COMMENT '物料编号',
  `quantity` int DEFAULT '0' COMMENT '样品数量',
  `unit` varchar(20) DEFAULT 'pcs' COMMENT '单位',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `status` varchar(20) DEFAULT 'available' COMMENT '状态: available/used/scrapped/sent',
  `sent_to` varchar(200) DEFAULT NULL COMMENT '寄送给谁',
  `sent_date` date DEFAULT NULL COMMENT '寄送日期',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_sample_order` (`sample_order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='样品库存表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_sample_inventory_bak_20260924_sao`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_sample_inventory_bak_20260924_sao` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `sample_order_id` bigint unsigned DEFAULT NULL COMMENT '关联打样单ID',
  `product_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '产品名称',
  `material_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料编号',
  `quantity` int DEFAULT '0' COMMENT '样品数量',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pcs' COMMENT '单位',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'available' COMMENT '状态: available/used/scrapped/sent',
  `sent_to` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '寄送给谁',
  `sent_date` date DEFAULT NULL COMMENT '寄送日期',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_sample_inventory_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_sample_inventory_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `sample_order_id` bigint unsigned DEFAULT NULL COMMENT '关联打样单ID',
  `product_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '产品名称',
  `material_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料编号',
  `quantity` int DEFAULT '0' COMMENT '样品数量',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pcs' COMMENT '单位',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '仓库ID',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'available' COMMENT '状态: available/used/scrapped/sent',
  `sent_to` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '寄送给谁',
  `sent_date` date DEFAULT NULL COMMENT '寄送日期',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_sample_order`
--

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
  `process_card_id` bigint unsigned DEFAULT NULL COMMENT '关联印前工艺卡ID',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联生产工单ID',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单ID',
  `sample_fee` decimal(18,4) DEFAULT '0.0000' COMMENT '打样费用',
  `fee_charged` tinyint DEFAULT '0' COMMENT '是否收取打样费: 0-否 1-是',
  `fee_deductible` tinyint DEFAULT '0' COMMENT '打样费是否可抵扣大货: 0-否 1-是',
  `fee_deducted` tinyint DEFAULT '0' COMMENT '打样费是否已抵扣: 0-否 1-是',
  `sample_version` int DEFAULT '1' COMMENT '打样版本号(支持多轮改样)',
  `parent_version_id` bigint unsigned DEFAULT NULL COMMENT '父版本打样单ID',
  `converted_at` datetime DEFAULT NULL COMMENT '转大货时间',
  `converted_by` bigint unsigned DEFAULT NULL COMMENT '转大货操作人',
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_notify_date` (`notify_date`)
) ENGINE=InnoDB AUTO_INCREMENT=195 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='打样订单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_sample_order_bak_20260924_sao`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_sample_order_bak_20260924_sao` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '打样订单号',
  `notify_date` date DEFAULT NULL COMMENT '通知日期',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `product_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '产品名称',
  `material_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料编号',
  `version` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'A' COMMENT '版本',
  `size_spec` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '尺寸规格',
  `material_spec` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '材料规格',
  `specification` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '规格型号',
  `quantity` int DEFAULT '0' COMMENT '数量',
  `order_date` date DEFAULT NULL COMMENT '订单日期',
  `customer_require_date` date DEFAULT NULL COMMENT '客户需求日期',
  `delivery_date` date DEFAULT NULL COMMENT '交付日期',
  `actual_delivery_date` date DEFAULT NULL COMMENT '实际交付日期',
  `delivery_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '交付状态',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '状态: pending/producing/completed/cancelled',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `process_card_id` bigint unsigned DEFAULT NULL COMMENT '关联印前工艺卡ID',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联生产工单ID',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单ID',
  `sample_fee` decimal(18,4) DEFAULT '0.0000' COMMENT '打样费用',
  `fee_charged` tinyint DEFAULT '0' COMMENT '是否收取打样费: 0-否 1-是',
  `fee_deductible` tinyint DEFAULT '0' COMMENT '打样费是否可抵扣大货: 0-否 1-是',
  `fee_deducted` tinyint DEFAULT '0' COMMENT '打样费是否已抵扣: 0-否 1-是',
  `sample_version` int DEFAULT '1' COMMENT '打样版本号(支持多轮改样)',
  `parent_version_id` bigint unsigned DEFAULT NULL COMMENT '父版本打样单ID',
  `converted_at` datetime DEFAULT NULL COMMENT '转大货时间',
  `converted_by` bigint unsigned DEFAULT NULL COMMENT '转大货操作人',
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sal_sample_order_bak_20260926`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sal_sample_order_bak_20260926` (
  `id` bigint unsigned NOT NULL DEFAULT '0',
  `order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '打样订单号',
  `notify_date` date DEFAULT NULL COMMENT '通知日期',
  `customer_id` bigint unsigned DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '客户名称',
  `product_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '产品名称',
  `material_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '物料编号',
  `version` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'A' COMMENT '版本',
  `size_spec` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '尺寸规格',
  `material_spec` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '材料规格',
  `specification` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '规格型号',
  `quantity` int DEFAULT '0' COMMENT '数量',
  `order_date` date DEFAULT NULL COMMENT '订单日期',
  `customer_require_date` date DEFAULT NULL COMMENT '客户需求日期',
  `delivery_date` date DEFAULT NULL COMMENT '交付日期',
  `actual_delivery_date` date DEFAULT NULL COMMENT '实际交付日期',
  `delivery_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '交付状态',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT '状态: pending/producing/completed/cancelled',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `process_card_id` bigint unsigned DEFAULT NULL COMMENT '关联印前工艺卡ID',
  `work_order_id` bigint unsigned DEFAULT NULL COMMENT '关联生产工单ID',
  `sales_order_id` bigint unsigned DEFAULT NULL COMMENT '关联销售订单ID',
  `sample_fee` decimal(18,4) DEFAULT '0.0000' COMMENT '打样费用',
  `fee_charged` tinyint DEFAULT '0' COMMENT '是否收取打样费: 0-否 1-是',
  `fee_deductible` tinyint DEFAULT '0' COMMENT '打样费是否可抵扣大货: 0-否 1-是',
  `fee_deducted` tinyint DEFAULT '0' COMMENT '打样费是否已抵扣: 0-否 1-是',
  `sample_version` int DEFAULT '1' COMMENT '打样版本号(支持多轮改样)',
  `parent_version_id` bigint unsigned DEFAULT NULL COMMENT '父版本打样单ID',
  `converted_at` datetime DEFAULT NULL COMMENT '转大货时间',
  `converted_by` bigint unsigned DEFAULT NULL COMMENT '转大货操作人',
  `deleted` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `screen_plate_history`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `screen_plate_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `screen_plate_id` int NOT NULL,
  `action` varchar(50) NOT NULL COMMENT 'Created/Exposed/Printed/Cleaned/Reclaimed/Scrapped/TensionAdjusted',
  `tension_value` decimal(6,2) DEFAULT NULL,
  `life_increment` int DEFAULT '0',
  `remark` text,
  `operator_id` bigint unsigned DEFAULT NULL,
  `operator_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_screen_plate_action` (`screen_plate_id`,`action`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `screen_plate_history_ibfk_1` FOREIGN KEY (`screen_plate_id`) REFERENCES `prd_screen_plate` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='网版生命周期历史记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `split_order`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `split_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `split_no` varchar(50) NOT NULL COMMENT '分切单号',
  `split_date` date DEFAULT NULL COMMENT '分切日期',
  `parent_batch_id` bigint unsigned DEFAULT NULL COMMENT '母料批次ID',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_name` varchar(100) DEFAULT NULL,
  `warehouse_id` bigint unsigned DEFAULT NULL,
  `out_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '良品出库量',
  `total_waste` decimal(18,4) DEFAULT '0.0000' COMMENT '损耗量',
  `status` tinyint DEFAULT '0' COMMENT '0草稿 1已审核 3已作废',
  `remark` varchar(500) DEFAULT NULL,
  `operator_id` bigint unsigned DEFAULT NULL,
  `operator_name` varchar(50) DEFAULT NULL,
  `create_by` bigint unsigned DEFAULT NULL,
  `total_cost` decimal(18,4) DEFAULT '0.0000',
  `audit_time` datetime DEFAULT NULL,
  `auditor_id` bigint unsigned DEFAULT NULL,
  `auditor_name` varchar(50) DEFAULT NULL,
  `version` int unsigned DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_split_no` (`split_no`),
  KEY `idx_parent_batch` (`parent_batch_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_split_date` (`split_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分切单(大料分小料)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `split_order_detail`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `split_order_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `split_id` bigint unsigned DEFAULT NULL,
  `pieces` int DEFAULT '1' COMMENT '件数',
  `qty_per_piece` decimal(18,4) DEFAULT '0.0000' COMMENT '每件数量',
  `total_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '该明细总数量',
  `width` decimal(18,2) DEFAULT '0.00' COMMENT '宽幅',
  `is_waste` tinyint DEFAULT '0' COMMENT '是否损耗 0良品 1损耗',
  `remark` varchar(255) DEFAULT NULL,
  `child_batch_id` bigint unsigned DEFAULT NULL COMMENT '审核后生成的子批ID',
  `child_batch_no` varchar(50) DEFAULT NULL,
  `allocated_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '分摊成本',
  PRIMARY KEY (`id`),
  KEY `idx_split` (`split_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分切单明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `srm_supplier_eval`
--

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

--
-- Table structure for table `srm_supplier_eval_item`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商评估明细';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `std_bom_header`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `std_bom_header` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `bom_no` varchar(50) NOT NULL COMMENT 'BOM编号',
  `product_id` bigint unsigned NOT NULL COMMENT '产品ID',
  `product_code` varchar(50) NOT NULL COMMENT '产品编码',
  `product_name` varchar(200) NOT NULL COMMENT '产品名称',
  `product_spec` varchar(500) DEFAULT NULL COMMENT '产品规格',
  `version` varchar(20) DEFAULT 'V1.0' COMMENT '版本号',
  `is_default` tinyint DEFAULT '1' COMMENT '是否默认版本',
  `status` tinyint DEFAULT '0' COMMENT '状态: 0-草稿,1-已发布,2-已停用',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `base_qty` decimal(18,4) DEFAULT '1.0000' COMMENT '基础数量',
  `total_material_count` int unsigned DEFAULT '0' COMMENT '物料总数',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `effective_date` date DEFAULT NULL COMMENT '生效日期',
  `obsolete_date` date DEFAULT NULL COMMENT '失效日期',
  `remark` text COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `approve_by` bigint unsigned DEFAULT NULL COMMENT '审核人ID',
  `approve_time` datetime DEFAULT NULL COMMENT '审核时间',
  `publish_time` datetime DEFAULT NULL COMMENT '发布时间',
  `legacy_source` varchar(30) DEFAULT NULL COMMENT '旧表来源',
  `legacy_id` bigint unsigned DEFAULT NULL COMMENT '旧表原始ID',
  `deleted` tinyint DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bom_no` (`bom_no`),
  UNIQUE KEY `uk_product_version` (`product_id`,`version`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_status` (`status`),
  KEY `idx_is_default` (`is_default`),
  KEY `idx_effective` (`effective_date`,`obsolete_date`),
  KEY `idx_legacy` (`legacy_source`,`legacy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准BOM主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `std_bom_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `std_bom_line` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `bom_id` bigint unsigned NOT NULL COMMENT 'BOM主表ID',
  `line_no` int unsigned NOT NULL COMMENT '行号',
  `parent_line_id` bigint unsigned DEFAULT NULL COMMENT '父行ID',
  `level` int unsigned DEFAULT '1' COMMENT '层级',
  `material_id` bigint unsigned NOT NULL COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(500) DEFAULT NULL COMMENT '物料规格',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `consumption_qty` decimal(18,6) NOT NULL DEFAULT '0.000000' COMMENT '消耗数量',
  `loss_rate` decimal(5,2) DEFAULT '0.00' COMMENT '损耗率',
  `actual_qty` decimal(18,6) DEFAULT '0.000000' COMMENT '实际用量',
  `unit_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '单位成本',
  `total_cost` decimal(18,4) DEFAULT '0.0000' COMMENT '总成本',
  `material_type` tinyint DEFAULT '1' COMMENT '物料类型: 1-原材料,2-半成品,3-辅料,4-包材,5-其他',
  `is_key_material` tinyint DEFAULT '0' COMMENT '是否关键物料',
  `position_no` varchar(50) DEFAULT NULL COMMENT '位号',
  `process_seq` int unsigned DEFAULT NULL COMMENT '工序序号',
  `process_name` varchar(100) DEFAULT NULL COMMENT '工序名称',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bom_line` (`bom_id`,`line_no`),
  KEY `idx_parent_line` (`parent_line_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_material_type` (`material_type`),
  CONSTRAINT `fk_std_bom_line_header` FOREIGN KEY (`bom_id`) REFERENCES `std_bom_header` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准BOM行表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `std_material`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `std_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '物料名称',
  `specification` varchar(500) DEFAULT NULL COMMENT '规格型号',
  `category_id` bigint unsigned DEFAULT NULL COMMENT '分类ID',
  `material_type` tinyint DEFAULT '1' COMMENT '物料类型: 1-原材料,2-半成品,3-成品,4-辅料,5-包材,6-其他',
  `unit` varchar(20) DEFAULT NULL COMMENT '计量单位',
  `barcode` varchar(50) DEFAULT NULL COMMENT '条形码',
  `brand` varchar(50) DEFAULT NULL COMMENT '品牌',
  `safety_stock` decimal(18,4) DEFAULT '0.0000' COMMENT '安全库存',
  `max_stock` decimal(18,4) DEFAULT NULL COMMENT '最大库存',
  `min_stock` decimal(18,4) DEFAULT NULL COMMENT '最小库存',
  `purchase_price` decimal(18,4) DEFAULT NULL COMMENT '采购单价',
  `sale_price` decimal(18,4) DEFAULT NULL COMMENT '销售单价',
  `cost_price` decimal(18,4) DEFAULT NULL COMMENT '成本单价',
  `unit_cost` decimal(18,4) DEFAULT NULL COMMENT '参考成本',
  `warehouse_id` bigint unsigned DEFAULT NULL COMMENT '默认仓库ID',
  `default_supplier_id` bigint unsigned DEFAULT NULL COMMENT '默认供应商ID',
  `default_supplier_name` varchar(100) DEFAULT NULL COMMENT '默认供应商',
  `shelf_life` int DEFAULT NULL COMMENT '保质期(天)',
  `warning_days` int DEFAULT NULL COMMENT '预警天数',
  `is_batch_managed` tinyint DEFAULT '0' COMMENT '是否批次管理: 0-否,1-是',
  `is_serial_managed` tinyint DEFAULT '0' COMMENT '是否序列号管理: 0-否,1-是',
  `is_active` tinyint DEFAULT '1' COMMENT '是否启用',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用,1-启用',
  `remark` text COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `legacy_source` varchar(30) DEFAULT NULL COMMENT '旧表来源: inv_material/bom_material/mdm_material',
  `legacy_id` bigint unsigned DEFAULT NULL COMMENT '旧表原始ID',
  `deleted` tinyint DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_code` (`material_code`),
  KEY `idx_material_name` (`material_name`),
  KEY `idx_material_type` (`material_type`),
  KEY `idx_category` (`category_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_legacy` (`legacy_source`,`legacy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4115 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准物料主档';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `std_purchase_order`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `std_purchase_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_no` varchar(50) NOT NULL COMMENT '采购单号',
  `source_request_id` bigint unsigned DEFAULT NULL COMMENT '来源请购单ID',
  `source_request_no` varchar(50) DEFAULT NULL COMMENT '来源请购单号',
  `supplier_id` bigint unsigned DEFAULT NULL COMMENT '供应商ID',
  `supplier_name` varchar(100) NOT NULL COMMENT '供应商名称',
  `supplier_code` varchar(50) DEFAULT NULL COMMENT '供应商编码',
  `order_date` date NOT NULL COMMENT '订单日期',
  `delivery_date` date DEFAULT NULL COMMENT '预计交货日期',
  `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` decimal(10,4) DEFAULT '1.0000' COMMENT '汇率',
  `total_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '订单总金额',
  `total_quantity` decimal(18,4) DEFAULT '0.0000' COMMENT '订单总数量',
  `tax_rate` decimal(5,2) DEFAULT '13.00' COMMENT '税率%',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `grand_total` decimal(18,4) DEFAULT '0.0000' COMMENT '含税总金额',
  `status` tinyint DEFAULT '0' COMMENT '状态: 0-草稿,1-已提交,2-审校中,3-审校通过,4-已批准,5-部分收货,6-已完成,7-已取消,8-已关闭',
  `over_receipt_tolerance` decimal(5,2) DEFAULT '5.00' COMMENT '超收容差率%',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT '付款条款',
  `delivery_address` text COMMENT '送货地址',
  `contact_person` varchar(50) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `remark` text COMMENT '备注',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `approve_by` bigint unsigned DEFAULT NULL COMMENT '批准人ID',
  `approve_time` datetime DEFAULT NULL COMMENT '批准时间',
  `close_by` bigint unsigned DEFAULT NULL COMMENT '关闭人ID',
  `close_time` datetime DEFAULT NULL COMMENT '关闭时间',
  `close_reason` varchar(200) DEFAULT NULL COMMENT '关闭原因',
  `legacy_source` varchar(30) DEFAULT NULL COMMENT '旧表来源: pur_order / pur_purchase_order',
  `legacy_id` bigint unsigned DEFAULT NULL COMMENT '旧表原始ID',
  `deleted` tinyint DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_source_request` (`source_request_id`),
  KEY `idx_legacy` (`legacy_source`,`legacy_id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准采购订单主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `std_purchase_order_line`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `std_purchase_order_line` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id` bigint unsigned NOT NULL COMMENT '采购单ID',
  `line_no` int unsigned NOT NULL COMMENT '行号',
  `material_id` bigint unsigned DEFAULT NULL COMMENT '物料ID',
  `material_code` varchar(50) NOT NULL COMMENT '物料编码',
  `material_name` varchar(200) NOT NULL COMMENT '物料名称',
  `material_spec` varchar(500) DEFAULT NULL COMMENT '物料规格',
  `unit` varchar(20) DEFAULT '件' COMMENT '单位',
  `order_qty` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '订购数量',
  `received_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '累计入库数量',
  `returned_qty` decimal(18,4) DEFAULT '0.0000' COMMENT '累计退货数量',
  `unit_price` decimal(18,4) NOT NULL DEFAULT '0.0000' COMMENT '单价',
  `amount` decimal(18,4) DEFAULT '0.0000' COMMENT '金额',
  `tax_rate` decimal(5,2) DEFAULT '13.00' COMMENT '税率%',
  `tax_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '税额',
  `line_total` decimal(18,4) DEFAULT '0.0000' COMMENT '行合计',
  `require_date` date DEFAULT NULL COMMENT '需求日期',
  `closed_flag` tinyint DEFAULT '0' COMMENT '行关闭标志',
  `closed_reason` varchar(200) DEFAULT NULL COMMENT '关闭原因',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_line` (`order_id`,`line_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_require_date` (`require_date`),
  CONSTRAINT `fk_std_po_line_order` FOREIGN KEY (`order_id`) REFERENCES `std_purchase_order` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准采购订单行表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stock_flow`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_flow` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `flow_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_no` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_id` bigint DEFAULT NULL,
  `warehouse_id` bigint unsigned NOT NULL,
  `warehouse_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `stock_before` decimal(18,4) NOT NULL,
  `stock_after` decimal(18,4) NOT NULL,
  `unit_price` decimal(12,4) DEFAULT '0.0000',
  `total_amount` decimal(14,2) DEFAULT '0.00',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_by_id` bigint DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_flow_no` (`flow_no`),
  KEY `idx_business_type` (`business_type`),
  KEY `idx_source` (`source_type`,`source_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_create_by` (`create_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_announcement`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_announcement` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '公告ID',
  `title` varchar(200) NOT NULL COMMENT '公告标题',
  `content` text NOT NULL COMMENT '公告内容',
  `type` varchar(20) DEFAULT 'info' COMMENT '类型',
  `priority` int DEFAULT '0' COMMENT '优先级',
  `is_top` tinyint DEFAULT '0' COMMENT '是否置顶',
  `publish_time` datetime DEFAULT NULL COMMENT '发布时间',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间',
  `status` varchar(20) DEFAULT 'draft' COMMENT '状态',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_publish_time` (`publish_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统公告';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_announcement_read`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_announcement_read` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `announcement_id` bigint unsigned NOT NULL COMMENT '公告ID',
  `user_id` bigint unsigned NOT NULL COMMENT '用户ID',
  `read_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_announcement_user` (`announcement_id`,`user_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='公告阅读记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_calc_param`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_calc_param` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '参数ID',
  `category` varchar(50) NOT NULL COMMENT '分类: mrp/cost/schedule/qc/screen_plate/printing',
  `param_key` varchar(100) NOT NULL COMMENT '参数键 (如 mrp.default_lead_time_days)',
  `param_value` varchar(500) NOT NULL COMMENT '参数值 (字符串存储，由服务层转型)',
  `value_type` enum('int','decimal','boolean','string') NOT NULL DEFAULT 'string' COMMENT '值类型',
  `default_value` varchar(500) DEFAULT NULL COMMENT '代码内置默认值（用于 DB 不可用时兜底）',
  `description` varchar(500) DEFAULT NULL COMMENT '参数说明',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0-禁用 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_param_key` (`param_key`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='计算参数配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_calc_param_category_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_calc_param_category_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '参数ID',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '分类: mrp/cost/schedule/qc/screen_plate/printing',
  `param_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '参数键 (如 mrp.default_lead_time_days)',
  `param_value` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '参数值 (字符串存储，由服务层转型)',
  `value_type` enum('int','decimal','boolean','string') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'string' COMMENT '值类型',
  `default_value` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '代码内置默认值（用于 DB 不可用时兜底）',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '参数说明',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0-禁用 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常 1-已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_company`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_company` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `short_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `legal_person` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reg_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'CNY' COMMENT '本位币',
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fax` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postcode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_config`
--

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
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `config_group` varchar(50) DEFAULT NULL COMMENT '配置分组',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=379 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_config_change_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_config_change_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `old_value` text NOT NULL COMMENT '旧值',
  `new_value` text NOT NULL COMMENT '新值',
  `operator_id` int NOT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `remark` varchar(500) DEFAULT NULL COMMENT '变更说明',
  `status` tinyint DEFAULT '0' COMMENT '0=待审批，1=已通过，2=已驳回',
  `approver_id` int DEFAULT NULL COMMENT '审批人ID',
  `approver_name` varchar(50) DEFAULT NULL COMMENT '审批人姓名',
  `approve_time` datetime DEFAULT NULL COMMENT '审批时间',
  `approve_remark` varchar(500) DEFAULT NULL COMMENT '审批意见',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_config_key` (`config_key`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='配置变更审批记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_config_change_request`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_config_change_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module` varchar(100) NOT NULL,
  `config_key` varchar(200) NOT NULL,
  `old_value` text,
  `new_value` text NOT NULL,
  `change_type` varchar(20) DEFAULT 'update',
  `reason` text,
  `applicant_id` int DEFAULT '0',
  `applicant_name` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `approver_id` int DEFAULT NULL,
  `approver_name` varchar(100) DEFAULT NULL,
  `approve_time` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_module` (`module`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_currency`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_currency` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL COMMENT '币种代码 ISO 4217 (CNY/USD/VND)',
  `name` varchar(50) NOT NULL COMMENT '币种名称',
  `symbol` varchar(10) DEFAULT NULL COMMENT '符号 (¥/$/₫)',
  `decimal_places` tinyint DEFAULT '2' COMMENT '小数位 (CNY=2, USD=2, VND=0)',
  `status` tinyint DEFAULT '1' COMMENT '1启用 0停用',
  `sort` int DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_currency_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='币种主数据';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_daily_check_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_daily_check_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '巡检ID',
  `check_date` date NOT NULL COMMENT '巡检日期',
  `check_type` varchar(50) NOT NULL COMMENT '巡检类型',
  `error_count` int NOT NULL DEFAULT '0' COMMENT '异常数量',
  `error_detail` text COMMENT '异常明细',
  `status` tinyint DEFAULT '0' COMMENT '0待处理 1已处理',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_check_date` (`check_date`),
  KEY `idx_check_type` (`check_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统每日巡检日志';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_data_scope`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_data_scope` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint unsigned NOT NULL,
  `scope_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_ids` text COLLATE utf8mb4_unicode_ci,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_data_scope_role` (`role_id`),
  KEY `idx_data_scope_type` (`scope_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据权限范围';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_department`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_department` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '部门ID',
  `parent_id` bigint unsigned DEFAULT NULL COMMENT '父部门ID, NULL为顶级部门',
  `dept_name` varchar(100) NOT NULL COMMENT '部门名称',
  `dept_code` varchar(50) DEFAULT NULL COMMENT '部门编码',
  `sort_order` int DEFAULT '0' COMMENT '排序序号',
  `leader_id` bigint unsigned DEFAULT NULL COMMENT '部门负责人ID',
  `phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_leader` (`leader_id`),
  CONSTRAINT `fk_sys_department_leader` FOREIGN KEY (`leader_id`) REFERENCES `sys_user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sys_department_parent` FOREIGN KEY (`parent_id`) REFERENCES `sys_department` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='部门表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_dict_data`
--

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
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  KEY `idx_dict_type` (`dict_type_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_dict_data_type` FOREIGN KEY (`dict_type_id`) REFERENCES `sys_dict_type` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='字典数据表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_dict_type`
--

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
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='字典类型表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_employee`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除',
  `bank_account` varchar(50) DEFAULT NULL COMMENT '银行账号',
  `emergency_contact` varchar(50) DEFAULT NULL COMMENT '紧急联系人',
  `emergency_phone` varchar(20) DEFAULT NULL COMMENT '紧急联系电话',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_no` (`employee_no`)
) ENGINE=InnoDB AUTO_INCREMENT=1012 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_event_processed`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_event_processed` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL COMMENT 'domain_event_outbox.id',
  `handler_name` varchar(255) NOT NULL COMMENT '处理器类名',
  `status` varchar(20) NOT NULL DEFAULT 'processed' COMMENT 'processing-处理中, processed-已处理',
  `processed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_handler` (`event_id`,`handler_name`),
  KEY `idx_processed_at` (`processed_at`),
  KEY `idx_status_processed_at` (`status`,`processed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4710 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='事件幂等表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_exchange_rate`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_exchange_rate` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `from_currency` varchar(10) NOT NULL COMMENT '源币种',
  `to_currency` varchar(10) NOT NULL COMMENT '目标币种',
  `rate` decimal(18,6) NOT NULL COMMENT '汇率',
  `rate_date` date NOT NULL COMMENT '汇率日期',
  `source` varchar(50) DEFAULT 'manual' COMMENT '汇率来源 manual/api',
  `remark` varchar(200) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_exchange_rate_pair_date` (`from_currency`,`to_currency`,`rate_date`),
  KEY `idx_from_to_date` (`from_currency`,`to_currency`,`rate_date`),
  KEY `idx_date` (`rate_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='汇率表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_login_log`
--

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
  KEY `idx_create_time` (`create_time`),
  KEY `idx_login_log_time_user` (`create_time`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1443 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='登录日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_menu`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_menu` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `parent_id` bigint unsigned DEFAULT NULL COMMENT '父菜单ID, NULL为顶级菜单',
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
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_menu_code` (`menu_code`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_type` (`menu_type`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_sys_menu_parent` FOREIGN KEY (`parent_id`) REFERENCES `sys_menu` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=131 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='菜单权限表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_migration`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_migration` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `migration_name` varchar(255) NOT NULL,
  `batch` int NOT NULL DEFAULT '1',
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `migration_name` (`migration_name`),
  KEY `idx_migration_name` (`migration_name`),
  KEY `idx_applied_at` (`applied_at`)
) ENGINE=InnoDB AUTO_INCREMENT=166 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_notice`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通知公告表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_notification`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_notification` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `type` varchar(30) NOT NULL COMMENT '通知类型：inventory_alert/system/task/security等',
  `title` varchar(200) NOT NULL COMMENT '通知标题',
  `content` text COMMENT '通知内容',
  `user_id` bigint unsigned DEFAULT NULL COMMENT '接收用户ID（空表示广播）',
  `is_read` tinyint DEFAULT '0' COMMENT '是否已读：0未读 1已读',
  `read_time` datetime DEFAULT NULL COMMENT '阅读时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_read` (`is_read`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统通知';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_oper_log`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='操作日志记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_operate_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_operate_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `module` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `content` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `before_data` longtext COLLATE utf8mb4_unicode_ci,
  `after_data` longtext COLLATE utf8mb4_unicode_ci,
  `ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_method` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_param` longtext COLLATE utf8mb4_unicode_ci,
  `response_result` longtext COLLATE utf8mb4_unicode_ci,
  `status` tinyint DEFAULT '1',
  `error_msg` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_ms` int DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_type` (`type`),
  KEY `idx_username` (`username`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_module_type` (`module`,`type`),
  KEY `idx_title` (`title`),
  KEY `idx_ip` (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_operation_log`
--

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
  `business_id` varchar(100) DEFAULT '' COMMENT '业务ID',
  `business_type` varchar(50) DEFAULT '' COMMENT '业务类型',
  `response_result` text COMMENT '响应结果',
  `title` varchar(100) DEFAULT NULL COMMENT 'title',
  `oper_name` varchar(100) DEFAULT NULL COMMENT 'oper_name',
  `oper_type` tinyint DEFAULT NULL COMMENT 'oper_type',
  `oper_method` varchar(100) DEFAULT NULL COMMENT 'oper_method',
  `oper_url` varchar(255) DEFAULT NULL COMMENT 'oper_url',
  `oper_ip` varchar(255) DEFAULT NULL COMMENT 'oper_ip',
  `oper_time` datetime DEFAULT NULL COMMENT 'oper_time',
  `module` varchar(100) DEFAULT NULL COMMENT 'module',
  `oper_param` json DEFAULT NULL COMMENT 'oper_param',
  `oper_result` tinyint DEFAULT NULL COMMENT 'oper_result',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_oper_log_time` (`create_time`),
  KEY `idx_oper_log_time_user` (`create_time`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=589 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='操作日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_role`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_name` varchar(50) NOT NULL COMMENT '角色名称',
  `role_code` varchar(50) NOT NULL COMMENT '角色编码',
  `description` varchar(255) DEFAULT NULL COMMENT '角色描述',
  `data_scope` tinyint DEFAULT '1' COMMENT '数据范围: 1-全部, 2-本部门, 3-本部门及下级, 4-仅本人',
  `permissions` json DEFAULT NULL COMMENT '按钮权限码（JSON 数组，通配形态如 warehouse:* / orders:sales:*）。正式读写入口 /api/role-permissions/buttons，前端按钮显隐唯一数据源；不参与服务端鉴权（鉴权以 sys_role_menu + sys_menu 为准）。2026-09-24 起 organization/role 与 system/roles 的写入通道已关闭。',
  `status` tinyint DEFAULT '1' COMMENT '状态: 0-禁用, 1-启用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  `parent_id` int DEFAULT NULL COMMENT '父角色ID（角色继承）',
  `inherit_mode` varchar(20) NOT NULL DEFAULT 'merge' COMMENT '权限继承模式: merge(合并) | override(覆盖)',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  `role_type` tinyint NOT NULL DEFAULT '2' COMMENT '角色类型：1-系统角色 2-自定义',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`),
  KEY `idx_status` (`status`),
  KEY `idx_sys_role_parent_id` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_role_menu`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role_menu` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `role_id` bigint unsigned NOT NULL COMMENT '角色ID',
  `menu_id` bigint unsigned NOT NULL COMMENT '菜单ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_menu` (`role_id`,`menu_id`),
  KEY `idx_menu` (`menu_id`),
  CONSTRAINT `fk_role_menu_menu` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_menu_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=664 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色菜单关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_salary`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='薪资表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_scheduled_task`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_scheduled_task` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `task_name` varchar(200) NOT NULL COMMENT '任务名称',
  `task_type` varchar(50) NOT NULL COMMENT '任务类型',
  `task_group` varchar(50) DEFAULT 'default' COMMENT '任务分组',
  `cron_expression` varchar(100) DEFAULT NULL COMMENT 'Cron表达式',
  `description` text COMMENT '任务描述',
  `config` text COMMENT '任务配置（JSON）',
  `status` varchar(20) DEFAULT 'active' COMMENT '状态：active/paused',
  `last_execute_time` datetime DEFAULT NULL COMMENT '最后执行时间',
  `last_result` text COMMENT '最后执行结果',
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_task_type` (`task_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='定时任务表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_task_execution_log`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_task_execution_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `task_id` bigint unsigned NOT NULL COMMENT '任务ID',
  `task_name` varchar(200) DEFAULT NULL COMMENT '任务名称',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `status` varchar(20) DEFAULT 'running' COMMENT '状态',
  `result` text COMMENT '执行结果',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='任务执行日志';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_user`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_department` (`department_id`),
  KEY `idx_status` (`status`),
  KEY `idx_sys_user_department_id` (`department_id`),
  CONSTRAINT `fk_sys_user_department` FOREIGN KEY (`department_id`) REFERENCES `sys_department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_user_department` FOREIGN KEY (`department_id`) REFERENCES `sys_department` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_user_dept_bak_20260925`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user_dept_bak_20260925` (
  `id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '用户ID',
  `department_id` bigint unsigned DEFAULT NULL COMMENT '部门ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_user_role`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user_role` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint unsigned NOT NULL COMMENT '用户ID',
  `role_id` bigint unsigned NOT NULL COMMENT '角色ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`,`role_id`),
  KEY `idx_role` (`role_id`),
  CONSTRAINT `fk_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sys_warehouse_category`
--

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
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除: 0-正常, 1-已删除',
  PRIMARY KEY (`id`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_bom_std_full`
--

SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_bom_std_full` AS SELECT 
 1 AS `bom_id`,
 1 AS `bom_code`,
 1 AS `product_id`,
 1 AS `product_code`,
 1 AS `product_name`,
 1 AS `version`,
 1 AS `effective_date`,
 1 AS `obsolete_date`,
 1 AS `status`,
 1 AS `line_id`,
 1 AS `line_no`,
 1 AS `material_id`,
 1 AS `material_code`,
 1 AS `material_name`,
 1 AS `consumption_qty`,
 1 AS `waste_rate`,
 1 AS `material_type`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_hr_attendance_full`
--

SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_hr_attendance_full` AS SELECT 
 1 AS `id`,
 1 AS `attendance_date`,
 1 AS `employee_code`,
 1 AS `emp_id`,
 1 AS `employee_name`,
 1 AS `department_name`,
 1 AS `check_in_time`,
 1 AS `check_out_time`,
 1 AS `status`,
 1 AS `working_hours`,
 1 AS `overtime_hours`,
 1 AS `remark`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_inventory_batch_full`
--

SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_inventory_batch_full` AS SELECT 
 1 AS `inventory_id`,
 1 AS `material_id`,
 1 AS `material_code`,
 1 AS `material_name`,
 1 AS `material_spec`,
 1 AS `unit`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `total_qty`,
 1 AS `batch_available_qty`,
 1 AS `diff_qty`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_outbound_batch_allocation_full`
--

SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_outbound_batch_allocation_full` AS SELECT 
 1 AS `id`,
 1 AS `source_type`,
 1 AS `source_id`,
 1 AS `source_no`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `material_id`,
 1 AS `material_code`,
 1 AS `material_name`,
 1 AS `batch_id`,
 1 AS `batch_no`,
 1 AS `allocated_qty`,
 1 AS `unit_cost`,
 1 AS `total_cost`,
 1 AS `fifo_mode`,
 1 AS `operator_name`,
 1 AS `create_time`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_purchase_order_std_full`
--

SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_purchase_order_std_full` AS SELECT 
 1 AS `id`,
 1 AS `po_code`,
 1 AS `request_id`,
 1 AS `request_no`,
 1 AS `supplier_id`,
 1 AS `supplier_name`,
 1 AS `order_date`,
 1 AS `delivery_date`,
 1 AS `total_amount`,
 1 AS `tax_rate`,
 1 AS `tax_amount`,
 1 AS `grand_total`,
 1 AS `status`,
 1 AS `currency`,
 1 AS `remark`,
 1 AS `create_by`,
 1 AS `create_by_name`,
 1 AS `create_time`,
 1 AS `approve_by`,
 1 AS `approve_time`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_purchase_request_full`
--

SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_purchase_request_full` AS SELECT 
 1 AS `id`,
 1 AS `request_no`,
 1 AS `request_date`,
 1 AS `request_type`,
 1 AS `request_dept_id`,
 1 AS `request_dept_name`,
 1 AS `requester_id`,
 1 AS `requester_name`,
 1 AS `reviewer_id`,
 1 AS `reviewer_name`,
 1 AS `approver_id`,
 1 AS `approver_name`,
 1 AS `status`,
 1 AS `priority`,
 1 AS `expected_date`,
 1 AS `total_amount`,
 1 AS `currency`,
 1 AS `remark`,
 1 AS `create_time`,
 1 AS `update_time`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `wf_approval_cc`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wf_approval_cc` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `instance_id` bigint unsigned NOT NULL,
  `node_id` bigint unsigned DEFAULT NULL,
  `cc_user_id` bigint NOT NULL,
  `cc_user_name` varchar(50) DEFAULT NULL,
  `is_read` tinyint DEFAULT '0',
  `read_time` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_instance` (`instance_id`),
  KEY `idx_cc_user` (`cc_user_id`),
  KEY `idx_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wf_approval_history`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wf_approval_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `instance_id` bigint unsigned NOT NULL,
  `task_id` bigint unsigned DEFAULT NULL,
  `action` varchar(20) NOT NULL,
  `operator_id` bigint DEFAULT NULL,
  `operator_name` varchar(50) DEFAULT NULL,
  `from_status` tinyint DEFAULT NULL,
  `to_status` tinyint DEFAULT NULL,
  `comment` text,
  `ip_address` varchar(50) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_instance` (`instance_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wf_approval_instance`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wf_approval_instance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `workflow_id` bigint unsigned DEFAULT NULL,
  `workflow_name` varchar(100) DEFAULT NULL,
  `source_type` varchar(50) NOT NULL,
  `source_id` bigint NOT NULL,
  `source_no` varchar(50) DEFAULT NULL,
  `current_node_id` bigint unsigned DEFAULT NULL,
  `current_node_name` varchar(100) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `initiator_id` bigint DEFAULT NULL,
  `initiator_name` varchar(50) DEFAULT NULL,
  `amount` decimal(14,2) DEFAULT NULL,
  `urge_count` int DEFAULT '0',
  `complete_time` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_source` (`source_type`,`source_id`),
  KEY `idx_status` (`status`),
  KEY `idx_initiator` (`initiator_id`),
  KEY `idx_current_node` (`current_node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wf_approval_task`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wf_approval_task` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `instance_id` bigint unsigned NOT NULL,
  `node_id` bigint unsigned DEFAULT NULL,
  `node_name` varchar(100) DEFAULT NULL,
  `approver_id` bigint NOT NULL,
  `approver_name` varchar(50) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `action` varchar(20) DEFAULT NULL,
  `comment` text,
  `action_time` datetime DEFAULT NULL,
  `transfer_to_id` bigint DEFAULT NULL,
  `transfer_to_name` varchar(50) DEFAULT NULL,
  `delegate_from_id` bigint DEFAULT NULL,
  `delegate_from_name` varchar(50) DEFAULT NULL,
  `urge_time` datetime DEFAULT NULL,
  `remark` text,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_instance` (`instance_id`),
  KEY `idx_approver` (`approver_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wf_condition_rule`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wf_condition_rule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `workflow_id` bigint unsigned NOT NULL,
  `rule_name` varchar(100) NOT NULL,
  `condition_type` varchar(30) DEFAULT NULL,
  `operator` varchar(10) DEFAULT NULL,
  `threshold_value` varchar(100) DEFAULT NULL,
  `skip_nodes` varchar(200) DEFAULT NULL,
  `add_nodes` varchar(200) DEFAULT NULL,
  `notify_users` text,
  `is_active` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_workflow` (`workflow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wf_workflow_config`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wf_workflow_config` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `workflow_name` varchar(100) NOT NULL,
  `module_type` varchar(50) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_active` tinyint DEFAULT '0',
  `priority` int DEFAULT '0',
  `version` int DEFAULT '1',
  `create_by` bigint DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module_type`),
  KEY `idx_active` (`is_active`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='审批流程配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wf_workflow_node`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wf_workflow_node` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `workflow_id` bigint unsigned NOT NULL,
  `node_name` varchar(100) NOT NULL,
  `node_type` varchar(20) NOT NULL,
  `node_order` int DEFAULT '1',
  `approver_type` varchar(30) DEFAULT NULL,
  `approver_ids` text,
  `approver_names` varchar(500) DEFAULT NULL,
  `approval_mode` varchar(10) DEFAULT 'and',
  `auto_pass_hours` int DEFAULT '0',
  `is_required` tinyint DEFAULT '1',
  `condition_expression` text,
  `remark` varchar(500) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_workflow` (`workflow_id`),
  KEY `idx_order` (`node_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_order_costs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_costs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '成本ID',
  `work_order_id` bigint unsigned NOT NULL COMMENT '工单ID',
  `work_order_no` varchar(50) DEFAULT NULL COMMENT '工单编号',
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
  `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order` (`work_order_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_wo_cost_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `prod_work_order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单成本表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Current Database: `vnerpdacahng`
--

USE `vnerpdacahng`;

--
-- Final view structure for view `v_bom_std_full`
--

/*!50001 DROP VIEW IF EXISTS `v_bom_std_full`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_bom_std_full` AS select `bh`.`id` AS `bom_id`,`bh`.`bom_code` AS `bom_code`,`bh`.`product_id` AS `product_id`,`m`.`material_code` AS `product_code`,`m`.`material_name` AS `product_name`,`bh`.`version` AS `version`,`bh`.`effective_date` AS `effective_date`,`bh`.`obsolete_date` AS `obsolete_date`,`bh`.`status` AS `status`,`bl`.`id` AS `line_id`,`bl`.`line_no` AS `line_no`,`bl`.`material_id` AS `material_id`,`bl`.`material_code` AS `material_code`,`bl`.`material_name` AS `material_name`,`bl`.`consumption_qty` AS `consumption_qty`,`bl`.`waste_rate` AS `waste_rate`,`bl`.`material_type` AS `material_type` from ((`prd_bom_std` `bh` left join `prd_bom_line_std` `bl` on(((`bh`.`id` = `bl`.`bom_id`) and (`bl`.`deleted` = 0)))) left join `inv_material_std` `m` on((`bh`.`product_id` = `m`.`id`))) where (`bh`.`deleted` = 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_hr_attendance_full`
--

/*!50001 DROP VIEW IF EXISTS `v_hr_attendance_full`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_hr_attendance_full` AS select `a`.`id` AS `id`,`a`.`attendance_date` AS `attendance_date`,`a`.`employee_id` AS `employee_code`,`a`.`emp_id` AS `emp_id`,`e`.`name` AS `employee_name`,`a`.`department_name` AS `department_name`,`a`.`check_in_time` AS `check_in_time`,`a`.`check_out_time` AS `check_out_time`,`a`.`status` AS `status`,`a`.`working_hours` AS `working_hours`,`a`.`overtime_hours` AS `overtime_hours`,`a`.`remark` AS `remark` from (`hr_attendance` `a` left join `sys_employee` `e` on((`a`.`emp_id` = `e`.`id`))) where (`a`.`deleted` = 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_inventory_batch_full`
--

/*!50001 DROP VIEW IF EXISTS `v_inventory_batch_full`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_inventory_batch_full` AS select `i`.`id` AS `inventory_id`,`i`.`material_id` AS `material_id`,`m`.`material_code` AS `material_code`,`m`.`material_name` AS `material_name`,`m`.`specification` AS `material_spec`,`m`.`unit` AS `unit`,`i`.`warehouse_id` AS `warehouse_id`,`w`.`warehouse_name` AS `warehouse_name`,`i`.`quantity` AS `total_qty`,coalesce(`b`.`total_available`,0) AS `batch_available_qty`,(`i`.`quantity` - coalesce(`b`.`total_available`,0)) AS `diff_qty` from (((`inv_inventory` `i` left join `inv_material` `m` on((`i`.`material_id` = `m`.`id`))) left join `inv_warehouse` `w` on((`i`.`warehouse_id` = `w`.`id`))) left join (select `inv_inventory_batch`.`material_id` AS `material_id`,`inv_inventory_batch`.`warehouse_id` AS `warehouse_id`,sum(`inv_inventory_batch`.`available_qty`) AS `total_available` from `inv_inventory_batch` where (`inv_inventory_batch`.`deleted` = 0) group by `inv_inventory_batch`.`material_id`,`inv_inventory_batch`.`warehouse_id`) `b` on(((`i`.`material_id` = `b`.`material_id`) and (`i`.`warehouse_id` = `b`.`warehouse_id`)))) where (`i`.`deleted` = 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_outbound_batch_allocation_full`
--

/*!50001 DROP VIEW IF EXISTS `v_outbound_batch_allocation_full`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_outbound_batch_allocation_full` AS select `ba`.`id` AS `id`,`ba`.`source_type` AS `source_type`,`ba`.`source_id` AS `source_id`,`ba`.`source_no` AS `source_no`,`ba`.`warehouse_id` AS `warehouse_id`,`w`.`warehouse_name` AS `warehouse_name`,`ba`.`material_id` AS `material_id`,`m`.`material_code` AS `material_code`,`m`.`material_name` AS `material_name`,`ba`.`batch_id` AS `batch_id`,`ba`.`batch_no` AS `batch_no`,`ba`.`allocated_qty` AS `allocated_qty`,`ba`.`unit_cost` AS `unit_cost`,`ba`.`total_cost` AS `total_cost`,`ba`.`fifo_mode` AS `fifo_mode`,`ba`.`operator_name` AS `operator_name`,`ba`.`create_time` AS `create_time` from ((`inv_outbound_batch_allocation` `ba` left join `inv_warehouse` `w` on((`ba`.`warehouse_id` = `w`.`id`))) left join `inv_material` `m` on((`ba`.`material_id` = `m`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_purchase_order_std_full`
--

/*!50001 DROP VIEW IF EXISTS `v_purchase_order_std_full`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_purchase_order_std_full` AS select `po`.`id` AS `id`,`po`.`po_code` AS `po_code`,`po`.`request_id` AS `request_id`,`pr`.`request_no` AS `request_no`,`po`.`supplier_id` AS `supplier_id`,`s`.`supplier_name` AS `supplier_name`,`po`.`order_date` AS `order_date`,`po`.`delivery_date` AS `delivery_date`,`po`.`total_amount` AS `total_amount`,`po`.`tax_rate` AS `tax_rate`,`po`.`tax_amount` AS `tax_amount`,`po`.`grand_total` AS `grand_total`,`po`.`status` AS `status`,`po`.`currency` AS `currency`,`po`.`remark` AS `remark`,`po`.`create_by` AS `create_by`,`e`.`name` AS `create_by_name`,`po`.`create_time` AS `create_time`,`po`.`approve_by` AS `approve_by`,`po`.`approve_time` AS `approve_time` from (((`pur_order_std` `po` left join `pur_request` `pr` on((`po`.`request_id` = `pr`.`id`))) left join `pur_supplier` `s` on((`po`.`supplier_id` = `s`.`id`))) left join `sys_employee` `e` on((`po`.`create_by` = `e`.`id`))) where (`po`.`deleted` = 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_purchase_request_full`
--

/*!50001 DROP VIEW IF EXISTS `v_purchase_request_full`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_purchase_request_full` AS select `pr`.`id` AS `id`,`pr`.`request_no` AS `request_no`,`pr`.`request_date` AS `request_date`,`pr`.`request_type` AS `request_type`,`pr`.`request_dept_id` AS `request_dept_id`,`d`.`dept_name` AS `request_dept_name`,`pr`.`requester_id` AS `requester_id`,`e1`.`name` AS `requester_name`,`pr`.`reviewer_id` AS `reviewer_id`,`e2`.`name` AS `reviewer_name`,`pr`.`approver_id` AS `approver_id`,`e3`.`name` AS `approver_name`,`pr`.`status` AS `status`,`pr`.`priority` AS `priority`,`pr`.`expected_date` AS `expected_date`,`pr`.`total_amount` AS `total_amount`,`pr`.`currency` AS `currency`,`pr`.`remark` AS `remark`,`pr`.`create_time` AS `create_time`,`pr`.`update_time` AS `update_time` from ((((`pur_request` `pr` left join `sys_department` `d` on((`pr`.`request_dept_id` = `d`.`id`))) left join `sys_employee` `e1` on((`pr`.`requester_id` = `e1`.`id`))) left join `sys_employee` `e2` on((`pr`.`reviewer_id` = `e2`.`id`))) left join `sys_employee` `e3` on((`pr`.`approver_id` = `e3`.`id`))) where (`pr`.`deleted` = 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-26 17:27:15
