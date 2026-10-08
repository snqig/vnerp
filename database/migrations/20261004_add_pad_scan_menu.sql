-- 20261004_add_pad_scan_menu.sql
-- Pad 扫码工作站侧边栏入口（可达性补强）
--   - 挂载于「仓库管理」根菜单（menu_code='warehouse'）之下
--   - 菜单码 pad_scan，路径 /pad/scan，图标 QrCode（sidebar iconMap 已内置该图标）
--   - permission 留空：菜单可见性由 sys_role_menu 控制；盘点/溯源等具体动作
--     仍由 API 权限（WAREHOUSE_STOCKTAKE / QRCODE_VIEW）在服务端把关
-- 幂等：可重复执行（父级按 menu_code 定位，不硬编码 id；授权按 role_code 定位）

-- 1) 插入菜单项
INSERT INTO sys_menu
  (parent_id, menu_name, menu_code, menu_type, icon, path, component,
   permission, sort_order, status, is_visible, deleted, create_time, update_time)
SELECT
  p.id, 'Pad 扫码工作站', 'pad_scan', 2, 'QrCode', '/pad/scan', '/pad/scan',
  NULL, 99, 1, 1, 0, NOW(), NOW()
FROM sys_menu p
WHERE p.menu_code = 'warehouse'
  AND p.parent_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.menu_code = 'pad_scan');

-- 2) 授权给现场角色（super_admin + 仓储/生产现场角色），幂等
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
JOIN sys_menu m ON m.menu_code = 'pad_scan'
WHERE r.role_code IN ('super_admin','warehouse_keeper','warehouse_manager','production_manager')
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = r.id AND rm.menu_id = m.id
  );
