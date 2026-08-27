-- 采购申请模块数据库表结构
-- 创建时间: 2026-03-18

-- 先删除旧表（如果存在）
DROP TABLE IF EXISTS pur_request_item;
DROP TABLE IF EXISTS pur_request_approve;
DROP TABLE IF EXISTS pur_request;

-- 采购申请主表
CREATE TABLE pur_request (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '申请ID',
    request_no VARCHAR(50) NOT NULL COMMENT '申请单号',
    request_date DATE NOT NULL COMMENT '申请日期',
    request_type VARCHAR(50) COMMENT '申请类型(原材料/辅料/设备/办公用品/其他)',
    request_dept VARCHAR(100) COMMENT '申请部门',
    requester_id INT COMMENT '申请人ID',
    requester_name VARCHAR(100) COMMENT '申请人姓名',
    total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
    currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
    status TINYINT DEFAULT 0 COMMENT '状态: 0-草稿 1-待审批 2-已批准 3-已拒绝 4-已转采购 5-已完成',
    priority TINYINT DEFAULT 1 COMMENT '优先级: 0-低 1-中 2-高 3-紧急',
    expected_date DATE COMMENT '期望到货日期',
    supplier_id INT COMMENT '建议供应商ID',
    supplier_name VARCHAR(200) COMMENT '建议供应商名称',
    remark TEXT COMMENT '备注',
    approver_id INT COMMENT '审批人ID',
    approver_name VARCHAR(100) COMMENT '审批人姓名',
    approve_date DATE COMMENT '审批日期',
    approve_remark TEXT COMMENT '审批备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除: 0-否 1-是',
    INDEX idx_request_no (request_no),
    INDEX idx_status (status),
    INDEX idx_request_date (request_date),
    INDEX idx_requester (requester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请主表';

-- 采购申请明细表
CREATE TABLE pur_request_item (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '明细ID',
    request_id INT NOT NULL COMMENT '申请ID',
    line_no INT COMMENT '行号',
    material_id INT COMMENT '物料ID',
    material_code VARCHAR(50) COMMENT '物料编码',
    material_name VARCHAR(200) COMMENT '物料名称',
    material_spec VARCHAR(500) COMMENT '规格型号',
    material_unit VARCHAR(50) COMMENT '单位',
    quantity DECIMAL(12,3) NOT NULL COMMENT '数量',
    price DECIMAL(12,4) COMMENT '预估单价',
    amount DECIMAL(12,2) COMMENT '金额',
    supplier_id INT COMMENT '建议供应商ID',
    supplier_name VARCHAR(200) COMMENT '建议供应商名称',
    expected_date DATE COMMENT '期望到货日期',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除',
    INDEX idx_request_id (request_id),
    INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请明细表';

-- 采购申请审批记录表
CREATE TABLE pur_request_approve (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    request_id INT NOT NULL COMMENT '申请ID',
    approver_id INT COMMENT '审批人ID',
    approver_name VARCHAR(100) COMMENT '审批人姓名',
    approve_action VARCHAR(50) COMMENT '审批动作(提交/批准/拒绝/退回)',
    approve_status TINYINT COMMENT '审批后状态',
    approve_remark TEXT COMMENT '审批意见',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_request_id (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请审批记录表';

-- 插入测试数据
INSERT INTO pur_request (request_no, request_date, request_type, request_dept, requester_name, total_amount, status, priority, expected_date, remark) VALUES
('PR20260318001', '2026-03-18', '原材料', '生产部', '张三', 15000.00, 1, 2, '2026-03-25', '紧急采购生产所需原材料'),
('PR20260318002', '2026-03-18', '辅料', '品质部', '李四', 3200.50, 2, 1, '2026-03-30', '品质检测用品'),
('PR20260317001', '2026-03-17', '办公用品', '行政部', '王五', 850.00, 0, 0, '2026-03-20', '办公耗材补充');

INSERT INTO pur_request_item (request_id, line_no, material_code, material_name, material_spec, material_unit, quantity, price, amount, remark) VALUES
(1, 1, 'MAT001', 'PET薄膜', '厚度0.1mm 宽度500mm', '米', 1000, 8.50, 8500.00, '用于产品包装'),
(1, 2, 'MAT002', '不干胶标签纸', 'A4 白色', '张', 500, 3.20, 1600.00, '标签打印'),
(1, 3, 'MAT003', '油墨', '黑色 丝印用', '公斤', 50, 98.00, 4900.00, '生产用');
