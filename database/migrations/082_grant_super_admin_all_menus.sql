-- 082_grant_super_admin_all_menus.sql
--
-- 【缺陷】超级管理员（sys_role.role_code = 'super_admin'）在 sys_role_menu 中**一条绑定都没有**。
--
-- 证据（迁移前实测）：
--   sys_role_menu 按角色分布：role 2..10 各 11~27 行，role 21/22（QA 临时角色）各 1 行，
--   **role 1 = super_admin 为 0 行**；sys_menu 有 111 行（status=1, deleted=0）。
--
-- 影响链（全部已运行时复现）：
--   1. 登录响应 `data.user.permissions = []`（login/route.ts:305-314 走 sys_menu ⋈ sys_role_menu）
--   2. `GET /api/auth/menus` 返回 `menus: []`（auth/menus/route.ts:66-76 同一 join）
--   3. 侧边栏无任何菜单 → 用户可见症状即「没有权限」
--   4. `lib/auth.ts:getUserInfo` 的 permissions 同样为空
--   注：服务端 `withPermission` 因 `hasPermission` 显式含 `roles.includes('super_admin')` 放行，
--       所以 API 仍全 200 —— 这就是「接口都通、界面却无权限」的原因。
--
-- 【根因】src/app/api/init/settings-seed/route.ts:1390-1419 的 roleMenuAssignments 种子映射表
--   只列了 business_manager / sales / engineer / production_manager / warehouse_manager /
--   warehouse_keeper / purchaser / qc_inspector / accountant 九个业务角色，**遗漏 super_admin**。
--   而 src/app/api/init/menus/route.ts:1469-1490 已明确表达「super_admin 绑定全部 status=1 菜单」的既有设计意图。
--
-- 【修复】按该既有意图补齐绑定。幂等：uk_role_menu(role_id, menu_id) 唯一键 + INSERT IGNORE，可重复执行。

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
CROSS JOIN sys_menu m
WHERE r.role_code = 'super_admin'
  AND r.deleted = 0
  AND m.deleted = 0
  AND m.status = 1;
