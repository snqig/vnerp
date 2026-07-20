-- ============================================================
-- HR 模块完整数据表 DDL 汇总
-- Phase 8 — Integration & Deployment
-- 依赖顺序: 无依赖表 → 员工级引用 → 跨表引用
-- ============================================================

-- -----------------------------------------------------------
-- 1. 薪资标准表 (按岗位/技能等级)
-- 无表依赖
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_salary_standard (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    position_code VARCHAR(50) NOT NULL COMMENT '岗位编码',
    skill_level INT NOT NULL DEFAULT 1 COMMENT '技能等级 1-5',
    base_salary DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '基本工资',
    piece_rate_type VARCHAR(20) COMMENT '计件类型: piece/qty/weight',
    performance_base DECIMAL(10,2) DEFAULT 0.00 COMMENT '绩效基数',
    allowance_night DECIMAL(10,2) DEFAULT 0.00 COMMENT '夜班津贴(元/天)',
    allowance_high_temp DECIMAL(10,2) DEFAULT 0.00 COMMENT '高温津贴(元/月)',
    effective_date DATE NOT NULL COMMENT '生效日期',
    factory_id BIGINT UNSIGNED COMMENT '所属工厂',
    status TINYINT DEFAULT 1 COMMENT '1=启用 0=停用',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    INDEX idx_position_code (position_code),
    INDEX idx_effective_date (effective_date),
    INDEX idx_factory (factory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='薪资标准表';

-- -----------------------------------------------------------
-- 2. 工序单价表 (计件工资核心)
-- 无表依赖
-- -----------------------------------------------------------
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

-- -----------------------------------------------------------
-- 3. 班次规则表 & 排班表
-- 无表依赖 (排班表逻辑引用班次ID)
-- -----------------------------------------------------------
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

-- -----------------------------------------------------------
-- 4. 考勤异常表
-- 逻辑依赖: employee_id (引用 sys_employee)
-- -----------------------------------------------------------
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

-- -----------------------------------------------------------
-- 5. 员工薪资档案表
-- 逻辑依赖: employee_id (引用 sys_employee)
-- -----------------------------------------------------------
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

-- -----------------------------------------------------------
-- 6. 月度薪资计算结果表
-- 逻辑依赖: employee_id (引用 sys_employee)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_salary_calculation (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
    calc_month VARCHAR(7) NOT NULL COMMENT '计算月份 (YYYY-MM)',
    base_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '基本工资',
    piece_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '计件工资',
    overtime_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '加班工资',
    performance_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '绩效奖金',
    allowances DECIMAL(10,2) DEFAULT 0.00 COMMENT '津贴补贴合计',
    social_insurance_personal DECIMAL(10,2) DEFAULT 0.00 COMMENT '个人社保',
    housing_fund_personal DECIMAL(10,2) DEFAULT 0.00 COMMENT '个人公积金',
    individual_tax DECIMAL(10,2) DEFAULT 0.00 COMMENT '个人所得税',
    attendance_deduction DECIMAL(10,2) DEFAULT 0.00 COMMENT '考勤扣款',
    other_deduction DECIMAL(10,2) DEFAULT 0.00 COMMENT '其他扣款',
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

-- -----------------------------------------------------------
-- 7. 计件产量明细表 (与MES对接)
-- 逻辑依赖: employee_id (引用 sys_employee)
-- -----------------------------------------------------------
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

-- -----------------------------------------------------------
-- 8. 员工证书表
-- 逻辑依赖: employee_id (引用 sys_employee)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_certificate (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
    cert_name VARCHAR(200) NOT NULL COMMENT '证书名称',
    cert_code VARCHAR(100) DEFAULT NULL COMMENT '证书编号',
    cert_type VARCHAR(50) DEFAULT NULL COMMENT '证书类型(operation/safety/quality/skill)',
    issue_authority VARCHAR(200) DEFAULT NULL COMMENT '发证机关',
    issue_date DATE DEFAULT NULL COMMENT '发证日期',
    expiry_date DATE DEFAULT NULL COMMENT '到期日期',
    remind_days INT DEFAULT 30 COMMENT '提前提醒天数',
    status TINYINT DEFAULT 1 COMMENT '状态 1有效 0过期',
    file_url VARCHAR(500) DEFAULT NULL COMMENT '证书扫描件',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_ce_employee (employee_id),
    KEY idx_ce_type (cert_type),
    KEY idx_ce_expiry (expiry_date),
    KEY idx_ce_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工证书';

-- -----------------------------------------------------------
-- 9. 员工技能矩阵表
-- 逻辑依赖: employee_id (引用 sys_employee), certificate_id (引用 hr_certificate)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_skill_matrix (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
    skill_code VARCHAR(50) NOT NULL COMMENT '技能编码',
    skill_name VARCHAR(100) NOT NULL COMMENT '技能名称',
    skill_category VARCHAR(50) DEFAULT NULL COMMENT '技能分类(printing/binding/finishing/maintenance)',
    skill_level TINYINT DEFAULT 1 COMMENT '技能等级 1-5',
    certified TINYINT DEFAULT 0 COMMENT '是否认证 0/1',
    certificate_id BIGINT UNSIGNED DEFAULT NULL COMMENT '关联证书ID',
    assessor VARCHAR(50) DEFAULT NULL COMMENT '评估人',
    assess_date DATE DEFAULT NULL COMMENT '评估日期',
    next_assess_date DATE DEFAULT NULL COMMENT '下次评估日期',
    remark TEXT COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_sk_employee (employee_id),
    KEY idx_sk_category (skill_category),
    KEY idx_sk_level (skill_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工技能矩阵';
