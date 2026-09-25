-- ============================================================================
-- 《三大改进方向实施方案》· 迁移脚本安全版（基于真实 schema 重写）
-- 生成日期：2026-09-23
-- 改写依据：INFORMATION_SCHEMA 实证（见 docs/qa/ERP全模块分析报告-论断可信度审计-20260923.md）
-- 执行状态：
--   ✅ 第 1 部分（关联列+索引）已通过 database/migrations/20260923084800_cross_module_linkage.ts 隔离执行并登记 sys_migration(batch=85)
--   ⏸ 第 2 部分（CREATE VIEW）仅作评审交付，需人工确认后单独执行（下方已纠正原方案 4 处错误列名）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 第 1 部分：跨模块关联列 + 索引（已执行，记录于此备查）
-- 原方案直接 ALTER 会失败/重复，已按真实库重写：
--   - prod_work_order.sales_order_id          已存在 → 仅补索引 idx_sales_order
--   - prod_material_issue 表不存在；活跃表 prod_work_order_material_req 已含 work_order_id → 跳过
--   - inv_inbound_order.work_order_id         缺失 → 已补列 + 索引（po_id 已存在，跳过）
--   - inv_outbound_order.sales_order_id       缺失（仅有 sales_order_no） → 已补列 + 索引
--   - qc_incoming_inspection.inbound_order_id 缺失 → 已补列 + 索引
--   - inv_inbound_order.po_id                  已存在 + 有索引 → 跳过
-- 备份表：_bak_20260923_inv_inbound_order / _bak_20260923_inv_outbound_order / _bak_20260923_qc_incoming_inspection
-- 回滚：node_modules/.bin/tsx scripts/migrate.ts down --count 1（执行 20260923084800 的 down）
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 第 2 部分：跨模块全链路视图（修正版 · 待评审后执行）
-- 原方案 CREATE VIEW v_sales_order_full 有 4 处引用真实库不存在的列，直接执行会报错：
--   × so.customer_name        -> sal_order 无该列（仅有 customer_id），改为 customer_id
--   × oo.outbound_no          -> inv_outbound_order 列名为 order_no，改为 order_no AS outbound_no
--   × oo.actual_qty           -> 列名为 total_qty，改为 total_qty AS shipped_qty
--   × ar.source_order_id      -> fin_receivable 无该列（实为 order_id），改为 ar.order_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_sales_order_full AS
SELECT
  so.id,
  so.order_no,
  so.customer_id,
  so.status,
  so.total_amount,
  wo.work_order_no,
  wo.status            AS work_order_status,
  wo.completed_qty,
  oo.order_no          AS outbound_no,
  oo.status            AS outbound_status,
  oo.total_qty         AS shipped_qty,
  ar.receivable_no,
  ar.amount            AS receivable_amount,
  ar.received_amount
FROM sal_order so
LEFT JOIN prod_work_order        wo ON so.id = wo.sales_order_id
LEFT JOIN inv_outbound_order     oo ON so.id = oo.sales_order_id
LEFT JOIN fin_receivable         ar ON so.id = ar.order_id;

-- 注：fin_receivable.order_id 当前样本均为 NULL（历史数据未回填），视图仍可创建；
--     入库单→检验单链路（qc_incoming_inspection.inbound_order_id）已补列，但本视图未直接引用，
--     若需「检验→入库→退货」链路可另建 v_inbound_qc_full 视图。
