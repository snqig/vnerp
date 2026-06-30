-- 生产模块测试数据
-- 依赖 base-data.sql 已执行

-- 标准卡
INSERT INTO prd_standard_card (id, card_no, product_name, specification, status, create_time) VALUES
(1, 'SC202605100001', '黑色印刷标准卡', '200目丝网+黑色油墨', 1, NOW()),
(2, 'SC202605100002', '白色印刷标准卡', '150目丝网+白色油墨', 1, NOW());

-- 标准卡油墨明细
INSERT INTO prd_standard_card_ink (id, card_id, ink_type, ink_color, mix_ratio, usage_amount, unit) VALUES
(1, 1, '溶剂型', '黑色', '1:0.2', 0.5, 'kg'),
(2, 2, '溶剂型', '白色', '1:0.3', 0.8, 'kg');

-- 标准卡网版明细
INSERT INTO prd_standard_card_screen (id, card_id, screen_type, mesh_count, tension, unit) VALUES
(1, 1, '不锈钢', 200, 25, 'N/cm'),
(2, 2, '聚酯', 150, 20, 'N/cm');

-- 标准卡刀具明细
INSERT INTO prd_standard_card_die (id, card_id, die_type, die_code, cutting_method) VALUES
(1, 1, '平压平', 'DIE-A001', '模切'),
(2, 2, '圆压圆', 'DIE-B001', '滚切');

-- 生产工单
INSERT INTO prd_work_order (id, order_no, product_name, plan_quantity, completed_quantity, status, standard_card_id, plan_start_date, plan_end_date, create_time) VALUES
(1, 'WO202605100001', '黑色标签印刷', 1000, 0, 1, 1, '2026-05-10', '2026-05-15', NOW()),
(2, 'WO202605100002', '白色包装印刷', 2000, 500, 3, 2, '2026-05-08', '2026-05-12', NOW());

-- 报工记录
INSERT INTO prd_work_report (id, work_order_id, report_type, good_qty, defect_qty, operator_name, report_time, create_time) VALUES
(1, 2, 1, 500, 10, '操作员A', NOW(), NOW());
