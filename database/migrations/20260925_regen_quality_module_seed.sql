-- ============================================================
-- 迁移：质量模块 4 页面（lab-test / complaint / final / process）种子数据重生成
-- 日期：2026-09-25
-- 用户决议：表头列保留，对齐数据；允许删除现有数据，重生成有跨表关联的真实数据。
--
-- 运行时核验结论（根因）：
--   1) final/process 列表 0 关联：prd_process_card.product_code 存 '1'-'20'，
--      而 prd_standard_card 真实 id 为 44-63 → CAST JOIN 0 命中，
--      客户/规格/包装方式/品质专员列全空。
--   2) prd_standard_card 44-63 的 tolerance/packing_type/quality_manager/
--      process_flow1/2 全 NULL（JOIN 命中后这些列仍为空）。
--   3) qms_lab_test 6 行（LAB-2026-001~003 双份重复），product/batch/tester/
--      conclusion 全 NULL（旧种子只写老轨 material_*）。
--   4) qms_complaint 旧数据 product_id 悬空语义（product_* 曾从 material_* 回填）。
--   5) qc_inspection 无 source_type='process_card' 记录 → process 页检验记录弹窗必空。
--
-- 关联设计（表与表关联）：
--   prd_process_card.product_code = prd_standard_card.id（44-63）
--   prd_standard_card.customer_id = crm_customer.id（61-70，真实存在）
--   qms_lab_test.product_id       = mdm_product.id（44-53，真实存在）
--   qms_complaint.customer_id     = crm_customer.id（61-68）
--   qms_complaint.product_id      = mdm_product.id（44-51）
--   qms_complaint.order_no        = sal_order.order_no（真实单号）
--   qc_inspection.source_no       = prd_process_card.card_no（type=process_card）
--   检验员 tester/inspector/quality_manager = sys_employee 品质部真实姓名（李四/赵六）
--
-- 幂等性：数据重生成迁移——每段先 DELETE 限定范围再 INSERT，重复执行结果一致；
--         process_card 桥接 UPDATE 带「未命中」守卫；std_card 补列带 NULL 守卫。
-- 回滚：备份表 *_bak_20260925（见各段）。
-- ============================================================

-- ---------- 备份 ----------
CREATE TABLE IF NOT EXISTS prd_process_card_bak_20260925 AS SELECT * FROM prd_process_card;
CREATE TABLE IF NOT EXISTS prd_standard_card_bak_20260925 AS SELECT * FROM prd_standard_card;
CREATE TABLE IF NOT EXISTS qms_lab_test_bak_20260925 AS SELECT * FROM qms_lab_test;
CREATE TABLE IF NOT EXISTS qms_complaint_bak2_20260925 AS SELECT * FROM qms_complaint;

-- ============================================================
-- A. final/process 列表数据源：流程卡桥接标准卡 + 卡面产品名对齐
-- ============================================================
UPDATE prd_process_card
SET product_code = CAST(id + 43 AS CHAR)
WHERE deleted = 0
  AND CAST(product_code AS UNSIGNED) BETWEEN 1 AND 20
  AND CAST(product_code AS UNSIGNED) NOT IN (SELECT id FROM prd_standard_card);

UPDATE prd_process_card pc
JOIN prd_standard_card sc ON CAST(pc.product_code AS UNSIGNED) = sc.id
SET pc.product_name = sc.product_name
WHERE pc.deleted = 0;

-- 标准卡补齐列表展示字段（只填 NULL，不覆盖已有值）
UPDATE prd_standard_card
SET tolerance = '±0.2mm',
    packing_type = ELT((id - 43) % 3 + 1, '盒装', '卷装', '片装'),
    quality_manager = IF((id - 43) % 2 = 0, '李四', '赵六'),
    process_flow1 = '印刷',
    process_flow2 = ELT((id - 43) % 3 + 1, '模切', '分切', '冲型')
WHERE deleted = 0 AND id BETWEEN 44 AND 63
  AND packing_type IS NULL AND quality_manager IS NULL;

-- ============================================================
-- B. qms_lab_test 重生成（关联 mdm_product 44-53，品质部员工）
--    值域：test_type ∈ 页面 testTypeMap；conclusion ∈ pass/fail/conditional/pending；
--         status ∈ 1 待检测 / 2 检测中 / 3 已完成（与 conclusion 逻辑自洽）
-- ============================================================
DELETE FROM qms_lab_test WHERE test_no LIKE 'LAB-2026-%';

INSERT INTO qms_lab_test
  (test_no, product_id, product_code, product_name, batch_no, test_type,
   test_items, test_standard, test_equipment, tester, test_date,
   conclusion, status, remark, create_time, update_time)
VALUES
  ('LT202609050001', 44, 'PRD001', '空调控制面板标签', 'B20260901-01', 'color',
   '色差 ΔE、光泽度', 'GB/T 3979', '分光测色仪 SP-620', '李四', '2026-09-05',
   'pass', 3, NULL, NOW(), NOW()),
  ('LT202609080002', 45, 'PRD002', '洗衣机铭牌', 'B20260904-02', 'adhesion',
   '剥离强度（90°）', 'GB/T 2792', '剥离试验机 BL-100', '赵六', '2026-09-08',
   'pass', 3, NULL, NOW(), NOW()),
  ('LT202609100003', 46, 'PRD003', '手机电池标签', 'B20260906-03', 'wear',
   '耐摩擦次数（乙醇/RCA）', 'GB/T 7706', 'RCA 耐磨试验机', '李四', '2026-09-10',
   'fail', 3, '判定不合格，退印刷课返工', NOW(), NOW()),
  ('LT202609120004', 47, 'PRD004', '新能源汽车电池包标签', 'B20260908-04', 'tensile',
   '抗拉强度、断裂伸长率', 'GB/T 1040', '拉力试验机 XL-500', '赵六', '2026-09-12',
   'pass', 3, NULL, NOW(), NOW()),
  ('LT202609150005', 48, 'PRD005', '医疗设备面板标签', 'B20260911-05', 'thickness',
   '总厚度、胶层厚度', 'GB/T 6672', '测厚仪 CH-10', '李四', '2026-09-15',
   'pending', 2, '检测中', NOW(), NOW()),
  ('LT202609170006', 49, 'PRD006', '无人机外壳标识', 'B20260913-06', 'physical',
   '耐候性（UV 500h）', 'GB/T 16422', 'UV 老化试验箱', '赵六', '2026-09-17',
   'conditional', 3, '客户已确认接受', NOW(), NOW()),
  ('LT202609190007', 50, 'PRD007', '锂电池电芯标签', 'B20260915-07', 'adhesion',
   '剥离强度（90°）', 'GB/T 2792', '剥离试验机 BL-100', '李四', '2026-09-19',
   'pass', 3, NULL, NOW(), NOW()),
  ('LT202609220008', 51, 'PRD008', '工业自动化PLC标签', 'B20260918-08', 'color',
   '色差 ΔE、套印精度', 'GB/T 3979', '分光测色仪 SP-620', '赵六', '2026-09-22',
   'pending', 1, '待检测', NOW(), NOW()),
  ('LT202609230009', 52, 'PRD009', '服务器机箱标签', 'B20260919-09', 'wear',
   '耐摩擦次数（乙醇）', 'GB/T 7706', 'RCA 耐磨试验机', '李四', '2026-09-23',
   'pass', 3, NULL, NOW(), NOW()),
  ('LT202609240010', 53, 'PRD010', '充电桩标识牌', 'B20260920-10', 'tensile',
   '抗拉强度、耐温变性', 'GB/T 1040', '拉力试验机 XL-500', '赵六', '2026-09-24',
   'fail', 3, '材料耐温不达标，换材重测', NOW(), NOW());

-- ============================================================
-- C. qms_complaint 重生成（关联 crm_customer 61-68 / mdm_product 44-51 /
--    sal_order 真实单号；status ∈ 1~5 页面 statusMap）
-- ============================================================
DELETE FROM qms_complaint;

INSERT INTO qms_complaint
  (complaint_no, complaint_source, customer_id, customer_name,
   product_id, product_code, product_name, order_no,
   defect_date, defect_qty, defect_desc, complaint_type, severity,
   reporter, report_date, status, remark, create_time)
VALUES
  ('CP202609050001', 'customer', 61, '美的集团', 44, 'PRD001', '空调控制面板标签', 'SO202609080020',
   '2026-09-03', 120, '印刷颜色偏差，与标准色板不符', 'quality', 3,
   '钱七', '2026-09-05', 3, 'D3 临时返工已完成', NOW()),
  ('CP202609080002', 'customer', 62, '格力电器', 45, 'PRD002', '洗衣机铭牌', 'SO202609070019',
   '2026-09-06', 60, '交货延迟 3 天', 'delivery', 2,
   '钱七', '2026-09-08', 4, '已协调物流加急', NOW()),
  ('CP202609110003', 'internal', 63, '华为技术', 46, 'PRD003', '手机电池标签', NULL,
   '2026-09-10', 200, '耐摩擦不达标（实验室 LT202609100003）', 'quality', 3,
   '李四', '2026-09-11', 2, '8D 处理中', NOW()),
  ('CP202609130004', 'customer', 64, '比亚迪汽车', 47, 'PRD004', '新能源汽车电池包标签', 'SO202609060018',
   '2026-09-12', 80, '标签边缘翘起', 'quality', 2,
   '钱七', '2026-09-13', 2, NULL, NOW()),
  ('CP202609160005', 'customer', 65, '迈瑞医疗', 48, 'PRD005', '医疗设备面板标签', NULL,
   '2026-09-15', 30, '包装破损，片张划伤', 'delivery', 2,
   '钱七', '2026-09-16', 1, NULL, NOW()),
  ('CP202609180006', 'audit', 66, '大疆创新', 49, 'PRD006', '无人机外壳标识', NULL,
   '2026-09-17', 0, '内审发现批次追溯记录不完整', 'quality', 1,
   '赵六', '2026-09-18', 5, '已闭环，记录补齐', NOW()),
  ('CP202609210007', 'customer', 67, '宁德时代', 50, 'PRD007', '锂电池电芯标签', 'SO202609050017',
   '2026-09-20', 500, '批间色差明显（ΔE>1.5）', 'quality', 3,
   '钱七', '2026-09-21', 2, '已启动 8D，根因分析中', NOW()),
  ('CP202609230008', 'customer', 68, '宁德时代科技', 51, 'PRD008', '工业自动化PLC标签', NULL,
   '2026-09-22', 40, '服务响应不及时', 'service', 1,
   '钱七', '2026-09-23', 1, NULL, NOW());

-- ============================================================
-- D. qc_inspection 补 process_card 检验记录（process 页弹窗数据源）
--    inspection_type=2（与现网一致）；result 1=合格 2=不合格 3=让步接收；
--    inspection_qty = qualified + unqualified（不变量）
-- ============================================================
DELETE FROM qc_inspection WHERE source_type = 'process_card';

INSERT INTO qc_inspection
  (inspection_no, inspection_type, source_type, source_no, batch_no,
   inspection_qty, qualified_qty, unqualified_qty, inspection_result,
   inspector, inspection_date, remark, create_time, update_time, create_by, update_by)
VALUES
  ('QCP202609100001', 2, 'process_card', 'PC20240501001', 'B20260901-01', 5000, 5000, 0, 1, '李四', '2026-09-10', NULL, NOW(), NOW(), 1, 1),
  ('QCP202609110002', 2, 'process_card', 'PC20240502001', 'B20260902-02', 3000, 2880, 120, 2, '赵六', '2026-09-11', '套印偏移 120 张，已隔离返工', NOW(), NOW(), 1, 1),
  ('QCP202609120003', 2, 'process_card', 'PC20240503001', 'B20260903-03', 2000, 2000, 0, 1, '李四', '2026-09-12', NULL, NOW(), NOW(), 1, 1),
  ('QCP202609130004', 2, 'process_card', 'PC20240504001', 'B20260904-04', 8000, 7920, 80, 3, '赵六', '2026-09-13', '色差轻微，客户让步接收', NOW(), NOW(), 1, 1),
  ('QCP202609150005', 2, 'process_card', 'PC20240505001', 'B20260905-05', 10000, 10000, 0, 1, '李四', '2026-09-15', NULL, NOW(), NOW(), 1, 1),
  ('QCP202609170006', 2, 'process_card', 'PC20240506001', 'B20260906-06', 6000, 5850, 150, 2, '赵六', '2026-09-17', '刀线毛边 150 张，换模重检', NOW(), NOW(), 1, 1),
  ('QCP202609190007', 2, 'process_card', 'PC20240507001', 'B20260907-07', 4000, 4000, 0, 1, '李四', '2026-09-19', NULL, NOW(), NOW(), 1, 1),
  ('QCP202609210008', 2, 'process_card', 'PC20240508001', 'B20260908-08', 2500, 2500, 0, 1, '赵六', '2026-09-21', NULL, NOW(), NOW(), 1, 1),
  ('QCP202609230009', 2, 'process_card', 'PC20240509001', 'B20260909-09', 3500, 3460, 40, 2, '李四', '2026-09-23', '模切偏位 40 张', NOW(), NOW(), 1, 1),
  ('QCP202609240010', 2, 'process_card', 'PC20240510001', 'B20260910-10', 4500, 4500, 0, 1, '赵六', '2026-09-24', NULL, NOW(), NOW(), 1, 1);

-- ============================================================
-- 回滚参考（勿在迁移内执行）：
--   UPDATE prd_process_card SET product_code = CAST(id AS CHAR),
--     product_name = (SELECT product_name FROM prd_process_card_bak_20260925 b WHERE b.id = prd_process_card.id)
--     WHERE deleted = 0;
--   UPDATE prd_standard_card SET tolerance = NULL, packing_type = NULL,
--     quality_manager = NULL, process_flow1 = NULL, process_flow2 = NULL
--     WHERE id BETWEEN 44 AND 63;
--   DELETE FROM qms_lab_test WHERE test_no LIKE 'LT2026%';
--   INSERT INTO qms_lab_test SELECT * FROM qms_lab_test_bak_20260925 WHERE test_no LIKE 'LAB-2026-%';
--   DELETE FROM qms_complaint;
--   INSERT INTO qms_complaint SELECT * FROM qms_complaint_bak2_20260925;
--   DELETE FROM qc_inspection WHERE source_type = 'process_card';
-- ============================================================
