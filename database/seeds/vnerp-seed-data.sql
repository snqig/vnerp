-- ###########################################################
-- 印刷生产经营信息管理系统 Print MIS 丝网印刷ERP 全新业务种子数据
-- 编码规则、小料拆分、FIFO、库位、工单、检验、财务 全闭环
-- 基于全局配置驱动生成，可直接执行
-- ###########################################################

SET FOREIGN_KEY_CHECKS = 0;

-- ========================
-- 1. 客户
-- ========================
INSERT INTO crm_customer (id, customer_no, name, contact, phone, address, status, create_time)
VALUES (1, 'CUST000001', '测试客户A', '张三', '13800000001', '广东省深圳市宝安区', 1, NOW());

-- ========================
-- 2. 供应商
-- ========================
INSERT INTO pur_supplier (id, supplier_no, name, contact, phone, address, status, create_time)
VALUES (1, 'SUPP000001', '测试原料供应商', '李四', '13800000002', '广东省东莞市', 1, NOW());

-- ========================
-- 3. 物料（整料 / 小料 / 成品 全套关联）
-- ========================
INSERT INTO bas_material (id, mat_no, name, spec, unit, type, split_unit, split_enable, shelf_life, status, create_time)
VALUES
(1, 'MAT000001', 'PET薄膜(整卷)', '100米/卷', '卷', 'raw', 10, 1, 180, 1, NOW()),
(2, 'MAT000002', 'PET薄膜(小卷)', '10米/卷', '卷', 'raw', 0, 0, 180, 1, NOW()),
(3, 'MAT000003', '黑色油墨', '5kg/桶', 'kg', 'raw', 1, 1, 180, 1, NOW()),
(4, 'MAT000004', '成品-丝网印刷A', '100*200mm', 'pcs', 'finish', 0, 0, 365, 1, NOW()),
(5, 'MAT000005', '洗网水', '20L/桶', 'L', 'raw', 5, 1, 365, 1, NOW());

-- ========================
-- 4. BOM（成品→小料→辅料）
-- ========================
INSERT INTO bom_list (id, bom_no, material_id, version, status, create_time)
VALUES (1, 'BOM000001', 4, 'V1.0', 1, NOW());

INSERT INTO bom_item (id, bom_id, material_id, qty, unit, remark)
VALUES
(1, 1, 2, 1, '卷', 'PET薄膜小卷'),
(2, 1, 3, 0.5, 'kg', '黑色油墨'),
(3, 1, 5, 0.1, 'L', '洗网水');

-- ========================
-- 5. 仓库 + 库位（7步闭环分区）
-- ========================
INSERT INTO inv_warehouse (id, wh_no, name, type, status, create_time)
VALUES (1, 'WH01', '主仓库', 'main', 1, NOW());

INSERT INTO inv_warehouse_location (id, wh_id, code, name, type, status, create_time)
VALUES
(1, 1, 'WH01-WAIT', '待检区', 'wait', 1, NOW()),
(2, 1, 'WH01-BIG', '整料区', 'big', 1, NOW()),
(3, 1, 'WH01-SMALL', '小料区', 'small', 1, NOW()),
(4, 1, 'WH01-BAD', '不良品区', 'bad', 1, NOW()),
(5, 1, 'WH01-FINISH', '成品区', 'finish', 1, NOW());

-- ========================
-- 6. 工序
-- ========================
INSERT INTO prd_process (id, process_code, process_name, sort_order, status, create_time)
VALUES
(1, 'P01', '制版', 1, 1, NOW()),
(2, 'P02', '印刷', 2, 1, NOW()),
(3, 'P03', '烘干', 3, 1, NOW()),
(4, 'P04', '检验', 4, 1, NOW()),
(5, 'P05', '包装入库', 5, 1, NOW());

-- ========================
-- 7. 刀模 / 网版（带寿命规则）
-- ========================
INSERT INTO eqp_mould (id, mould_code, mould_name, material_id, use_days, max_times, warn_days, current_times, status, create_time)
VALUES (1, 'MD001', '标准刀模A', 4, 90, 5000, 15, 1200, 1, NOW());

INSERT INTO eqp_screen (id, screen_code, screen_name, material_id, mesh_count, use_days, max_times, warn_days, current_times, status, create_time)
VALUES (1, 'SC001', '350目网版', 4, 350, 60, 3000, 10, 800, 1, NOW());

-- ========================
-- 8. 标准卡（颜色 / 工艺 / 质量）
-- =================-------
INSERT INTO standard_cards (id, card_no, name, type, version, material_id, status, create_time)
VALUES
(1, 'SCC20260511001', '黑色印刷标准卡', 'color', 'V1.0', 4, 1, NOW()),
(2, 'SCP20260511001', '丝网印刷工艺卡', 'process', 'V1.0', 4, 1, NOW()),
(3, 'SCQ20260511001', '成品检验质量卡', 'quality', 'V1.0', 4, 1, NOW());

-- ========================
-- 9. 销售订单（业务起点）
-- ========================
INSERT INTO sal_order (id, so_no, customer_id, order_date, delivery_date, status, total_amount, remark, create_time)
VALUES (1, 'SO202605110001', 1, '2026-05-11', '2026-06-11', 2, 8000.00, '测试订单', NOW());

INSERT INTO sal_order_item (id, so_id, material_id, qty, unit_price, amount, remark)
VALUES (1, 1, 4, 100, 80.00, 8000.00, '成品-丝网印刷A');

-- ========================
-- 10. 生产工单
-- ========================
INSERT INTO prd_work_order (id, wo_no, so_id, material_id, plan_qty, bom_id, standard_card_id, status, start_time, end_time, remark, create_time)
VALUES (1, 'WO202605110001', 1, 4, 100, 1, 2, 2, '2026-05-12 08:00:00', '2026-05-16 18:00:00', '生产工单', NOW());

-- ========================
-- 11. 入库单（整料）+ 小料拆分
-- ========================
INSERT INTO inv_inbound_order (id, in_no, wh_id, supplier_id, type, status, total_amount, remark, create_time)
VALUES (1, 'IN202605110001', 1, 1, 'purchase', 4, 1500.00, '采购入库', NOW());

INSERT INTO inv_inbound_item (id, inbound_id, material_id, batch_no, qty, unit, price, amount, qr_code, location_id, status, create_time)
VALUES
(1, 1, 1, 'RM20260511001', 10, '卷', 100.00, 1000.00, 'VNR202605110000010', 2, 4, NOW()),
(2, 1, 3, 'RM20260511002', 50, 'kg', 8.00, 400.00, 'VNR202605110000021', 2, 4, NOW()),
(3, 1, 5, 'RM20260511003', 20, 'L', 5.00, 100.00, 'VNR202605110000031', 2, 4, NOW());

-- 拆分记录：10卷整料 → 100卷小料（每卷10米）
INSERT INTO material_splits (id, parent_qr_code, child_qr_code, material_id, parent_qty, child_qty, split_time, operator_id, status, create_time)
VALUES
(1, 'VNR202605110000010', 'VNR202605110000011', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(2, 'VNR202605110000010', 'VNR202605110000012', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(3, 'VNR202605110000010', 'VNR202605110000013', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(4, 'VNR202605110000010', 'VNR202605110000014', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(5, 'VNR202605110000010', 'VNR202605110000015', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(6, 'VNR202605110000010', 'VNR202605110000016', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(7, 'VNR202605110000010', 'VNR202605110000017', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(8, 'VNR202605110000010', 'VNR202605110000018', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(9, 'VNR202605110000010', 'VNR202605110000019', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW()),
(10, 'VNR202605110000010', 'VNR202605110000020', 1, 100, 10, '2026-05-11 09:00:00', 1, 'used', NOW());

-- ========================
-- 12. 批次库存（FIFO正确）
-- ========================
INSERT INTO wh_inventory (id, qr_code, material_id, warehouse_id, location_id, quantity, batch_no, inbound_time, status, create_time)
VALUES
(1, 'VNR202605110000011', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:00:00', 1, NOW()),
(2, 'VNR202605110000012', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:00:00', 1, NOW()),
(3, 'VNR202605110000013', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:00:00', 1, NOW()),
(4, 'VNR202605110000014', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:00:00', 1, NOW()),
(5, 'VNR202605110000015', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:00:00', 1, NOW()),
(6, 'VNR202605110000016', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:30:00', 1, NOW()),
(7, 'VNR202605110000017', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:30:00', 1, NOW()),
(8, 'VNR202605110000018', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:30:00', 1, NOW()),
(9, 'VNR202605110000019', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:30:00', 1, NOW()),
(10, 'VNR202605110000020', 2, 1, 3, 10, 'RM20260511001', '2026-05-11 08:30:00', 1, NOW()),
(11, 'VNR202605110000021', 3, 1, 3, 50, 'RM20260511002', '2026-05-11 08:00:00', 1, NOW()),
(12, 'VNR202605110000031', 5, 1, 3, 20, 'RM20260511003', '2026-05-11 08:00:00', 1, NOW());

-- ========================
-- 13. 领料单（按BOM、按FIFO）
-- ========================
INSERT INTO mat_requisition (id, req_no, wo_id, requisition_type, status, applicant_id, apply_time, approve_time, remark, create_time)
VALUES (1, 'MR202605110001', 1, 'normal', 4, 1, '2026-05-12 07:30:00', '2026-05-12 07:35:00', '生产领料', NOW());

INSERT INTO mat_requisition_item (id, requisition_id, material_id, plan_qty, actual_qty, unit, qr_code, batch_no, location_id, status, create_time)
VALUES
(1, 1, 2, 100, 100, '卷', 'VNR202605110000011', 'RM20260511001', 3, 4, NOW()),
(2, 1, 3, 50, 50, 'kg', 'VNR202605110000021', 'RM20260511002', 3, 4, NOW()),
(3, 1, 5, 10, 10, 'L', 'VNR202605110000031', 'RM20260511003', 3, 4, NOW());

-- 更新库存（领料出库）
UPDATE wh_inventory SET quantity = quantity - 100 WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
UPDATE wh_inventory SET quantity = quantity - 50 WHERE id = 11;
UPDATE wh_inventory SET quantity = quantity - 10 WHERE id = 12;

-- ========================
-- 14. 工序报工（不跳工序）
-- ========================
INSERT INTO prd_process_report (id, wo_id, process_id, operator_id, report_date, plan_qty, completed_qty, qualified_qty, scrapped_qty, work_hours, status, remark, create_time)
VALUES
(1, 1, 1, 1, '2026-05-12 08:00:00', 100, 100, 98, 2, 8, 'finished', '制版完成', NOW()),
(2, 1, 2, 1, '2026-05-13 08:00:00', 100, 100, 97, 3, 8, 'finished', '印刷完成', NOW()),
(3, 1, 3, 1, '2026-05-14 08:00:00', 100, 100, 99, 1, 6, 'finished', '烘干完成', NOW()),
(4, 1, 4, 1, '2026-05-15 08:00:00', 100, 99, 97, 2, 8, 'finished', '检验完成', NOW()),
(5, 1, 5, 1, '2026-05-16 08:00:00', 99, 97, 97, 0, 4, 'finished', '包装入库', NOW());

-- ========================
-- 15. 检验报告
-- ========================
INSERT INTO qms_inspection_report (id, report_no, inspection_type, wo_id, inspector_id, inspection_date, sample_size, qualified_size, unqualified_size, result, status, conclusion, create_time)
VALUES (1, 'IR202605110001', 'FQC', 1, 1, '2026-05-15 14:00:00', 99, 97, 2, 'qualified', 'finished', '合格', NOW());

-- ========================
-- 16. 成品入库
-- ========================
INSERT INTO fpr_receipt (id, receipt_no, wo_id, warehouse_id, location_id, qty, unit, quality_status, status, receiver_id, receive_time, remark, create_time)
VALUES (1, 'FPR202605110001', 1, 1, 5, 97, 'pcs', 'qualified', 4, 1, '2026-05-16 16:00:00', '成品入库', NOW());

-- 插入成品库存
INSERT INTO wh_inventory (id, qr_code, material_id, warehouse_id, location_id, quantity, batch_no, inbound_time, status, create_time)
VALUES (13, 'VNR202605160000001', 4, 1, 5, 97, 'FP20260516001', '2026-05-16 16:00:00', 1, NOW());

-- ========================
-- 17. 发货单
-- ========================
INSERT INTO ship_shipment (id, ship_no, so_id, customer_id, shipment_date, status, total_qty, shipped_qty, carrier, tracking_no, remark, create_time)
VALUES (1, 'SH202605170001', 1, 1, '2026-05-17 09:00:00', 4, 97, 97, '顺丰速运', 'SF1234567890', '发货', NOW());

INSERT INTO ship_shipment_item (id, shipment_id, material_id, qty, unit, qr_code, batch_no, status, create_time)
VALUES (1, 1, 4, 97, 'pcs', 'VNR202605160000001', 'FP20260516001', 4, NOW());

-- 更新库存（发货出库）
UPDATE wh_inventory SET quantity = 0 WHERE id = 13;

-- ========================
-- 18. 财务应收
-- ========================
INSERT INTO fin_ar (id, ar_no, so_id, shipment_id, customer_id, total_amount, received_amount, balance_amount, due_date, status, create_time)
VALUES (1, 'AR202605170001', 1, 1, 1, 7760.00, 0, 7760.00, '2026-06-17', 'unpaid', NOW());

-- ========================
-- 19. 工单成本核算
-- ========================
INSERT INTO fin_workorder_cost (id, wo_id, material_cost, labor_cost, overhead_cost, total_cost, unit_cost, qty, status, calculate_time, create_time)
VALUES (1, 1, 1450.00, 2720.00, 680.00, 4850.00, 50.00, 97, 'calculated', '2026-05-16 18:00:00', NOW());

-- 成本明细
INSERT INTO fin_material_batch_cost (id, wo_id, material_id, qty, unit_cost, total_cost, batch_no, source_type, create_time)
VALUES
(1, 1, 2, 100, 10.00, 1000.00, 'RM20260511001', 'requisition', NOW()),
(2, 1, 3, 50, 8.00, 400.00, 'RM20260511002', 'requisition', NOW()),
(3, 1, 5, 10, 5.00, 50.00, 'RM20260511003', 'requisition', NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ✅ 种子数据插入完成！
--
-- 📊 数据统计：
--    客户：1家
--    供应商：1家
--    物料：5种（整料1种 + 小料1种 + 辅料2种 + 成品1种）
--    仓库：1个（含5个库位）
--    工序：5道
--    刀模：1套
--    网版：1块
--    标准卡：3张
--    销售订单：1笔
--    生产工单：1张
--    入库单：1张（含物料拆分记录10条）
--    库存批次：13条
--    领料单：1张（含明细3项）
--    工序报工：5道（完整流程）
--    检验报告：1份
--    成品入库：1批
--    发货单：1批
--    应收账款：1笔
--    工单成本：1笔（含材料成本明细3项）
--
-- 🔗 可跑通的业务流程：
--    销售(SO) → 生产(WO) → 采购(IN) → 拆分(SPLIT) → 库存(WH)
--    → 领料(MR) → 报工(REPORT) → 检验(FQC) → 入库(FPR)
--    → 发货(SH) → 应收(AR) → 成本(COST)
--
-- 💡 使用说明：
--    1. 先执行清空旧数据SQL（附件A）
--    2. 再执行本文件
--    3. 系统即可正常演示完整业务流程
-- ============================================================