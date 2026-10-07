-- 20261007_merge_quality_process_final_into_center_menu.sql
-- 把 sys_menu 中「过程检验」「成品检验」两条菜单合并为单条「质量检验中心」。
--
-- 背景：c7de62ff 已把两个独立页面合并进 /quality/center（tab 定位），
-- 随后的 20261007_fix_stale_quality_process_final_menu.sql 把两条菜单的
-- path/component 都改成 /quality/center —— 但**保留了两条菜单行和两个名字**，
-- 于是侧边栏渲染出「过程检验」「成品检验」两个入口，点进去却是同一个页面。
--
-- 本迁移：
--   1) 主菜单（quality_process，id=75）改名「质量检验中心」，menu_code 保持不变
--      —— 保留它是因为 sys_role_menu / 用户偏好 / 审计都按 menu_id 引用，
--      改 code 会连带打断这些引用；改 name 零副作用。
--   2) 重复菜单（quality_final，id=76）停用而非物理删除：
--      is_visible=0 + status=0 让 sidebar 不再下发，但行本身留着，
--      角色授权关系不丢（之后若要恢复 tab 入口仍可翻回来）。
--      若确认不再需要，可另行物理删除，本迁移不做不可逆操作。
--
-- 不影响 API 鉴权：/api/quality/process 与 /api/quality/final 在
-- src/lib/route-permissions-table.ts 里走的是 API_PERMISSIONS.QUALITY_VIEW /
-- QUALITY_INSPECT，与菜单行的 permission 串（quality:process:* / quality:final:*）
-- 是两套东西，菜单改名/停用不会改变 API 权限判定。
--
-- 幂等：按 menu_code 定位，可重复执行。

-- 1) 主菜单改名「质量检验中心」
UPDATE sys_menu
SET menu_name = '质量检验中心',
    path = '/quality/center',
    component = '/quality/center',
    is_visible = 1,
    status = 1,
    update_time = NOW()
WHERE menu_code = 'quality_process'
  AND (menu_name <> '质量检验中心'
       OR path <> '/quality/center'
       OR IFNULL(component, '') <> '/quality/center');

-- 2) 重复菜单停用（不进 sidebar）
UPDATE sys_menu
SET is_visible = 0,
    status = 0,
    update_time = NOW()
WHERE menu_code = 'quality_final'
  AND (is_visible <> 0 OR status <> 0);