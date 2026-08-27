-- 六级组织架构: 集团 -> 法人 -> 工厂 -> 车间 -> 班组 -> 岗位

-- 1. 集团
CREATE TABLE IF NOT EXISTS org_group (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL COMMENT '集团编码',
    name VARCHAR(100) NOT NULL COMMENT '集团名称',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '1=启用 0=停用',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_group_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='集团';

-- 2. 法人
CREATE TABLE IF NOT EXISTS org_legal_entity (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT UNSIGNED NOT NULL COMMENT '所属集团',
    code VARCHAR(50) NOT NULL COMMENT '法人编码',
    name VARCHAR(100) NOT NULL COMMENT '法人名称',
    tax_id VARCHAR(50) COMMENT '税号',
    legal_person VARCHAR(50) COMMENT '法定代表人',
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_le_code (code),
    INDEX idx_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='法人';

-- 3. 工厂
CREATE TABLE IF NOT EXISTS org_factory (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    legal_entity_id BIGINT UNSIGNED NOT NULL COMMENT '所属法人',
    code VARCHAR(50) NOT NULL COMMENT '工厂编码',
    name VARCHAR(100) NOT NULL COMMENT '工厂名称',
    address VARCHAR(255) COMMENT '地址',
    contact_person VARCHAR(50) COMMENT '联系人',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_factory_code (code),
    INDEX idx_legal_entity (legal_entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工厂';

-- 4. 车间
CREATE TABLE IF NOT EXISTS org_workshop (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    factory_id BIGINT UNSIGNED NOT NULL COMMENT '所属工厂',
    code VARCHAR(50) NOT NULL COMMENT '车间编码',
    name VARCHAR(100) NOT NULL COMMENT '车间名称',
    manager_name VARCHAR(50) COMMENT '车间主任',
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_workshop_code (code),
    INDEX idx_factory (factory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车间';

-- 5. 班组
CREATE TABLE IF NOT EXISTS org_team (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workshop_id BIGINT UNSIGNED NOT NULL COMMENT '所属车间',
    code VARCHAR(50) NOT NULL COMMENT '班组编码',
    name VARCHAR(100) NOT NULL COMMENT '班组名称',
    team_leader VARCHAR(50) COMMENT '班组长',
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_team_code (code),
    INDEX idx_workshop (workshop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班组';

-- 6. 岗位
CREATE TABLE IF NOT EXISTS org_position (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT UNSIGNED COMMENT '所属班组',
    code VARCHAR(50) NOT NULL COMMENT '岗位编码',
    name VARCHAR(100) NOT NULL COMMENT '岗位名称',
    skill_level INT DEFAULT 1 COMMENT '技能等级 1-5',
    base_salary_range VARCHAR(50) COMMENT '基本工资范围',
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_position_code (code),
    INDEX idx_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位';

-- 员工-岗位关联表 (支持员工多岗位)
CREATE TABLE IF NOT EXISTS hr_employee_position (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    position_id BIGINT UNSIGNED NOT NULL,
    is_primary TINYINT DEFAULT 0 COMMENT '1=主岗',
    start_date DATE COMMENT '任职日期',
    end_date DATE COMMENT '离职日期',
    status TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_emp_pos (employee_id, position_id),
    INDEX idx_position (position_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工岗位关联';
