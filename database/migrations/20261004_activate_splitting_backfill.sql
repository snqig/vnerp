-- batch 159: 激活拆批（splitting）主数据
-- 业务裁定（2026-10-04）：按分类默认「占位」宽度/长度激活自动横切引擎；
--   宽度真实值需后续逐物料精修。
-- 仅对尺寸类物料（薄膜/片材/离型膜/保护膜 C01、包装材料/管材/胶带 C07，
--   及 RAW/PKG/PAPER/FILM 等旧树类）执行：
--   1) is_splittable = 1（启用分切单）
--   2) 占位 width=1000(mm)、length=100000(mm≈100m) —— 占位值，待业务按真实规格精修
--   3) 回填其非删除批次的 width/length/area，使 FIFO 宽度横切引擎可运行
-- 注意：width/length 为占位默认值，面积守恒横切数学按占位值计算，
--   批量精修真实宽度前，横切/面积结果仅近似。幂等：仅填充 NULL/0。

UPDATE inv_material
SET is_splittable = 1,
    width = 1000,
    length = 100000
WHERE (width IS NULL OR width = 0)
  AND category_id IN (
    SELECT id FROM inv_material_category
    WHERE category_code LIKE 'C01%' OR category_code LIKE 'C07%'
       OR id IN (1, 2, 6, 7, 200, 204, 205, 221, 227)
  );

UPDATE inv_inventory_batch b
JOIN inv_material m ON m.id = b.material_id
SET b.width = m.width,
    b.length = m.length,
    b.area = m.width * m.length * b.available_qty
WHERE b.deleted = 0
  AND m.width > 0
  AND (b.width IS NULL OR b.width = 0);
