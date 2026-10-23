-- ============================================================
-- 20260930 进料检验演示数据真实性修复（qc_incoming_inspection）
-- 问题（2026-09-30 用户报告 quality/incoming 列表）：
--   ① 检验员「品管员甲」在 sys_employee 无此人（11 名员工中不存在）；
--   ② 明细每单仅 1 条「外观/无破损/合格」，与表单默认 5 项不符；
--   ③ qrcode_record.ref_no 指向不存在的入库单号 IB-2026-09-14-RAW-xx
--      （批次→入库单反查断裂，resolveInboundOrder 永远 miss）；
--   ④ 入库单 767-786 inspection_status=3（待检）与 pass 检验单未联动；
--   ⑤ 20 单全部同日(2026-09-14)、全部 pass，观感失真。
-- 方案：原地修正关联与内容（不重建 id，批次/入库单的 inspection_id 关联保持）。
-- 检验员取品质部在职真实员工：吴十(EMP008 高级品管) / 赵六(EMP004 审核员)。
-- 李四(EMP002 品管员) status=3 非在职，不采用（下拉选不到的名单会出现不一致）。
-- ============================================================

-- 0) 安全前置：仅作用于现存 20 条演示数据（id 35-54）
--    若 id 段不符（已被重建），语句按 WHERE 自然 0 行命中，幂等安全。

-- 1) 检验员改为真实员工（按 id 奇偶轮换，品质部在职）
UPDATE qc_incoming_inspection SET inspector_name = '吴十'
WHERE deleted = 0 AND id BETWEEN 35 AND 54 AND MOD(id, 2) = 1;
UPDATE qc_incoming_inspection SET inspector_name = '赵六'
WHERE deleted = 0 AND id BETWEEN 35 AND 54 AND MOD(id, 2) = 0;

-- 2) 两单改不合格（id 41→RAW-07 / id 47→RAW-13），合格数量重算
UPDATE qc_incoming_inspection
SET inspection_result = 'fail', qualified_qty = 0, unqualified_qty = quantity
WHERE deleted = 0 AND id IN (41, 47);

-- 3) 旧明细软删（每单原仅 1 条「外观」）
UPDATE qc_incoming_inspection_item SET deleted = 1
WHERE deleted = 0 AND inspection_id BETWEEN 35 AND 54;

-- 4) 明细重建：每单 5 项（与页面表单默认一致，文案取 zh-CN 既有 key 值）
INSERT INTO qc_incoming_inspection_item (inspection_id, inspection_no, item_name, standard, actual_value, result, remark)
SELECT i.id, i.inspection_no, '外观检查', '外观标准', '无破损、无污渍', 'pass', NULL
FROM qc_incoming_inspection i WHERE i.deleted = 0 AND i.id BETWEEN 35 AND 54;

INSERT INTO qc_incoming_inspection_item (inspection_id, inspection_no, item_name, standard, actual_value, result, remark)
SELECT i.id, i.inspection_no, '尺寸检查', '尺寸标准', '符合规格偏差范围', 'pass', NULL
FROM qc_incoming_inspection i WHERE i.deleted = 0 AND i.id BETWEEN 35 AND 54;

INSERT INTO qc_incoming_inspection_item (inspection_id, inspection_no, item_name, standard, actual_value, result, remark)
SELECT i.id, i.inspection_no, '物料检查', '物料标准', '与订单样品一致', 'pass', NULL
FROM qc_incoming_inspection i WHERE i.deleted = 0 AND i.id BETWEEN 35 AND 54;

-- 效能测试：合格单 → 达标/pass；不合格单(41/47) → 不达标/fail
INSERT INTO qc_incoming_inspection_item (inspection_id, inspection_no, item_name, standard, actual_value, result, remark)
SELECT i.id, i.inspection_no, '效能测试', '效能标准', '达标', 'pass', NULL
FROM qc_incoming_inspection i WHERE i.deleted = 0 AND i.id BETWEEN 35 AND 54 AND i.id NOT IN (41, 47);

INSERT INTO qc_incoming_inspection_item (inspection_id, inspection_no, item_name, standard, actual_value, result, remark)
SELECT i.id, i.inspection_no, '效能测试', '效能标准', '不达标', 'fail', '退回供应商处理'
FROM qc_incoming_inspection i WHERE i.deleted = 0 AND i.id IN (41, 47);

INSERT INTO qc_incoming_inspection_item (inspection_id, inspection_no, item_name, standard, actual_value, result, remark)
SELECT i.id, i.inspection_no, '套件装检查', '套件装标准', '包装完好', 'pass', NULL
FROM qc_incoming_inspection i WHERE i.deleted = 0 AND i.id BETWEEN 35 AND 54;

-- 5) 批次联动：不合格单对应批次冻结（pass 单保持 normal/1 不动）
UPDATE inv_inventory_batch
SET alert_level = 'frozen', status = 0
WHERE deleted = 0 AND batch_no IN ('B2026-09-14-RAW-07', 'B2026-09-14-RAW-13');

-- 6) 入库单 inspection_status 联动：pass→1、fail→2（原全部 3 未联动）
UPDATE inv_inbound_order o
INNER JOIN qc_incoming_inspection i ON i.inbound_order_id = o.id AND i.deleted = 0
SET o.inspection_status = CASE i.inspection_result WHEN 'pass' THEN 1 WHEN 'fail' THEN 2 ELSE o.inspection_status END
WHERE o.deleted = 0 AND o.id BETWEEN 767 AND 786;

-- 7) 修复批次→入库单链路：qrcode_record.ref_no 由编造的 IB-2026-09-14-RAW-xx
--    改指现存入库单号（与检验单 inbound_no 一致），resolveInboundOrder 反查恢复可达
UPDATE qrcode_record q
INNER JOIN qc_incoming_inspection i ON i.batch_no = q.batch_no AND i.deleted = 0
SET q.ref_no = i.inbound_no
WHERE q.qr_type = 'material' AND q.deleted = 0
  AND q.batch_no LIKE 'B2026-09-14-RAW%' AND i.inbound_no IS NOT NULL;

-- 8) 日期分散（09-01 起每日一单），消除「20 单同日」失真；单号日期段同步跟随
--    两步腾挪避免中间态撞号
UPDATE qc_incoming_inspection
SET inspection_no = CONCAT(inspection_no, '_TMP')
WHERE deleted = 0 AND id BETWEEN 35 AND 54;

UPDATE qc_incoming_inspection
SET inspection_no = CONCAT('QCIN-2026-09-', LPAD(id - 34, 2, '0'), '-01'),
    inspection_date = DATE(CONCAT('2026-09-', LPAD(id - 34, 2, '0')))
WHERE deleted = 0 AND id BETWEEN 35 AND 54;

UPDATE qc_incoming_inspection_item it
INNER JOIN qc_incoming_inspection i ON i.id = it.inspection_id
SET it.inspection_no = i.inspection_no
WHERE i.deleted = 0 AND i.id BETWEEN 35 AND 54;
