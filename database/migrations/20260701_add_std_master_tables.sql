-- ========================================================
-- 标准主档表补丁（2026-07-01）
-- 修复 inv_material_std / prd_bom_std / prd_bom_line_std 缺失
-- 以及 inv_inventory / sal_order_detail 列缺失导致端到端测试 beforeAll 失败
-- 依据：
--   1. src/app/api/migrations/readmd-fixes/route.ts 中的 DDL（HTTP 接口已禁用，改走 CLI）
--   2. src/lib/services/sales-order-service.ts 与 data-fix-tool.ts 的实际查询字段
--   3. src/lib/__tests__/end-to-end-flow.test.ts 的 beforeAll INSERT 字段
-- 注意：
--   - CREATE TABLE IF NOT EXISTS 保证建表幂等
--   - ALTER TABLE ADD COLUMN 在 MySQL 8.0 不支持 IF NOT EXISTS，
--     重复执行会因列已存在报错，setup-db.mjs 的 executeStatements 会逐语句容错跳过
-- ========================================================

-- --------------------------------------------------------
-- 1. 标准物料主档 inv_material_std（三合一）
--    生产代码引用：src/lib/services/data-fix-tool.ts:13,114,136
--    测试引用：end-to-end-flow.test.ts:28,34
--    与 route.ts DDL 的差异：补 status 列（route.ts 遗漏，测试与生产查询均需要）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inv_material_std` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '物料ID',
  `material_code` VARCHAR(50) NOT NULL COMMENT '物料编码',
  `material_name` VARCHAR(100) NOT NULL COMMENT '物料名称',
  `material_spec` VARCHAR(200) NULL COMMENT '规格型号',
  `unit` VARCHAR(20) NOT NULL COMMENT '计量单位',
  `material_type` TINYINT NOT NULL DEFAULT 1 COMMENT '1原材料 2半成品 3成品 4辅料 5包材',
  `category_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '分类ID',
  `is_batch` TINYINT NOT NULL DEFAULT 1 COMMENT '是否批次管理',
  `is_expire` TINYINT NOT NULL DEFAULT 0 COMMENT '是否效期管理',
  `safe_stock` DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '安全库存',
  `standard_cost` DECIMAL(18,4) DEFAULT 0 COMMENT '标准成本',
  `shelf_life_days` INT DEFAULT NULL COMMENT '保质期天数',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0禁用 1启用（route.ts 遗漏，测试与生产查询需要）',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `legacy_source` VARCHAR(30) DEFAULT NULL COMMENT '旧表来源: inv_material/bom_material/mdm_material',
  `legacy_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
  `updated_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_code` (`material_code`),
  KEY `idx_material_type` (`material_type`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_legacy` (`legacy_source`, `legacy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准物料主档';

-- --------------------------------------------------------
-- 2. 标准BOM头 prd_bom_std
--    生产代码引用：src/lib/services/sales-order-service.ts:42
--    测试引用：end-to-end-flow.test.ts:46
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prd_bom_std` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'BOM ID',
  `bom_code` VARCHAR(50) NOT NULL COMMENT 'BOM编码',
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '成品ID',
  `product_name` VARCHAR(100) DEFAULT NULL COMMENT '成品名称',
  `version` VARCHAR(20) NOT NULL DEFAULT 'V1.0' COMMENT '版本',
  `effective_date` DATE NOT NULL COMMENT '生效日期',
  `obsolete_date` DATE NULL COMMENT '失效日期',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0草稿 1生效 2作废',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `legacy_source` VARCHAR(30) DEFAULT NULL COMMENT '旧表来源',
  `legacy_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
  `updated_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bom_code` (`bom_code`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_status` (`status`),
  KEY `idx_effective_date` (`effective_date`),
  KEY `idx_legacy` (`legacy_source`, `legacy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准BOM头';

-- --------------------------------------------------------
-- 3. 标准BOM行 prd_bom_line_std
--    生产代码引用：src/lib/services/sales-order-service.ts:69
--    测试引用：end-to-end-flow.test.ts:53
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prd_bom_line_std` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'BOM行ID',
  `bom_id` BIGINT UNSIGNED NOT NULL COMMENT 'BOM头ID',
  `line_no` INT NOT NULL DEFAULT 1 COMMENT '行号',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `material_code` VARCHAR(50) DEFAULT NULL COMMENT '物料编码',
  `material_name` VARCHAR(100) DEFAULT NULL COMMENT '物料名称',
  `consumption_qty` DECIMAL(18,4) NOT NULL COMMENT '单耗',
  `waste_rate` DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '损耗率%',
  `material_type` TINYINT DEFAULT 1 COMMENT '1原材料 2半成品 3辅料 4包材 5其他',
  `remark` VARCHAR(200) DEFAULT NULL COMMENT '备注',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
  PRIMARY KEY (`id`),
  KEY `idx_bom_id` (`bom_id`),
  KEY `idx_material_id` (`material_id`),
  CONSTRAINT `fk_bom_line_std_bom` FOREIGN KEY (`bom_id`) REFERENCES `prd_bom_std` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准BOM行';

-- --------------------------------------------------------
-- 4. inv_inventory 补列
--    测试引用：end-to-end-flow.test.ts:59
--    现有列：id, material_id, warehouse_id, location_code, quantity, locked_qty,
--            available_qty, batch_no, production_date, expiry_date, update_time
--    缺失：material_code, material_name, unit, deleted
-- --------------------------------------------------------
ALTER TABLE `inv_inventory` ADD COLUMN `material_code` VARCHAR(50) NULL COMMENT '物料编码（冗余，便于查询）' AFTER `material_id`;
ALTER TABLE `inv_inventory` ADD COLUMN `material_name` VARCHAR(100) NULL COMMENT '物料名称（冗余）' AFTER `material_code`;
ALTER TABLE `inv_inventory` ADD COLUMN `unit` VARCHAR(20) NULL COMMENT '计量单位' AFTER `quantity`;
ALTER TABLE `inv_inventory` ADD COLUMN `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记' AFTER `update_time`;
ALTER TABLE `inv_inventory` ADD INDEX `idx_material_code` (`material_code`);

-- --------------------------------------------------------
-- 5. sal_order_detail 补列
--    测试引用：end-to-end-flow.test.ts:72
--    现有列：id, order_id, material_id, quantity, unit, unit_price, tax_rate,
--            amount, tax_amount, total_amount, delivered_qty, delivery_date, remark, create_time
--    缺失：material_name, deleted
-- --------------------------------------------------------
ALTER TABLE `sal_order_detail` ADD COLUMN `material_name` VARCHAR(100) NULL COMMENT '物料名称（冗余）' AFTER `material_id`;
ALTER TABLE `sal_order_detail` ADD COLUMN `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记' AFTER `create_time`;
ALTER TABLE `sal_order_detail` ADD INDEX `idx_material_name` (`material_name`);
