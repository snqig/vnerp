-- ============================================
-- 登录系统数据库表设计
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS `sys_user` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(加密存储)',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `dept_id` INT DEFAULT NULL COMMENT '部门ID',
  `role_id` INT DEFAULT NULL COMMENT '角色ID',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
  `login_fail_count` INT DEFAULT 0 COMMENT '登录失败次数',
  `lock_until` DATETIME DEFAULT NULL COMMENT '锁定截止时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '是否删除: 0-否, 1-是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- 登录日志表
CREATE TABLE IF NOT EXISTS `sys_login_log` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` INT DEFAULT NULL COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `login_type` TINYINT DEFAULT 1 COMMENT '登录类型: 1-账号密码, 2-手机验证码',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '浏览器UA',
  `login_status` TINYINT DEFAULT 1 COMMENT '登录状态: 0-失败, 1-成功',
  `fail_reason` VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_username` (`username`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志表';

-- 插入超级管理员用户 (密码: admin 使用 bcrypt 加密)
-- 密码: admin -> $2b$10$YourHashedPasswordHere
INSERT INTO `sys_user` (`username`, `password`, `real_name`, `email`, `phone`, `status`, `dept_id`, `role_id`) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjNvl7xPLP1mNV9C', '超级管理员', 'admin@dachang.com', '13800138000', 1, 1, 1)
ON DUPLICATE KEY UPDATE 
  `password` = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjNvl7xPLP1mNV9C',
  `status` = 1;
