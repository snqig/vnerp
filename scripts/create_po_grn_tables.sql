-- 采购单与入库单逻辑关系数据库设计
-- 遵循"单据驱动、数量勾稽、状态联动"原则

-- ==========================================
-- 1. 采购单主表 (PO_HEADER)
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_purchase_order (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    po_no VARCHAR(50) NOT NULL COMMENT '采购单号',
    supplier_id INT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
    supplier_name VARCHAR(100) NOT NULL COMMENT '供应商名称',
    supplier_code VARCHAR(50) DEFAULT NULL COMMENT '供应商编码',
    order_date DATE NOT NULL COMMENT '订单日期',
    delivery_date DATE DEFAULT NULL COMMENT '预计交货日期',
    currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率',
    total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '订单总金额',
    total_quantity DECIMAL(14,3) DEFAULT 0 COMMENT '订单总数量',
    tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
    tax_amount DECIMAL(14,2) DEFAULT 0 COMMENT '税额',
    grand_total DECIMAL(14,2) DEFAULT 0 COMMENT '含税总金额',
    -- 状态: 10-草稿, 20-待审批, 30-已审批, 40-部分收货, 50-已完成, 90-已关闭
    status TINYINT UNSIGNED DEFAULT 10 COMMENT '状态',
    over_receipt_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '超收容差率%',
    payment_terms VARCHAR(100) DEFAULT NULL COMMENT '付款条款',
    delivery_address TEXT DEFAULT NULL COMMENT '送货地址',
    contact_person VARCHAR(50) DEFAULT NULL COMMENT '联系人',
    contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    audit_by INT UNSIGNED DEFAULT NULL COMMENT '审批人ID',
    audit_time DATETIME DEFAULT NULL COMMENT '审批时间',
    close_by INT UNSIGNED DEFAULT NULL COMMENT '关闭人ID',
    close_time DATETIME DEFAULT NULL COMMENT '关闭时间',
    close_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_po_no (po_no),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单主表';

-- ==========================================
-- 2. 采购单行表 (PO_LINE)
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_purchase_order_line (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    po_id INT UNSIGNED NOT NULL COMMENT '采购单ID',
    line_no INT UNSIGNED NOT NULL COMMENT '行号',
    material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
    material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    order_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '订购数量',
    received_qty DECIMAL(14,3) DEFAULT 0 COMMENT '累计入库数量',
    returned_qty DECIMAL(14,3) DEFAULT 0 COMMENT '累计退货数量',
    unit_price DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '单价',
    amount DECIMAL(14,2) DEFAULT 0 COMMENT '金额',
    tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
    tax_amount DECIMAL(14,2) DEFAULT 0 COMMENT '税额',
    line_total DECIMAL(14,2) DEFAULT 0 COMMENT '行合计',
    require_date DATE DEFAULT NULL COMMENT '需求日期',
    closed_flag TINYINT(1) DEFAULT 0 COMMENT '行关闭标志',
    closed_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_po_line (po_id, line_no),
    INDEX idx_material (material_id),
    INDEX idx_material_code (material_code),
    INDEX idx_require_date (require_date),
    FOREIGN KEY (po_id) REFERENCES pur_purchase_order(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单行表';

-- ==========================================
-- 3. 入库单主表 (GRN_HEADER) - 修改现有表
-- ==========================================
ALTER TABLE inv_inbound_order 
ADD COLUMN IF NOT EXISTS po_id INT UNSIGNED DEFAULT NULL COMMENT '关联采购单ID' AFTER order_no,
ADD COLUMN IF NOT EXISTS po_no VARCHAR(50) DEFAULT NULL COMMENT '采购单号' AFTER po_id,
ADD COLUMN IF NOT EXISTS grn_type ENUM('po', 'blind', 'return') DEFAULT 'po' COMMENT '入库类型: po-按单入库, blind-盲收, return-退货入库' AFTER order_type,
ADD COLUMN IF NOT EXISTS asn_no VARCHAR(50) DEFAULT NULL COMMENT '到货通知单号' AFTER po_no,
ADD COLUMN IF NOT EXISTS delivery_no VARCHAR(100) DEFAULT NULL COMMENT '送货单号/快递单号' AFTER asn_no,
ADD COLUMN IF NOT EXISTS qc_status ENUM('pending', 'pass', 'fail', 'partial') DEFAULT 'pending' COMMENT '质检状态' AFTER status,
ADD COLUMN IF NOT EXISTS qc_remark TEXT DEFAULT NULL COMMENT '质检备注' AFTER qc_status,
ADD COLUMN IF NOT EXISTS post_time DATETIME DEFAULT NULL COMMENT '过账时间' AFTER audit_time,
ADD COLUMN IF NOT EXISTS post_by INT UNSIGNED DEFAULT NULL COMMENT '过账人ID' AFTER post_time,
ADD INDEX IF NOT EXISTS idx_po_id (po_id),
ADD INDEX IF NOT EXISTS idx_po_no (po_no),
ADD INDEX IF NOT EXISTS idx_grn_type (grn_type);

-- ==========================================
-- 4. 入库单行表 (GRN_LINE) - 修改现有表
-- ==========================================
ALTER TABLE inv_inbound_item
ADD COLUMN IF NOT EXISTS po_line_id INT UNSIGNED DEFAULT NULL COMMENT '关联采购单行ID' AFTER order_id,
ADD COLUMN IF NOT EXISTS line_no INT UNSIGNED DEFAULT NULL COMMENT '行号' AFTER po_line_id,
ADD COLUMN IF NOT EXISTS accepted_qty DECIMAL(14,3) DEFAULT 0 COMMENT '合格数量' AFTER quantity,
ADD COLUMN IF NOT EXISTS rejected_qty DECIMAL(14,3) DEFAULT 0 COMMENT '不良数量' AFTER accepted_qty,
ADD COLUMN IF NOT EXISTS qc_result ENUM('pending', 'pass', 'fail', 'partial') DEFAULT 'pending' COMMENT '质检结果' AFTER rejected_qty,
ADD COLUMN IF NOT EXISTS qc_inspector_id INT UNSIGNED DEFAULT NULL COMMENT '质检员ID' AFTER qc_result,
ADD COLUMN IF NOT EXISTS qc_time DATETIME DEFAULT NULL COMMENT '质检时间' AFTER qc_inspector_id,
ADD COLUMN IF NOT EXISTS batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号' AFTER qc_time,
ADD COLUMN IF NOT EXISTS supplier_batch_no VARCHAR(100) DEFAULT NULL COMMENT '供应商批次号' AFTER batch_no,
ADD COLUMN IF NOT EXISTS warehouse_id INT UNSIGNED DEFAULT NULL COMMENT '仓库ID' AFTER supplier_batch_no,
ADD COLUMN IF NOT EXISTS location_id INT UNSIGNED DEFAULT NULL COMMENT '库位ID' AFTER warehouse_id,
ADD COLUMN IF NOT EXISTS putaway_status ENUM('pending', 'done') DEFAULT 'pending' COMMENT '上架状态' AFTER location_id,
ADD INDEX IF NOT EXISTS idx_po_line_id (po_line_id),
ADD INDEX IF NOT EXISTS idx_batch_no (batch_no);

-- ==========================================
-- 5. 库存事务表 (INVENTORY_TRANSACTION)
-- ==========================================
CREATE TABLE IF NOT EXISTS inv_inventory_transaction (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    trans_no VARCHAR(50) NOT NULL COMMENT '事务单号',
    trans_type ENUM('in', 'out', 'transfer', 'adjust', 'return') NOT NULL COMMENT '事务类型: in-入库, out-出库, transfer-移库, adjust-调整, return-退货',
    source_type ENUM('grn', 'delivery', 'transfer', 'adjust', 'production') DEFAULT NULL COMMENT '来源类型',
    source_id INT UNSIGNED DEFAULT NULL COMMENT '来源单据ID',
    source_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源单据行ID',
    material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号',
    warehouse_id INT UNSIGNED DEFAULT NULL COMMENT '仓库ID',
    location_id INT UNSIGNED DEFAULT NULL COMMENT '库位ID',
    quantity DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '数量(正数入库/负数出库)',
    unit_cost DECIMAL(14,4) DEFAULT 0 COMMENT '单位成本',
    total_cost DECIMAL(14,2) DEFAULT 0 COMMENT '总成本',
    unit_price DECIMAL(14,4) DEFAULT 0 COMMENT '单价(采购价)',
    total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '总金额',
    account_dr VARCHAR(50) DEFAULT NULL COMMENT '借方科目',
    account_cr VARCHAR(50) DEFAULT NULL COMMENT '贷方科目',
    reference_no VARCHAR(100) DEFAULT NULL COMMENT '参考单号',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_trans_no (trans_no),
    INDEX idx_trans_type (trans_type),
    INDEX idx_source (source_type, source_id),
    INDEX idx_material (material_id),
    INDEX idx_batch (batch_no),
    INDEX idx_warehouse (warehouse_id),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存事务表';

-- ==========================================
-- 6. 退货单表 (RTV - Return To Vendor)
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_return_order (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    rtv_no VARCHAR(50) NOT NULL COMMENT '退货单号',
    po_id INT UNSIGNED NOT NULL COMMENT '关联采购单ID',
    po_no VARCHAR(50) NOT NULL COMMENT '采购单号',
    grn_id INT UNSIGNED DEFAULT NULL COMMENT '关联入库单ID',
    supplier_id INT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
    supplier_name VARCHAR(100) NOT NULL COMMENT '供应商名称',
    return_date DATE NOT NULL COMMENT '退货日期',
    total_qty DECIMAL(14,3) DEFAULT 0 COMMENT '退货总数量',
    total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '退货总金额',
    -- 状态: 10-草稿, 20-待审批, 30-已审批, 40-已出库, 90-已取消
    status TINYINT UNSIGNED DEFAULT 10 COMMENT '状态',
    return_reason VARCHAR(200) NOT NULL COMMENT '退货原因',
    return_type ENUM('qc_fail', 'damage', 'wrong_item', 'over_order', 'other') DEFAULT 'qc_fail' COMMENT '退货类型',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    audit_by INT UNSIGNED DEFAULT NULL COMMENT '审批人ID',
    audit_time DATETIME DEFAULT NULL COMMENT '审批时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_rtv_no (rtv_no),
    INDEX idx_po_id (po_id),
    INDEX idx_grn_id (grn_id),
    INDEX idx_status (status),
    INDEX idx_return_date (return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退货单主表';

-- ==========================================
-- 7. 退货单行表
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_return_order_line (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    rtv_id INT UNSIGNED NOT NULL COMMENT '退货单ID',
    line_no INT UNSIGNED NOT NULL COMMENT '行号',
    po_line_id INT UNSIGNED DEFAULT NULL COMMENT '关联采购单行ID',
    grn_line_id INT UNSIGNED DEFAULT NULL COMMENT '关联入库单行ID',
    material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
    batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号',
    return_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '退货数量',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    unit_price DECIMAL(14,4) DEFAULT 0 COMMENT '单价',
    amount DECIMAL(14,2) DEFAULT 0 COMMENT '金额',
    return_reason TEXT DEFAULT NULL COMMENT '退货原因说明',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_rtv_line (rtv_id, line_no),
    INDEX idx_po_line_id (po_line_id),
    INDEX idx_grn_line_id (grn_line_id),
    FOREIGN KEY (rtv_id) REFERENCES pur_return_order(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退货单行表';

-- ==========================================
-- 8. 供应商表 (补充)
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_supplier (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    supplier_code VARCHAR(50) NOT NULL COMMENT '供应商编码',
    supplier_name VARCHAR(100) NOT NULL COMMENT '供应商名称',
    supplier_type ENUM('material', 'service', 'outsourcing', 'other') DEFAULT 'material' COMMENT '供应商类型',
    contact_person VARCHAR(50) DEFAULT NULL COMMENT '联系人',
    contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    address TEXT DEFAULT NULL COMMENT '地址',
    payment_terms VARCHAR(100) DEFAULT NULL COMMENT '付款条款',
    tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '默认税率%',
    over_receipt_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '超收容差率%',
    currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
    status TINYINT(1) DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_supplier_code (supplier_code),
    INDEX idx_supplier_name (supplier_name),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商表';

-- ==========================================
-- 插入测试数据
-- ==========================================

-- 供应商测试数据
INSERT IGNORE INTO pur_supplier (supplier_code, supplier_name, supplier_type, contact_person, contact_phone, over_receipt_tolerance) VALUES
('SUP001', 'ABC造纸厂', 'material', '张经理', '13800138001', 5.00),
('SUP002', 'XYZ包装材料', 'material', '李经理', '13800138002', 10.00),
('SUP003', '3M中国', 'material', '王经理', '13800138003', 0.00);

-- 采购单测试数据
INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, total_amount, total_quantity, status, over_receipt_tolerance, remark)
SELECT 
    'PO20250101001',
    id,
    supplier_name,
    supplier_code,
    '2025-01-01',
    '2025-01-15',
    50000.00,
    1000,
    30,
    over_receipt_tolerance,
    '测试采购单'
FROM pur_supplier WHERE supplier_code = 'SUP001'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order WHERE po_no = 'PO20250101001');

-- 采购单行测试数据
INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, unit_price, amount, require_date)
SELECT 
    id,
    1,
    'MAT001',
    '白色卷纸',
    '100M×1.5M, 80g',
    '卷',
    500,
    50.00,
    25000.00,
    '2025-01-15'
FROM pur_purchase_order WHERE po_no = 'PO20250101001'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'PO20250101001') AND line_no = 1);

INSERT INTO pur_purchase_order_line (po_id, line_no, material_code, material_name, material_spec, unit, order_qty, unit_price, amount, require_date)
SELECT 
    id,
    2,
    'MAT002',
    '3M胶带',
    '3M7533, 50mm×50m',
    '卷',
    1000,
    25.00,
    25000.00,
    '2025-01-15'
FROM pur_purchase_order WHERE po_no = 'PO20250101001'
AND NOT EXISTS (SELECT 1 FROM pur_purchase_order_line WHERE po_id = (SELECT id FROM pur_purchase_order WHERE po_no = 'PO20250101001') AND line_no = 2);

SELECT '采购单与入库单逻辑关系表创建完成！' AS result;
