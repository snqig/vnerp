-- 工序单价表 (计件工资核心)
CREATE TABLE IF NOT EXISTS hr_piece_rate (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    process_code VARCHAR(50) NOT NULL COMMENT '工序编码 (印刷/裁切/包装等)',
    product_type VARCHAR(50) COMMENT '产品类型',
    unit_price DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT '计件单价',
    unit VARCHAR(20) NOT NULL DEFAULT '件' COMMENT '计量单位: 件/米/公斤',
    quality_threshold DECIMAL(5,2) DEFAULT 0.00 COMMENT '质量达标率门槛 %',
    effective_date DATE NOT NULL COMMENT '生效日期',
    factory_id BIGINT UNSIGNED COMMENT '所属工厂',
    status TINYINT DEFAULT 1 COMMENT '1=启用 0=停用',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    INDEX idx_process_code (process_code),
    INDEX idx_product_type (product_type),
    INDEX idx_effective_date (effective_date),
    INDEX idx_factory (factory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工序单价表';
