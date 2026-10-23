-- batch 162: 双轨打通 —— 存量互链回填（best-effort，按 batch_no 关联）
--
-- 对历史数据建立 qrcode_record.label_id <-> inv_material_label.qr_record_id 的互链。
-- 关联键取 batch_no（两表共有物理标识）；同一 batch_no 下取各自最新一行作为代表，避免 1:N 歧义放大。
-- 仅填 NULL 侧，不覆盖既有手工关联；幂等可重跑。
--
-- 方向 1：qrcode_record.label_id <- inv_material_label（同 batch_no 最新标签）
-- 注意：qrcode_record.batch_no 为 utf8mb4_unicode_ci，inv_material_label.batch_no 为 utf8mb4_0900_ai_ci，
-- 跨表 JOIN 须在比较两侧显式统一 collation（同 qrcode/route.ts 既有写法）。
UPDATE qrcode_record qr
JOIN (
  SELECT l.batch_no, MAX(l.id) AS label_id
  FROM inv_material_label l
  WHERE l.deleted = 0 AND l.batch_no IS NOT NULL AND l.batch_no <> ''
  GROUP BY l.batch_no
) latest ON latest.batch_no COLLATE utf8mb4_0900_ai_ci = qr.batch_no COLLATE utf8mb4_0900_ai_ci
SET qr.label_id = latest.label_id
WHERE qr.deleted = 0 AND qr.batch_no IS NOT NULL AND qr.batch_no <> '' AND qr.label_id IS NULL;

-- 方向 2：inv_material_label.qr_record_id <- qrcode_record（同 batch_no 最新二维码）
UPDATE inv_material_label l
JOIN (
  SELECT qr.batch_no, MAX(qr.id) AS qr_id
  FROM qrcode_record qr
  WHERE qr.deleted = 0 AND qr.batch_no IS NOT NULL AND qr.batch_no <> ''
  GROUP BY qr.batch_no
) latest ON latest.batch_no COLLATE utf8mb4_0900_ai_ci = l.batch_no COLLATE utf8mb4_0900_ai_ci
SET l.qr_record_id = latest.qr_id
WHERE l.deleted = 0 AND l.batch_no IS NOT NULL AND l.batch_no <> '' AND l.qr_record_id IS NULL;
