-- 车辆管理模块数据库表结构
-- 创建时间: 2026-03-18

-- 车辆信息表
CREATE TABLE IF NOT EXISTS delivery_vehicle (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '车辆ID',
    vehicle_no VARCHAR(50) NOT NULL COMMENT '车牌号',
    vehicle_type VARCHAR(50) COMMENT '车辆类型(货车/面包车/轿车等)',
    brand VARCHAR(100) COMMENT '品牌',
    model VARCHAR(100) COMMENT '型号',
    color VARCHAR(50) COMMENT '颜色',
    engine_no VARCHAR(100) COMMENT '发动机号',
    frame_no VARCHAR(100) COMMENT '车架号',
    buy_date DATE COMMENT '购买日期',
    mileage INT DEFAULT 0 COMMENT '当前里程数(公里)',
    fuel_type VARCHAR(50) COMMENT '燃油类型(汽油/柴油/电动)',
    capacity DECIMAL(10,2) COMMENT '载重/载客量',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-停用 1-可用 2-维修中 3-报废',
    driver_id INT COMMENT '默认司机ID',
    driver_name VARCHAR(100) COMMENT '默认司机姓名',
    driver_phone VARCHAR(20) COMMENT '司机电话',
    insurance_expire DATE COMMENT '保险到期日',
    annual_inspect_expire DATE COMMENT '年检到期日',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除: 0-否 1-是',
    INDEX idx_vehicle_no (vehicle_no),
    INDEX idx_status (status),
    INDEX idx_driver_id (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车辆信息表';

-- 车辆维修记录表
CREATE TABLE IF NOT EXISTS delivery_vehicle_repair (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    vehicle_id INT NOT NULL COMMENT '车辆ID',
    repair_date DATE NOT NULL COMMENT '维修日期',
    repair_type VARCHAR(50) COMMENT '维修类型(保养/维修/事故)',
    mileage INT COMMENT '维修时里程数',
    repair_content TEXT COMMENT '维修内容',
    repair_cost DECIMAL(10,2) COMMENT '维修费用',
    repair_shop VARCHAR(200) COMMENT '维修厂',
    next_maintain_mileage INT COMMENT '下次保养里程',
    next_maintain_date DATE COMMENT '下次保养日期',
    operator VARCHAR(100) COMMENT '经办人',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除',
    INDEX idx_vehicle_id (vehicle_id),
    INDEX idx_repair_date (repair_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车辆维修记录表';

-- 车辆费用记录表
CREATE TABLE IF NOT EXISTS delivery_vehicle_cost (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    vehicle_id INT NOT NULL COMMENT '车辆ID',
    cost_date DATE NOT NULL COMMENT '费用日期',
    cost_type VARCHAR(50) NOT NULL COMMENT '费用类型(油费/保险/年检/过路费/停车费等)',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
    mileage INT COMMENT '当前里程数',
    fuel_volume DECIMAL(10,2) COMMENT '加油量(升)',
    unit_price DECIMAL(10,2) COMMENT '单价',
    location VARCHAR(200) COMMENT '地点',
    operator VARCHAR(100) COMMENT '经办人',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除',
    INDEX idx_vehicle_id (vehicle_id),
    INDEX idx_cost_date (cost_date),
    INDEX idx_cost_type (cost_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车辆费用记录表';

-- 司机信息表
CREATE TABLE IF NOT EXISTS delivery_driver (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '司机ID',
    driver_no VARCHAR(50) COMMENT '司机编号',
    name VARCHAR(100) NOT NULL COMMENT '姓名',
    phone VARCHAR(20) COMMENT '电话',
    id_card VARCHAR(18) COMMENT '身份证号',
    license_type VARCHAR(20) COMMENT '驾照类型(A1/A2/B1/B2/C1等)',
    license_no VARCHAR(50) COMMENT '驾照号码',
    license_expire DATE COMMENT '驾照到期日',
    entry_date DATE COMMENT '入职日期',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-离职 1-在职',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除',
    INDEX idx_driver_no (driver_no),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='司机信息表';

-- 插入测试数据
INSERT INTO delivery_vehicle (vehicle_no, vehicle_type, brand, model, color, fuel_type, capacity, status, driver_name, driver_phone) VALUES
('粤A12345', '货车', '东风', '多利卡', '白色', '柴油', 5.00, 1, '张三', '13800138001'),
('粤B67890', '面包车', '五菱', '宏光', '银色', '汽油', 1.50, 1, '李四', '13800138002'),
('粤C11111', '轿车', '丰田', '凯美瑞', '黑色', '汽油', 0.50, 1, '王五', '13800138003');

INSERT INTO delivery_driver (driver_no, name, phone, license_type, license_no, status) VALUES
('D001', '张三', '13800138001', 'B2', '440100123456789012', 1),
('D002', '李四', '13800138002', 'C1', '440100123456789013', 1),
('D003', '王五', '13800138003', 'C1', '440100123456789014', 1);
