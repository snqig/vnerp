-- 薪资标准表 (按岗位/技能等级)
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
