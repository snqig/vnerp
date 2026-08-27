-- ============================================================
-- Migration 020: 对齐 qc_unqualified 表结构（吸收 qc_unqualified_handle 字段）
-- 日期: 2026-07-07
-- 背景:
--   schema.sql 定义了 qc_unqualified 表（status + handle_method）
--   但 init/supplement-tables/route.ts 运行时创建了 qc_unqualified_handle 表
--   （handle_status + handle_type + 7 个额外字段）
--   API 路由使用 qc_unqualified_handle，spc-analysis.ts 使用 qc_unqualified
--   导致两表数据不互通
-- 策略:
--   1. 为 qc_unqualified 补齐 qc_unqualified_handle 的 7 个字段
--   2. 重命名 status -> handle_status 对齐前端字段名
--   3. 删除 handle_method，新增 handle_type（扩展为 4 种处置方式）
--   4. 合并 qc_unqualified_handle 数据到 qc_unqualified
--   5. DROP qc_unqualified_handle 消除幽灵表
-- ============================================================

-- ========================================================
-- 一、为 qc_unqualified 补齐字段（幂等）
-- ========================================================

-- handle_no 处理单号
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'handle_no');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN handle_no VARCHAR(50) NULL COMMENT ''处理单号'' AFTER unqualified_no', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- material_code 物料编码
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'material_code');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN material_code VARCHAR(50) NULL COMMENT ''物料编码'' AFTER material_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- material_name 物料名称
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'material_name');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN material_name VARCHAR(100) NULL COMMENT ''物料名称'' AFTER material_code', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- handle_type 处置方式: 1-返工/2-报废/3-让步接收/4-退货
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'handle_type');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN handle_type TINYINT NULL COMMENT ''处置方式: 1-返工, 2-报废, 3-让步接收, 4-退货'' AFTER unqualified_reason', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- responsible_dept 责任部门
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'responsible_dept');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN responsible_dept VARCHAR(100) NULL COMMENT ''责任部门'' AFTER handle_type', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- responsible_person 责任人
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'responsible_person');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN responsible_person VARCHAR(50) NULL COMMENT ''责任人'' AFTER responsible_dept', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- cost_amount 损失金额
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'cost_amount');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN cost_amount DECIMAL(18,4) DEFAULT 0 COMMENT ''损失金额'' AFTER handle_result', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- remark 备注（qc_unqualified 原本只有 unqualified_reason，无 remark）
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'remark');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN remark TEXT NULL COMMENT ''备注'' AFTER cost_amount', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- update_time
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'update_time');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'' AFTER create_time', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- create_by
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'create_by');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN create_by BIGINT UNSIGNED NULL COMMENT ''创建人ID'' AFTER update_time', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- deleted 软删除
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'deleted');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除'' AFTER create_by', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 二、添加 handle_status 列（实际 DB 无 status 列，需直接 ADD）
-- ========================================================

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'handle_status');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD COLUMN handle_status TINYINT NOT NULL DEFAULT 1 COMMENT ''处理状态: 1-待处理, 2-处理中, 3-已完成'' AFTER handle_type', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 同步更新 handle_type 注释（扩展为 4 种处置方式）
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'handle_type');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE qc_unqualified MODIFY COLUMN handle_type TINYINT NULL COMMENT ''处置方式: 1-返工, 2-报废, 3-让步接收, 4-退货''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 三、删除废弃的 handle_method 列（被 handle_type 替代）
-- ========================================================

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND COLUMN_NAME = 'handle_method');
SET @sql = IF(@cnt > 0, 'ALTER TABLE qc_unqualified DROP COLUMN handle_method', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 四、添加 handle_no 唯一键（如果不存在）
-- ========================================================

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND INDEX_NAME = 'uk_handle_no');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD UNIQUE KEY uk_handle_no (handle_no)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 五、合并 qc_unqualified_handle 数据到 qc_unqualified（如果表存在）
-- ========================================================

SET @tbl_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified_handle');
SET @sql = IF(@tbl_exists > 0, 'INSERT IGNORE INTO qc_unqualified (handle_no, inspection_id, material_id, material_code, material_name, batch_no, unqualified_qty, unqualified_type, unqualified_reason, handle_type, responsible_dept, responsible_person, handle_result, cost_amount, remark, handle_status, handler_id, handle_date, create_time, update_time, create_by, deleted) SELECT handle_no, inspection_id, material_id, material_code, material_name, NULL, unqualified_qty, NULL, NULL, handle_type, responsible_dept, responsible_person, handle_result, cost_amount, remark, handle_status, NULL, NULL, create_time, update_time, create_by, deleted FROM qc_unqualified_handle WHERE handle_no IS NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 六、删除幽灵表 qc_unqualified_handle
-- ========================================================

SET @tbl_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified_handle');
SET @sql = IF(@tbl_exists > 0, 'DROP TABLE qc_unqualified_handle', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 七、为 handle_status 添加索引（如果不存在）
-- ========================================================

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_unqualified' AND INDEX_NAME = 'idx_handle_status');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_unqualified ADD KEY idx_handle_status (handle_status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
