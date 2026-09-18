-- ============================================================================
-- 085_backfill_material_cost_from_purchase_history.sql
--
-- 目的：为 BOM / 配方成本计算提供基础成本数据（此前 std_material.unit_cost 全为 NULL，
--       4086 行无一条有值，导致引用它的成本计算恒为 0）。
--
-- 来源：pur_purchase_order_line 的历史采购均价（本位币优先，回落原币单价）
--
-- 范围限定（重要）：
--   · 排除 material_code 以 TEST 开头的自动化测试垃圾数据（实测 58 个有价物料中
--     有 50 个是 TEST_MAT_<timestamp> 形式，其 10.00 单价为测试造数，不得作为成本）
--   · 实际可回填的真实物料为 8 条（MAT001-MAT008：PET/PVC 薄膜、不干胶、丝印油墨、
--     导电银浆），均价 5.00。覆盖率 8/4086 —— 其余物料库内无任何成本数据来源。
--
-- 幂等：仅填充当前为 NULL 或 0 的成本；可重复执行且结果稳定。
--
-- 执行方式：必须经受控执行器（显式白名单）执行，禁止 `migrate up` 全量跑。
-- 生成日期：2026-09-18
-- ============================================================================

-- ① inv_material.cost_price ← 历史采购均价
UPDATE inv_material im
JOIN (
    SELECT pl.material_id,
           AVG(COALESCE(NULLIF(pl.base_unit_price, 0), pl.unit_price)) AS avg_unit_price
      FROM pur_purchase_order_line pl
     WHERE pl.unit_price > 0
       AND pl.material_id IS NOT NULL
     GROUP BY pl.material_id
) agg ON agg.material_id = im.id
   SET im.cost_price  = ROUND(agg.avg_unit_price, 4),
       im.update_time = NOW()
 WHERE (im.cost_price IS NULL OR im.cost_price = 0)
   AND im.material_code NOT LIKE 'TEST%'
   AND agg.avg_unit_price > 0;

-- ② std_material.unit_cost ← inv_material.cost_price（按物料编码对齐，4085/4086 可匹配）
UPDATE std_material sm
JOIN inv_material im ON im.material_code = sm.material_code
   SET sm.unit_cost   = im.cost_price,
       sm.update_time = NOW()
 WHERE (sm.unit_cost IS NULL OR sm.unit_cost = 0)
   AND im.cost_price > 0
   AND im.material_code NOT LIKE 'TEST%';
