-- ============================================================
-- 字段对齐迁移脚本 v1
-- 生成时间: 2026-09-22
-- 说明: 补齐 API 路由引用但 DB 表缺失的列
-- 安全: 使用 IF NOT EXISTS（MySQL 8.0+），重复执行不报错
-- ============================================================

-- ========== 1. 销售模块 ==========

-- sal_order: 多币种本位币字段 + 发货数量
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_order` ADD COLUMN `IF` NOT EXISTS base_tax_amount DECIMAL(12,2) DEFAULT 0 COMMENT '本位币税额'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_order` ADD COLUMN `IF` NOT EXISTS base_total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '本位币不含税总额'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_order` ADD COLUMN `IF` NOT EXISTS base_grand_total DECIMAL(12,2) DEFAULT 0 COMMENT '本位币价税合计'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_order` ADD COLUMN `IF` NOT EXISTS shipped_qty DECIMAL(12,2) DEFAULT 0 COMMENT '已发货数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- sal_order_item: 物料关联 + 软删除
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_order_item` ADD COLUMN `IF` NOT EXISTS material_id BIGINT NULL COMMENT '物料ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_order_item` ADD COLUMN `IF` NOT EXISTS material_code VARCHAR(64) NULL COMMENT '物料编码'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_order_item` ADD COLUMN `IF` NOT EXISTS deleted TINYINT DEFAULT 0 COMMENT '软删除'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- sal_return: 退货类型 + 退货数量
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_return' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_return` ADD COLUMN `IF` NOT EXISTS return_type VARCHAR(32) DEFAULT 'quality' COMMENT '退货类型'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_return' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_return` ADD COLUMN `IF` NOT EXISTS total_qty DECIMAL(12,2) DEFAULT 0 COMMENT '退货总数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- fin_receivable: 关联销售单
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_receivable' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `fin_receivable` ADD COLUMN `IF` NOT EXISTS order_id BIGINT NULL COMMENT '关联单据ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_receivable' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `fin_receivable` ADD COLUMN `IF` NOT EXISTS order_type VARCHAR(32) NULL COMMENT '单据类型'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- ========== 2. 库存模块 ==========

-- inv_inventory_batch: 批次扩展字段
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS material_code VARCHAR(64) NULL COMMENT '物料编码'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS available_quantity DECIMAL(12,2) DEFAULT 0 COMMENT '可用数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS inbound_quantity DECIMAL(12,2) DEFAULT 0 COMMENT '入库数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS outbound_quantity DECIMAL(12,2) DEFAULT 0 COMMENT '出库数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS qc_status VARCHAR(32) NULL COMMENT '质检状态'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS specification VARCHAR(256) NULL COMMENT '规格'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS supplier_id BIGINT NULL COMMENT '供应商ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS supplier_name VARCHAR(128) NULL COMMENT '供应商名称'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS area DECIMAL(12,2) NULL COMMENT '面积'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS available_area DECIMAL(12,2) NULL COMMENT '可用面积'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS length DECIMAL(12,2) NULL COMMENT '长度'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS width DECIMAL(12,2) NULL COMMENT '宽度'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS batch_type VARCHAR(32) NULL COMMENT '批次类型'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `IF` NOT EXISTS parent_batch_id BIGINT NULL COMMENT '父批次ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_inventory: 库存扩展
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory` ADD COLUMN `IF` NOT EXISTS cost_price DECIMAL(12,4) DEFAULT 0 COMMENT '成本单价'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory` ADD COLUMN `IF` NOT EXISTS frozen_qty DECIMAL(12,2) DEFAULT 0 COMMENT '冻结数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory` ADD COLUMN `IF` NOT EXISTS stocktaking_flag TINYINT DEFAULT 0 COMMENT '盘点标记'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory` ADD COLUMN `IF` NOT EXISTS total_qty DECIMAL(12,2) DEFAULT 0 COMMENT '总数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_outbound_item: 出库明细扩展
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_outbound_item` ADD COLUMN `IF` NOT EXISTS width DECIMAL(12,2) NULL COMMENT '宽度'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_outbound_item` ADD COLUMN `IF` NOT EXISTS batch_id BIGINT NULL COMMENT '批次ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_outbound_item` ADD COLUMN `IF` NOT EXISTS original_inbound_date DATETIME NULL COMMENT '原始入库日期'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_sales_outbound_item: 销售出库明细
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_sales_outbound_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_sales_outbound_item` ADD COLUMN `IF` NOT EXISTS batch_id BIGINT NULL COMMENT '批次ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_sales_outbound_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_sales_outbound_item` ADD COLUMN `IF` NOT EXISTS location_id BIGINT NULL COMMENT '库位ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_sales_outbound_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_sales_outbound_item` ADD COLUMN `IF` NOT EXISTS original_inbound_date DATETIME NULL COMMENT '原始入库日期'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_sales_outbound_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_sales_outbound_item` ADD COLUMN `IF` NOT EXISTS qr_code VARCHAR(128) NULL COMMENT '二维码'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_stocktaking_item: 盘点明细
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS batch_id BIGINT NULL COMMENT '批次ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS location_id BIGINT NULL COMMENT '库位ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS original_inbound_date DATETIME NULL COMMENT '原始入库日期'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS qr_code VARCHAR(128) NULL COMMENT '二维码'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS diff_status VARCHAR(32) NULL COMMENT '差异状态'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS diff_reason TEXT NULL COMMENT '差异原因'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS diff_approver BIGINT NULL COMMENT '差异审批人'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS diff_approve_time DATETIME NULL COMMENT '差异审批时间'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking_item` ADD COLUMN `IF` NOT EXISTS process_time DATETIME NULL COMMENT '处理时间'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_stocktaking: 盘点主表
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking` ADD COLUMN `IF` NOT EXISTS total_items INT DEFAULT 0 COMMENT '总项数'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking` ADD COLUMN `IF` NOT EXISTS approver_id BIGINT NULL COMMENT '审批人ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_transfer_item: 调拨明细
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_transfer_item` ADD COLUMN `IF` NOT EXISTS batch_id BIGINT NULL COMMENT '批次ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_transfer_item` ADD COLUMN `IF` NOT EXISTS location_id BIGINT NULL COMMENT '库位ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_transfer_item` ADD COLUMN `IF` NOT EXISTS original_inbound_date DATETIME NULL COMMENT '原始入库日期'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_stock_adjust_item: 库存调整明细
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stock_adjust_item` ADD COLUMN `IF` NOT EXISTS batch_id BIGINT NULL COMMENT '批次ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stock_adjust_item` ADD COLUMN `IF` NOT EXISTS location_id BIGINT NULL COMMENT '库位ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stock_adjust_item` ADD COLUMN `IF` NOT EXISTS original_inbound_date DATETIME NULL COMMENT '原始入库日期'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stock_adjust_item` ADD COLUMN `IF` NOT EXISTS qr_code VARCHAR(128) NULL COMMENT '二维码'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_inbound_item: 入库明细
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inbound_item` ADD COLUMN `IF` NOT EXISTS is_consumed TINYINT DEFAULT 0 COMMENT '是否已消耗'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_warehouse: 仓库属性
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_warehouse' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_warehouse` ADD COLUMN `IF` NOT EXISTS capacity DECIMAL(12,2) NULL COMMENT '容量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_warehouse' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_warehouse` ADD COLUMN `IF` NOT EXISTS category_id BIGINT NULL COMMENT '仓库分类ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_warehouse' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_warehouse` ADD COLUMN `IF` NOT EXISTS include_in_calculation TINYINT DEFAULT 1 COMMENT '是否纳入计算'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_warehouse' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_warehouse` ADD COLUMN `IF` NOT EXISTS nature VARCHAR(64) NULL COMMENT '性质'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_material: 物料属性
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_material' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_material` ADD COLUMN `IF` NOT EXISTS is_splittable TINYINT DEFAULT 0 COMMENT '是否可分切'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_material_category: 物料分类
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_material_category' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_material_category` ADD COLUMN `IF` NOT EXISTS category_type VARCHAR(32) NULL COMMENT '分类类型'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_material_category' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_material_category` ADD COLUMN `IF` NOT EXISTS remark VARCHAR(256) NULL COMMENT '备注'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_material_category' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_material_category` ADD COLUMN `IF` NOT EXISTS typical_examples VARCHAR(512) NULL COMMENT '典型示例'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- inv_scan_log: 扫码日志
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `IF` NOT EXISTS qr_type VARCHAR(32) NULL COMMENT '二维码类型'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `IF` NOT EXISTS result_message VARCHAR(512) NULL COMMENT '结果消息'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `IF` NOT EXISTS batch_no VARCHAR(64) NULL COMMENT '批次号'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `IF` NOT EXISTS workorder_no VARCHAR(64) NULL COMMENT '工单号'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `IF` NOT EXISTS material_name VARCHAR(128) NULL COMMENT '物料名称'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `IF` NOT EXISTS scan_result VARCHAR(32) NULL COMMENT '扫码结果'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `IF` NOT EXISTS sn VARCHAR(128) NULL COMMENT '序列号'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- ========== 3. 生产模块 ==========

-- prod_work_order: 工单扩展
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prod_work_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prod_work_order` ADD COLUMN `IF` NOT EXISTS process_card_id BIGINT NULL COMMENT '工艺卡ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prod_work_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prod_work_order` ADD COLUMN `IF` NOT EXISTS sales_order_id BIGINT NULL COMMENT '销售订单ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prod_work_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prod_work_order` ADD COLUMN `IF` NOT EXISTS standard_card_id BIGINT NULL COMMENT '标准卡ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prod_work_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prod_work_order` ADD COLUMN `IF` NOT EXISTS order_type VARCHAR(32) NULL COMMENT '订单类型'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prod_work_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prod_work_order` ADD COLUMN `IF` NOT EXISTS completed_qty DECIMAL(12,2) DEFAULT 0 COMMENT '完工数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- prd_material_return: 退料单
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_material_return' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_material_return` ADD COLUMN `IF` NOT EXISTS return_reason VARCHAR(256) NULL COMMENT '退料原因'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_material_return' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_material_return` ADD COLUMN `IF` NOT EXISTS operator_id BIGINT NULL COMMENT '操作人ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- prd_material_return_item: 退料明细
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_material_return_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_material_return_item` ADD COLUMN `IF` NOT EXISTS create_time DATETIME NULL COMMENT '创建时间'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_material_return_item' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_material_return_item` ADD COLUMN `IF` NOT EXISTS remark VARCHAR(256) NULL COMMENT '备注'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- prd_work_report: 报工
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_work_report' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_work_report` ADD COLUMN `IF` NOT EXISTS tool_id BIGINT NULL COMMENT '工装ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_work_report' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_work_report` ADD COLUMN `IF` NOT EXISTS screen_plate_id BIGINT NULL COMMENT '网版ID'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- ========== 4. 设备模块 ==========

-- eqp_repair: 设备维修
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `IF` NOT EXISTS repair_start_time DATETIME NULL COMMENT '维修开始时间'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `IF` NOT EXISTS repair_end_time DATETIME NULL COMMENT '维修结束时间'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `IF` NOT EXISTS repair_cost DECIMAL(12,2) DEFAULT 0 COMMENT '维修费用'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `IF` NOT EXISTS repair_result VARCHAR(256) NULL COMMENT '维修结果'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `IF` NOT EXISTS status VARCHAR(32) DEFAULT 'pending' COMMENT '状态'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- eqp_calibration: 设备校准
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_calibration' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_calibration` ADD COLUMN `IF` NOT EXISTS status VARCHAR(32) DEFAULT 'pending' COMMENT '状态'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- eqp_scrap: 设备报废
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_scrap' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_scrap` ADD COLUMN `IF` NOT EXISTS status VARCHAR(32) DEFAULT 'pending' COMMENT '状态'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- ========== 5. 委外模块 ==========

-- outsource_order: 委外订单
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_order` ADD COLUMN `IF` NOT EXISTS issued_qty DECIMAL(12,2) DEFAULT 0 COMMENT '发料数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_order` ADD COLUMN `IF` NOT EXISTS qualified_qty DECIMAL(12,2) DEFAULT 0 COMMENT '合格数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_order` ADD COLUMN `IF` NOT EXISTS received_qty DECIMAL(12,2) DEFAULT 0 COMMENT '收货数量'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_order' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_order` ADD COLUMN `IF` NOT EXISTS settled_amount DECIMAL(12,2) DEFAULT 0 COMMENT '结算金额'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- outsource_settlement: 委外结算
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_settlement' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_settlement` ADD COLUMN `IF` NOT EXISTS payment_date DATE NULL COMMENT '付款日期'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- ========== 6. 采购模块 ==========

-- pur_supplier: 供应商
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pur_supplier' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `pur_supplier` ADD COLUMN `IF` NOT EXISTS default_currency VARCHAR(8) DEFAULT 'CNY' COMMENT '默认币种'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- ========== 7. 系统模块 ==========

-- sys_role: 角色
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_role' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sys_role` ADD COLUMN `IF` NOT EXISTS role_type VARCHAR(32) DEFAULT 'custom' COMMENT '角色类型'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_role' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sys_role` ADD COLUMN `IF` NOT EXISTS sort_order INT DEFAULT 0 COMMENT '排序'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- sys_warehouse_category: 仓库分类
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_warehouse_category' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `sys_warehouse_category` ADD COLUMN `IF` NOT EXISTS deleted TINYINT DEFAULT 0 COMMENT '软删除'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- ========== 8. 其他模块 ==========

-- biz_contract_review: 合同评审
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='biz_contract_review' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `biz_contract_review` ADD COLUMN `IF` NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='biz_contract_review' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `biz_contract_review` ADD COLUMN `IF` NOT EXISTS final_result VARCHAR(32) NULL COMMENT '最终结果'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='biz_contract_review' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `biz_contract_review` ADD COLUMN `IF` NOT EXISTS final_reviewer BIGINT NULL COMMENT '最终审批人'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- prd_screen_plate: 网版
-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_screen_plate' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_screen_plate` ADD COLUMN `IF` NOT EXISTS frame_type VARCHAR(64) NULL COMMENT '框架类型'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column IF if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_screen_plate' AND COLUMN_NAME='IF');
SET @sql = IF(@c=0, 'ALTER TABLE `prd_screen_plate` ADD COLUMN `IF` NOT EXISTS mesh_material VARCHAR(64) NULL COMMENT '网布材质'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;


-- ========== 完成 ==========
SELECT '字段对齐迁移完成' AS message;
