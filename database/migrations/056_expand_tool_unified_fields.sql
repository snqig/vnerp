-- 056: 扩展 dcprint_tool 表，统一刀模/网版/工装三套体系字段
-- 来源: 体系B (dcprint_die_template) + 体系C (dcprint_screen_plate)

ALTER TABLE dcprint_tool
  -- 体系B 字段 (刀模)
  ADD COLUMN asset_type VARCHAR(50) DEFAULT NULL COMMENT '资产类型' AFTER warehouse_location,
  ADD COLUMN layout_type VARCHAR(50) DEFAULT NULL COMMENT '版面类型' AFTER asset_type,
  ADD COLUMN pieces_per_impression INT DEFAULT NULL COMMENT '每版印张数' AFTER layout_type,
  ADD COLUMN material VARCHAR(100) DEFAULT NULL COMMENT '材质' AFTER pieces_per_impression,
  ADD COLUMN qr_code VARCHAR(255) DEFAULT NULL COMMENT '二维码' AFTER material,
  ADD COLUMN supplier_id BIGINT UNSIGNED DEFAULT NULL COMMENT '供应商ID' AFTER qr_code,
  ADD COLUMN maintenance_interval INT DEFAULT NULL COMMENT '保养间隔(印数)' AFTER supplier_id,
  ADD COLUMN maintenance_count INT DEFAULT 0 COMMENT '保养次数' AFTER maintenance_interval,
  ADD COLUMN last_maintenance_date DATE DEFAULT NULL COMMENT '上次保养日期' AFTER maintenance_count,
  ADD COLUMN last_maintenance_impressions INT DEFAULT NULL COMMENT '上次保养印数' AFTER last_maintenance_date,
  ADD COLUMN last_used_date DATE DEFAULT NULL COMMENT '上次使用日期' AFTER last_maintenance_impressions,
  -- 体系C 字段 (网版)
  ADD COLUMN mesh_count VARCHAR(20) DEFAULT NULL COMMENT '目数' AFTER last_used_date,
  ADD COLUMN mesh_material VARCHAR(50) DEFAULT NULL COMMENT '丝网材质' AFTER mesh_count,
  ADD COLUMN size VARCHAR(50) DEFAULT NULL COMMENT '尺寸' AFTER mesh_material,
  ADD COLUMN tension_value DECIMAL(5,1) DEFAULT NULL COMMENT '张力值' AFTER size,
  ADD COLUMN frame_type VARCHAR(50) DEFAULT NULL COMMENT '网框类型' AFTER tension_value,
  ADD COLUMN customer_id BIGINT UNSIGNED DEFAULT NULL COMMENT '客户ID' AFTER frame_type,
  ADD COLUMN reclaim_count INT DEFAULT 0 COMMENT '回用次数' AFTER customer_id,
  ADD COLUMN exposure_date DATE DEFAULT NULL COMMENT '曝光日期' AFTER reclaim_count,
  ADD COLUMN last_clean_date DATE DEFAULT NULL COMMENT '上次清洗日期' AFTER exposure_date,
  ADD COLUMN last_reclaim_date DATE DEFAULT NULL COMMENT '上次回用日期' AFTER last_clean_date,
  ADD COLUMN tension_date DATE DEFAULT NULL COMMENT '张力检测日期' AFTER last_reclaim_date;
