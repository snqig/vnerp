-- 20260924: eng_sample_to_mass 数据重生成（修复幽灵关联 + 状态语义 + 关联补齐）
-- 背景（2026-09-24 实测）：
--   1. standard_card_id 44-63 为幽灵引用（dcprint_sample_process_card 命中 0/20）→ 置 NULL
--   2. workorder_id 505-524 全部指向 deleted=1 的软删工单 → 改关联真实在用工单并回填产品归属
--   3. product_code/bom_id/bom_version/确认人/参数全 NULL → prd_bom 50-59 与 mdm_product 44-53 精确对位回填
--   4. transfer_no 前缀 TR- 与代码生成 STM- 不一致 → 统一 STM-YYYYMMDD-NNN
--   5. status 全部=3 但 workorder 已填/conversion_date 空 → 重建合理状态流转（1/2/3/4/5/6/7 混合）
-- 真实可依赖关联（已核实）：sal_sample_order 77-96（20/20 存在、单号全对位）、crm_customer 61-70、
--   mdm_product 44-53、prd_bom 50-59（product_id 44-53 一一对应）

-- ① 备份（列序 = INFORMATION_SCHEMA ORDINAL_POSITION，rollback 用 INSERT SELECT * 恢复）
DROP TABLE IF EXISTS eng_sample_to_mass_bak_20260924_stm;
CREATE TABLE eng_sample_to_mass_bak_20260924_stm AS
SELECT * FROM eng_sample_to_mass;

-- ② 清空重建（全表仅 20 行活数据，id 42-61）
DELETE FROM eng_sample_to_mass;

INSERT INTO eng_sample_to_mass (
  id, sample_order_id, sample_order_no, product_id, product_name, customer_id, customer_name,
  standard_card_id, standard_card_no, process_card_id, process_card_no,
  status, remark, create_time, update_time, deleted, transfer_no, product_code,
  sample_params, mass_params, sop_file, bom_id, bom_version, process_route, check_standard, special_note,
  sample_confirmer, sample_confirm_date, eng_confirmer, eng_confirm_date,
  prod_confirmer, prod_confirm_date, quality_confirmer, quality_confirm_date,
  create_by, workorder_id, workorder_no, conversion_date, approved_by
) VALUES
-- 草稿（status=1）：仅基础信息
(42, 77, 'SMP-2026-09-14-01', 44, '空调控制面板标签', 61, '美的集团',
 NULL, NULL, NULL, NULL, 1, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-001', 'PRD001',
 '{"material":"PET","thickness":"0.05mm","print_colors":4,"size":"50x30mm","adhesive":"强粘"}',
 '{"speed":"12000 pcs/h","scrap_rate":"0.8%","ink":"UV-4C","die":"标准模切"}',
 NULL, 50, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL),
-- 样品确认（status=2）
(43, 78, 'SMP-2026-09-14-02', 45, '洗衣机铭牌', 62, '格力电器',
 NULL, NULL, NULL, NULL, 2, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-002', 'PRD002',
 '{"material":"PVC","thickness":"0.1mm","print_colors":2,"size":"80x50mm"}',
 '{"speed":"8000 pcs/h","scrap_rate":"1.0%","ink":"UV-2C","die":"圆角模切"}',
 NULL, 51, '1.0', '印刷→冲压→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL),
-- 工程确认（status=3）
(44, 79, 'SMP-2026-09-14-03', 46, '手机电池标签', 63, '华为技术',
 NULL, NULL, NULL, NULL, 3, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-003', 'PRD003',
 '{"material":"PP","thickness":"0.08mm","print_colors":5,"size":"60x40mm","heatmap":true}',
 '{"speed":"10000 pcs/h","scrap_rate":"0.5%","ink":"UV-5C","die":"异形模切"}',
 NULL, 52, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '耐候性需通过 72h 盐雾测试',
 '张伟', '2026-09-14', '李娜', '2026-09-14', NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL),
(45, 80, 'SMP-2026-09-14-04', 47, '新能源汽车电池包标签', 64, '比亚迪汽车',
 NULL, NULL, NULL, NULL, 3, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-004', 'PRD004',
 '{"material":"PP","thickness":"0.08mm","print_colors":5,"size":"60x40mm","heatmap":true}',
 '{"speed":"10000 pcs/h","scrap_rate":"0.5%","ink":"UV-5C","die":"异形模切"}',
 NULL, 53, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '车规级要求：-40℃~85℃ 温循',
 '张伟', '2026-09-14', '李娜', '2026-09-14', NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL),
-- 生产确认（status=4）
(46, 81, 'SMP-2026-09-14-05', 48, '医疗设备面板标签', 65, '迈瑞医疗',
 NULL, NULL, NULL, NULL, 4, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-005', 'PRD005',
 '{"material":"PET","thickness":"0.05mm","print_colors":4,"size":"50x30mm","adhesive":"强粘"}',
 '{"speed":"12000 pcs/h","scrap_rate":"0.8%","ink":"UV-4C","die":"标准模切"}',
 NULL, 54, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '医疗级：需环氧乙烷灭菌兼容',
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', NULL, NULL, 1, NULL, NULL, NULL, NULL),
(47, 82, 'SMP-2026-09-14-06', 49, '无人机外壳标识', 66, '大疆创新',
 NULL, NULL, NULL, NULL, 4, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-006', 'PRD006',
 '{"material":"亚克力","thickness":"2mm","print_colors":3,"size":"100x60mm"}',
 '{"speed":"3000 pcs/h","scrap_rate":"1.5%","ink":"溶剂-3C","die":"CNC精雕"}',
 NULL, 55, '1.0', '印刷→精雕→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', NULL, NULL, 1, NULL, NULL, NULL, NULL),
-- 品质确认（status=5）
(48, 83, 'SMP-2026-09-14-07', 50, '锂电池电芯标签', 67, '宁德时代',
 NULL, NULL, NULL, NULL, 5, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-007', 'PRD007',
 '{"material":"PP","thickness":"0.08mm","print_colors":5,"size":"60x40mm","heatmap":true}',
 '{"speed":"10000 pcs/h","scrap_rate":"0.5%","ink":"UV-5C","die":"异形模切"}',
 NULL, 56, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '阻燃等级需达 UL94 VTM-0',
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, NULL, NULL, NULL, NULL),
(49, 84, 'SMP-2026-09-14-08', 51, '工业自动化PLC标签', 68, '宁德时代科技',
 NULL, NULL, NULL, NULL, 5, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-008', 'PRD008',
 '{"material":"PVC","thickness":"0.1mm","print_colors":2,"size":"80x50mm"}',
 '{"speed":"8000 pcs/h","scrap_rate":"1.0%","ink":"UV-2C","die":"圆角模切"}',
 NULL, 57, '1.0', '印刷→冲压→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, NULL, NULL, NULL, NULL),
(50, 85, 'SMP-2026-09-14-09', 52, '服务器机箱标签', 69, '汇川技术',
 NULL, NULL, NULL, NULL, 5, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-009', 'PRD009',
 '{"material":"PET","thickness":"0.05mm","print_colors":4,"size":"50x30mm","adhesive":"强粘"}',
 '{"speed":"12000 pcs/h","scrap_rate":"0.8%","ink":"UV-4C","die":"标准模切"}',
 NULL, 58, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, NULL, NULL, NULL, NULL),
(51, 86, 'SMP-2026-09-14-10', 53, '充电桩标识牌', 70, '联想集团',
 NULL, NULL, NULL, NULL, 5, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-010', 'PRD010',
 '{"material":"亚克力","thickness":"2mm","print_colors":3,"size":"100x60mm"}',
 '{"speed":"3000 pcs/h","scrap_rate":"1.5%","ink":"溶剂-3C","die":"CNC精雕"}',
 NULL, 59, '1.0', '印刷→精雕→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '户外使用：需 UV 防老化涂层',
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, NULL, NULL, NULL, NULL),
-- 已转量产（status=6）：全确认链 + 关联真实在用工单 + 转产日期/审批人
(52, 87, 'SMP-2026-09-14-11', 44, '空调控制面板标签', 61, '美的集团',
 NULL, NULL, NULL, NULL, 6, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-011', 'PRD001',
 '{"material":"PET","thickness":"0.05mm","print_colors":4,"size":"50x30mm","adhesive":"强粘"}',
 '{"speed":"12000 pcs/h","scrap_rate":"0.8%","ink":"UV-4C","die":"标准模切"}',
 NULL, 50, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, 9260, 'WO-00030', '2026-09-15', '超级管理员'),
(53, 88, 'SMP-2026-09-14-12', 45, '洗衣机铭牌', 62, '格力电器',
 NULL, NULL, NULL, NULL, 6, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-012', 'PRD002',
 '{"material":"PVC","thickness":"0.1mm","print_colors":2,"size":"80x50mm"}',
 '{"speed":"8000 pcs/h","scrap_rate":"1.0%","ink":"UV-2C","die":"圆角模切"}',
 NULL, 51, '1.0', '印刷→冲压→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, 9261, 'WO-00032', '2026-09-15', '超级管理员'),
(54, 89, 'SMP-2026-09-14-13', 46, '手机电池标签', 63, '华为技术',
 NULL, NULL, NULL, NULL, 6, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-013', 'PRD003',
 '{"material":"PP","thickness":"0.08mm","print_colors":5,"size":"60x40mm","heatmap":true}',
 '{"speed":"10000 pcs/h","scrap_rate":"0.5%","ink":"UV-5C","die":"异形模切"}',
 NULL, 52, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, 9262, 'WO-00033', '2026-09-16', '超级管理员'),
(55, 90, 'SMP-2026-09-14-14', 47, '新能源汽车电池包标签', 64, '比亚迪汽车',
 NULL, NULL, NULL, NULL, 6, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-014', 'PRD004',
 '{"material":"PP","thickness":"0.08mm","print_colors":5,"size":"60x40mm","heatmap":true}',
 '{"speed":"10000 pcs/h","scrap_rate":"0.5%","ink":"UV-5C","die":"异形模切"}',
 NULL, 53, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '车规级要求：-40℃~85℃ 温循',
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, 9263, 'WO-00034', '2026-09-16', '超级管理员'),
(56, 91, 'SMP-2026-09-14-15', 48, '医疗设备面板标签', 65, '迈瑞医疗',
 NULL, NULL, NULL, NULL, 6, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-015', 'PRD005',
 '{"material":"PET","thickness":"0.05mm","print_colors":4,"size":"50x30mm","adhesive":"强粘"}',
 '{"speed":"12000 pcs/h","scrap_rate":"0.8%","ink":"UV-4C","die":"标准模切"}',
 NULL, 54, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '医疗级：需环氧乙烷灭菌兼容',
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, 9256, 'WO-00024', '2026-09-17', '超级管理员'),
(57, 92, 'SMP-2026-09-14-16', 49, '无人机外壳标识', 66, '大疆创新',
 NULL, NULL, NULL, NULL, 6, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-016', 'PRD006',
 '{"material":"亚克力","thickness":"2mm","print_colors":3,"size":"100x60mm"}',
 '{"speed":"3000 pcs/h","scrap_rate":"1.5%","ink":"溶剂-3C","die":"CNC精雕"}',
 NULL, 55, '1.0', '印刷→精雕→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', '李娜', '2026-09-14', '王强', '2026-09-15', '刘洋', '2026-09-15', 1, 9257, 'WO-00026', '2026-09-17', '超级管理员'),
-- 退回（status=7）
(58, 93, 'SMP-2026-09-14-17', 50, '锂电池电芯标签', 67, '宁德时代',
 NULL, NULL, NULL, NULL, 7, '工程确认后发现样品耐候性不达标，退回重新打样', '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-017', 'PRD007',
 '{"material":"PP","thickness":"0.08mm","print_colors":5,"size":"60x40mm","heatmap":true}',
 '{"speed":"10000 pcs/h","scrap_rate":"0.5%","ink":"UV-5C","die":"异形模切"}',
 NULL, 56, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '阻燃等级需达 UL94 VTM-0',
 '张伟', '2026-09-14', '李娜', '2026-09-14', NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL),
-- 第二轮打样新单
(59, 94, 'SMP-2026-09-14-18', 51, '工业自动化PLC标签', 68, '宁德时代科技',
 NULL, NULL, NULL, NULL, 1, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-018', 'PRD008',
 '{"material":"PVC","thickness":"0.1mm","print_colors":2,"size":"80x50mm"}',
 '{"speed":"8000 pcs/h","scrap_rate":"1.0%","ink":"UV-2C","die":"圆角模切"}',
 NULL, 57, '1.0', '印刷→冲压→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL),
(60, 95, 'SMP-2026-09-14-19', 52, '服务器机箱标签', 69, '汇川技术',
 NULL, NULL, NULL, NULL, 2, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-019', 'PRD009',
 '{"material":"PET","thickness":"0.05mm","print_colors":4,"size":"50x30mm","adhesive":"强粘"}',
 '{"speed":"12000 pcs/h","scrap_rate":"0.8%","ink":"UV-4C","die":"标准模切"}',
 NULL, 58, '1.0', '印刷→模切→质检→包装', 'GB/T 7705-2008 印刷品外观要求', NULL,
 '张伟', '2026-09-14', NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL),
(61, 96, 'SMP-2026-09-14-20', 53, '充电桩标识牌', 70, '联想集团',
 NULL, NULL, NULL, NULL, 3, NULL, '2026-09-14 11:30:00', NOW(), 0, 'STM-20260914-020', 'PRD010',
 '{"material":"亚克力","thickness":"2mm","print_colors":3,"size":"100x60mm"}',
 '{"speed":"3000 pcs/h","scrap_rate":"1.5%","ink":"溶剂-3C","die":"CNC精雕"}',
 NULL, 59, '1.0', '印刷→精雕→质检→包装', 'GB/T 7705-2008 印刷品外观要求', '户外使用：需 UV 防老化涂层',
 '张伟', '2026-09-14', '李娜', '2026-09-14', NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL);

-- ③ 已转量产记录关联的 6 条工单：回填产品归属（原 product_id=0 空壳，同时修复工单池产品归属）
UPDATE prod_work_order SET product_id = 44, product_code = 'PRD001', product_name = '空调控制面板标签', update_time = NOW() WHERE id = 9260 AND deleted = 0;
UPDATE prod_work_order SET product_id = 45, product_code = 'PRD002', product_name = '洗衣机铭牌', update_time = NOW() WHERE id = 9261 AND deleted = 0;
UPDATE prod_work_order SET product_id = 46, product_code = 'PRD003', product_name = '手机电池标签', update_time = NOW() WHERE id = 9262 AND deleted = 0;
UPDATE prod_work_order SET product_id = 47, product_code = 'PRD004', product_name = '新能源汽车电池包标签', update_time = NOW() WHERE id = 9263 AND deleted = 0;
UPDATE prod_work_order SET product_id = 48, product_code = 'PRD005', product_name = '医疗设备面板标签', update_time = NOW() WHERE id = 9256 AND deleted = 0;
UPDATE prod_work_order SET product_id = 49, product_code = 'PRD006', product_name = '无人机外壳标识', update_time = NOW() WHERE id = 9257 AND deleted = 0;
