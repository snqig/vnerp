-- HR 模块菜单注册（适配 vnerpdacahng sys_menu 表结构）
-- 列: menu_name, menu_code, menu_type(1=目录 2=菜单 3=按钮), icon, path, component, permission, sort_order, status, visible, is_visible, deleted
-- 注意：menu_code 有 UNIQUE 约束，不能重复

-- ============================================================
-- 1. 创建父目录（如果不存在）
-- ============================================================
INSERT INTO `sys_menu` (`menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `permission`, `sort_order`, `status`, `visible`, `is_visible`, `deleted`)
SELECT '人力资源', 'hr', 1, 'Users', '/hr', 'hr:*', 12, 1, 1, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `menu_code` = 'hr' AND `deleted` = 0);

-- 获取父目录 ID
SET @hr_parent = (SELECT `id` FROM `sys_menu` WHERE `menu_code` = 'hr' AND `deleted` = 0 LIMIT 1);

-- ============================================================
-- 2. 子菜单（menu_type=2）
-- ============================================================
-- 使用临时表批量插入，避免重复
CREATE TEMPORARY TABLE IF NOT EXISTS `tmp_hr_menus` (
  `menu_name` VARCHAR(50), `menu_code` VARCHAR(50), `icon` VARCHAR(50),
  `path` VARCHAR(200), `component` VARCHAR(255), `permission` VARCHAR(100), `sort_order` INT
);

DELETE FROM `tmp_hr_menus`;
INSERT INTO `tmp_hr_menus` VALUES
('员工管理',   'hr_employee',       'UserCircle',      '/hr/employee',             '/hr/employee',             'hr:employee:*',      1),
('组织架构',   'hr_organization',   'Building2',       '/hr/organization',         '/hr/organization',         'hr:organization:*',  2),
('班次管理',   'hr_shift',          'Clock',           '/hr/shifts',               '/hr/shifts',               'hr:shift:*',         3),
('排班管理',   'hr_schedule',       'CalendarDays',    '/hr/schedules',            '/hr/schedules',            'hr:schedule:*',      4),
('考勤管理',   'hr_attendance',     'ClipboardCheck',  '/hr/attendance',           '/hr/attendance',           'hr:attendance:*',    5),
('工序单价',   'hr_piece_rate',     'DollarSign',      '/hr/salary/piece-rate',    '/hr/salary/piece-rate',    'hr:piece-rate:*',    6),
('计件产量',   'hr_piece_work',     'Hammer',          '/hr/salary/piece-work',    '/hr/salary/piece-work',    'hr:piece-work:*',    7),
('薪资计算',   'hr_salary_calc',    'Calculator',      '/hr/salary/calculate',     '/hr/salary/calculate',     'hr:salary:calc',     8),
('薪资管理',   'hr_salary',         'Wallet',          '/hr/salary',               '/hr/salary',               'hr:salary:*',        9),
('银行报盘',   'hr_bank_report',    'Landmark',        '/hr/salary/bank-report',   '/hr/salary/bank-report',   'hr:bank-report:*',  10),
('电子工资条', 'hr_payslip',        'FileText',        '/hr/salary/payslips',      '/hr/salary/payslips',      'hr:payslip:*',       11),
('绩效评分',   'hr_performance',    'Star',            '/hr/performance',          '/hr/performance',          'hr:performance:*',   12),
('培训管理',   'hr_training',       'BookOpen',        '/hr/training',             '/hr/training',             'hr:training:*',      13),
('技能认证',   'hr_skill',          'Award',           '/hr/skills',               '/hr/skills',               'hr:skill:*',         14),
('证书管理',   'hr_certificate',    'ScrollText',      '/hr/certificates',         '/hr/certificates',         'hr:certificate:*',   15),
('证书到期预警','hr_cert_expiry',   'BellRing',        '/hr/certificates/expiring','/hr/certificates/expiring','hr:certificate:expiry',16),
('人力报表',   'hr_report',         'BarChart3',       '/hr/reports',              '/hr/reports',              'hr:report:*',        17),
('MES同步日志','hr_mes_sync',       'RefreshCw',       '/hr/mes-sync',             '/hr/mes-sync',             'hr:mes-sync:*',      18);

-- 插入不重复的菜单
INSERT INTO `sys_menu` (`menu_name`, `menu_code`, `menu_type`, `icon`, `path`, `component`, `permission`, `sort_order`, `parent_id`, `status`, `visible`, `is_visible`, `deleted`)
SELECT t.*, @hr_parent, 1, 1, 1, 1, 0
FROM `tmp_hr_menus` t
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `menu_code` = t.`menu_code` AND `deleted` = 0);

-- ============================================================
-- 3. 按钮权限（menu_type=3，挂载在对应子菜单下）
-- ============================================================
CREATE TEMPORARY TABLE IF NOT EXISTS `tmp_hr_buttons` (
  `menu_code` VARCHAR(50), `btn_name` VARCHAR(50), `btn_code` VARCHAR(50), `sort` INT
);

DELETE FROM `tmp_hr_buttons`;

-- 员工管理按钮
INSERT INTO `tmp_hr_buttons` VALUES ('hr_employee', '新增员工', 'hr:employee:create', 1);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_employee', '编辑员工', 'hr:employee:edit', 2);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_employee', '删除员工', 'hr:employee:delete', 3);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_employee', '导出员工', 'hr:employee:export', 4);

-- 考勤管理按钮
INSERT INTO `tmp_hr_buttons` VALUES ('hr_attendance', '新增考勤', 'hr:attendance:create', 1);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_attendance', '编辑考勤', 'hr:attendance:edit', 2);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_attendance', '删除考勤', 'hr:attendance:delete', 3);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_attendance', '导入考勤', 'hr:attendance:import', 4);

-- 薪资管理按钮
INSERT INTO `tmp_hr_buttons` VALUES ('hr_salary', '编辑薪资', 'hr:salary:edit', 1);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_salary', '确认发放', 'hr:salary:confirm', 2);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_salary', '导出薪资', 'hr:salary:export', 3);

-- 薪资计算按钮
INSERT INTO `tmp_hr_buttons` VALUES ('hr_salary_calc', '执行计算', 'hr:salary:calc-execute', 1);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_salary_calc', '批量确认', 'hr:salary:calc-confirm', 2);

-- 培训管理按钮
INSERT INTO `tmp_hr_buttons` VALUES ('hr_training', '新增培训', 'hr:training:create', 1);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_training', '编辑培训', 'hr:training:edit', 2);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_training', '删除培训', 'hr:training:delete', 3);

-- 绩效评分按钮
INSERT INTO `tmp_hr_buttons` VALUES ('hr_performance', '录入评分', 'hr:performance:create', 1);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_performance', '编辑评分', 'hr:performance:edit', 2);

-- 证书管理按钮
INSERT INTO `tmp_hr_buttons` VALUES ('hr_certificate', '新增证书', 'hr:certificate:create', 1);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_certificate', '编辑证书', 'hr:certificate:edit', 2);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_certificate', '删除证书', 'hr:certificate:delete', 3);

-- MES同步按钮
INSERT INTO `tmp_hr_buttons` VALUES ('hr_mes_sync', '手动同步', 'hr:mes-sync:manual', 1);
INSERT INTO `tmp_hr_buttons` VALUES ('hr_mes_sync', '重试同步', 'hr:mes-sync:retry', 2);

-- 插入按钮权限（挂载到父菜单）
INSERT INTO `sys_menu` (`menu_name`, `menu_code`, `menu_type`, `permission`, `sort_order`, `parent_id`, `status`, `visible`, `is_visible`, `deleted`)
SELECT b.`btn_name`, b.`btn_code`, 3, b.`btn_code`, b.`sort`, m.`id`, 1, 1, 1, 0
FROM `tmp_hr_buttons` b
JOIN `sys_menu` m ON m.`menu_code` = b.`menu_code` AND m.`deleted` = 0
WHERE NOT EXISTS (SELECT 1 FROM `sys_menu` WHERE `menu_code` = b.`btn_code` AND `deleted` = 0);

-- ============================================================
-- 4. 角色-菜单关联（admin role_id=1）
-- ============================================================
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, m.`id` FROM `sys_menu` m
WHERE m.`menu_code` IN (
  'hr', 'hr_employee', 'hr_organization', 'hr_shift', 'hr_schedule',
  'hr_attendance', 'hr_piece_rate', 'hr_piece_work', 'hr_salary_calc',
  'hr_salary', 'hr_bank_report', 'hr_payslip', 'hr_performance',
  'hr_training', 'hr_skill', 'hr_certificate', 'hr_cert_expiry',
  'hr_report', 'hr_mes_sync'
) AND m.`deleted` = 0
AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` WHERE `role_id` = 1 AND `menu_id` = m.`id`);

-- 按钮权限关联（admin 角色）
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, m.`id` FROM `sys_menu` m
WHERE m.`menu_type` = 3 AND m.`menu_code` LIKE 'hr:%' AND m.`deleted` = 0
AND NOT EXISTS (SELECT 1 FROM `sys_role_menu` WHERE `role_id` = 1 AND `menu_id` = m.`id`);

-- ============================================================
-- 5. 清理临时表
-- ============================================================
DROP TEMPORARY TABLE IF EXISTS `tmp_hr_menus`;
DROP TEMPORARY TABLE IF EXISTS `tmp_hr_buttons`;
