-- rollback: 20260924_regen_sample_to_mass_data.sql
-- 从备份表恢复原 20 行（列序与主表一致，SELECT * 直接回灌），并还原 6 条工单的产品归属为空壳。
DELETE FROM eng_sample_to_mass;
INSERT INTO eng_sample_to_mass SELECT * FROM eng_sample_to_mass_bak_20260924_stm;

UPDATE prod_work_order SET product_id = 0, product_code = '', product_name = NULL, update_time = NOW() WHERE id IN (9260, 9261, 9262, 9263, 9256, 9257) AND deleted = 0;
