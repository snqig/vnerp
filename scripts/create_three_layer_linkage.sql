-- 三层勾稽模型数据库设计
-- 业务订单(BIZ_ORDER) → 采购申请(PR) → 采购订单(PO) → 入库单(GRN)
-- 遵循"需求可视、执行受控、追溯完整"原则

-- ==========================================
-- 1. 业务订单主表 (BIZ_ORDER)
-- 支持销售订单、生产订单、委外订单
-- ==========================================
CREATE TABLE IF NOT EXISTS biz_order_header (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_no VARCHAR(50) NOT NULL COMMENT '业务订单号',
    order_type ENUM('SALE', 'MFG', 'SUB', 'STOCK') NOT NULL COMMENT '订单类型: SALE-销售, MFG-生产, SUB-委外, STOCK-库存补货',
    order_category VARCHAR(50) DEFAULT NULL COMMENT '订单类别',
    customer_id INT UNSIGNED DEFAULT NULL COMMENT '客户ID(销售订单)',
    customer_name VARCHAR(100) DEFAULT NULL COMMENT '客户名称',
    product_id INT UNSIGNED DEFAULT NULL COMMENT '产品ID',
    product_name VARCHAR(200) DEFAULT NULL COMMENT '产品名称',
    product_spec VARCHAR(500) DEFAULT NULL COMMENT '产品规格',
    -- 状态: 10-草稿, 20-已确认, 30-部分转采购, 40-全部转采购, 50-部分收货, 60-已完成, 90-已关闭
    status TINYINT UNSIGNED DEFAULT 10 COMMENT '订单状态',
    req_qty DECIMAL(14,3) DEFAULT 0 COMMENT '需求数量',
    ordered_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已转采购数量(勾稽字段)',
    received_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已收货数量(勾稽字段)',
    consumed_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已消耗/发货数量',
    delivery_date DATE DEFAULT NULL COMMENT '交货日期',
    priority TINYINT UNSIGNED DEFAULT 5 COMMENT '优先级 1-10',
    is_strict_by_order TINYINT(1) DEFAULT 1 COMMENT '是否严格按单: 1-是, 0-否',
    tolerance_percent DECIMAL(5,2) DEFAULT 5.00 COMMENT '容差百分比',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    confirm_by INT UNSIGNED DEFAULT NULL COMMENT '确认人ID',
    confirm_time DATETIME DEFAULT NULL COMMENT '确认时间',
    close_by INT UNSIGNED DEFAULT NULL COMMENT '关闭人ID',
    close_time DATETIME DEFAULT NULL COMMENT '关闭时间',
    close_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_order_type (order_type),
    INDEX idx_status (status),
    INDEX idx_customer (customer_id),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务订单主表';

-- ==========================================
-- 2. 业务订单行表 (BIZ_ORDER_LINE) - 需求源头
-- ==========================================
CREATE TABLE IF NOT EXISTS biz_order_line (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_id INT UNSIGNED NOT NULL COMMENT '业务订单ID',
    line_no INT UNSIGNED NOT NULL COMMENT '行号',
    material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
    material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    req_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '需求数量',
    ordered_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已转采购数量(勾稽)',
    received_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已收货数量(勾稽)',
    consumed_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已消耗数量(勾稽)',
    available_to_receive DECIMAL(14,3) DEFAULT 0 COMMENT '已收货待消耗数量',
    require_date DATE DEFAULT NULL COMMENT '需求日期',
    is_strict_by_order TINYINT(1) DEFAULT 1 COMMENT '是否严格按单',
    closed_flag TINYINT(1) DEFAULT 0 COMMENT '行关闭标志',
    closed_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_order_line (order_id, line_no),
    INDEX idx_material (material_id),
    INDEX idx_material_code (material_code),
    INDEX idx_require_date (require_date),
    FOREIGN KEY (order_id) REFERENCES biz_order_header(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务订单行表';

-- ==========================================
-- 3. 采购申请表 (PR - Purchase Request)
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_request (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    pr_no VARCHAR(50) NOT NULL COMMENT '采购申请号',
    order_type ENUM('SALE', 'MFG', 'SUB', 'STOCK') NOT NULL COMMENT '需求类型',
    source_order_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单ID',
    source_order_no VARCHAR(50) DEFAULT NULL COMMENT '来源业务订单号',
    request_date DATE NOT NULL COMMENT '申请日期',
    require_date DATE NOT NULL COMMENT '需求日期',
    total_qty DECIMAL(14,3) DEFAULT 0 COMMENT '总数量',
    total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '总金额',
    -- 状态: 10-草稿, 20-待审批, 30-已审批, 40-部分转PO, 50-全部转PO, 90-已取消
    status TINYINT UNSIGNED DEFAULT 10 COMMENT '状态',
    priority TINYINT UNSIGNED DEFAULT 5 COMMENT '优先级',
    request_by INT UNSIGNED DEFAULT NULL COMMENT '申请人ID',
    request_dept VARCHAR(50) DEFAULT NULL COMMENT '申请部门',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    audit_by INT UNSIGNED DEFAULT NULL COMMENT '审批人ID',
    audit_time DATETIME DEFAULT NULL COMMENT '审批时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_pr_no (pr_no),
    INDEX idx_source_order (source_order_id),
    INDEX idx_status (status),
    INDEX idx_request_date (request_date),
    INDEX idx_require_date (require_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请表';

-- ==========================================
-- 4. 采购申请行表 (PR_LINE)
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_request_line (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    pr_id INT UNSIGNED NOT NULL COMMENT '采购申请ID',
    line_no INT UNSIGNED NOT NULL COMMENT '行号',
    source_order_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单ID',
    source_order_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单行ID',
    material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
    material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    req_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '申请数量',
    ordered_qty DECIMAL(14,3) DEFAULT 0 COMMENT '已转PO数量',
    unit_price DECIMAL(14,4) DEFAULT 0 COMMENT '预估单价',
    amount DECIMAL(14,2) DEFAULT 0 COMMENT '预估金额',
    require_date DATE DEFAULT NULL COMMENT '需求日期',
    suggested_supplier_id INT UNSIGNED DEFAULT NULL COMMENT '建议供应商ID',
    suggested_supplier_name VARCHAR(100) DEFAULT NULL COMMENT '建议供应商',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_pr_line (pr_id, line_no),
    INDEX idx_source_order (source_order_id, source_order_line_id),
    INDEX idx_material (material_id),
    FOREIGN KEY (pr_id) REFERENCES pur_request(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请行表';

-- ==========================================
-- 5. 修改采购订单行表 - 添加业务订单来源标识
-- ==========================================
ALTER TABLE pur_purchase_order_line
ADD COLUMN IF NOT EXISTS source_order_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单ID' AFTER po_id,
ADD COLUMN IF NOT EXISTS source_order_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单行ID' AFTER source_order_id,
ADD COLUMN IF NOT EXISTS source_order_no VARCHAR(50) DEFAULT NULL COMMENT '来源业务订单号' AFTER source_order_line_id,
ADD COLUMN IF NOT EXISTS pr_id INT UNSIGNED DEFAULT NULL COMMENT '来源采购申请ID' AFTER source_order_no,
ADD COLUMN IF NOT EXISTS pr_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源采购申请行ID' AFTER pr_id,
ADD COLUMN IF NOT EXISTS is_strict_by_order TINYINT(1) DEFAULT 1 COMMENT '是否严格按单' AFTER closed_reason,
ADD INDEX IF NOT EXISTS idx_source_order (source_order_id, source_order_line_id),
ADD INDEX IF NOT EXISTS idx_pr (pr_id, pr_line_id);

-- ==========================================
-- 6. 修改入库单行表 - 添加业务订单勾稽关系
-- ==========================================
ALTER TABLE inv_inbound_item
ADD COLUMN IF NOT EXISTS source_order_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单ID' AFTER po_line_id,
ADD COLUMN IF NOT EXISTS source_order_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源业务订单行ID' AFTER source_order_id,
ADD COLUMN IF NOT EXISTS is_consumed TINYINT(1) DEFAULT 0 COMMENT '是否已关联消耗' AFTER putaway_status,
ADD INDEX IF NOT EXISTS idx_source_order (source_order_id, source_order_line_id);

-- ==========================================
-- 7. 业务订单与采购订单关联表（多对多场景）
-- ==========================================
CREATE TABLE IF NOT EXISTS link_order_po (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_id INT UNSIGNED NOT NULL COMMENT '业务订单ID',
    order_line_id INT UNSIGNED NOT NULL COMMENT '业务订单行ID',
    po_id INT UNSIGNED NOT NULL COMMENT '采购订单ID',
    po_line_id INT UNSIGNED NOT NULL COMMENT '采购订单行ID',
    link_type ENUM('DIRECT', 'MERGE', 'SPLIT') DEFAULT 'DIRECT' COMMENT '关联类型: DIRECT-直接, MERGE-合并, SPLIT-拆分',
    link_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '关联数量',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_link (order_line_id, po_line_id),
    INDEX idx_order (order_id),
    INDEX idx_po (po_id),
    FOREIGN KEY (order_id) REFERENCES biz_order_header(id) ON DELETE CASCADE,
    FOREIGN KEY (po_id) REFERENCES pur_purchase_order(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务订单与PO关联表';

-- ==========================================
-- 8. 消耗记录表（生产领料/销售出库勾稽）
-- ==========================================
CREATE TABLE IF NOT EXISTS biz_consumption (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_id INT UNSIGNED NOT NULL COMMENT '业务订单ID',
    order_line_id INT UNSIGNED NOT NULL COMMENT '业务订单行ID',
    material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    -- 消耗类型: ISSUE-领料, DELIVERY-发货, RETURN-退货
    consumption_type ENUM('ISSUE', 'DELIVERY', 'RETURN') DEFAULT 'ISSUE' COMMENT '消耗类型',
    consumption_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '消耗数量',
    source_grn_id INT UNSIGNED DEFAULT NULL COMMENT '来源入库单ID',
    source_grn_line_id INT UNSIGNED DEFAULT NULL COMMENT '来源入库单行ID',
    warehouse_id INT UNSIGNED DEFAULT NULL COMMENT '仓库ID',
    batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号',
    reference_no VARCHAR(100) DEFAULT NULL COMMENT '参考单号',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_order (order_id, order_line_id),
    INDEX idx_material (material_id),
    INDEX idx_grn (source_grn_id),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务订单消耗记录表';

-- ==========================================
-- 9. 容差配置表
-- ==========================================
CREATE TABLE IF NOT EXISTS order_tolerance_config (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID(空表示通用配置)',
    material_code VARCHAR(50) DEFAULT NULL COMMENT '物料编码',
    order_type VARCHAR(20) DEFAULT 'PURCHASE' COMMENT '订单类型: PURCHASE-采购, SALE-销售',
    over_delivery_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '超交容差%',
    under_delivery_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '短交容差%',
    price_tolerance DECIMAL(5,2) DEFAULT 2.00 COMMENT '价格容差%',
    action_on_exceed ENUM('BLOCK', 'WARNING', 'APPROVAL') DEFAULT 'WARNING' COMMENT '超额处理: BLOCK-阻止, WARNING-警告, APPROVAL-审批',
    is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认配置',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_config (material_id, order_type),
    INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='容差配置表';

-- ==========================================
-- 10. 状态变更历史表
-- ==========================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    order_type ENUM('BIZ', 'PR', 'PO', 'GRN') NOT NULL COMMENT '订单类型',
    order_id INT UNSIGNED NOT NULL COMMENT '订单ID',
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    old_status VARCHAR(50) NOT NULL COMMENT '原状态',
    new_status VARCHAR(50) NOT NULL COMMENT '新状态',
    change_reason VARCHAR(200) DEFAULT NULL COMMENT '变更原因',
    trigger_by VARCHAR(50) DEFAULT NULL COMMENT '触发来源',
    operator_id INT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
    operator_name VARCHAR(100) DEFAULT NULL COMMENT '操作人',
    operate_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_order (order_type, order_id),
    INDEX idx_operate_time (operate_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='状态变更历史表';

-- ==========================================
-- 插入测试数据
-- ==========================================

-- 业务订单测试数据
INSERT INTO biz_order_header (order_no, order_type, customer_name, product_name, status, req_qty, delivery_date, remark)
SELECT 'SO20250101001', 'SALE', '新普科技', 'ASUS笔记本标签', 20, 10000, '2025-02-15', '测试销售订单'
WHERE NOT EXISTS (SELECT 1 FROM biz_order_header WHERE order_no = 'SO20250101001');

INSERT INTO biz_order_line (order_id, line_no, material_code, material_name, material_spec, unit, req_qty, require_date)
SELECT id, 1, 'MAT001', '白色PET膜', '100M×1.5M, 0.1mm', '卷', 100, '2025-01-20'
FROM biz_order_header WHERE order_no = 'SO20250101001'
AND NOT EXISTS (SELECT 1 FROM biz_order_line WHERE order_id = (SELECT id FROM biz_order_header WHERE order_no = 'SO20250101001') AND line_no = 1);

INSERT INTO biz_order_line (order_id, line_no, material_code, material_name, material_spec, unit, req_qty, require_date)
SELECT id, 2, 'MAT002', '3M7533胶带', '50mm×50m', '卷', 200, '2025-01-20'
FROM biz_order_header WHERE order_no = 'SO20250101001'
AND NOT EXISTS (SELECT 1 FROM biz_order_line WHERE order_id = (SELECT id FROM biz_order_header WHERE order_no = 'SO20250101001') AND line_no = 2);

-- 采购申请测试数据
INSERT INTO pur_request (pr_no, order_type, source_order_id, source_order_no, request_date, require_date, total_qty, status, remark)
SELECT 'PR20250101001', 'SALE', id, order_no, '2025-01-05', '2025-01-20', 100, 30, '根据SO20250101001生成'
FROM biz_order_header WHERE order_no = 'SO20250101001'
AND NOT EXISTS (SELECT 1 FROM pur_request WHERE pr_no = 'PR20250101001');

INSERT INTO pur_request_line (pr_id, line_no, source_order_id, source_order_line_id, material_code, material_name, material_spec, unit, req_qty, require_date)
SELECT 
    pr.id, 1, bol.order_id, bol.id, bol.material_code, bol.material_name, bol.material_spec, bol.unit, bol.req_qty, bol.require_date
FROM pur_request pr
JOIN biz_order_line bol ON bol.order_id = pr.source_order_id AND bol.line_no = 1
WHERE pr.pr_no = 'PR20250101001'
AND NOT EXISTS (SELECT 1 FROM pur_request_line WHERE pr_id = (SELECT id FROM pur_request WHERE pr_no = 'PR20250101001') AND line_no = 1);

-- 更新采购单行，添加来源标识
UPDATE pur_purchase_order_line pol
SET 
    source_order_id = (SELECT source_order_id FROM pur_request_line WHERE id = pol.pr_line_id),
    source_order_line_id = (SELECT source_order_line_id FROM pur_request_line WHERE id = pol.pr_line_id),
    pr_id = pol.pr_line_id
WHERE pol.pr_line_id IS NOT NULL;

-- 插入容差配置
INSERT INTO order_tolerance_config (order_type, over_delivery_tolerance, under_delivery_tolerance, price_tolerance, action_on_exceed, is_default)
SELECT 'PURCHASE', 5.00, 5.00, 2.00, 'WARNING', 1
WHERE NOT EXISTS (SELECT 1 FROM order_tolerance_config WHERE order_type = 'PURCHASE' AND is_default = 1);

SELECT '三层勾稽模型表结构创建完成！' AS result;
