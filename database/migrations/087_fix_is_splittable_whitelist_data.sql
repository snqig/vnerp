-- =============================================================================
-- 087_fix_is_splittable_whitelist_data.sql
-- -----------------------------------------------------------------------------
-- 背景（2026-09-18 运行时核实）：
--   分切白名单机制【已实现】—— 迁移 20260827132300_add_is_splittable 建列并按分类码
--   (FILM/PAPER/PKG/RAW) 置 1，src/lib/reference-validation.ts:assertMaterialSplittable()
--   在 src/app/api/warehouse/split-order/route.ts:109/235 做 400 拦截，
--   PATCH /api/materials/[id] 提供主数据手动覆盖。
--
--   真正的缺陷在【数据】：初始化迁移按「分类 = RAW」粗粒度整类置 1，而顶级分类
--   id=1 (RAW/原材料) 里混入了 779 条非卷材记录：
--     · 30 条 material_name = '网版'    （工装，unit='个'）
--     ·  1 条 material_name = '网框'    （工装，unit='个'）
--     · 747 条 material_name = '原材料'  （字面占位名，material_code 为纯数字，
--        width 为空 / length=0，且在 inv_inventory / inv_inbound_item /
--        pur_purchase_order_line 中引用数均为 0 —— 孤儿占位数据）
--     ·  1 条 material_name = '规格品'
--   只有 5 条是真实卷材（MAT001-MAT005：PET薄膜×2 / PVC薄膜 / 不干胶PET / 不干胶PVC）。
--
-- 处置（用户 2026-09-18 决策：779 行全部置 0）：
--   保留 MAT001-MAT005 的 is_splittable = 1，其余 category_id=1 的行置 0。
--
-- 判定明细：docs/qa/分切白名单逐条判定-20260918.csv（784 行，含依据与置信度）
-- 回滚：database/migrations/rollback/087_rollback.sql
-- 幂等性：WHERE is_splittable = 1 守卫，可重复执行
-- =============================================================================

UPDATE inv_material
   SET is_splittable = 0,
       update_time = NOW()
 WHERE category_id = 1
   AND is_splittable = 1
   AND deleted = 0
   AND material_code NOT IN ('MAT001', 'MAT002', 'MAT003', 'MAT004', 'MAT005');
