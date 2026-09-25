-- ============================================
-- 跨模块外键补全迁移（Task #173，实底核实修订版）
-- 日期：2026-09-25
-- 说明：本文件为早期推测草稿的重写——原稿引用的 fin_receivable.source_order_id、
--       fin_payable.po_id 均不存在，已按 information_schema 实底修正：
--       · fin_receivable 用 order_id (bigint unsigned，兼容 sal_order.id)，不用 source_id(signed)
--       · fin_payable 无 po_id → 先 ADD COLUMN 再回填再建 FK
--       · qc_incoming_inspection.inbound_order_id (bigint unsigned) 现全 NULL，先回填再建 FK
--       · prod_work_order.sales_order_id 现全 NULL，直接建 FK
--       · inv_inventory_batch→inv_inventory 为联合业务键关联，遵方案不加物理 FK（P2）
-- 幂等：全部经 information_schema 守卫的预处理语句，可安全重跑。
-- ============================================

-- ---------- 0. 备份 ----------
CREATE TABLE IF NOT EXISTS fin_payable_bak_20260925fk AS SELECT * FROM fin_payable;
CREATE TABLE IF NOT EXISTS fin_receivable_bak_20260925fk AS SELECT * FROM fin_receivable;
CREATE TABLE IF NOT EXISTS qc_incoming_inspection_bak_20260925fk AS SELECT * FROM qc_incoming_inspection;
CREATE TABLE IF NOT EXISTS prod_work_order_bak_20260925fk AS SELECT * FROM prod_work_order;

-- ---------- 1. P0: prod_work_order.sales_order_id → sal_order ----------
-- 现状：sales_order_id 全 NULL（wo_so 实底 0 行非空），0 孤儿，可直接建 FK(SET NULL)
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='prod_work_order'
      AND CONSTRAINT_NAME='fk_work_order_sales_order') = 0,
  'ALTER TABLE prod_work_order ADD CONSTRAINT fk_work_order_sales_order FOREIGN KEY (sales_order_id) REFERENCES sal_order(id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_work_order_sales_order already exists''');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------- 2. P0: fin_receivable.order_id → sal_order ----------
-- 2.1 回填 order_id：AR source_no 命中 sal_delivery.delivery_no（20/20），
--     delivery.order_id 指向 sal_order 85-104（软删但物理行存在，FK 可满足）
UPDATE fin_receivable r
  JOIN sal_delivery d ON r.source_no = d.delivery_no
SET r.order_id = d.order_id
WHERE r.order_id IS NULL AND r.deleted = 0;

-- 2.2 兜底：无法回填的置 NULL（防 FK 创建失败）
UPDATE fin_receivable r
  LEFT JOIN sal_order o ON r.order_id = o.id
SET r.order_id = NULL
WHERE r.order_id IS NOT NULL AND o.id IS NULL;

-- 2.3 FK(RESTRICT)：有应收关联的订单不允许物理删除
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='fin_receivable'
      AND CONSTRAINT_NAME='fk_receivable_sales_order') = 0,
  'ALTER TABLE fin_receivable ADD CONSTRAINT fk_receivable_sales_order FOREIGN KEY (order_id) REFERENCES sal_order(id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_receivable_sales_order already exists''');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------- 3. P0: fin_payable → pur_purchase_order ----------
-- 3.1 补列 po_id（实底：现表无 po_id/source_id 列，仅 source_no 字符串）
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='fin_payable'
      AND COLUMN_NAME='po_id') = 0,
  'ALTER TABLE fin_payable ADD COLUMN po_id bigint unsigned NULL COMMENT ''来源采购订单id'' AFTER supplier_id',
  'SELECT ''fin_payable.po_id already exists''');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- 3.2 回填：source_no = po_no（两列同为 utf8mb4_0900_ai_ci，实底确认；20/20 真实 PO 命中，
--     IN_TEST_* 测试残留 54 行已 deleted=1 且 source_no 不命中 → po_id 留 NULL）
UPDATE fin_payable p
  JOIN pur_purchase_order o ON p.source_no = o.po_no
SET p.po_id = o.id
WHERE p.po_id IS NULL;

-- 3.3 兜底清孤儿
UPDATE fin_payable p
  LEFT JOIN pur_purchase_order o ON p.po_id = o.id
SET p.po_id = NULL
WHERE p.po_id IS NOT NULL AND o.id IS NULL;

-- 3.4 FK(RESTRICT)：有应付挂账的采购单不允许物理删除
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='fin_payable'
      AND CONSTRAINT_NAME='fk_payable_purchase_order') = 0,
  'ALTER TABLE fin_payable ADD CONSTRAINT fk_payable_purchase_order FOREIGN KEY (po_id) REFERENCES pur_purchase_order(id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_payable_purchase_order already exists''');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------- 4. P1: qc_incoming_inspection.inbound_order_id → inv_inbound_order ----------
-- 4.1 回填：按 supplier_name→pur_supplier + material_code 命中入库明细（fk-verify6 预演 20/20 1:1），
--     同步补 inbound_no / supplier_id / material_id / 合格数量（pass→全量合格）
UPDATE qc_incoming_inspection q
  JOIN pur_supplier s ON q.supplier_name = s.supplier_name COLLATE utf8mb4_0900_ai_ci
  JOIN inv_inbound_order io ON io.supplier_id = s.id AND io.deleted = 0
  JOIN inv_inbound_item it ON it.order_id = io.id AND it.material_code = q.material_code COLLATE utf8mb4_0900_ai_ci
SET q.inbound_order_id = io.id,
    q.inbound_no = io.order_no,
    q.supplier_id = s.id,
    q.material_id = it.material_id,
    q.qualified_qty = IF(q.inspection_result = 'pass', q.quantity, 0),
    q.unqualified_qty = IF(q.inspection_result = 'pass', 0, q.quantity)
WHERE q.inbound_order_id IS NULL;

-- 4.2 兜底清孤儿
UPDATE qc_incoming_inspection q
  LEFT JOIN inv_inbound_order io ON q.inbound_order_id = io.id
SET q.inbound_order_id = NULL
WHERE q.inbound_order_id IS NOT NULL AND io.id IS NULL;

-- 4.3 FK(SET NULL)：入库单删除时质检记录保留、来源置空
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA='vnerpdacahng' AND TABLE_NAME='qc_incoming_inspection'
      AND CONSTRAINT_NAME='fk_qc_inbound_order') = 0,
  'ALTER TABLE qc_incoming_inspection ADD CONSTRAINT fk_qc_inbound_order FOREIGN KEY (inbound_order_id) REFERENCES inv_inbound_order(id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_qc_inbound_order already exists''');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------- 5. 验证（runner 读取结果） ----------
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA='vnerpdacahng'
  AND CONSTRAINT_NAME IN ('fk_work_order_sales_order','fk_receivable_sales_order',
                          'fk_payable_purchase_order','fk_qc_inbound_order');

-- 备注：
-- 1. fin_receivable.source_id 为 signed bigint，与 sal_order.id (unsigned) 不兼容，
--    本迁移不改符号、不建 FK，统一改用 order_id 挂接销售订单。
-- 2. inv_inventory_batch → inv_inventory 为 (material+warehouse) 联合业务键，P2 治理项，不加物理 FK。
-- 3. qc_incoming_inspection 行 id 为 int，仅影响本表主键，不影响 FK 列类型（inbound_order_id 为 bigint unsigned）。
