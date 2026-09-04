-- 数据库迁移：架构清理 - 合并冗余表
-- 迁移编号：20260510
-- 描述：合并冗余表，统一数据源
-- 执行前请备份数据库！

-- 1. 给 qrcode_record 添加拆分字段
ALTER TABLE qrcode_record
  ADD COLUMN IF NOT EXISTS split_flag TINYINT DEFAULT 0 COMMENT '拆分标识: 0-整料, 1-小料, 2-余料',
  ADD COLUMN IF NOT EXISTS parent_qr_id BIGINT UNSIGNED DEFAULT NULL COMMENT '父级二维码记录ID',
  ADD INDEX IF NOT EXISTS idx_split_flag (split_flag),
  ADD INDEX IF NOT EXISTS idx_parent_qr_id (parent_qr_id);

-- 2. 给正式表添加 deleted 字段
ALTER TABLE inv_stocktaking ADD COLUMN IF NOT EXISTS deleted TINYINT DEFAULT 0;
ALTER TABLE inv_transfer_order ADD COLUMN IF NOT EXISTS deleted TINYINT DEFAULT 0;
ALTER TABLE fin_receivable ADD COLUMN IF NOT EXISTS deleted TINYINT DEFAULT 0;
ALTER TABLE fin_payable ADD COLUMN IF NOT EXISTS deleted TINYINT DEFAULT 0;

-- 3. 迁移冗余表数据（详细迁移逻辑见 0005_consolidate_redundant_tables.sql）

-- 回滚语句：
-- ALTER TABLE qrcode_record DROP COLUMN IF EXISTS split_flag;
-- ALTER TABLE qrcode_record DROP COLUMN IF EXISTS parent_qr_id;
