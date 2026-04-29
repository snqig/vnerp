-- 质量检验系统菜单
-- 添加到 sys_menu 表

-- 先删除已存在的质量菜单（避免重复）
DELETE FROM sys_menu WHERE menu_code LIKE 'quality%';

-- 插入质量检验系统菜单
INSERT INTO `sys_menu` (`parent_id`, `menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `component`, `permission`, `sort_order`, `status`, `is_visible`) VALUES
-- 质量检验系统（父菜单）
(0, '质量管理', 'quality', 1, 'FileCheck', '/quality', NULL, 'quality:*', 11, 1, 1);

-- 获取父菜单ID
SET @quality_parent_id = LAST_INSERT_ID();

-- 子菜单
INSERT INTO `sys_menu` (`parent_id`, `menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `component`, `permission`, `sort_order`, `status`, `is_visible`) VALUES
(@quality_parent_id, '进料检验', 'quality_incoming', 2, NULL, '/quality/incoming', '/quality/incoming', 'quality:incoming:*', 1, 1, 1),
(@quality_parent_id, '质量追溯', 'quality_trace', 2, NULL, '/quality/trace', '/quality/trace', 'quality:trace:*', 2, 1, 1);

-- 为管理员角色添加菜单权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, id FROM sys_menu WHERE menu_code LIKE 'quality%';

-- 为生产主管角色添加菜单权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 5, id FROM sys_menu WHERE menu_code LIKE 'quality%';

-- 为质量管理员角色添加菜单权限（如果存在）
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.id, m.id FROM sys_role r, sys_menu m
WHERE r.role_name = '质量管理员' AND m.menu_code LIKE 'quality%';
