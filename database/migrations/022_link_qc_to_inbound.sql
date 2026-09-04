-- ============================================================
-- Migration 022: 将质检单关联到入库单（事务性关联）
-- 日期: 2026-08-28
-- 背景:
--   - 质检流程目前独立于入库流程,缺少强制关联
--   - 需要确保入库单审核前必须有对应的质检单且质检合格
-- 策略:
--   1. 为 qc_incoming_inspection 增加 inbound_order_id / inbound_no 列
--   2. 为 inv_inbound_order 增加 mandatory_qc 列,标识是否强制质检
--   3. 插入质检单时自动关联入库单
--   4. 审核入库单时校验关联质检单状态
-- 注意:
--   - 幂等执行
--   - 历史数据可通过 qr_code 关联回填
-- ============================================================

-- 1. 为 qc_incoming_inspection 增加入库单关联字段
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_incoming_inspection' AND COLUMN_NAME = 'inbound_order_id');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_incoming_inspection ADD COLUMN inbound_order_id BIGINT UNSIGNED NULL COMMENT "关联入库单ID" AFTER batch_no', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_incoming_inspection' AND COLUMN_NAME = 'inbound_no');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_incoming_inspection ADD COLUMN inbound_no VARCHAR(50) NULL COMMENT "关联入库单号" AFTER inbound_order_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加索引
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_incoming_inspection' AND INDEX_NAME = 'idx_inbound_order_id');
SET @sql = IF(@cnt = 0, 'ALTER TABLE qc_incoming_inspection ADD INDEX idx_inbound_order_id (inbound_order_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 为 inv_inbound_order 增加强制质检标记
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_order' AND COLUMN_NAME = 'mandatory_qc');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inbound_order ADD COLUMN mandatory_qc TINYINT NOT NULL DEFAULT 0 COMMENT "是否强制质检: 0-否, 1-是" AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 回填历史数据:通过 QR code 关联
UPDATE inv_inbound_order iio
LEFT JOIN qrcode_record qr ON iio.order_no = qr.ref_no
LEFT JOIN qc_incoming_inspection qci ON qr.batch_no = qci.batch_no
SET iio.mandatory_qc = 1
WHERE iio.status IN ('draft', 'pending')
  AND iio.order_type = 'purchase'
  AND iio.mandatory_qc = 0;

