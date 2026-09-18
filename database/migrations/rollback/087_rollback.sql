-- =============================================================================
-- rollback/087_rollback.sql
-- 087 回滚：把 category_id=1 下非 MAT001-MAT005 的行恢复为 is_splittable = 1
--
-- 注意：087 置 0 的 779 行中，747 条为孤儿占位数据（零业务引用），
--       30 条网版 / 1 条网框为工装。若无特殊需要，不建议回滚。
-- =============================================================================

UPDATE inv_material
   SET is_splittable = 1,
       update_time = NOW()
 WHERE category_id = 1
   AND is_splittable = 0
   AND deleted = 0
   AND material_code NOT IN ('MAT001', 'MAT002', 'MAT003', 'MAT004', 'MAT005');
