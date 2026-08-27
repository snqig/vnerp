-- 打样单管理模块数据库表结构
-- 创建时间: 2026-03-19

-- 先删除旧表（如果存在）
DROP TABLE IF EXISTS sample_order;

-- 打样单主表
CREATE TABLE sample_order (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '打样单ID',
    sample_no VARCHAR(50) NOT NULL COMMENT '打样单号',
    order_month INT COMMENT '月份',
    order_date DATE NOT NULL COMMENT '下单日期',
    sample_type VARCHAR(50) COMMENT '种类(设变/测试/新款)',
    customer_name VARCHAR(200) COMMENT '客户名称',
    print_method VARCHAR(100) COMMENT '印刷方式(卷料丝印/轮转印/空白)',
    color_sequence VARCHAR(50) COMMENT '色序',
    product_name VARCHAR(200) COMMENT '品名',
    material_code VARCHAR(100) COMMENT '料号',
    size_spec VARCHAR(100) COMMENT '尺寸',
    material_desc TEXT COMMENT '材料描述',
    sample_order_no VARCHAR(100) COMMENT '打样单编号',
    required_date DATE COMMENT '需求日期',
    progress_status VARCHAR(100) COMMENT '进展状态',
    is_confirmed TINYINT DEFAULT 0 COMMENT '是否确认: 0-否 1-是',
    is_urgent TINYINT DEFAULT 0 COMMENT '是否急件: 0-否 1-是',
    is_produce_together TINYINT DEFAULT 0 COMMENT '同时生产: 0-否 1-是',
    quantity INT COMMENT '数量',
    progress_detail VARCHAR(200) COMMENT '进展详情(产线拿/等材料/冲压/印刷/切割/UV/嗮版/出片/检样/做卡)',
    sample_count INT DEFAULT 1 COMMENT '打样次数',
    sample_reason VARCHAR(200) COMMENT '打样原因',
    order_tracker VARCHAR(100) COMMENT '跟单人员',
    provided_material VARCHAR(100) COMMENT '提供资料(电子档/打样单)',
    receive_time TIME COMMENT '接单时间',
    mylar_info VARCHAR(200) COMMENT '麦拉信息',
    sample_stock VARCHAR(200) COMMENT '样品库存',
    customer_confirm VARCHAR(200) COMMENT '客户确认',
    remark TEXT COMMENT '备注',
    status TINYINT DEFAULT 0 COMMENT '状态: 0-待处理 1-进行中 2-已完成 3-已取消',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除: 0-否 1-是',
    INDEX idx_sample_no (sample_no),
    INDEX idx_customer (customer_name),
    INDEX idx_order_date (order_date),
    INDEX idx_status (status),
    INDEX idx_sample_type (sample_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打样单管理表';

-- 插入测试数据
INSERT INTO sample_order (
    sample_no, order_month, order_date, sample_type, customer_name, 
    print_method, color_sequence, product_name, material_code, size_spec,
    material_desc, sample_order_no, required_date, progress_status,
    is_confirmed, is_urgent, is_produce_together, quantity, progress_detail,
    sample_count, sample_reason, order_tracker, provided_material, receive_time
) VALUES
('DY-20260109-001', 1, '2026-01-09', '设变', '新普', '卷料丝印', '4色', 'ASUS_X1605', '120QAE21H-DC-C', '296.3*96.8', 
 '0.036BH-2抗噪+3M7533', 'DY-A047-05914', '2026-01-09', '已完成', 1, 0, 1, 10, '产线拿', 12, '变更内容及版本', '吴', '电子档', '14:28:00'),

('DY-20260224-001', 2, '2026-02-24', '测试', '新普', '卷料丝印', '5色', 'HP_NA04080XL', '120QAM61H-DC-3', '301.31*75.32',
 '1.高泰 50番PA+5um阻燃层+25um压花胶 成品厚度 95+8/-8 2.金利宝 33番PA+20um阻燃层+25um FR01T117胶 成品厚度 90+8/-8', 
 'DY-A047-06527', '2026-03-04', '进行中', 0, 0, 0, 30, '等材料', 4, '新材料打样', '吴', '电子档', '18:53:00'),

('DY-20260224-002', 2, '2026-02-24', '测试', '新普', '卷料丝印', '3色', 'HP_NA04080XL', '121-4087H-DC-2', '268.9*56.8',
 '1.高泰 50番PA+5um阻燃层+25um压花胶 2.金利宝 33番PA+20um阻燃层+25um FR01T117胶',
 'DY-A047-06549', '2026-03-04', '进行中', 0, 0, 0, 30, '等材料', 4, '新材料打样', '吴', '电子档', '18:54:00'),

('DY-20260302-001', 3, '2026-03-02', '测试', '上扬', '卷料丝印', '2色', NULL, '6X0000209S13', '37*70',
 '0.046KB-1+3720小菱形胶/0.046KB-1+3720方形胶', 'DY-A168-01046', '2026-03-04', '进行中', 0, 0, 0, 200, '等材料', 4, '改材料打样', '吴', '打样单', '10:01:00'),

('DY-20260306-001', 3, '2026-03-06', '设变', '新普', '卷料丝印', '3色', 'DELL-GHOSTRIDER-6C', '120QAJ14H-DC-B', '323.82*104.98',
 '0.05LHF360(PCR100%)+P20R02', 'DY-A047-06315', '2026-03-09', '已完成', 1, 0, 1, 5, '产线拿', 6, '变更版本.增加管控线', '李', '电子档', '14:46:00'),

('DY-20260316-001', 3, '2026-03-16', NULL, '神基', '卷料丝印', '2色', NULL, '242890700002', '22.7*7.7',
 '0.178PC1860+3M7533', 'DY-A294-0630', '2026-03-17', '进行中', 0, 0, 0, 30, '冲压', 3, '同生产增加数量', '吴', '打样单', '13:40:00'),

('DY-20260316-002', 3, '2026-03-16', '设变', '上扬', '卷料丝印', '5色', 'W77MC27', '6X0000215S13', '87.77*95.53',
 '0.036AH22V+3M7533', 'DY-A168-01050', '2026-03-19', '进行中', 0, 1, 0, 300, '印刷', 2, '变更内容、尺寸及料号', '吴', '电子档', '14:48:00'),

('DY-20260317-001', 3, '2026-03-17', '设变', '新普', '卷料丝印', '2色', 'AVIX APB-L122720-6S1P', '121-4017H-A', '16*14',
 '0.05DFD250A+3M7533', 'DY-A047-06379', '2026-03-23', '进行中', 0, 0, 0, 1100, '切割', 6, '变更版本', '吴', '电子档', '13:33:00'),

('DY-20260317-002', 3, '2026-03-17', '新款', '飞捷', '轮转印', '2色', NULL, '3LPC5600011', '160*28',
 'SY19B+PP2F', 'DY-A021-00008', '2026-03-23', '进行中', 0, 0, 0, 50, '等材料', 1, '新款', '吴', '电子档', '14:31:00'),

('DY-20260318-001', 3, '2026-03-18', '设变', '新普', '卷料丝印', '4色', 'HP_GH02047XL', '120Q8238H-K', '239*74.6',
 '0.033KB-1+3M7533', 'DY-A047-04397', '2026-03-18', '进行中', 1, 0, 1, 5, '出片', 17, '变更内容及版本', '吴', '电子档', '08:23:00');
