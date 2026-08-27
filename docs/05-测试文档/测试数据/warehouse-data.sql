-- 仓库模块测试数据
-- 依赖 base-data.sql 已执行

-- 入库记录
INSERT INTO inv_production_inbound (id, inbound_no, inbound_type, warehouse_id, operator_name, status, remark, create_time) VALUES
(1, 'IN202605100001', 1, 1, '仓库管理员', 4, '采购入库-黑色油墨', NOW()),
(2, 'IN202605100002', 2, 3, '仓库管理员', 4, '生产入库-成品', NOW());

-- 二维码记录
INSERT INTO qrcode_record (id, qr_code, qr_type, ref_id, material_id, material_name, quantity, unit, warehouse_id, split_flag, parent_qr_id, status, create_time) VALUES
(1, 'QR-MAT-001', 'material', 1, 1, '黑色油墨-大桶', 100, 'kg', 1, 0, NULL, 1, NOW()),
(2, 'QR-MAT-002', 'material', 1, 2, '白色油墨-大桶', 80, 'kg', 1, 0, NULL, 1, NOW()),
(3, 'QR-MAT-003', 'material', 1, 3, 'PVC薄膜-卷', 50, 'm', 1, 0, NULL, 1, NOW()),
(4, 'QR-PRD-001', 'product', 2, NULL, '黑色标签成品', 500, '张', 3, 0, NULL, 1, NOW()),
(5, 'QR-MAT-001-S1', 'material', 1, 1, '黑色油墨-小料', 20, 'kg', 1, 1, 1, 1, NOW()),
(6, 'QR-MAT-001-S2', 'material', 1, 1, '黑色油墨-余料', 5, 'kg', 1, 2, 1, 1, NOW());

-- 盘点记录
INSERT INTO inv_stocktaking (id, taking_no, warehouse_id, taking_type, status, operator_name, remark, create_time) VALUES
(1, 'TK202605100001', 1, 1, 4, '仓库管理员', '定期盘点-原材料仓', NOW()),
(2, 'TK202605100002', 3, 2, 2, '仓库管理员', '不定期盘点-成品仓', NOW());

-- 调拨记录
INSERT INTO inv_transfer_order (id, transfer_no, from_warehouse_id, to_warehouse_id, transfer_type, status, operator_name, remark, create_time) VALUES
(1, 'TF202605100001', 1, 2, 2, 3, '仓库管理员', '仓库调拨-原材料到在制品', NOW()),
(2, 'TF202605100002', 1, 4, 1, 1, '仓库管理员', '库位调拨-油墨', NOW());

-- 应收记录
INSERT INTO fin_receivable (id, receivable_no, source_type, source_no, customer_id, customer_name, amount, received_amount, balance, due_date, status, create_time) VALUES
(1, 'AR202605100001', 1, 'SO202605100001', 1, '包装公司A', 50000, 20000, 30000, '2026-06-10', 2, NOW()),
(2, 'AR202605100002', 1, 'SO202605100002', 2, '印刷公司B', 30000, 0, 30000, '2026-05-20', 1, NOW());

-- 应付记录
INSERT INTO fin_payable (id, payable_no, source_type, source_no, supplier_id, supplier_name, amount, paid_amount, balance, due_date, status, create_time) VALUES
(1, 'AP202605100001', 1, 'PO202605100001', 1, '油墨供应商A', 20000, 10000, 10000, '2026-06-01', 2, NOW()),
(2, 'AP202605100002', 1, 'PO202605100002', 2, '薄膜供应商B', 15000, 0, 15000, '2026-06-15', 1, NOW());
