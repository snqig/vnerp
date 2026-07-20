-- 员工薪资档案表
CREATE TABLE IF NOT EXISTS hr_salary_profile (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
    salary_type VARCHAR(20) NOT NULL DEFAULT 'mixed' COMMENT '薪资类型: piece(计件)/time(计时)/mixed(混合)',
    base_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '基本工资',
    social_insurance_base DECIMAL(10,2) DEFAULT 0.00 COMMENT '社保基数',
    housing_fund_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '公积金比例 %',
    tax_deduction DECIMAL(10,2) DEFAULT 0.00 COMMENT '专项附加扣除(月)',
    bank_account VARCHAR(50) COMMENT '银行卡号',
    bank_name VARCHAR(100) COMMENT '开户行',
    effective_date DATE NOT NULL COMMENT '生效日期',
    status TINYINT DEFAULT 1 COMMENT '1=启用 0=停用',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee (employee_id),
    INDEX idx_effective_date (effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工薪资档案表';
