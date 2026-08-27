-- 考勤异常表
CREATE TABLE IF NOT EXISTS hr_attendance_exception (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
    exception_date DATE NOT NULL COMMENT '异常日期',
    exception_type VARCHAR(20) NOT NULL COMMENT 'late(迟到)/early_leave(早退)/absence(旷工)/overtime(加班超时)',
    minutes INT DEFAULT 0 COMMENT '迟到/早退分钟数',
    deduction_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '扣款金额',
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending(待处理)/approved(已批准)/rejected(已驳回)',
    handler_id BIGINT UNSIGNED COMMENT '处理人ID',
    handle_time DATETIME COMMENT '处理时间',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_date (employee_id, exception_date),
    INDEX idx_type (exception_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤异常表';
