-- =====================================================================
-- 回滚：20260924_regen_sample_order_ink_data.sql
-- 策略：整表回灌备份表（备份在迁移首步 CTAS 生成）
-- =====================================================================

-- 1. prd_ink：清空后回灌
DELETE FROM prd_ink;
INSERT INTO prd_ink SELECT * FROM prd_ink_bak_20260924_ink;

-- 2. sal_sample_order：清空后回灌
DELETE FROM sal_sample_order;
INSERT INTO sal_sample_order SELECT * FROM sal_sample_order_bak_20260924_sao;

-- 3. sal_sample_inventory：清空后回灌
DELETE FROM sal_sample_inventory;
INSERT INTO sal_sample_inventory SELECT * FROM sal_sample_inventory_bak_20260924_sao;
