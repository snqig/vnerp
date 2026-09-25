-- ============================================================================
-- 20260922_add_missing_business_cols.sql
-- 目的：补齐 10 张表缺失的业务必需列 —— API (生产 route) 已在读写但 DB 不存在
--       MySQL strict 模式下这些 INSERT/UPDATE 会直接报 Unknown column 错误
--
-- 根因：多轮模块迭代中 API 代码先写了，DB migration 后续漏加，且
--       actual_schema.sql 长期未与真实 MySQL DESCRIBE 同步，导致审计困难
--
-- 覆盖范围（全部为生产 route 或 quality/equipment/outsource 业务）：
--   ① eqp_repair          — 6 cols  (equipment/repair 生产 route 在写)
--   ② outsource_order     — 4 cols  (outsource/issue/receive/settlement 全链路)
--   ③ inv_scan_log        — 6 cols  (dcprint/ink-usage 生产 route)
--   ④ inv_outbound_item   — 2 cols  (warehouse/outbound/confirm)
--   ⑤ inv_transfer_item   — 3 cols  (warehouse/transfer)
--   ⑥ inv_stocktaking     — 1 col   (warehouse/stocktaking)
--   ⑦ inv_stock_adjust_item — 4 cols (warehouse/stock-adjust)
--   ⑧ fin_receivable      — 2 cols  (sales/delivery ship)
--   ⑨ sal_order           — 1 col   (sales/delivery ship)
--   ⑩ inv_inventory_batch — 6 cols  (quality/incoming, batch-inventory)
--
-- 幂等性：ADD COLUMN IF NOT EXISTS (MySQL 8.0+)；UPDATE 的 WHERE 限定旧值
-- 影响面：仅 ADD COLUMN，无 DROP/ALTER COLUMN，存量数据自动填 DEFAULT
-- ============================================================================


-- ① eqp_repair — 设备维修状态/时间/成本（equipment/repair 生产 route 在写）
-- idempotent: add column status if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='status');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `status` TINYINT NULL DEFAULT 0 COMMENT '维修状态 0待修1维修中2已完成3已关闭' AFTER remark', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column repair_start_time if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='repair_start_time');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `repair_start_time` DATETIME NULL COMMENT '维修开始时间' AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column repair_end_time if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='repair_end_time');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `repair_end_time` DATETIME NULL COMMENT '维修结束时间' AFTER repair_start_time', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column repair_cost if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='repair_cost');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `repair_cost` DECIMAL(12,2) NULL DEFAULT 0 COMMENT '维修成本' AFTER repair_end_time', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column repair_result if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='repair_result');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `repair_result` VARCHAR(255) NULL COMMENT '维修结果' AFTER repair_cost', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column create_by if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_repair' AND COLUMN_NAME='create_by');
SET @sql = IF(@c=0, 'ALTER TABLE `eqp_repair` ADD COLUMN `create_by` BIGINT UNSIGNED NULL COMMENT '创建人' AFTER create_time', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ② outsource_order — 外协发料/收货/结算数量（outsource/issue/receive/settlement 三端）
-- idempotent: add column issued_qty if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_order' AND COLUMN_NAME='issued_qty');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_order` ADD COLUMN `issued_qty` DECIMAL(18,4) NULL DEFAULT 0 COMMENT '已发数量' AFTER quantity', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column received_qty if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_order' AND COLUMN_NAME='received_qty');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_order` ADD COLUMN `received_qty` DECIMAL(18,4) NULL DEFAULT 0 COMMENT '已收数量' AFTER issued_qty', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column qualified_qty if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_order' AND COLUMN_NAME='qualified_qty');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_order` ADD COLUMN `qualified_qty` DECIMAL(18,4) NULL DEFAULT 0 COMMENT '合格数量' AFTER received_qty', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column settled_amount if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='outsource_order' AND COLUMN_NAME='settled_amount');
SET @sql = IF(@c=0, 'ALTER TABLE `outsource_order` ADD COLUMN `settled_amount` DECIMAL(18,2) NULL DEFAULT 0 COMMENT '已结算金额' AFTER total_amount', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ③ inv_scan_log — 扫码日志增强字段（dcprint/ink-usage 生产 route）
-- idempotent: add column qr_type if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='qr_type');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `qr_type` VARCHAR(20) NULL COMMENT '二维码类型' AFTER qr_code', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column batch_no if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='batch_no');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `batch_no` VARCHAR(50) NULL COMMENT '批次号' AFTER qr_type', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column material_name if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='material_name');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `material_name` VARCHAR(200) NULL COMMENT '物料名称' AFTER batch_no', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column workorder_no if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='workorder_no');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `workorder_no` VARCHAR(50) NULL COMMENT '工单编号' AFTER material_name', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column scan_result if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='scan_result');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `scan_result` VARCHAR(20) NULL COMMENT '扫码结果' AFTER workorder_no', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column result_message if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_scan_log' AND COLUMN_NAME='result_message');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_scan_log` ADD COLUMN `result_message` VARCHAR(500) NULL COMMENT '结果描述' AFTER scan_result', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ④ inv_outbound_item — 出库明细增强（warehouse/outbound/confirm）
-- idempotent: add column batch_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_item' AND COLUMN_NAME='batch_id');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_outbound_item` ADD COLUMN `batch_id` INT UNSIGNED NULL COMMENT '批次ID' AFTER material_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column original_inbound_date if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_item' AND COLUMN_NAME='original_inbound_date');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_outbound_item` ADD COLUMN `original_inbound_date` DATE NULL COMMENT '原始入库日期' AFTER batch_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ⑤ inv_transfer_item — 调拨明细增强（warehouse/transfer）
-- idempotent: add column batch_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_item' AND COLUMN_NAME='batch_id');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_transfer_item` ADD COLUMN `batch_id` INT UNSIGNED NULL COMMENT '批次ID' AFTER material_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column original_inbound_date if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_item' AND COLUMN_NAME='original_inbound_date');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_transfer_item` ADD COLUMN `original_inbound_date` DATE NULL COMMENT '原始入库日期' AFTER batch_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column location_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_item' AND COLUMN_NAME='location_id');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_transfer_item` ADD COLUMN `location_id` BIGINT UNSIGNED NULL COMMENT '库位ID' AFTER original_inbound_date', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ⑥ inv_stocktaking — 盘点审批人（warehouse/stocktaking）
-- idempotent: add column approver_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking' AND COLUMN_NAME='approver_id');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stocktaking` ADD COLUMN `approver_id` BIGINT UNSIGNED NULL COMMENT '审批人ID' AFTER create_by', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ⑦ inv_stock_adjust_item — 库存调整明细增强（warehouse/stock-adjust）
-- idempotent: add column batch_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='batch_id');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stock_adjust_item` ADD COLUMN `batch_id` INT UNSIGNED NULL COMMENT '批次ID' AFTER material_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column location_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='location_id');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stock_adjust_item` ADD COLUMN `location_id` BIGINT UNSIGNED NULL COMMENT '库位ID' AFTER batch_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column original_inbound_date if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='original_inbound_date');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stock_adjust_item` ADD COLUMN `original_inbound_date` DATE NULL COMMENT '原始入库日期' AFTER location_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column qr_code if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust_item' AND COLUMN_NAME='qr_code');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_stock_adjust_item` ADD COLUMN `qr_code` VARCHAR(100) NULL COMMENT '二维码' AFTER original_inbound_date', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ⑧ fin_receivable — 应收关联单据（sales/delivery ship）
-- idempotent: add column order_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_receivable' AND COLUMN_NAME='order_id');
SET @sql = IF(@c=0, 'ALTER TABLE `fin_receivable` ADD COLUMN `order_id` BIGINT UNSIGNED NULL COMMENT '关联订单ID' AFTER customer_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column order_type if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_receivable' AND COLUMN_NAME='order_type');
SET @sql = IF(@c=0, 'ALTER TABLE `fin_receivable` ADD COLUMN `order_type` VARCHAR(20) NULL COMMENT '订单类型 sal_order/sal_delivery' AFTER order_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ⑨ sal_order — 销售发货数量冗余（sales/delivery ship 写入，方便汇总查询）
-- idempotent: add column shipped_qty if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sal_order' AND COLUMN_NAME='shipped_qty');
SET @sql = IF(@c=0, 'ALTER TABLE `sal_order` ADD COLUMN `shipped_qty` DECIMAL(18,4) NULL DEFAULT 0 COMMENT '已发货数量' AFTER total_amount', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ⑩ inv_inventory_batch — 批次扩展字段（quality/incoming 来料检验 + batch-inventory）
-- idempotent: add column inspection_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='inspection_id');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `inspection_id` BIGINT UNSIGNED NULL COMMENT '关联检验单ID' AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column specification if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='specification');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `specification` VARCHAR(200) NULL COMMENT '规格' AFTER material_name', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column inbound_no if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='inbound_no');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `inbound_no` VARCHAR(50) NULL COMMENT '入库单号' AFTER batch_no', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column supplier_id if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='supplier_id');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `supplier_id` BIGINT UNSIGNED NULL COMMENT '供应商ID' AFTER warehouse_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column supplier_name if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='supplier_name');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `supplier_name` VARCHAR(100) NULL COMMENT '供应商名称' AFTER supplier_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- idempotent: add column qc_status if missing
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='qc_status');
SET @sql = IF(@c=0, 'ALTER TABLE `inv_inventory_batch` ADD COLUMN `qc_status` VARCHAR(20) NULL DEFAULT 'pending' COMMENT '质检状态' AFTER inspection_status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;;



-- ---------------- 自检 ----------------
-- 每张表执行：SHOW COLUMNS FROM <table> LIKE '<col>';
-- 全部应返回 1 row
--
-- 回滚（如需要）：
-- ALTER TABLE <table> DROP COLUMN <col>;

