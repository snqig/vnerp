-- Migration 053: 报工表新增工装关联列（刀模/网版）
-- 依据: docs/刀模 _ 网版工装全生命周期管理 完整落地方案.md 第7.2节
-- 目的: 打通报工 → 工装寿命累计事件驱动联动
-- 关联: dcprint_tool.id（不加 FK 约束，与 dcprint_sample_process_card.die_tool_id 现有模式一致）

ALTER TABLE `prd_work_report`
  ADD COLUMN `tool_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联刀模工装ID（dcprint_tool.id）' AFTER `remark`,
  ADD COLUMN `screen_plate_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联网版工装ID（dcprint_tool.id）' AFTER `tool_id`;

ALTER TABLE `prd_work_report`
  ADD INDEX `idx_tool_id` (`tool_id`),
  ADD INDEX `idx_screen_plate_id` (`screen_plate_id`);
