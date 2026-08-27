-- 计件产量明细表 (与MES对接)
CREATE TABLE IF NOT EXISTS hr_piece_work_detail (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
    work_date DATE NOT NULL COMMENT '工作日期',
    process_code VARCHAR(50) NOT NULL COMMENT '工序编码',
    product_code VARCHAR(50) COMMENT '产品编码',
    quantity INT NOT NULL DEFAULT 0 COMMENT '产量',
    defective_quantity INT DEFAULT 0 COMMENT '次品数量',
    unit_price DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT '当时单价',
    amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - defective_quantity/NULLIF(quantity,0))) STORED COMMENT '金额(自动计算)',
    machine_id VARCHAR(50) COMMENT '设备ID',
    mes_sync_id VARCHAR(50) COMMENT 'MES同步ID',
    sync_status TINYINT DEFAULT 0 COMMENT '0=待同步 1=已同步',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee (employee_id),
    INDEX idx_work_date (work_date),
    INDEX idx_process (process_code),
    INDEX idx_mes_sync (mes_sync_id),
    INDEX idx_employee_date (employee_id, work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计件产量明细表';
