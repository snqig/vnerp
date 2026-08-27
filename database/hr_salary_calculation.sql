-- 月度薪资计算结果表
CREATE TABLE IF NOT EXISTS hr_salary_calculation (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
    calc_month VARCHAR(7) NOT NULL COMMENT '计算月份 (YYYY-MM)',

    -- 应发项
    base_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '基本工资',
    piece_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '计件工资',
    overtime_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '加班工资',
    performance_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '绩效奖金',
    allowances DECIMAL(10,2) DEFAULT 0.00 COMMENT '津贴补贴合计',

    -- 应扣项
    social_insurance_personal DECIMAL(10,2) DEFAULT 0.00 COMMENT '个人社保',
    housing_fund_personal DECIMAL(10,2) DEFAULT 0.00 COMMENT '个人公积金',
    individual_tax DECIMAL(10,2) DEFAULT 0.00 COMMENT '个人所得税',
    attendance_deduction DECIMAL(10,2) DEFAULT 0.00 COMMENT '考勤扣款',
    other_deduction DECIMAL(10,2) DEFAULT 0.00 COMMENT '其他扣款',

    -- 合计
    gross_pay DECIMAL(10,2) DEFAULT 0.00 COMMENT '应发合计',
    total_deduction DECIMAL(10,2) DEFAULT 0.00 COMMENT '应扣合计',
    net_pay DECIMAL(10,2) DEFAULT 0.00 COMMENT '实发工资',

    status VARCHAR(20) DEFAULT 'draft' COMMENT 'draft(草稿)/confirmed(确认)/paid(已发)',
    calc_log JSON COMMENT '计算日志(JSON)',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_employee_month (employee_id, calc_month),
    INDEX idx_month (calc_month),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='月度薪资计算结果表';
