-- 全程二维码追溯系统菜单
-- 添加到 sys_menu 表

-- 先删除已存在的菜单（避免重复）
DELETE FROM sys_menu WHERE menu_code LIKE 'dcprint%';

-- 插入全程二维码追溯系统菜单
INSERT INTO `sys_menu` (`parent_id`, `menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `component`, `permission`, `sort_order`, `status`, `is_visible`) VALUES
-- 全程二维码追溯系统（父菜单）
(0, '全程追溯', 'dcprint', 1, 'QrCode', '/dcprint', NULL, 'dcprint:*', 10, 1, 1);

-- 获取父菜单ID
SET @dcprint_parent_id = LAST_INSERT_ID();

-- 子菜单
INSERT INTO `sys_menu` (`parent_id`, `menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `component`, `permission`, `sort_order`, `status`, `is_visible`) VALUES
(@dcprint_parent_id, '物料标签', 'dcprint_labels', 2, NULL, '/dcprint/labels', '/dcprint/labels', 'dcprint:labels:*', 1, 1, 1),
(@dcprint_parent_id, '物料分切', 'dcprint_cutting', 2, NULL, '/dcprint/cutting', '/dcprint/cutting', 'dcprint:cutting:*', 2, 1, 1),
(@dcprint_parent_id, '流程卡', 'dcprint_cards', 2, NULL, '/dcprint/process-cards', '/dcprint/process-cards', 'dcprint:cards:*', 3, 1, 1),
(@dcprint_parent_id, '物料追溯', 'dcprint_trace', 2, NULL, '/dcprint/trace', '/dcprint/trace', 'dcprint:trace:*', 4, 1, 1);

-- 为管理员角色添加菜单权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, id FROM sys_menu WHERE menu_code LIKE 'dcprint%';

-- 为生产主管角色添加菜单权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 5, id FROM sys_menu WHERE menu_code LIKE 'dcprint%';

-- 为仓库管理员角色添加菜单权限
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 6, id FROM sys_menu WHERE menu_code LIKE 'dcprint%';
