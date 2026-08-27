-- 人力资源系统菜单
-- 添加到 sys_menu 表

-- 先删除已存在的人力资源菜单（避免重复）
DELETE FROM sys_menu WHERE menu_code LIKE 'hr%';

-- 插入人力资源系统菜单
INSERT INTO `sys_menu` (`parent_id`, `menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `component`, `permission`, `sort_order`, `status`, `is_visible`) VALUES
-- 人力资源系统（父菜单）
(0, '人力资源', 'hr', 1, 'Users', '/hr', NULL, 'hr:*', 12, 1, 1);

-- 获取父菜单ID
SET @hr_parent_id = LAST_INSERT_ID();

-- 子菜单
INSERT INTO `sys_menu` (`parent_id`, `menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `component`, `permission`, `sort_order`, `status`, `is_visible`) VALUES
(@hr_parent_id, '员工管理', 'hr_employee', 2, NULL, '/hr/employee', '/hr/employee', 'hr:employee:*', 1, 1, 1),
(@hr_parent_id, '考勤管理', 'hr_attendance', 2, NULL, '/hr/attendance', '/hr/attendance', 'hr:attendance:*', 2, 1, 1);

-- 为管理员角色添加菜单权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, id FROM sys_menu WHERE menu_code LIKE 'hr%';

-- 为人力资源角色添加菜单权限（如果存在）
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.id, m.id FROM sys_role r, sys_menu m
WHERE r.role_name = '人力资源' AND m.menu_code LIKE 'hr%';

-- 为部门主管角色添加菜单权限（如果存在）
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.id, m.id FROM sys_role r, sys_menu m
WHERE r.role_name = '部门主管' AND m.menu_code LIKE 'hr%';
