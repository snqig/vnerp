-- 生成采购订单测试数据
-- 采购单号：P020260401001, P020260401002, P020260402003, P020260403004, P020260404005

-- ==========================================
-- 1. 确保供应商存在
-- ==========================================
INSERT IGNORE INTO pur_supplier (supplier_code, supplier_name, supplier_type, contact_name, contact_phone)
VALUES
('SUP001', '深圳材料有限公司', 1, '张经理', '13800138001'),
('SUP002', '广州包装材料厂', 1, '李经理', '13800138002'),
('SUP003', '上海化工原料公司', 1, '王经理', '13800138003');

-- ==========================================
-- 2. 生成采购订单
-- ==========================================

-- 采购单 1: P020260401001
INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, total_amount, total_quantity, status, remark)
SELECT 
    'P020260401001',
    id,
    supplier_name,
    supplier_code,
    '2026-04-01',
    '2026-04-10',
    15000.00,
    300,
    30,
    '2026年4月第一批采购'
FROM pur_supplier 
WHERE supplier_code = 'SUP001'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order WHERE po_no = 'P020260401001');

-- 采购单 2: P020260401002
INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, total_amount, total_quantity, status, remark)
SELECT 
    'P020260401002',
    id,
    supplier_name,
    supplier_code,
    '2026-04-01',
    '2026-04-12',
    28000.00,
    400,
    30,
    '2026年4月第二批采购'
FROM pur_supplier 
WHERE supplier_code = 'SUP002'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order WHERE po_no = 'P020260401002');

-- 采购单 3: P020260402003
INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, total_amount, total_quantity, status, remark)
SELECT 
    'P020260402003',
    id,
    supplier_name,
    supplier_code,
    '2026-04-02',
    '2026-04-15',
    12000.00,
    250,
    30,
    '2026年4月3日采购'
FROM pur_supplier 
WHERE supplier_code = 'SUP003'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order WHERE po_no = 'P020260402003');

-- 采购单 4: P020260403004
INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, total_amount, total_quantity, status, remark)
SELECT 
    'P020260403004',
    id,
    supplier_name,
    supplier_code,
    '2026-04-03',
    '2026-04-18',
    22000.00,
    350,
    30,
    '2026年4月4日采购'
FROM pur_supplier 
WHERE supplier_code = 'SUP001'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order WHERE po_no = 'P020260403004');

-- 采购单 5: P020260404005
INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, total_amount, total_quantity, status, remark)
SELECT 
    'P020260404005',
    id,
    supplier_name,
    supplier_code,
    '2026-04-04',
    '2026-04-20',
    18000.00,
    280,
    30,
    '2026年4月5日采购'
FROM pur_supplier 
WHERE supplier_code = 'SUP002'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order WHERE po_no = 'P020260404005');

-- ==========================================
-- 3. 生成采购订单明细
-- ==========================================

-- 采购单 1 明细
INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 1, 'MAT001', '铜版纸', '80g, A4', '包', 100, 80, 50.00, 5000.00, '2026-04-10'
FROM pur_purchase_order WHERE po_no = 'P020260401001'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260401001') AND line_no = 1);

INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 2, 'MAT002', '油墨', 'CMYK套装', '套', 50, 45, 200.00, 10000.00, '2026-04-10'
FROM pur_purchase_order WHERE po_no = 'P020260401001'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260401001') AND line_no = 2);

-- 采购单 2 明细
INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 1, 'MAT003', 'PP薄膜', '0.1mm', 'kg', 200, 180, 80.00, 16000.00, '2026-04-12'
FROM pur_purchase_order WHERE po_no = 'P020260401002'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260401002') AND line_no = 1);

INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 2, 'MAT004', '胶粘剂', '500ml', '瓶', 200, 190, 60.00, 12000.00, '2026-04-12'
FROM pur_purchase_order WHERE po_no = 'P020260401002'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260401002') AND line_no = 2);

-- 采购单 3 明细
INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 1, 'MAT005', '化学溶剂', '1L', '桶', 100, 95, 120.00, 12000.00, '2026-04-15'
FROM pur_purchase_order WHERE po_no = 'P020260402003'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260402003') AND line_no = 1);

-- 采购单 4 明细
INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 1, 'MAT001', '铜版纸', '80g, A3', '包', 150, 140, 60.00, 9000.00, '2026-04-18'
FROM pur_purchase_order WHERE po_no = 'P020260403004'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260403004') AND line_no = 1);

INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 2, 'MAT002', '油墨', '特殊色', '套', 65, 60, 200.00, 13000.00, '2026-04-18'
FROM pur_purchase_order WHERE po_no = 'P020260403004'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260403004') AND line_no = 2);

-- 采购单 5 明细
INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 1, 'MAT003', 'PP薄膜', '0.15mm', 'kg', 150, 145, 80.00, 12000.00, '2026-04-20'
FROM pur_purchase_order WHERE po_no = 'P020260404005'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260404005') AND line_no = 1);

INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, require_date)
SELECT 
    id, 2, 'MAT004', '胶粘剂', '1L', '瓶', 100, 95, 60.00, 6000.00, '2026-04-20'
FROM pur_purchase_order WHERE po_no = 'P020260404005'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'P020260404005') AND line_no = 2);

-- ==========================================
-- 4. 更新采购单总金额和总数量
-- ==========================================
UPDATE pur_purchase_order po
SET 
    total_amount = (SELECT SUM(amount) FROM pur_purchase_order_line WHERE po_id = po.id),
    total_quantity = (SELECT SUM(order_qty) FROM pur_purchase_order_line WHERE po_id = po.id)
WHERE po.po_no IN (
    'P020260401001',
    'P020260401002',
    'P020260402003',
    'P020260403004',
    'P020260404005'
);

SELECT '采购订单测试数据生成完成！' AS result;