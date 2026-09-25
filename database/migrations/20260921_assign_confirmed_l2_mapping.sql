-- ============================================================================
-- 20260921_assign_confirmed_l2_mapping.sql
-- 目的：把「用户已确认」的 47 行 C12 物料挂到二级分类
-- ----------------------------------------------------------------------------
-- 背景（承接上一步 20260921_l2_mount_and_dedup.sql）：
--   092 只自动挂了「关键词精确命中」档（分组∈{跨一级重分类,同级细化} 且 置信度∈{高,中}）。
--   余下 78 行属于「关键词未命中 / 字形仅相近 / 并列需裁决」，按设计**不自动 apply**，
--   清单见 docs/qa/二级分类待指派清单-20260921.md。
--   用户于 2026-09-21 确认其中的 6 个可判档（共 47 行），本迁移即按该确认执行。
--
-- 确认口径（用户原话，行数一一对应）：
--   C01-07 离型膜（消银龙/特多龙/离型纸族）          14
--   C01-08 保护膜（上光膜/雾膜/聚脂膜/电磁膜）        12
--   C07-09 铜版纸/合成纸（雪铜/模造纸/牛皮纸/热敏纸）  10
--   C01-02 PC（0.25PC 等）                           5
--   C01-01 PET                                       3
--   C07-08 热缩套管                                   3
--   合计 47；剩余 31 行仍留在 C12（无候选，待查 BOM/供应商）。
--
-- 分类 code → id（2026-09-21 实测，77 个二级分类结构）：
--   C01-01 PET=233   C01-02 PC=234   C01-07 离型膜=274   C01-08 保护膜=275
--   C07-08 热缩套管=296   C07-09 铜版纸/合成纸=297   C12 待确认/其他=232
--
-- 幂等性：每条 UPDATE 均带 `category_id = 232`（迁移前原值），
--         重复执行时 affectedRows = 0，不会二次改动已归位的行。
--
-- 回滚：database/migrations/rollback/093_rollback.sql（按备份表还原 category_id）
-- 备份表：inv_material_l2c_bak_20260921（由执行脚本创建，含 id/旧 category_id）
--
-- 迁移前留痕（应得 47 行 / 各分类 0 行变更）：
--   SELECT id, material_name, category_id FROM inv_material
--    WHERE id IN (76,104,111,119,146,147,155,187,191,197,223,265,268,274,278,279,301,437,491,520,530,648,699,710,796,814,818,895,991,998,1025,1035,1079,1097,1123,1125,1126,1145,1207,1263,1270,1277,1281,1325,4432,4438)
--      AND category_id = 232;
--
-- 迁移后自检（应得：C12=31，C01-01=31，C01-02=20，C01-07=20，C01-08=17，C07-08=5，C07-09=16）：
--   SELECT c.category_code, c.category_name, COUNT(m.id) cnt
--     FROM inv_material_category c
--     LEFT JOIN inv_material m ON m.category_id = c.id AND m.deleted = 0
--    WHERE c.category_code IN ('C12','C01-01','C01-02','C01-07','C01-08','C07-08','C07-09')
--    GROUP BY c.id ORDER BY c.category_code;
-- ============================================================================


-- ---------------- C01-07 离型膜 (id=274) —— 14 行 ----------------
-- 25#白色特多龙 / 25#格底消银龙 / 50#格底消银龙 / 100#不变色消银龙 / 75#变色消银龙
-- / 50#透明离型纸 / 离型纸 / 75G黄牛皮离型纸 / 120g白色离型纸 / 蓝色离型纸
-- / 50#I不变色消银龙 / 150#不变色消银龙 / 25#厚底不变消银龙 / 离型纸(M-DEMO-008)
UPDATE inv_material SET category_id = 274, update_time = NOW()
 WHERE category_id = 232 AND deleted = 0
   AND id IN (301, 437, 491, 520, 530, 814, 991, 998, 1111, 1125, 1207, 1277, 1281, 4438);


-- ---------------- C01-08 保护膜 (id=275) —— 12 行 ----------------
-- 76#格底珠光膜 / 聚脂膜W / 聚脂膜B / 聚脂膜G / 上光膜 / 15#上光膜 / 25#上光膜
-- / 无底雾膜 / 有底雾膜 / 电磁膜 / 聚脂膜 / OPP光膜(M-DEMO-002)
UPDATE inv_material SET category_id = 275, update_time = NOW()
 WHERE category_id = 232 AND deleted = 0
   AND id IN (76, 274, 278, 279, 648, 699, 710, 796, 818, 895, 1325, 4432);


-- ---------------- C07-09 铜版纸/合成纸 (id=297) —— 10 行 ----------------
-- 格底镜铜 / 雪铜 / 蓝底雪铜 / 热敏纸 / 双层格底热转印纸 / 格底模造纸
-- / 格底牛皮纸 / 厚底模造纸 / 耐高温纸 / R胶热敏纸
UPDATE inv_material SET category_id = 297, update_time = NOW()
 WHERE category_id = 232 AND deleted = 0
   AND id IN (104, 111, 119, 146, 147, 155, 187, 191, 223, 268);


-- ---------------- C01-02 PC (id=234) —— 5 行 ----------------
-- 0.375PC / 0.25PC / 0.178PC / 0.125PC / 0.254PC
UPDATE inv_material SET category_id = 234, update_time = NOW()
 WHERE category_id = 232 AND deleted = 0
   AND id IN (1025, 1035, 1079, 1097, 1123);


-- ---------------- C01-01 PET (id=233) —— 3 行 ----------------
-- 0.1PET / 50#压花胶PET / 0.025PET
UPDATE inv_material SET category_id = 233, update_time = NOW()
 WHERE category_id = 232 AND deleted = 0
   AND id IN (197, 265, 1145);


-- ---------------- C07-08 热缩套管 (id=296) —— 3 行 ----------------
-- 热缩管 / 0.5mm热缩管 / 0.2mm热缩管
UPDATE inv_material SET category_id = 296, update_time = NOW()
 WHERE category_id = 232 AND deleted = 0
   AND id IN (1126, 1263, 1270);
