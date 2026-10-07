-- 20261007_fix_stale_quality_process_final_menu.sql
-- 修复 c7de62ff（quality/process + quality/final 合并进 quality/center）遗留的僵尸菜单。
--
-- 症状：侧边栏「过程检验」点进去 404 —— 路由目录已删，但 sys_menu 仍指向旧路径。
-- 根因：该提交只改了初始化种子端点 src/app/api/init/menus/route.ts（仅 seed 时生效），
--       未提供迁移修正已存在的库表 → live sys_menu 行 75/76 保持 /quality/process。
--       同批的 final（行 76）一并修正。
--
-- 幂等：按 menu_code 定位，可重复执行。

-- 1) 过程检验：path + component 一并指向 /quality/center
UPDATE sys_menu
SET path = '/quality/center',
    component = '/quality/center',
    update_time = NOW()
WHERE menu_code = 'quality_process'
  AND (path <> '/quality/center' OR IFNULL(component, '') <> '/quality/center');

-- 2) 终检：同上
UPDATE sys_menu
SET path = '/quality/center',
    component = '/quality/center',
    update_time = NOW()
WHERE menu_code = 'quality_final'
  AND (path <> '/quality/center' OR IFNULL(component, '') <> '/quality/center');