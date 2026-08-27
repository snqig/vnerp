-- ============================================================
-- Migration 077: qrcode_record 在 qr_code 上增加唯一约束 uk_qr_code
--
-- 背景：
--   入库审核通过时 QrCodeGenerationHandler 为每个入库明细生成一张物料二维码。
--   二维码取值由「入库单号 + 行序号 + 批次 + 物料 + 仓库」确定性推导，
--   配合本迁移建立的 qr_code 唯一约束，实现「同一入库明细只保留一张有效码，
--   反审核作废、再审核复活（status=1）」的幂等语义（详见 #5 修复）。
--
--   注意：早期方案曾考虑在 (batch_no, material_id, warehouse_id) 上加唯一约束，
--   但该约束语义错误——同一批次在仓库内本可拥有多张二维码（整料/小料/余料、或
--   不同入库单的同批次），且不同入库单的同批次会互相覆盖 ref_id 导致数据错乱，
--   因此改为在 qr_code（二维码天然唯一标识）上加唯一约束。
--
--   幂等模式：使用 INFORMATION_SCHEMA.STATISTICS 检查索引是否存在再添加；
--   迁移运行器按 `;` 同连接顺序执行，会话变量跨语句保持。
-- ============================================================

-- 检查唯一索引 uk_qr_code 是否已存在，不存在则添加
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qrcode_record' AND INDEX_NAME = 'uk_qr_code');
SET @sql = IF(@idx = 0,
  'ALTER TABLE qrcode_record ADD UNIQUE INDEX uk_qr_code (qr_code)',
  'SELECT ''uk_qr_code already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证：确认索引已创建
SELECT
  INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'qrcode_record'
  AND INDEX_NAME = 'uk_qr_code'
ORDER BY SEQ_IN_INDEX;
