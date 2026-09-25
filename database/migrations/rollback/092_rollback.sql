-- 092_rollback.sql —— 回滚 20260921_l2_mount_and_dedup.sql
-- 恢复被触碰行的 material_name / specification / category_id / deleted 到迁移前状态
UPDATE inv_material m
JOIN `inv_material_phase2_bak_20260921` b ON b.id = m.id
SET m.material_name = b.material_name,
    m.specification = b.specification,
    m.category_id   = b.category_id,
    m.deleted       = b.deleted,
    m.update_time   = NOW();
-- 校验：
--   SELECT COUNT(*) FROM inv_material WHERE deleted=0 AND material_name='原材料';   -- 应回到 304
--   SELECT c.category_code, COUNT(*) FROM inv_material m JOIN inv_material_category c ON c.id=m.category_id
--     WHERE m.deleted=0 AND c.category_code LIKE 'C%' GROUP BY c.category_code ORDER BY 1;
