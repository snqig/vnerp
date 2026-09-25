-- 093_rollback.sql —— 回滚 20260921_assign_confirmed_l2_mapping.sql
-- 按备份表还原 47 行 category_id（其余列本迁移未触碰）
UPDATE inv_material m
JOIN `inv_material_l2c_bak_20260921` b ON b.id = m.id
SET m.category_id = b.category_id,
    m.update_time = NOW();
-- 校验（应回到：C12=78，C01-01=28，C01-02=15，C01-07=6，C01-08=5，C07-08=2，C07-09=6）：
--   SELECT c.category_code, COUNT(m.id) cnt FROM inv_material_category c
--     LEFT JOIN inv_material m ON m.category_id=c.id AND m.deleted=0
--    WHERE c.category_code IN ('C12','C01-01','C01-02','C01-07','C01-08','C07-08','C07-09')
--    GROUP BY c.id ORDER BY c.category_code;
