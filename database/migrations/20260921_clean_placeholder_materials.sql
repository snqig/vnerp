-- ============================================================================
-- 20260921_clean_placeholder_materials.sql
-- 清理物料主数据中的「占位行 / 列错位行」
-- ----------------------------------------------------------------------------
-- 背景（2026-09-21 审计结论）：
--   2026-06-03 导入「5月原材料月报表」时发生 Excel **列错位**：
--     material_name 被填成分类列的表头值「原材料」，真实品名被挤到 specification 列。
--   证据：id=60 code=37 name='原材料' spec='格底铜版纸' remark='导入自5月原材料月报表-月报表'
--   影响面：747 行 name='原材料' + 1 行纯表头行（code='类别', name='品名'）
--
-- 为什么「修名」而不是「删除」：
--   决定性检验显示，这 443 行的 131 个品名里，**130 个在物料主数据中不存在其他记录**
--   （抽检：铜版纸 正常行 0 / 占位行 38；保护膜 0/37；上光膜 0/20；PC料 0/20）。
--   即：这些行是该公司**原材料主数据的唯一载体**，删除等于清空原材料主数据。
--   同时全库列级扫描（130 个含 material/product 的列）确认业务侧零引用。
--
-- 处置：
--   A 档（1 行）   纯表头行（code='类别', name='品名'）   → 软删 deleted=1
--   B 档（443 行） name='原材料' 且 specification 有值   → 修复 name←specification，同时 specification←NULL
--   C 档（304 行） name='原材料' 且 specification 为空   → 本文件不处理，见独立迁移
--
-- 前置条件：备份表 inv_material_placeholder_bak_20260921 已建立（由 apply 脚本创建）
-- 回滚：database/migrations/rollback/091_rollback.sql
-- ============================================================================

-- ---------------- A 档：纯表头行（期望 1 行） ----------------
UPDATE inv_material
SET deleted = 1,
    update_time = NOW()
WHERE deleted = 0
  AND material_name IN ('品名', '类别', '辅助品', '包材', '产品名称', '物料名称', '备注')
  AND material_name <> '原材料';

-- ---------------- B 档：列错位修复（期望 443 行） ----------------
-- 真实品名在 specification 列 → 搬回 material_name；specification 该列语义错位，置 NULL。
UPDATE inv_material
SET material_name  = TRIM(specification),
    specification  = NULL,
    update_time    = NOW()
WHERE deleted = 0
  AND material_name = '原材料'
  AND TRIM(COALESCE(specification, '')) <> '';

-- ============================================================================
-- 执行后自检：
--   SELECT COUNT(*) FROM inv_material WHERE deleted=0 AND material_name='原材料';           -- 期望 304（C 档）
--   SELECT COUNT(*) FROM inv_material WHERE deleted=0 AND material_name='品名';             -- 期望 0
--   SELECT COUNT(*) FROM inv_material WHERE deleted=0 AND material_name='格底铜版纸';       -- 期望 >0
-- ============================================================================
