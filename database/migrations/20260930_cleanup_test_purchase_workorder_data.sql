-- 20260930_cleanup_test_purchase_workorder_data.sql
-- 清理自动化测试残留垃圾数据 + 修复 qrcode 幽灵工单引用（batch=154）
--
-- 背景：E2E 测试脚本直接写库留下垃圾（物证：TEST_MAT_<ts>_<rand> 物料、
--       PO_<13位时间戳>_<idx> 前端时间戳单号、WO[_LOW]_<ts>_<idx> 工单号、「测试供应商」文本）。
--       测试分 5 轮执行（09-27 20:05 一轮 + 09-30 13:46/14:12/14:33/15:29 四轮），每轮造 6 单+6 工单。
--
-- 清理范围（时间戳格式 = 测试垃圾特征，无论 deleted 与否）：
-- 1. pur_purchase_order 36 条 PO_<ts>_ 格式单（30 活跃 + 6 已软删）。
--    其中活跃 30 条 status=2 是**非法状态码**（合法域 10/20/30/40/50/90/99），
--    PurchaseOrderStatus.fromDbCode(2) 抛 DomainError → 采购订单列表接口 400；
--    表头 total_amount/total_quantity=0 与明细 order_qty=100 不一致、create_by NULL、
--    supplier_name「测试供应商」与 supplier_id=1（东莞PET薄膜厂）错位。
-- 2. 上述 36 单的明细 36 条。
-- 3. prod_work_order 55 条时间戳格式测试工单（44 活+11 已软删），与脏单同轮生成；
--    经核查被 prd_process_card / prd_finish_order / prd_work_report /
--    inv_inbound_order / work_order_costs 引用全为 0。
-- 4. qrcode_record 11 条（qr_type=product×5 / workorder×6）ref_no 指向不存在的
--    WO-000xx / WO202609260000xx 旧格式工单 → 按 id 序对位重指真实种子工单
--    （WO-YYYYMMDD-xxxx 格式 36 张），同步修正 work_order_id/work_order_no 冗余列。
--
-- 不动（留待用户裁定）：
--   - PO_FP_<ts> 软删单 49 条（status=40，已软删列表不可见）+ 其明细 49 条；
--   - TEST_MAT 测试物料 832 个（被库存 430 行/库存交易 12 条/采购明细 79 条引用，
--     清理牵连 FIFO 库存链路）。
-- 注：本迁移含 DELETE（测试垃圾硬删）；结构回滚依据 .workbuddy/tmp/ 备份惯例。

-- 1) 时间戳格式测试单的明细（活跃+软删）
DELETE l FROM pur_purchase_order_line l
JOIN pur_purchase_order p ON p.id = l.po_id
WHERE p.po_no REGEXP '^PO_[0-9]{13}_';

-- 2) 时间戳格式测试单本体（活跃+软删）
DELETE FROM pur_purchase_order
WHERE po_no REGEXP '^PO_[0-9]{13}_';

-- 3) 引用测试工单的领料单（55 条，与测试工单一一对应同轮生成；正常领料单 40 条不受影响）
DELETE mi FROM prd_material_issue mi
JOIN prod_work_order w ON w.id = mi.work_order_id
WHERE w.work_order_no REGEXP '^WO(_LOW)?_[0-9]{13}_';

-- 4) 时间戳格式测试工单（活跃+软删）
DELETE FROM prod_work_order
WHERE work_order_no REGEXP '^WO(_LOW)?_[0-9]{13}_';

-- 5) qrcode 幽灵工单引用重指（product×5 + workorder×6 → 种子工单前 11 张）
UPDATE qrcode_record q
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM qrcode_record
  WHERE deleted = 0 AND qr_type IN ('product', 'workorder')
) ranked ON ranked.id = q.id
JOIN (
  SELECT id AS wo_id, work_order_no, ROW_NUMBER() OVER (ORDER BY id) AS rn2
  FROM prod_work_order
  WHERE deleted = 0 AND work_order_no REGEXP '^WO-[0-9]{8}-[0-9]{4}$'
) wo ON wo.rn2 = ranked.rn
SET q.ref_no        = wo.work_order_no,
    q.work_order_id = wo.wo_id,
    q.work_order_no = wo.work_order_no,
    q.update_time   = NOW();
