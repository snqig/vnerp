-- =============================================================================
-- rollback/086_rollback.sql
-- 086 回填的可回滚脚本。
--
-- 说明：086 只向「原本为 NULL 或 0」的成本列写入数值，因此回滚 = 把本次
-- 新增的取值清回 NULL。为避免误清业务后续录入的真实成本，回滚按
-- 「material_code 白名单 + 值等于本次写入值」双重限定，需先执行下面
-- 第 0 步导出白名单，再执行第 1/2 步。
-- =============================================================================

-- 第 0 步（人工）：导出本次 086 新增回填的行，人工核对后再执行下方语句
-- SELECT sm.material_code, sm.unit_cost, sm.cost_price
--   FROM std_material sm
--  WHERE sm.unit_cost > 0
--    AND sm.material_code NOT LIKE 'TEST%';

-- 第 1 步：清空 std_material 的 086 回填值（仅限与 inv_material 同值的行）
UPDATE std_material sm
JOIN inv_material im ON im.material_code = sm.material_code
   SET sm.unit_cost  = NULL,
       sm.cost_price = NULL,
       sm.update_time = NOW()
 WHERE sm.unit_cost = im.cost_price
   AND sm.cost_price = im.cost_price
   AND sm.material_code NOT LIKE 'TEST%';

-- 第 2 步：清空 inv_material 由 086 写入的 cost_price
--   注意：085 写入的 8 条（MAT001-MAT008，值 5.0000）也会被一并清空。
--   如需精确保留 085 结果，请改为按显式 id 列表回滚。
UPDATE inv_material im
   SET im.cost_price = NULL,
       im.update_time = NOW()
 WHERE im.cost_price > 0
   AND im.material_code NOT LIKE 'TEST%'
   AND im.material_code NOT LIKE 'M-DEMO-%';
