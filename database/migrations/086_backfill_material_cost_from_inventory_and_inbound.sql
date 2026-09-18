-- =============================================================================
-- 086_backfill_material_cost_from_inventory_and_inbound.sql
-- -----------------------------------------------------------------------------
-- 背景（2026-09-18 运行时核实结论）：
--   1) QA 报告称「std_material.unit_cost 全 NULL(4086 行) → BOM 成本恒为 0」，
--      经核实因果判断有误：全仓对 std_material.unit_cost 只有 DDL/CRUD，
--      **没有任何成本计算读取该列**（Grep 全仓 0 命中成本读取点）。
--   2) 真实成本读取路径只有两处，都落在 inv_material：
--        a. CostAmortizationService（工单成本分摊） 读 inv_material.cost_price
--        b. MaterialCostProvider（油墨/BOM 配方成本）读 inv_material.weighted_avg_cost
--           但该列在库中**根本不存在** → 主查询抛 ER_BAD_FIELD_ERROR 被 try/catch
--           静默吞掉 → 降级到 base_ink.unit_price（3 行且全为 0/空）→ 成本恒为 0。
--   3) 085 已用采购订单历史价回填 8 条真实物料（MAT001-MAT008）。本迁移扩大来源。
--
-- 数据源优先级（越靠前越权威）：
--   ① inv_inventory.unit_cost        库存台账移动加权平均成本（数量加权）
--   ② inv_inbound_item.unit_price    实际入库单价（含 base_unit_price 优先）
--   ③ pur_purchase_order_line        采购订单历史均价（085 已消费，此处不重复）
--
-- 目标列：
--   inv_material.cost_price   ← 真实读取路径 a
--   std_material.cost_price   ← 与 inv_material 对齐（保持两表口径一致）
--   std_material.unit_cost    ← 报告指控列；当前无读取点，仅作数据可用性补齐
--
-- 排除规则：material_code LIKE 'TEST%'（历史造数垃圾）、deleted=1、已有成本(>0)的行
-- 幂等性：全部 UPDATE 都带 (cost IS NULL OR cost=0) 守卫，可重复执行
--
-- 回滚：database/migrations/rollback/086_rollback.sql
-- =============================================================================

-- ① inv_material.cost_price ← 库存台账移动加权平均成本（数量加权；总量为 0 时退化为简单平均）
UPDATE inv_material im
JOIN (
  SELECT material_id,
         CASE
           WHEN SUM(CASE WHEN unit_cost > 0 THEN quantity ELSE 0 END) > 0
             THEN SUM(CASE WHEN unit_cost > 0 THEN unit_cost * quantity ELSE 0 END)
                  / SUM(CASE WHEN unit_cost > 0 THEN quantity ELSE 0 END)
           ELSE AVG(CASE WHEN unit_cost > 0 THEN unit_cost END)
         END AS avg_unit_cost
    FROM inv_inventory
   WHERE unit_cost > 0
     AND deleted = 0
     AND material_id IS NOT NULL
   GROUP BY material_id
) inv ON inv.material_id = im.id
   SET im.cost_price = ROUND(inv.avg_unit_cost, 4),
       im.update_time = NOW()
 WHERE (im.cost_price IS NULL OR im.cost_price = 0)
   AND im.material_code NOT LIKE 'TEST%'
   AND inv.avg_unit_cost > 0;

-- ② inv_material.cost_price ← 实际入库单价（base_unit_price 优先，回落到 unit_price）
UPDATE inv_material im
JOIN (
  SELECT material_id,
         AVG(COALESCE(NULLIF(base_unit_price, 0), unit_price)) AS avg_unit_price
    FROM inv_inbound_item
   WHERE unit_price > 0
     AND deleted = 0
     AND material_id IS NOT NULL
   GROUP BY material_id
) ib ON ib.material_id = im.id
   SET im.cost_price = ROUND(ib.avg_unit_price, 4),
       im.update_time = NOW()
 WHERE (im.cost_price IS NULL OR im.cost_price = 0)
   AND im.material_code NOT LIKE 'TEST%'
   AND ib.avg_unit_price > 0;

-- ③ std_material.cost_price ← inv_material.cost_price（按 material_code 对齐口径）
UPDATE std_material sm
JOIN inv_material im ON im.material_code = sm.material_code
   SET sm.cost_price = im.cost_price,
       sm.update_time = NOW()
 WHERE (sm.cost_price IS NULL OR sm.cost_price = 0)
   AND im.cost_price > 0
   AND im.material_code NOT LIKE 'TEST%';

-- ④ std_material.unit_cost ← inv_material.cost_price（补齐报告指控列；当前无读取点）
UPDATE std_material sm
JOIN inv_material im ON im.material_code = sm.material_code
   SET sm.unit_cost = im.cost_price,
       sm.update_time = NOW()
 WHERE (sm.unit_cost IS NULL OR sm.unit_cost = 0)
   AND im.cost_price > 0
   AND im.material_code NOT LIKE 'TEST%';
