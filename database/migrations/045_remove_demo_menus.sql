-- ============================================
-- 迁移 045: 删除示范菜单（demo / demo_crud）
-- 说明：示范菜单仅用于开发演示，生产环境不应保留
-- 幂等：菜单不存在时不会报错
-- ============================================

-- 1. 删除角色-菜单关联
DELETE FROM sys_role_menu WHERE menu_id IN (
  SELECT id FROM (
    SELECT id FROM sys_menu WHERE menu_code IN ('demo', 'demo_crud')
  ) AS t
);

-- 2. 先删除子菜单（demo_crud），再删除父菜单（demo）
DELETE FROM sys_menu WHERE menu_code = 'demo_crud';
DELETE FROM sys_menu WHERE menu_code = 'demo';
