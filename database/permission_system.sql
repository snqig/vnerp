-- ============================================
-- 权限管理系统数据库设计
-- 包含：菜单管理、权限控制、用户角色关联
-- ============================================

-- 1. 菜单表（系统菜单配置）
DROP TABLE IF EXISTS `sys_menu`;
CREATE TABLE `sys_menu` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `parent_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '父菜单ID，0为顶级菜单',
  `menu_name` VARCHAR(50) NOT NULL COMMENT '菜单名称',
  `menu_code` VARCHAR(50) NOT NULL COMMENT '菜单编码（唯一）',
  `menu_type` TINYINT NOT NULL DEFAULT 1 COMMENT '菜单类型：1-目录，2-菜单，3-按钮',
  `icon` VARCHAR(100) DEFAULT NULL COMMENT '菜单图标',
  `path` VARCHAR(200) DEFAULT NULL COMMENT '路由路径',
  `component` VARCHAR(200) DEFAULT NULL COMMENT '组件路径',
  `permission` VARCHAR(100) DEFAULT NULL COMMENT '权限标识（如：user:list）',
  `sort_order` INT UNSIGNED DEFAULT 0 COMMENT '排序号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
  `is_external` TINYINT DEFAULT 0 COMMENT '是否外链：0-否，1-是',
  `is_cache` TINYINT DEFAULT 1 COMMENT '是否缓存：0-否，1-是',
  `is_visible` TINYINT DEFAULT 1 COMMENT '是否可见：0-否，1-是',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_menu_code` (`menu_code`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_menu_type` (`menu_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统菜单表';

-- 插入菜单数据
INSERT INTO `sys_menu` (`parent_id`, `menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `component`, `permission`, `sort_order`, `status`) VALUES
-- 首页
(0, '首页', 'dashboard', 1, 'Home', '/dashboard', '/dashboard', 'dashboard:view', 1, 1),

-- 订单管理
(0, '订单管理', 'orders', 1, 'ShoppingCart', '/orders', NULL, 'orders:*', 2, 1),
(2, '销售订单', 'orders_sales', 2, NULL, '/orders/sales', '/orders/sales', 'orders:sales:*', 1, 1),
(2, '客户管理', 'orders_customers', 2, NULL, '/orders/customers', '/orders/customers', 'orders:customers:*', 2, 1),
(2, '产品管理', 'orders_products', 2, NULL, '/orders/products', '/orders/products', 'orders:products:*', 3, 1),
(2, 'BOM管理', 'orders_bom', 2, NULL, '/orders/bom', '/orders/bom', 'orders:bom:*', 4, 1),

-- 仓库管理
(0, '仓库管理', 'warehouse', 1, 'Warehouse', '/warehouse', NULL, 'warehouse:*', 3, 1),
(7, '入库管理', 'warehouse_inbound', 2, NULL, '/warehouse/inbound', '/warehouse/inbound', 'warehouse:inbound:*', 1, 1),
(7, '出库管理', 'warehouse_outbound', 2, NULL, '/warehouse/outbound', '/warehouse/outbound', 'warehouse:outbound:*', 2, 1),
(7, '库存查询', 'warehouse_inventory', 2, NULL, '/warehouse/inventory', '/warehouse/inventory', 'warehouse:inventory:*', 3, 1),

-- 生产管理
(0, '生产管理', 'production', 1, 'Factory', '/production', NULL, 'production:*', 4, 1),
(11, '生产工单', 'production_workorder', 2, NULL, '/production/workorder', '/production/workorder', 'production:workorder:*', 1, 1),
(11, '生产排程', 'production_schedule', 2, NULL, '/production/schedule', '/production/schedule', 'production:schedule:*', 2, 1),
(11, '工艺管理', 'production_process', 2, NULL, '/production/process', '/production/process', 'production:process:*', 3, 1),

-- 采购管理
(0, '采购管理', 'purchase', 1, 'ShoppingBag', '/purchase', NULL, 'purchase:*', 5, 1),
(15, '采购订单', 'purchase_orders', 2, NULL, '/purchase/orders', '/purchase/orders', 'purchase:orders:*', 1, 1),
(15, '供应商管理', 'purchase_suppliers', 2, NULL, '/purchase/suppliers', '/purchase/suppliers', 'purchase:suppliers:*', 2, 1),

-- 财务管理
(0, '财务管理', 'finance', 1, 'Banknote', '/finance', NULL, 'finance:*', 6, 1),
(18, '应收应付', 'finance_receivable', 2, NULL, '/finance/receivable', '/finance/receivable', 'finance:receivable:*', 1, 1),
(18, '成本核算', 'finance_cost', 2, NULL, '/finance/cost', '/finance/cost', 'finance:cost:*', 2, 1),
(18, '财务报表', 'finance_report', 2, NULL, '/finance/report', '/finance/report', 'finance:report:*', 3, 1),

-- 品质管理
(0, '品质管理', 'quality', 1, 'ShieldCheck', '/quality', NULL, 'quality:*', 7, 1),
(22, '来料检验', 'quality_incoming', 2, NULL, '/quality/incoming', '/quality/incoming', 'quality:incoming:*', 1, 1),
(22, '过程检验', 'quality_process', 2, NULL, '/quality/process', '/quality/process', 'quality:process:*', 2, 1),
(22, '成品检验', 'quality_final', 2, NULL, '/quality/final', '/quality/final', 'quality:final:*', 3, 1),

-- 人事管理
(0, '人事管理', 'hr', 1, 'Users', '/hr', NULL, 'hr:*', 8, 1),
(26, '员工档案', 'hr_employee', 2, NULL, '/hr/employee', '/hr/employee', 'hr:employee:*', 1, 1),
(26, '考勤管理', 'hr_attendance', 2, NULL, '/hr/attendance', '/hr/attendance', 'hr:attendance:*', 2, 1),
(26, '薪资管理', 'hr_salary', 2, NULL, '/hr/salary', '/hr/salary', 'hr:salary:*', 3, 1),

-- 系统设置
(0, '系统设置', 'settings', 1, 'Settings', '/settings', NULL, 'settings:*', 9, 1),
(30, '组织设置', 'settings_organization', 2, NULL, '/settings/organization', '/settings/organization', 'settings:organization:*', 1, 1),
(30, '用户管理', 'settings_users', 2, NULL, '/settings/users', '/settings/users', 'settings:users:*', 2, 1),
(30, '角色权限', 'settings_roles', 2, NULL, '/settings/roles', '/settings/roles', 'settings:roles:*', 3, 1),
(30, '菜单管理', 'settings_menus', 2, NULL, '/settings/menus', '/settings/menus', 'settings:menus:*', 4, 1),
(30, '系统日志', 'settings_logs', 2, NULL, '/settings/logs', '/settings/logs', 'settings:logs:*', 5, 1);

-- 2. 角色菜单关联表（角色拥有的菜单权限）
DROP TABLE IF EXISTS `sys_role_menu`;
CREATE TABLE `sys_role_menu` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `menu_id` BIGINT UNSIGNED NOT NULL COMMENT '菜单ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_menu_id` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色菜单关联表';

-- 3. 用户角色关联表
DROP TABLE IF EXISTS `sys_user_role`;
CREATE TABLE `sys_user_role` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 4. 操作日志表
DROP TABLE IF EXISTS `sys_operation_log`;
CREATE TABLE `sys_operation_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '用户ID',
  `username` VARCHAR(50) DEFAULT NULL COMMENT '用户名',
  `operation` VARCHAR(100) NOT NULL COMMENT '操作类型',
  `module` VARCHAR(50) DEFAULT NULL COMMENT '操作模块',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '操作描述',
  `request_method` VARCHAR(10) DEFAULT NULL COMMENT '请求方法',
  `request_url` VARCHAR(500) DEFAULT NULL COMMENT '请求URL',
  `request_params` TEXT DEFAULT NULL COMMENT '请求参数',
  `response_data` TEXT DEFAULT NULL COMMENT '响应数据',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '浏览器UA',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1-成功，0-失败',
  `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
  `execution_time` INT DEFAULT 0 COMMENT '执行时间(ms)',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_operation` (`operation`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ============================================
-- 初始化角色权限数据
-- ============================================

-- 超级管理员拥有所有菜单权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, id FROM sys_menu WHERE status = 1;

-- 系统管理员权限（除系统设置外）
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 2, id FROM sys_menu WHERE status = 1 AND menu_code NOT LIKE 'settings_%';

-- 财务经理权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 3, id FROM sys_menu WHERE menu_code IN ('dashboard', 'finance', 'finance_receivable', 'finance_cost', 'finance_report', 'orders_sales', 'orders_customers');

-- 销售经理权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 4, id FROM sys_menu WHERE menu_code IN ('dashboard', 'orders', 'orders_sales', 'orders_customers', 'orders_products', 'warehouse', 'warehouse_inventory');

-- 生产经理权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 5, id FROM sys_menu WHERE menu_code IN ('dashboard', 'production', 'production_workorder', 'production_schedule', 'production_process', 'warehouse', 'warehouse_inventory', 'quality', 'quality_process');

-- 仓库主管权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 6, id FROM sys_menu WHERE menu_code IN ('dashboard', 'warehouse', 'warehouse_inbound', 'warehouse_outbound', 'warehouse_inventory', 'purchase', 'purchase_orders', 'purchase_suppliers');

-- 品质主管权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 7, id FROM sys_menu WHERE menu_code IN ('dashboard', 'quality', 'quality_incoming', 'quality_process', 'quality_final', 'production', 'production_workorder');

-- 采购经理权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 8, id FROM sys_menu WHERE menu_code IN ('dashboard', 'purchase', 'purchase_orders', 'purchase_suppliers', 'warehouse', 'warehouse_inventory', 'finance', 'finance_receivable');

-- 人事经理权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 9, id FROM sys_menu WHERE menu_code IN ('dashboard', 'hr', 'hr_employee', 'hr_attendance', 'hr_salary', 'settings', 'settings_organization');

-- 普通员工权限（仅查看）
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 10, id FROM sys_menu WHERE menu_code IN ('dashboard', 'production', 'production_workorder', 'quality', 'quality_process');

-- ============================================
-- 初始化用户角色关联
-- ============================================

-- 超级管理员 admin 绑定超级管理员角色
INSERT INTO `sys_user_role` (`user_id`, `role_id`) VALUES (1, 1);

-- 添加一些测试用户
INSERT INTO `sys_user` (`username`, `password`, `real_name`, `email`, `phone`, `department_id`, `status`, `create_time`) VALUES
('finance', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EO', '财务专员', 'finance@dachang.com', '13800138001', 3, 1, NOW()),
('sales', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EO', '销售专员', 'sales@dachang.com', '13800138002', 5, 1, NOW()),
('production', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EO', '生产专员', 'production@dachang.com', '13800138003', 6, 1, NOW()),
('warehouse', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EO', '仓库专员', 'warehouse@dachang.com', '13800138004', 10, 1, NOW()),
('quality', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EO', '品质专员', 'quality@dachang.com', '13800138005', 8, 1, NOW());

-- 绑定测试用户角色
INSERT INTO `sys_user_role` (`user_id`, `role_id`) VALUES
(2, 3),  -- finance -> 财务经理
(3, 4),  -- sales -> 销售经理
(4, 5),  -- production -> 生产经理
(5, 6),  -- warehouse -> 仓库主管
(6, 7);  -- quality -> 品质主管
