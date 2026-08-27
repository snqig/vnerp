-- 创建入库管理相关表
-- 执行此脚本创建缺失的库存管理表

-- ==========================================
-- 1. 入库订单主表
-- ==========================================
CREATE TABLE IF NOT EXISTS inv_inbound_order (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_no VARCHAR(50) NOT NULL COMMENT '入库单号',
    order_type ENUM('purchase', 'return', 'transfer', 'other') DEFAULT 'purchase' COMMENT '入库类型：采购入库、退货入库、调拨入库、其他',
    warehouse_id INT UNSIGNED NOT NULL COMMENT '仓库ID',
    supplier_id INT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
    supplier_name VARCHAR(100) DEFAULT NULL COMMENT '供应商名称',
    total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
    total_quantity DECIMAL(12,3) DEFAULT 0 COMMENT '总数量',
    status ENUM('draft', 'pending', 'approved', 'completed', 'cancelled') DEFAULT 'draft' COMMENT '状态：草稿、待审核、已审核、已完成、已取消',
    inbound_date DATE DEFAULT NULL COMMENT '入库日期',
    remark TEXT COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除：0-否，1-是',
    INDEX idx_order_no (order_no),
    INDEX idx_warehouse (warehouse_id),
    INDEX idx_status (status),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库订单主表';

-- ==========================================
-- 2. 入库订单明细表
-- ==========================================
CREATE TABLE IF NOT EXISTS inv_inbound_item (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_id INT UNSIGNED NOT NULL COMMENT '入库订单ID',
    material_id INT UNSIGNED NOT NULL COMMENT '物料ID',
    material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
    material_spec VARCHAR(200) DEFAULT NULL COMMENT '物料规格',
    batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号',
    quantity DECIMAL(12,3) NOT NULL COMMENT '数量',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
    total_price DECIMAL(12,2) DEFAULT 0 COMMENT '总价',
    warehouse_location VARCHAR(50) DEFAULT NULL COMMENT '库位',
    produce_date DATE DEFAULT NULL COMMENT '生产日期',
    expire_date DATE DEFAULT NULL COMMENT '有效期至',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_order_id (order_id),
    INDEX idx_material (material_id),
    INDEX idx_batch_no (batch_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库订单明细表';

-- ==========================================
-- 3. 库存批次表
-- ==========================================
CREATE TABLE IF NOT EXISTS inv_inventory_batch (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    batch_no VARCHAR(50) NOT NULL COMMENT '批次号',
    material_id INT UNSIGNED NOT NULL COMMENT '物料ID',
    material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
    warehouse_id INT UNSIGNED NOT NULL COMMENT '仓库ID',
    warehouse_name VARCHAR(100) DEFAULT NULL COMMENT '仓库名称',
    quantity DECIMAL(12,3) DEFAULT 0 COMMENT '总数量',
    available_qty DECIMAL(12,3) DEFAULT 0 COMMENT '可用数量',
    locked_qty DECIMAL(12,3) DEFAULT 0 COMMENT '锁定数量',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
    produce_date DATE DEFAULT NULL COMMENT '生产日期',
    expire_date DATE DEFAULT NULL COMMENT '有效期至',
    inbound_date DATE DEFAULT NULL COMMENT '入库日期',
    status ENUM('normal', 'frozen', 'expired') DEFAULT 'normal' COMMENT '状态：正常、冻结、过期',
    version INT UNSIGNED DEFAULT 1 COMMENT '乐观锁版本号',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_batch_no (batch_no),
    INDEX idx_material (material_id),
    INDEX idx_warehouse (warehouse_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存批次表';

-- ==========================================
-- 4. 插入测试数据
-- ==========================================

-- 添加入库订单测试数据
INSERT INTO inv_inbound_order (order_no, order_type, warehouse_id, supplier_name, total_amount, total_quantity, status, inbound_date, remark) VALUES
('IN202501010001', 'purchase', 1, '供应商A', 15000.00, 100.000, 'completed', '2025-01-01', '第一批采购入库'),
('IN202501020001', 'purchase', 1, '供应商B', 25000.00, 200.000, 'completed', '2025-01-02', '第二批采购入库'),
('IN202501030001', 'return', 2, '客户C', 5000.00, 50.000, 'pending', '2025-01-03', '退货入库'),
('IN202501040001', 'transfer', 3, '', 0.00, 30.000, 'draft', NULL, '仓库调拨');

-- 添加入库明细测试数据
INSERT INTO inv_inbound_item (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price, warehouse_location, produce_date) VALUES
(1, 1, '原材料A', '规格A1', 'BATCH20250101001', 100.000, '卷', 150.00, 15000.00, 'A-01-01', '2025-01-01'),
(2, 2, '原材料B', '规格B1', 'BATCH20250102001', 200.000, '卷', 125.00, 25000.00, 'A-01-02', '2025-01-02'),
(3, 1, '原材料A', '规格A1', 'BATCH20250103001', 50.000, '卷', 100.00, 5000.00, 'B-01-01', '2025-01-03'),
(4, 3, '原材料C', '规格C1', 'BATCH20250104001', 30.000, '卷', 0.00, 0.00, 'C-01-01', '2025-01-04');

-- 添加库存批次测试数据
INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, unit, unit_price, produce_date, inbound_date, status) VALUES
('BATCH20250101001', 1, '原材料A', 1, '原材料仓库', 100.000, 100.000, '卷', 150.00, '2025-01-01', '2025-01-01', 'normal'),
('BATCH20250102001', 2, '原材料B', 1, '原材料仓库', 200.000, 200.000, '卷', 125.00, '2025-01-02', '2025-01-02', 'normal'),
('BATCH20250103001', 1, '原材料A', 2, '成品仓库', 50.000, 50.000, '卷', 100.00, '2025-01-03', '2025-01-03', 'normal'),
('BATCH20250104001', 3, '原材料C', 3, '辅料仓库', 30.000, 30.000, '卷', 0.00, '2025-01-04', '2025-01-04', 'normal');

SELECT '入库管理相关表创建完成！' AS result;
