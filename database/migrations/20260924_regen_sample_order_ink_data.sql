-- =====================================================================
-- 20260924 重生成 sample/orders + sample/management + sal_sample_inventory
--          及 prd_ink 的关联演示数据
-- 背景：
--   sal_sample_order id 97-141（45 行）为 E2E 测试垃圾：customer_name 为
--   「E2E测试客户-N」但 customer_id 全部=61（美的集团，名称与 id 不一致）、
--   material_no=MAT035 大量重复、converted 行无 sales_order_id。
--   id 77-96（20 行）为 eng_sample_to_mass 的上游（20/20 引用），必须保留，
--   但字段有病：notify_date 全 NULL、size_spec/specification/customer_require_date
--   全 NULL、delivery_status='completed'（合法值域 pending/delivered/signed 之外的
--   脏值）且 actual_delivery_date 全 NULL（自相矛盾）。
--   sal_sample_inventory 21 行全部引用 97-141，同批清理。
--   prd_ink 3 行 ink_type 全 NULL（页面类型列恒 '-'）、color_code/specification/
--   shelf_life 全 NULL。supplier_id=2/5 指向 pur_supplier（真实存在，无需修）。
--   dcprint_ink_formula_item 有 31 行引用 prd_ink id 1-3 → 不删行，只修补。
-- 关联数据源（真实主数据）：
--   crm_customer 61-70 / mdm_product 44-53（product_code PRD001-010）/
--   pur_supplier 1-6 / sys_user admin id=1
-- 回滚：database/migrations/rollback/20260924_regen_sample_order_ink_data_rollback.sql
-- =====================================================================

-- ---------- 1. 备份 ----------
CREATE TABLE IF NOT EXISTS sal_sample_order_bak_20260924_sao AS
  SELECT * FROM sal_sample_order;
CREATE TABLE IF NOT EXISTS sal_sample_inventory_bak_20260924_sao AS
  SELECT * FROM sal_sample_inventory;
CREATE TABLE IF NOT EXISTS prd_ink_bak_20260924_ink AS
  SELECT * FROM prd_ink;

-- ---------- 2. 清除 E2E 垃圾（sal_sample_inventory 21 行 + sal_sample_order 45 行）----------
-- 前置安全：eng_sample_to_mass 仅引用 77-96；prod_work_order 引用的 5 行工单全部 deleted=1
DELETE FROM sal_sample_inventory WHERE sample_order_id BETWEEN 97 AND 141;
DELETE FROM sal_sample_order WHERE id BETWEEN 97 AND 141;

-- ---------- 3. 修补存量 20 行（id 77-96，sample_to_mass 上游，不得删除）----------
UPDATE sal_sample_order s
JOIN mdm_product mp ON mp.product_code = s.material_no COLLATE utf8mb4_0900_ai_ci
SET s.notify_date          = s.order_date,                                        -- 通知日期（原全 NULL）
    s.size_spec            = mp.specification,                                    -- 尺寸规格 ← 产品主数据
    s.specification        = mp.specification,                                    -- 规格型号 ← 产品主数据
    s.material_spec        = CONCAT('PET ', 0.1 + (s.id % 3) * 0.025, 'mm 白膜'), -- 材料规格（演示值）
    s.customer_require_date = DATE_ADD(s.order_date, INTERVAL 7 DAY),             -- 客户需求日期
    s.delivery_date        = DATE_ADD(s.order_date, INTERVAL 10 DAY),
    s.delivery_status      = 'signed',                                            -- 修复非法脏值 'completed' → 'signed'
    s.actual_delivery_date = DATE_ADD(s.order_date, INTERVAL 10 DAY),             -- 与 delivery_status 自洽
    s.create_by            = 1                                                    -- admin
WHERE s.id BETWEEN 77 AND 96;

-- ---------- 4. 重建 20 行与客户/产品主数据关联的演示数据 ----------
-- 10 产品 × 2 版本（A/B）；状态覆盖 7 个生命周期值；delivery_status 与 status 严格自洽：
--   draft/pending/in_progress/cancelled → pending；completed/confirmed → delivered；converted → signed
INSERT INTO sal_sample_order
  (order_no, notify_date, customer_id, customer_name, product_name, material_no,
   version, size_spec, material_spec, specification, quantity, order_date,
   customer_require_date, delivery_date, actual_delivery_date, delivery_status,
   status, remark, create_by, sample_fee)
SELECT
  CONCAT('SMP-2026-09-21-', LPAD(ROW_NUMBER() OVER (ORDER BY v.version, mp.id), 2, '0')),
  DATE '2026-09-21',
  cc.id, cc.customer_name,
  mp.product_name, mp.product_code,
  v.version,
  mp.specification,
  CONCAT('PET ', 0.1 + (mp.id % 3) * 0.025, 'mm 白膜'),
  mp.specification,
  50 + (mp.id - 44) * 15 + IF(v.version = 'B', 7, 0),
  DATE '2026-09-21',
  DATE_ADD(DATE '2026-09-21', INTERVAL 7 DAY),
  DATE_ADD(DATE '2026-09-21', INTERVAL 10 DAY),
  CASE WHEN st.status IN ('completed','confirmed','converted')
       THEN DATE_ADD(DATE '2026-09-21', INTERVAL 9 DAY) END,
  CASE WHEN st.status IN ('completed','confirmed') THEN 'delivered'
       WHEN st.status = 'converted' THEN 'signed'
       ELSE 'pending' END,
  st.status,
  '演示数据：与客户/产品主数据真实关联',
  1,
  300 + (mp.id - 44) * 50
FROM mdm_product mp
JOIN crm_customer cc ON cc.id = 61 + ((mp.id - 44) % 10)
CROSS JOIN (SELECT 'A' AS version UNION ALL SELECT 'B') v
JOIN (SELECT ELT(seq, 'draft','pending','in_progress','completed','confirmed','converted','cancelled') AS status, seq
      FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7) t) st
  ON st.seq = ((mp.id - 44 + IF(v.version = 'B', 3, 0)) % 7) + 1
WHERE mp.id BETWEEN 44 AND 53;

-- ---------- 5. 样品库存联动重生成（新演示单中已完成/已确认/已转大货的行）----------
INSERT INTO sal_sample_inventory
  (sample_order_id, product_name, material_no, quantity, unit, warehouse_id, status, remark)
SELECT s.id, s.product_name, s.material_no, s.quantity, 'pcs', NULL, 'available',
       '演示数据：随打样单自动入库'
FROM sal_sample_order s
WHERE s.order_no LIKE 'SMP-2026-09-21-%'
  AND s.status IN ('completed', 'confirmed', 'converted')
  AND s.deleted = 0;

-- ---------- 6. prd_ink 修补（不删行：dcprint_ink_formula_item 31 处引用 id 1-3）----------
UPDATE prd_ink SET ink_type = 1, color_code = '#000000', specification = '1KG/桶', shelf_life = 24 WHERE id = 1;
UPDATE prd_ink SET ink_type = 1, color_code = '#00AEEF', specification = '1KG/桶', shelf_life = 24 WHERE id = 2;
UPDATE prd_ink SET ink_type = 3, color_code = '#E60012', specification = '1KG/桶', shelf_life = 18 WHERE id = 3;

-- ---------- 7. prd_ink 新增 4 行演示数据（type 覆盖水性/溶剂/UV/特种；含 1 行低于安全库存触发 ⚠）----------
INSERT INTO prd_ink
  (ink_code, ink_name, ink_type, color_name, color_code, brand, supplier_id, unit,
   specification, safety_stock, shelf_life, stock_qty, status, remark)
VALUES
  ('INK-YEL-001', '油墨黄色', 1, '黄色', '#F7C600', '东洋', 2, 'kg', '1KG/桶', 15.00, 24, 50.00, 1, '演示数据'),
  ('INK-WHT-001', '油墨白色', 2, '白色', '#FFFFFF', '深圳特种油墨', 5, 'kg', '5KG/桶', 20.00, 12, 8.00, 1, '演示数据：低于安全库存'),
  ('INK-GRN-001', '油墨绿色', 3, '绿色', '#00A651', '深圳特种油墨', 5, 'kg', '1KG/桶', 10.00, 18, 35.00, 1, '演示数据'),
  ('INK-GLD-001', '油墨金色', 5, '金色', '#D4AF37', '东洋', 2, 'kg', '1KG/桶', 5.00, 12, 12.00, 1, '演示数据');
