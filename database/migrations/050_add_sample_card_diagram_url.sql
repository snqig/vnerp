-- Migration 050: 打样工艺卡 — 新增工艺图示字段（图文混排）
-- 依据: docs/打样工艺卡录入页统一完善方案.md
-- 支持在工艺卡中插入工艺简图，使信息更直观

ALTER TABLE `dcprint_sample_process_card`
  ADD COLUMN `diagram_url` VARCHAR(500) DEFAULT NULL COMMENT '工艺图示URL' AFTER `remark`;
