-- 20260930_cleanup_e2e_inbound_outbound.sql
-- 清理 warehouse/inbound + outbound 的 E2E 测试垃圾 + 孤儿明细 + GRN-PROD 表头对齐（batch=155）
--
-- 背景：E2E 测试直写主库（batch=154 清理采购/工单后，当天又跑 3+ 轮）。
--       物证指纹：IN[_RB]_<13位时间戳>[_idx] 入库单、OUT[_LOW]_<13位时间戳>[_idx] 出库单、
--       「测试供应商」「测试操作员」「测试仓库_<ts>_<rand>」文本、E2E物料_<ts> 明细（material_id=0）、
--       IN20260930000001/02（draft，挂 E2E 幽灵明细）。
--
-- 牵连面已核实（probe_wh7/wh8，2026-09-30）：
--   inv_inventory_transaction 0 行、inv_inventory_batch（inbound_no）0 行、
--   inv_outbound_batch_allocation 0 行、qc_inspection 0 行、qc_incoming_inspection（真 FK）0 行、
--   domain_event_outbox 0 行、inv_inbound_label 0 行 → 仅污染 4 张表，无 FIFO/质检/事件牵连。
--
-- 清理范围（指纹无论 deleted 与否，与 batch=154 同口径）：
-- 1. inv_outbound_item：595 张垃圾出库单（活跃 65 + 软删 530）的明细。
-- 2. inv_outbound_order：同上 595 张本体。
-- 3. inv_inbound_item：276 张垃圾入库单（活跃 26 + 软删 250）的明细。
-- 4. inv_inbound_order：同上 276 张本体。
-- 5. 孤儿明细（父单物理不存在或已软删，但明细 deleted=0）：inbound 41 + outbound 39。
--    仅清活跃明细；「软删主单+软删明细」成对保留（出库主单可恢复场景）。
-- 6. GRN-PROD-20260926-001..010（other 类型，完工入库演示造数）表头 total_quantity
--    与明细汇总不符（如 140 vs 122，18n 递增）→ 表头对齐明细实汇。
--    total_amount/明细单价全 NULL **无源可补，不编造价格**，保留 NULL。
--
-- 不动（延续 batch=154 裁定）：TEST_MAT 测试物料 832 个、TEST_WH 测试仓库软删行、
--       PO_FP_<ts> 软删采购单、软删主单的软删明细对。
-- 注：本迁移含 DELETE（测试垃圾硬删）；FK 仅 inv_inbound_item/inv_outbound_item.order_id
--     与 qc_incoming_inspection.inbound_order_id（0 引用），先明细后主单，无 RESTRICT 风险。

-- 1) 垃圾出库单明细（活跃+软删）
DELETE i FROM inv_outbound_item i
JOIN inv_outbound_order o ON o.id = i.order_id
WHERE o.order_no REGEXP '^OUT(_LOW)?_[0-9]{13}'
   OR o.operator_name = '测试操作员'
   OR o.warehouse_name LIKE '%测试仓库%';

-- 2) 垃圾出库单本体（活跃+软删）
DELETE FROM inv_outbound_order
WHERE order_no REGEXP '^OUT(_LOW)?_[0-9]{13}'
   OR operator_name = '测试操作员'
   OR warehouse_name LIKE '%测试仓库%';

-- 3) 垃圾入库单明细（活跃+软删）
DELETE i FROM inv_inbound_item i
JOIN inv_inbound_order o ON o.id = i.order_id
WHERE o.order_no REGEXP '^IN(_RB)?_[0-9]{13}'
   OR o.supplier_name LIKE '%测试%'
   OR o.order_no IN ('IN20260930000001', 'IN20260930000002');

-- 4) 垃圾入库单本体（活跃+软删）
DELETE FROM inv_inbound_order
WHERE order_no REGEXP '^IN(_RB)?_[0-9]{13}'
   OR supplier_name LIKE '%测试%'
   OR order_no IN ('IN20260930000001', 'IN20260930000002');

-- 5) 孤儿明细：父单物理不存在或已软删，明细自身仍是活跃（deleted=0）
DELETE i FROM inv_inbound_item i
LEFT JOIN inv_inbound_order o ON o.id = i.order_id AND o.deleted = 0
WHERE o.id IS NULL AND i.deleted = 0;

DELETE i FROM inv_outbound_item i
LEFT JOIN inv_outbound_order o ON o.id = i.order_id AND o.deleted = 0
WHERE o.id IS NULL AND i.deleted = 0;

-- 6) GRN-PROD-20260926 表头数量对齐明细实汇（仅活跃 10 张，金额保持 NULL 不编造）
UPDATE inv_inbound_order o
JOIN (
  SELECT order_id, SUM(quantity) AS sq
  FROM inv_inbound_item
  GROUP BY order_id
) s ON s.order_id = o.id
SET o.total_quantity = s.sq,
    o.update_time = NOW()
WHERE o.order_no LIKE 'GRN-PROD-20260926-%'
  AND o.deleted = 0
  AND ABS(o.total_quantity - s.sq) > 0.001;

-- 7) 迁移登记
INSERT INTO sys_migration (migration_name, batch, execution_time)
VALUES ('20260930_cleanup_e2e_inbound_outbound.sql', 155, 0);
