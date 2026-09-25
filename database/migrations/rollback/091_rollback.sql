-- 091_rollback.sql —— 回滚 20260921_clean_placeholder_materials.sql
-- 恢复 A 档（纯表头行的 deleted）与 B 档（material_name / specification）
UPDATE inv_material m
JOIN `inv_material_placeholder_bak_20260921` b ON b.id = m.id
SET m.material_name = b.material_name,
    m.specification = b.specification,
    m.deleted       = b.deleted,
    m.update_time   = NOW();
-- 校验：SELECT COUNT(*) FROM inv_material WHERE deleted=0 AND material_name='原材料';  -- 应回到 747
