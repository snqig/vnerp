-- 班次规则表
CREATE TABLE IF NOT EXISTS hr_shift (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shift_name VARCHAR(50) NOT NULL COMMENT '班次名称 (早班/中班/夜班)',
    start_time VARCHAR(5) NOT NULL COMMENT '开始时间 HH:mm',
    end_time VARCHAR(5) NOT NULL COMMENT '结束时间 HH:mm',
    allow_overtime TINYINT DEFAULT 1 COMMENT '允许加班',
    overtime_rate DECIMAL(3,1) DEFAULT 1.5 COMMENT '加班倍率',
    night_allowance DECIMAL(10,2) DEFAULT 0.00 COMMENT '夜班津贴',
    late_threshold INT DEFAULT 15 COMMENT '迟到阈值(分钟)',
    early_leave_threshold INT DEFAULT 15 COMMENT '早退阈值(分钟)',
    working_hours DECIMAL(4,1) COMMENT '标准工时',
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班次规则';

-- 排班表
CREATE TABLE IF NOT EXISTS hr_schedule (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
    schedule_date DATE NOT NULL COMMENT '排班日期',
    shift_id BIGINT UNSIGNED COMMENT '班次ID',
    schedule_type VARCHAR(20) DEFAULT 'normal' COMMENT 'normal(正常)/overtime(加班)/leave(请假)',
    source VARCHAR(20) DEFAULT 'manual' COMMENT 'manual(手动)/auto(自动生成)',
    status TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_emp_date (employee_id, schedule_date),
    INDEX idx_date (schedule_date),
    INDEX idx_shift (shift_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排班表';
