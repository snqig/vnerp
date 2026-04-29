-- 创建产品管理相关表
-- 执行此脚本创建产品管理所需的数据库表

-- ==========================================
-- 1. 产品主表
-- ==========================================
CREATE TABLE IF NOT EXISTS mdm_product (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    product_code VARCHAR(50) NOT NULL COMMENT '产品编码',
    product_name VARCHAR(100) NOT NULL COMMENT '产品名称',
    short_name VARCHAR(50) DEFAULT NULL COMMENT '产品简称',
    specification TEXT COMMENT '规格参数',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    category_id INT UNSIGNED DEFAULT NULL COMMENT '产品分类ID',
    category_name VARCHAR(50) DEFAULT NULL COMMENT '产品分类名称',
    customer_id INT UNSIGNED DEFAULT NULL COMMENT '关联客户ID',
    customer_name VARCHAR(100) DEFAULT NULL COMMENT '关联客户名称',
    bom_version VARCHAR(20) DEFAULT 'V1.0' COMMENT 'BOM版本',
    description TEXT COMMENT '产品描述',
    status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active' COMMENT '状态：active-启用,inactive-停用,discontinued-停产',
    cost_price DECIMAL(12,2) DEFAULT 0 COMMENT '成本价',
    sale_price DECIMAL(12,2) DEFAULT 0 COMMENT '销售价',
    min_stock DECIMAL(12,3) DEFAULT 0 COMMENT '最低库存',
    max_stock DECIMAL(12,3) DEFAULT 0 COMMENT '最高库存',
    safety_stock DECIMAL(12,3) DEFAULT 0 COMMENT '安全库存',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_product_code (product_code),
    INDEX idx_category (category_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品主表';

-- ==========================================
-- 2. 产品分类表
-- ==========================================
CREATE TABLE IF NOT EXISTS mdm_product_category (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    category_code VARCHAR(50) NOT NULL COMMENT '分类编码',
    category_name VARCHAR(100) NOT NULL COMMENT '分类名称',
    parent_id INT UNSIGNED DEFAULT 0 COMMENT '父分类ID，0为顶级分类',
    level TINYINT UNSIGNED DEFAULT 1 COMMENT '层级',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    description TEXT COMMENT '分类描述',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：1-启用,0-停用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_category_code (category_code),
    INDEX idx_parent (parent_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品分类表';

-- ==========================================
-- 3. 产品BOM表（物料清单）
-- ==========================================
CREATE TABLE IF NOT EXISTS mdm_product_bom (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    product_id INT UNSIGNED NOT NULL COMMENT '产品ID',
    version VARCHAR(20) DEFAULT 'V1.0' COMMENT 'BOM版本',
    material_id INT UNSIGNED NOT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
    specification VARCHAR(200) DEFAULT NULL COMMENT '规格',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    quantity DECIMAL(12,3) DEFAULT 1 COMMENT '用量',
    loss_rate DECIMAL(5,2) DEFAULT 0 COMMENT '损耗率(%)',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    remark TEXT COMMENT '备注',
    is_key_material TINYINT(1) DEFAULT 0 COMMENT '是否关键物料',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    INDEX idx_product (product_id),
    INDEX idx_version (version),
    INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品BOM表';

-- ==========================================
-- 4. 产品工艺路线表
-- ==========================================
CREATE TABLE IF NOT EXISTS mdm_product_route (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    product_id INT UNSIGNED NOT NULL COMMENT '产品ID',
    route_version VARCHAR(20) DEFAULT 'V1.0' COMMENT '工艺版本',
    process_seq INT UNSIGNED NOT NULL COMMENT '工序序号',
    process_code VARCHAR(50) NOT NULL COMMENT '工序编码',
    process_name VARCHAR(100) NOT NULL COMMENT '工序名称',
    work_center_id INT UNSIGNED DEFAULT NULL COMMENT '工作中心ID',
    work_center_name VARCHAR(100) DEFAULT NULL COMMENT '工作中心名称',
    standard_time DECIMAL(10,2) DEFAULT 0 COMMENT '标准工时(分钟)',
    setup_time DECIMAL(10,2) DEFAULT 0 COMMENT '准备时间(分钟)',
    description TEXT COMMENT '工序说明',
    is_key_process TINYINT(1) DEFAULT 0 COMMENT '是否关键工序',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    INDEX idx_product (product_id),
    INDEX idx_version (route_version),
    INDEX idx_process_seq (process_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品工艺路线表';

-- ==========================================
-- 插入测试数据
-- ==========================================

-- 插入产品分类测试数据
INSERT INTO mdm_product_category (category_code, category_name, parent_id, level, sort_order, description, status) VALUES
('CAT001', '包装膜', 0, 1, 1, '各类包装用薄膜产品', 1),
('CAT002', '标签', 0, 1, 2, '各类标签贴纸产品', 1),
('CAT003', '彩印膜', 0, 1, 3, '彩色印刷薄膜产品', 1),
('CAT004', '功能膜', 0, 1, 4, '具有特殊功能的薄膜产品', 1),
('CAT005', '复合膜', 0, 1, 5, '多层复合薄膜产品', 1);

-- 插入产品测试数据
INSERT INTO mdm_product (product_code, product_name, short_name, specification, unit, category_id, category_name, customer_id, customer_name, bom_version, description, status, cost_price, sale_price, min_stock, max_stock, safety_stock) VALUES
('P001', '包装膜-透明', '透明膜', '厚度0.08mm,宽度1200mm,长度500m', '㎡', 1, '包装膜', NULL, '通用', 'V2.0', '高透明度包装膜，适用于食品包装', 'active', 2.50, 3.80, 1000, 10000, 2000),
('P002', '标签贴纸', '标签', '尺寸100x50mm,铜版纸,不干胶', '张', 2, '标签', NULL, '通用', 'V1.0', '标准铜版纸标签，适用于产品标识', 'active', 0.05, 0.12, 5000, 50000, 10000),
('P003', '彩印膜-蓝', '蓝色彩印膜', '厚度0.1mm,宽度1000mm,蓝色印刷', '㎡', 3, '彩印膜', 1, '东莞恒通', 'V1.2', '蓝色印刷薄膜，定制图案', 'active', 3.20, 5.00, 500, 5000, 1000),
('P004', '防静电膜', '防静电膜', '厚度0.12mm,宽度800mm,防静电处理', '㎡', 4, '功能膜', 2, '佛山利达', 'V3.0', '防静电功能膜，适用于电子产品包装', 'active', 4.50, 7.20, 300, 3000, 600),
('P005', '复合食品膜', '食品复合膜', '厚度0.15mm,多层复合,食品级', '㎡', 5, '复合膜', NULL, '通用', 'V1.5', '多层复合食品包装膜，高阻隔性', 'active', 5.00, 8.00, 800, 8000, 1500),
('P006', '热收缩膜', '收缩膜', '厚度0.06mm,宽度600mm,热收缩率50%', '㎡', 1, '包装膜', 3, '深圳华强', 'V1.0', '热收缩包装膜，适用于瓶装产品', 'active', 2.00, 3.20, 600, 6000, 1200),
('P007', '防伪标签', '防伪标签', '尺寸80x40mm,激光防伪,易碎纸', '张', 2, '标签', 4, '广州白云', 'V2.1', '激光防伪标签，防拆封设计', 'active', 0.80, 2.00, 2000, 20000, 4000),
('P008', '哑光膜', '哑光膜', '厚度0.1mm,宽度1100mm,哑光处理', '㎡', 3, '彩印膜', NULL, '通用', 'V1.0', '哑光表面处理薄膜，高档包装', 'active', 3.80, 6.00, 400, 4000, 800);

-- 插入产品BOM测试数据
INSERT INTO mdm_product_bom (product_id, version, material_id, material_code, material_name, specification, unit, quantity, loss_rate, sort_order, is_key_material) VALUES
(1, 'V2.0', 1, 'M001', 'PE原料', '高密度聚乙烯', 'kg', 0.85, 2.50, 1, 1),
(1, 'V2.0', 2, 'M002', '抗静电剂', '食品级抗静电添加剂', 'kg', 0.05, 1.00, 2, 0),
(2, 'V1.0', 3, 'M003', '铜版纸', '80g铜版纸', '㎡', 1.00, 3.00, 1, 1),
(2, 'V1.0', 4, 'M004', '不干胶', '水胶型不干胶', 'kg', 0.15, 2.00, 2, 1),
(3, 'V1.2', 1, 'M001', 'PE原料', '高密度聚乙烯', 'kg', 0.90, 2.50, 1, 1),
(3, 'V1.2', 5, 'M005', '蓝色母粒', '食品级蓝色母粒', 'kg', 0.08, 1.50, 2, 0);

-- 插入产品工艺路线测试数据
INSERT INTO mdm_product_route (product_id, route_version, process_seq, process_code, process_name, work_center_id, work_center_name, standard_time, setup_time, description, is_key_process) VALUES
(1, 'V2.0', 10, 'P001', '配料', 1, '配料车间', 30, 15, '按配方配制原料', 0),
(1, 'V2.0', 20, 'P002', '挤出', 2, '挤出车间', 120, 30, '熔融挤出成型', 1),
(1, 'V2.0', 30, 'P003', '冷却', 3, '冷却车间', 60, 10, '冷却定型', 0),
(1, 'V2.0', 40, 'P004', '分切', 4, '分切车间', 45, 20, '按规格分切', 1),
(1, 'V2.0', 50, 'P005', '检验', 5, '质检中心', 20, 5, '质量检验', 1),
(1, 'V2.0', 60, 'P006', '包装', 6, '包装车间', 30, 10, '成品包装', 0);

SELECT '产品管理相关表创建完成！' AS result;
