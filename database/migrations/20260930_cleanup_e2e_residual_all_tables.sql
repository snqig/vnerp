-- 20260930_cleanup_e2e_residual_all_tables.sql
-- 全库测试垃圾残留清理（batch=156）——覆盖 batch=154/155 漏网的三大指纹盲区
--
-- 漏网根因（2026-09-30 全库普查，349 表扫描）：
--   ① IN_TEST_/IN_E2E_ 前缀（此前正则 ^IN(_RB)?_[0-9]{13} 不匹配）；
--   ② std 双轨表（pur_order_std/std_purchase_order 等，154 只清了 pur_purchase_order）；
--   ③ dcprint_tool / dcprint_ink_formula_item / inv_stocktaking / dcprint_sample_process_* 全新污染面。
--
-- 清理范围（17 表，约 1400 行；先子后父，避开全部真 FK）：
--   fin_payable 88（source_no=IN_TEST_xxx，父入库单已被 155 物理删，幽灵应付，全软删）
--   inv_inventory_transaction 10（IN_TEST_/IN_E2E_/E2E_BUG001/BATCH_SYNC）
--   dcprint_tool_usage 26 + dcprint_tool 35（E2E-TOOL 测试工装）
--   dcprint_ink_formula_item 52（E2E 往 52 个真实配方塞的「E2E测试物料-1」，version 保留）
--   inv_stocktaking_item 235（TEST_MAT 盘点明细）+ 变空的盘点单头
--   pur_order_std 42 + pur_order_line_std 420、std_purchase_order 42 + line 42（双轨 E2E 采购）
--   prd_work_report 8 + prd_schedule 4(+detail) + prod_work_order 4（WO-20260926-0155..158，全软删）
--   sal_order_detail 18 + sal_order SO202609260003（活跃 E2E 销售单，唯一明细为 E2E）
--   inv_production_inbound_item 18 + inv_production_inbound 17（E2E 完工入库，全软删）
--   prd_material_issue_item 59（55 孤儿 + 4 软删父）+ prd_material_issue 4（E2E 工单软删领料单，
--     fk_prd_material_issue_work_order RESTRICT，须先于工单本体删除——首跑 STMT16 阻塞根因）
--   dcprint_sample_process_step/item/card 4+4+4（E2E 测试工艺卡）
--   qc_incoming_inspection 1（IQC20260930001「验证供应商_自动化」，无明细）
--   inv_outbound_item id=444（E2E 物料混入已软删业务单）
--   qrcode_record 235/236（customer_name/extra_data 的 E2E 文本，ref 已重指真实工单→修数据）
--   dcprint_ink_formula_version id=1（version_name「测试V1」→NULL，保留配方本体）
--
-- 保留（已裁定）：TEST_MAT 物料 832、TEST_WH 软删仓库、PO_FP 软删采购单、*_bak_* 备份表、
--   种子演示（biz_order_header/hr_salary_profile/sys_exchange_rate/pur_purchase_return id=1、
--   eqp_equipment 7、inv_material 3 条真实物料、sys_menu 81、临时审核测试仓库 id=238）。
-- 注：fin_payment_record 对这 88 条应付 0 引用（已核实）；先子后父无 RESTRICT 风险。

-- 1) 幽灵应付（IN_TEST_/IN_E2E_ 来源）
DELETE FROM fin_payable WHERE source_no REGEXP '^IN_(TEST|E2E)_';

-- 2) 测试库存交易
DELETE FROM inv_inventory_transaction
WHERE reference_no REGEXP '^IN_(TEST|E2E)_'
   OR batch_no LIKE 'E2E\\_%'
   OR batch_no LIKE 'BATCH_SYNC%';

-- 3) E2E 测试工装（先 usage 后 tool）
DELETE u FROM dcprint_tool_usage u
JOIN dcprint_tool t ON t.id = u.tool_id
WHERE t.tool_code LIKE 'E2E-TOOL%';
DELETE FROM dcprint_tool_usage WHERE process_name LIKE 'E2E%';
DELETE FROM dcprint_tool WHERE tool_code LIKE 'E2E-TOOL%';

-- 4) 墨配方被塞的 E2E 明细（version 本体保留）
DELETE FROM dcprint_ink_formula_item WHERE material_name LIKE 'E2E%';

-- 5) TEST_MAT 盘点明细 → 清掉变空的盘点单头
DELETE si FROM inv_stocktaking_item si
JOIN inv_material m ON m.id = si.material_id
WHERE m.material_code LIKE 'TEST_MAT%';
DELETE s FROM inv_stocktaking s
WHERE NOT EXISTS (SELECT 1 FROM inv_stocktaking_item si WHERE si.taking_id = s.id);

-- 6) std 双轨表 E2E 采购垃圾
DELETE l FROM pur_order_line_std l
JOIN pur_order_std p ON p.id = l.po_id
WHERE p.po_code REGEXP '_1[5-9][0-9]{11}(_|$)' OR p.supplier_name LIKE '%测试%';
DELETE FROM pur_order_std
WHERE po_code REGEXP '_1[5-9][0-9]{11}(_|$)' OR supplier_name LIKE '%测试%';
DELETE l FROM std_purchase_order_line l
JOIN std_purchase_order p ON p.id = l.order_id
WHERE p.order_no REGEXP '_1[5-9][0-9]{11}(_|$)' OR p.supplier_name LIKE '%测试%';
DELETE FROM std_purchase_order
WHERE order_no REGEXP '_1[5-9][0-9]{11}(_|$)' OR supplier_name LIKE '%测试%';

-- 7) E2E 工单链（报工/排程/明细 → 工单本体）
DELETE r FROM prd_work_report r
JOIN prod_work_order w ON w.id = r.work_order_id
WHERE w.product_name LIKE 'E2E测试产品%';
DELETE s FROM prd_schedule s
JOIN prod_work_order w ON w.id = s.work_order_id
WHERE w.product_name LIKE 'E2E测试产品%';
DELETE sd FROM prd_schedule_detail sd
JOIN prod_work_order w ON w.id = sd.work_order_id
WHERE w.product_name LIKE 'E2E测试产品%';
-- 6.5) E2E 工单关联的领料单（fk_prd_material_issue_work_order ON DELETE RESTRICT，
--      首跑 STMT16 即被此阻塞：4 张 E2E 工单各挂 1 行软删领料单；先 item 后父单）
DELETE i FROM prd_material_issue_item i
JOIN prd_material_issue mi ON mi.id = i.issue_id
JOIN prod_work_order w ON w.id = mi.work_order_id
WHERE w.product_name LIKE 'E2E测试产品%';
DELETE mi FROM prd_material_issue mi
JOIN prod_work_order w ON w.id = mi.work_order_id
WHERE w.product_name LIKE 'E2E测试产品%';
DELETE FROM prod_work_order WHERE product_name LIKE 'E2E测试产品%';

-- 8) E2E 销售单链（明细 → 活跃空单 SO202609260003）
DELETE FROM sal_order_detail WHERE material_name LIKE 'E2E测试产品%';
DELETE o FROM sal_order o
WHERE o.order_no = 'SO202609260003'
  AND NOT EXISTS (SELECT 1 FROM sal_order_detail d WHERE d.order_id = o.id);

-- 9) E2E 完工入库（先明细后头）
DELETE i FROM inv_production_inbound_item i
JOIN inv_production_inbound p ON p.id = i.inbound_id
WHERE p.operator_name LIKE 'E2E%' OR p.work_order_no = 'WO-00033';
DELETE FROM inv_production_inbound
WHERE operator_name LIKE 'E2E%' OR work_order_no = 'WO-00033';

-- 10) 领料孤儿/软删父明细（父单活跃的一律不动）
DELETE i FROM prd_material_issue_item i
LEFT JOIN prd_material_issue o ON o.id = i.issue_id AND o.deleted = 0
WHERE o.id IS NULL
  AND (i.material_name LIKE '%测试%' OR i.material_name LIKE 'E2E%' OR i.material_code LIKE 'TEST%');

-- 11) E2E 样品工艺卡（先 step/item 后 card）
DELETE s FROM dcprint_sample_process_step s
JOIN dcprint_sample_process_card c ON c.id = s.card_id
WHERE c.sample_name LIKE 'E2E%';
DELETE i FROM dcprint_sample_process_item i
JOIN dcprint_sample_process_card c ON c.id = i.card_id
WHERE c.sample_name LIKE 'E2E%';
DELETE FROM dcprint_sample_process_card WHERE sample_name LIKE 'E2E%';

-- 12) IQC 自动化验证单（无明细，已核实）
DELETE FROM qc_incoming_inspection WHERE supplier_name LIKE '%验证供应商%';

-- 13) 混入软删业务单的 E2E 出库明细
DELETE FROM inv_outbound_item WHERE id = 444;

-- 14) qrcode 两条 E2E 文本字段修数据（ref_no 已重指真实工单，保留记录本体）
UPDATE qrcode_record SET customer_name = NULL, extra_data = NULL
WHERE id IN (235, 236) AND (customer_name LIKE 'E2E%' OR extra_data LIKE '%E2E%');

-- 15) 配方 V1 展示名清理（本体保留）
UPDATE dcprint_ink_formula_version SET version_name = NULL
WHERE id = 1 AND version_name = '测试V1';

-- 16) 迁移登记
INSERT INTO sys_migration (migration_name, batch, execution_time)
VALUES ('20260930_cleanup_e2e_residual_all_tables.sql', 156, 0);
