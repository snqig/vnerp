-- Migration 037: Migrate historical purchase order status=2 to status=10 (draft)
--
-- Background: pur_purchase_order contained 66 rows with legacy status=2 (test seed data
-- from 2026-07-07). The domain value object PurchaseOrderStatus only recognizes codes
-- 10/20/30/40/50/90. The repository now degrades unknown codes to 'draft' defensively,
-- but the data should be corrected at the source.
--
-- status=2 had no domain meaning (likely a legacy "pending" code from an older schema).
-- Mapping to 10 (draft) is the safest choice: draft is editable and can transition to
-- any other status, so no business logic is bypassed.
--
-- This migration is idempotent: running it again affects 0 rows.

-- 1. Show counts before migration (for verification)
SELECT
  status,
  COUNT(*) AS cnt
FROM pur_purchase_order
WHERE deleted = 0
GROUP BY status
ORDER BY status;

-- 2. Migrate legacy status=2 to status=10 (draft)
UPDATE pur_purchase_order
SET status = 10,
    update_time = NOW()
WHERE status = 2 AND deleted = 0;

-- 3. Show counts after migration (for verification)
SELECT
  status,
  COUNT(*) AS cnt
FROM pur_purchase_order
WHERE deleted = 0
GROUP BY status
ORDER BY status;
