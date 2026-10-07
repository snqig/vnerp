-- 20261007_merge_quality_incoming_into_center_menu.sql
-- 把 sys_menu「来料检验」并入「质量检验中心」（/quality/center 的第一个 tab）。
--
-- 背景：来料检验（IQC）已从独立路由 /quality/incoming 抽成
-- src/components/quality/QualityIncomingPage.tsx，与过程检验、成品终检
-- 一起并入 center 页的内 tab（旧路由保留 307 + ?tab=incoming 兼容书签）。
-- 菜单若仍单列，侧边栏就会出现两个入口指向同一功能。
--
-- 处理方式：停用（is_visible=0, status=0）而非物理删除 ——
-- sys_role_menu 按 menu_id 引用，删行会连带打断角色授权关系；
-- 行保留，将来若要拆回独立 tab 翻一下即可。
--
-- 不影响 API 鉴权：/api/quality/incoming 在
-- src/lib/route-permissions-table.ts 里走的是 API_PERMISSIONS.QUALITY_VIEW /
-- QUALITY_INSPECT，与菜单行的 permission 串（quality:incoming:*）是两套东西。
--
-- 幂等：按 menu_code 定位，可重复执行。

-- 1) 来料检验菜单停用（不进 sidebar）
UPDATE sys_menu
SET is_visible = 0,
    status = 0,
    update_time = NOW()
WHERE menu_code = 'quality_incoming'
  AND (is_visible <> 0 OR status <> 0);

-- 2) 质量检验中心上移到 sort_order=1（原先排在来料检验之后）
--    合并后它是品质部下第一个检验入口，排序应随之调整。
UPDATE sys_menu
SET sort_order = 1,
    update_time = NOW()
WHERE menu_code = 'quality_process'
  AND sort_order <> 1;