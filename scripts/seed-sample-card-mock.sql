-- Mock data for testing quote generation & work order conversion
-- Usage: mysql -u <user> -p <database> < scripts/seed-sample-card-mock.sql
-- Or:   node scripts/run-sql.mjs scripts/seed-sample-card-mock.sql
--
-- Creates a confirmed sample process card with items + steps for testing
-- generate-quote and convert-work-order API endpoints.

-- Clean up previous mock data (idempotent)
DELETE FROM dcprint_sample_process_step WHERE card_id IN (
  SELECT id FROM dcprint_sample_process_card WHERE sample_no LIKE 'SP-MOCK-%'
);
DELETE FROM dcprint_sample_process_item WHERE card_id IN (
  SELECT id FROM dcprint_sample_process_card WHERE sample_no LIKE 'SP-MOCK-%'
);
DELETE FROM sal_quote WHERE sample_card_id IN (
  SELECT id FROM dcprint_sample_process_card WHERE sample_no LIKE 'SP-MOCK-%'
);
DELETE FROM prod_work_order_item WHERE work_order_id IN (
  SELECT id FROM prod_work_order WHERE order_no LIKE 'SP-MOCK-%'
);
DELETE FROM prod_work_order WHERE order_no LIKE 'SP-MOCK-%';
DELETE FROM dcprint_sample_process_card WHERE sample_no LIKE 'SP-MOCK-%';

-- Reset AUTO_INCREMENT to avoid huge gaps (optional)
ALTER TABLE dcprint_sample_process_card AUTO_INCREMENT = 1;

-- 1. Insert a confirmed sample process card (status=3)
-- Costs: material=120.50, labor=80.00, tool=50.00, total=250.50
INSERT INTO dcprint_sample_process_card
  (sample_no, sample_name, customer_id, customer_name, product_name, version_no, status,
   substrate_material_name, spec, print_color, material_loss_rate, estimated_hour,
   total_material_cost, total_labor_cost, total_tool_cost, total_cost,
   diagram_url, remark, confirm_by, confirm_time, create_by, create_time)
VALUES
  ('SP-MOCK-0001', '测试标签工艺卡-哑银纸四色印刷', 1, '测试客户A', '哑银纸标签 50x30mm', 'V1.0', 3,
   '哑银龙贴纸', '50x30mm 卷装', 'C/M/Y/K + 专色红', 5.00, 2.50,
   120.5000, 80.0000, 50.0000, 250.5000,
   NULL, 'Mock data for testing quote + work order conversion',
   1, NOW(), 1, NOW());

-- Get the card ID
SET @cardId = LAST_INSERT_ID();

-- 2. Insert material items (3 items)
-- Item 1: 主料 - 哑银纸基材
INSERT INTO dcprint_sample_process_item
  (card_id, item_type, material_code, material_name, specification, unit_dosage, unit, unit_cost, line_cost, sort)
VALUES
  (@cardId, 1, 'MAT-PET-001', '哑银龙贴纸', '50x30mm 卷装', 1.0000, 'm²', 80.0000, 80.0000, 1),
  (@cardId, 2, 'INK-CMYK-SET', '四色油墨套装', 'C/M/Y/K 各100ml', 0.2000, 'kg', 150.0000, 30.0000, 2),
  (@cardId, 3, 'AUX-GLUE-001', '水性胶水', '食品级', 0.0500, 'kg', 210.0000, 10.5000, 3);

-- 3. Insert process steps (2 steps)
-- Step 1: 印刷 (2 hours × 30/hr = 60)
-- Step 2: 模切 (0.5 hours × 40/hr = 20)
INSERT INTO dcprint_sample_process_step
  (card_id, process_name, work_hour, hourly_rate, line_cost, process_param, sort)
VALUES
  (@cardId, '四色丝网印刷', 2.00, 30.00, 60.0000, '{"mesh": "300目", "speed": "15m/min", "uv_curing": true}', 1),
  (@cardId, '平压平模切', 0.50, 40.00, 20.0000, '{"pressure": "3吨", "die_type": "刀模"}', 2);

-- Verification queries
SELECT '=== Mock Sample Card ===' AS info;
SELECT id, sample_no, sample_name, customer_name, status,
       total_material_cost, total_labor_cost, total_tool_cost, total_cost,
       quote_id, formal_work_order_id
FROM dcprint_sample_process_card WHERE sample_no = 'SP-MOCK-0001';

SELECT '=== Material Items ===' AS info;
SELECT id, item_type, material_code, material_name, unit_dosage, unit_cost, line_cost
FROM dcprint_sample_process_item WHERE card_id = @cardId ORDER BY sort;

SELECT '=== Process Steps ===' AS info;
SELECT id, process_name, work_hour, hourly_rate, line_cost
FROM dcprint_sample_process_step WHERE card_id = @cardId ORDER BY sort;

-- Expected test results:
-- generateQuote (markupRate=30, quantity=1):
--   totalCost = 250.50
--   quotedPrice = 250.50 * 1.3 * 1 = 325.6500
--
-- convertToFormalWorkOrder (planQty=1000):
--   prod_work_order with quantity=1000
--   3 BOM items:
--     Item 1: qty = 1.0 * 1000 = 1000, total = 1000 * 80 = 80000
--     Item 2: qty = 0.2 * 1000 = 200, total = 200 * 150 = 30000
--     Item 3: qty = 0.05 * 1000 = 50, total = 50 * 210 = 10500
