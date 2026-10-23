-- ============================================================
-- 20260930 补齐缺失的物料批次二维码（qrcode_record）
-- 背景：B2026-09-14-RAW-01..10 有 qrcode_record（ref_no 已由
--       20260930_fix_incoming_inspection_data.sql 修正为现存入库单号），
--       但 RAW-11..20 共 10 个批次自造数起就缺 QR 记录，
--       导致这 10 个批次的「批次→入库单」反查（resolveInboundOrder）
--       与追溯链路不可达。
-- 方案：按检验单（id 45-54 ⇔ RAW-11..20）派生补插 10 行，NOT EXISTS 幂等。
-- ============================================================

INSERT INTO qrcode_record (
  qr_code, qr_type, ref_no, batch_no,
  material_id, material_code, material_name, specification,
  quantity, unit, warehouse_id, warehouse_name,
  supplier_id, supplier_name,
  production_date, expiry_date,
  status, remark, create_by, deleted
)
SELECT
  CONCAT('QR-2026-09-30-', LPAD(i.id - 44, 2, '0')),
  'material',
  i.inbound_no,
  i.batch_no,
  i.material_id,
  i.material_code,
  i.material_name,
  i.specification,
  i.quantity,
  i.unit,
  1,
  '原材料仓',
  i.supplier_id,
  i.supplier_name,
  i.inspection_date,
  DATE_ADD(i.inspection_date, INTERVAL 90 DAY),
  1,
  '原始物料批次二维码',
  2,
  0
FROM qc_incoming_inspection i
WHERE i.deleted = 0
  AND i.id BETWEEN 45 AND 54
  AND i.inbound_no IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM qrcode_record q
    WHERE q.batch_no = i.batch_no AND q.qr_type = 'material' AND q.deleted = 0
  );
