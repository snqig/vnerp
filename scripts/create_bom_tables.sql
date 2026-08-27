-- BOM (物料清单) 管理数据库设计
-- 支持多级BOM、版本管理、替代料管理

-- ==========================================
-- 1. BOM主表 (BOM_HEADER)
-- ==========================================
CREATE TABLE IF NOT EXISTS bom_header (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    bom_no VARCHAR(50) NOT NULL COMMENT 'BOM编号',
    product_id INT UNSIGNED NOT NULL COMMENT '产品ID',
    product_code VARCHAR(50) NOT NULL COMMENT '产品编码',
    product_name VARCHAR(200) NOT NULL COMMENT '产品名称',
    product_spec VARCHAR(500) DEFAULT NULL COMMENT '产品规格',
    version VARCHAR(20) DEFAULT 'V1.0' COMMENT '版本号',
    is_default TINYINT(1) DEFAULT 1 COMMENT '是否默认版本',
    -- 状态: 10-草稿, 20-已审核, 30-已发布, 90-已停用
    status TINYINT UNSIGNED DEFAULT 10 COMMENT '状态',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    base_qty DECIMAL(14,3) DEFAULT 1 COMMENT '基础数量',
    total_material_count INT UNSIGNED DEFAULT 0 COMMENT '物料总数',
    total_cost DECIMAL(14,4) DEFAULT 0 COMMENT '总成本',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    audit_by INT UNSIGNED DEFAULT NULL COMMENT '审核人ID',
    audit_time DATETIME DEFAULT NULL COMMENT '审核时间',
    publish_time DATETIME DEFAULT NULL COMMENT '发布时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_bom_version (product_id, version),
    INDEX idx_bom_no (bom_no),
    INDEX idx_product_code (product_code),
    INDEX idx_status (status),
    INDEX idx_is_default (is_default),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM主表';

-- ==========================================
-- 2. BOM行表 (BOM_LINE) - 物料明细
-- ==========================================
CREATE TABLE IF NOT EXISTS bom_line (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    bom_id INT UNSIGNED NOT NULL COMMENT 'BOM主表ID',
    line_no INT UNSIGNED NOT NULL COMMENT '行号',
    parent_line_id INT UNSIGNED DEFAULT NULL COMMENT '父行ID(多级BOM)',
    level INT UNSIGNED DEFAULT 1 COMMENT '层级',
    material_id INT UNSIGNED NOT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
    material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    consumption_qty DECIMAL(14,6) NOT NULL DEFAULT 0 COMMENT '消耗数量',
    loss_rate DECIMAL(5,2) DEFAULT 0 COMMENT '损耗率%',
    actual_qty DECIMAL(14,6) DEFAULT 0 COMMENT '实际用量(含损耗)',
    unit_cost DECIMAL(14,4) DEFAULT 0 COMMENT '单位成本',
    total_cost DECIMAL(14,4) DEFAULT 0 COMMENT '总成本',
    -- 物料类型: RAW-原材料, SEMI-半成品, SUB-委外件, PKG-包材
    material_type ENUM('RAW', 'SEMI', 'SUB', 'PKG', 'OTHER') DEFAULT 'RAW' COMMENT '物料类型',
    is_key_material TINYINT(1) DEFAULT 0 COMMENT '是否关键物料',
    position_no VARCHAR(50) DEFAULT NULL COMMENT '位号(电子元件用)',
    process_seq INT UNSIGNED DEFAULT NULL COMMENT '工序序号',
    process_name VARCHAR(100) DEFAULT NULL COMMENT '工序名称',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_bom_line (bom_id, line_no),
    INDEX idx_parent_line (parent_line_id),
    INDEX idx_material (material_id),
    INDEX idx_material_code (material_code),
    INDEX idx_material_type (material_type),
    FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM行表';

-- ==========================================
-- 3. BOM替代料表 (BOM_ALTERNATIVE)
-- ==========================================
CREATE TABLE IF NOT EXISTS bom_alternative (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    bom_id INT UNSIGNED NOT NULL COMMENT 'BOM主表ID',
    bom_line_id INT UNSIGNED NOT NULL COMMENT 'BOM行ID',
    priority INT UNSIGNED DEFAULT 1 COMMENT '优先级',
    material_id INT UNSIGNED NOT NULL COMMENT '替代物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '替代物料编码',
    material_name VARCHAR(200) NOT NULL COMMENT '替代物料名称',
    conversion_rate DECIMAL(10,6) DEFAULT 1 COMMENT '转换比率',
    is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_bom_line (bom_line_id),
    INDEX idx_material (material_id),
    FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_line_id) REFERENCES bom_line(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM替代料表';

-- ==========================================
-- 4. BOM版本历史表 (BOM_VERSION_HISTORY)
-- ==========================================
CREATE TABLE IF NOT EXISTS bom_version_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    bom_id INT UNSIGNED NOT NULL COMMENT 'BOM主表ID',
    version VARCHAR(20) NOT NULL COMMENT '版本号',
    change_type ENUM('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'DISABLE') NOT NULL COMMENT '变更类型',
    change_content TEXT DEFAULT NULL COMMENT '变更内容',
    change_reason VARCHAR(200) DEFAULT NULL COMMENT '变更原因',
    operator_id INT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
    operator_name VARCHAR(100) DEFAULT NULL COMMENT '操作人',
    operate_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_bom_id (bom_id),
    INDEX idx_version (version),
    INDEX idx_operate_time (operate_time),
    FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM版本历史表';

-- ==========================================
-- 5. 物料基础信息表 (BOM_MATERIAL)
-- ==========================================
CREATE TABLE IF NOT EXISTS bom_material (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
    material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
    material_type ENUM('RAW', 'SEMI', 'FINISHED', 'SUB', 'PKG', 'OTHER') DEFAULT 'RAW' COMMENT '物料类型',
    category_id INT UNSIGNED DEFAULT NULL COMMENT '分类ID',
    category_name VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    unit_cost DECIMAL(14,4) DEFAULT 0 COMMENT '参考成本',
    safety_stock DECIMAL(14,3) DEFAULT 0 COMMENT '安全库存',
    default_supplier_id INT UNSIGNED DEFAULT NULL COMMENT '默认供应商ID',
    default_supplier_name VARCHAR(100) DEFAULT NULL COMMENT '默认供应商',
    shelf_life_days INT UNSIGNED DEFAULT NULL COMMENT '保质期(天)',
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_material_code (material_code),
    INDEX idx_material_name (material_name),
    INDEX idx_material_type (material_type),
    INDEX idx_category (category_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料基础信息表';

-- ==========================================
-- 6. 物料分类表 (BOM_MATERIAL_CATEGORY)
-- ==========================================
CREATE TABLE IF NOT EXISTS bom_material_category (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    category_code VARCHAR(50) NOT NULL COMMENT '分类编码',
    category_name VARCHAR(100) NOT NULL COMMENT '分类名称',
    parent_id INT UNSIGNED DEFAULT NULL COMMENT '父分类ID',
    level INT UNSIGNED DEFAULT 1 COMMENT '层级',
    sort_order INT UNSIGNED DEFAULT 0 COMMENT '排序',
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_category_code (category_code),
    INDEX idx_parent (parent_id),
    INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料分类表';

-- ==========================================
-- 插入测试数据
-- ==========================================

-- 物料分类
INSERT INTO bom_material_category (category_code, category_name, level, sort_order)
SELECT 'RAW', '原材料', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM bom_material_category WHERE category_code = 'RAW');

INSERT INTO bom_material_category (category_code, category_name, level, sort_order)
SELECT 'SEMI', '半成品', 1, 2
WHERE NOT EXISTS (SELECT 1 FROM bom_material_category WHERE category_code = 'SEMI');

INSERT INTO bom_material_category (category_code, category_name, level, sort_order)
SELECT 'PKG', '包材', 1, 3
WHERE NOT EXISTS (SELECT 1 FROM bom_material_category WHERE category_code = 'PKG');

-- 物料基础信息
INSERT INTO bom_material (material_code, material_name, material_spec, material_type, category_id, unit, unit_cost)
SELECT 'MAT001', '白色PET膜', '100M×1.5M, 0.1mm', 'RAW', 1, '卷', 50.00
WHERE NOT EXISTS (SELECT 1 FROM bom_material WHERE material_code = 'MAT001');

INSERT INTO bom_material (material_code, material_name, material_spec, material_type, category_id, unit, unit_cost)
SELECT 'MAT002', '3M7533胶带', '50mm×50m', 'RAW', 1, '卷', 25.00
WHERE NOT EXISTS (SELECT 1 FROM bom_material WHERE material_code = 'MAT002');

INSERT INTO bom_material (material_code, material_name, material_spec, material_type, category_id, unit, unit_cost)
SELECT 'MAT003', '离型纸', '80g', 'RAW', 1, '张', 0.50
WHERE NOT EXISTS (SELECT 1 FROM bom_material WHERE material_code = 'MAT003');

INSERT INTO bom_material (material_code, material_name, material_spec, material_type, category_id, unit, unit_cost)
SELECT 'PKG001', '纸箱', '40×30×20cm', 'PKG', 3, '个', 5.00
WHERE NOT EXISTS (SELECT 1 FROM bom_material WHERE material_code = 'PKG001');

-- BOM主表测试数据
INSERT INTO bom_header (bom_no, product_id, product_code, product_name, product_spec, version, status, base_qty, remark)
SELECT 'BOM20250101001', 1, 'PROD001', 'ASUS笔记本标签', '261.7×99.1mm', 'V1.0', 30, 1000, '测试BOM'
WHERE NOT EXISTS (SELECT 1 FROM bom_header WHERE bom_no = 'BOM20250101001');

-- BOM行表测试数据
INSERT INTO bom_line (bom_id, line_no, material_id, material_code, material_name, material_spec, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, is_key_material)
SELECT 
    bh.id, 1, bm.id, bm.material_code, bm.material_name, bm.material_spec, bm.unit, 
    0.1, 5.00, 0.105, bm.unit_cost, 5.25, 'RAW', 1
FROM bom_header bh, bom_material bm
WHERE bh.bom_no = 'BOM20250101001' AND bm.material_code = 'MAT001'
AND NOT EXISTS (SELECT 1 FROM bom_line WHERE bom_id = bh.id AND line_no = 1);

INSERT INTO bom_line (bom_id, line_no, material_id, material_code, material_name, material_spec, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, is_key_material)
SELECT 
    bh.id, 2, bm.id, bm.material_code, bm.material_name, bm.material_spec, bm.unit, 
    0.05, 3.00, 0.0515, bm.unit_cost, 1.29, 'RAW', 1
FROM bom_header bh, bom_material bm
WHERE bh.bom_no = 'BOM20250101001' AND bm.material_code = 'MAT002'
AND NOT EXISTS (SELECT 1 FROM bom_line WHERE bom_id = bh.id AND line_no = 2);

INSERT INTO bom_line (bom_id, line_no, material_id, material_code, material_name, material_spec, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, is_key_material)
SELECT 
    bh.id, 3, bm.id, bm.material_code, bm.material_name, bm.material_spec, bm.unit, 
    1.00, 0.00, 1.00, bm.unit_cost, 5.00, 'PKG', 0
FROM bom_header bh, bom_material bm
WHERE bh.bom_no = 'BOM20250101001' AND bm.material_code = 'PKG001'
AND NOT EXISTS (SELECT 1 FROM bom_line WHERE bom_id = bh.id AND line_no = 3);

-- 更新BOM总成本
UPDATE bom_header 
SET total_material_count = 3,
    total_cost = (SELECT SUM(total_cost) FROM bom_line WHERE bom_id = bom_header.id)
WHERE bom_no = 'BOM20250101001';

SELECT 'BOM管理表结构创建完成！' AS result;
