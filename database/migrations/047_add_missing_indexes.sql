-- 补齐缺失索引：配送单、退货单、应收应付账龄、设备维护、来料质检
-- 注意：MySQL 不支持 ADD INDEX IF NOT EXISTS，需逐条检查后添加

-- 配送单：按客户+状态筛选
SET @db = DATABASE();
SET @tbl = 'sal_delivery';
SET @idx = 'idx_delivery_customer_status';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql = IF(@cnt=0, CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`customer_id`, `status`)'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 退货单：按客户+状态筛选
SET @tbl = 'sal_return';
SET @idx = 'idx_return_customer_status';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql = IF(@cnt=0, CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`customer_id`, `status`)'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 应收账款：账龄分析
SET @tbl = 'fin_receivable';
SET @idx = 'idx_receivable_status_due';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql = IF(@cnt=0, CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`status`, `due_date`)'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 应付账款：账龄分析
SET @tbl = 'fin_payable';
SET @idx = 'idx_payable_status_due';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql = IF(@cnt=0, CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`status`, `due_date`)'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 设备：维护提醒查询
SET @tbl = 'eqp_equipment';
SET @idx = 'idx_equipment_status_maintenance';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql = IF(@cnt=0, CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`status`, `next_maintenance_date`)'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 来料质检：按物料查询
SET @tbl = 'qc_inspection';
SET @idx = 'idx_qc_inspection_material_date';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql = IF(@cnt=0, CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`material_id`, `inspection_date`)'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
