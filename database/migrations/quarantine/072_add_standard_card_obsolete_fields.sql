-- 072 为标准卡 print 表补充「作废」相关字段
-- 依赖：update_standard_card.sql 已创建 prd_standard_card（print 取向单表）
-- 说明：/api/standard-card/action?action=obsolete 流转到 status=5(已作废)，
--       需记录作废原因/操作人/时间。使用 ADD COLUMN IF NOT EXISTS 保证幂等、可重复执行。
ALTER TABLE `prd_standard_card`
  ADD COLUMN IF NOT EXISTS `obsolete_reason` VARCHAR(500) DEFAULT NULL COMMENT '作废原因' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `obsolete_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '作废人ID' AFTER `obsolete_reason`,
  ADD COLUMN IF NOT EXISTS `obsolete_at` DATETIME DEFAULT NULL COMMENT '作废时间' AFTER `obsolete_by`;
