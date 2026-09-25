-- ============================================
-- 分切记录重生成迁移（Task #171）
-- 日期：2026-09-25
-- 背景：inv_cutting_record 现存 20 条测试数据（CUT-2026-09-14-*），
--       source_label_id 100001-100020 / new_label_id 200001-200020 全部悬挂，
--       cut_width_str 与 operator_id 全空 → 列表物料列空白、统计失真。
-- 方案：清除悬挂测试记录；对 15 张真实 width=1000 母卷标签重生成有完整关联链的
--       分切记录：记录→母标签→子标签(type2)/余料标签(type3, parent_label_id 链)→
--       material_code 命中 inv_material。显式 id：记录 70-84、标签 100-147、明细 70-103。
-- 不变量：仅母卷可切、cut_total_width ≤ original_width、remain=original-cut_total、
--         母标签 is_cut=1/status=4、cutQty=quantity×cutWidth/1000。
-- 幂等：按自有前缀 CUT-2026-09-25-% 与显式 id 段先删后插，可安全重跑。
-- ============================================

-- 0) 备份（IF NOT EXISTS 保证重跑不覆盖首份备份）
CREATE TABLE IF NOT EXISTS inv_cutting_record_bak_20260925b AS SELECT * FROM inv_cutting_record;
CREATE TABLE IF NOT EXISTS inv_cutting_detail_bak_20260925b AS SELECT * FROM inv_cutting_detail;
CREATE TABLE IF NOT EXISTS inv_material_label_bak_20260925b AS SELECT * FROM inv_material_label;

-- 1) 清除历史悬挂测试记录（仅按测试号段精确清除）
DELETE d FROM inv_cutting_detail d
  JOIN inv_cutting_record r ON d.record_id = r.id
 WHERE r.record_no LIKE 'CUT-2026-09-14-%';
DELETE FROM inv_cutting_record WHERE record_no LIKE 'CUT-2026-09-14-%';

-- 2) 幂等守卫：清除本脚本既往产物
DELETE d FROM inv_cutting_detail d
  JOIN inv_cutting_record r ON d.record_id = r.id
 WHERE r.record_no LIKE 'CUT-2026-09-25-%';
DELETE FROM inv_cutting_record WHERE record_no LIKE 'CUT-2026-09-25-%';
DELETE FROM inv_material_label WHERE id BETWEEN 100 AND 147;
UPDATE inv_material_label
   SET is_cut=0, status=1, remaining_width=NULL
 WHERE id IN (1,42,43,44,48,49,50,51,52,53,54,58,59,60,61) AND deleted=0;

-- 3) 子标签(label_type=2)与余料标签(label_type=3)，INSERT..SELECT 从母卷继承主数据
INSERT INTO inv_material_label
  (id,label_no,qr_code,purchase_order_no,supplier_name,receive_date,material_code,material_name,specification,unit,batch_no,quantity,package_qty,width,length_per_roll,remark,color_code,mix_remark,warehouse_id,location_id,is_main_material,is_used,is_cut,parent_label_id,label_type,remaining_width,remaining_length,status,deleted)
SELECT 100, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('80mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*80/1000,4), 0.0000, 80.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=1
UNION ALL
SELECT 101, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('60mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*60/1000,4), 0.0000, 60.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=1
UNION ALL
SELECT 102, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('860mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*860/1000,4), 0.0000, 860.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-01', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=1
UNION ALL
SELECT 103, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('150mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*150/1000,4), 0.0000, 150.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=42
UNION ALL
SELECT 104, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('150mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*150/1000,4), 0.0000, 150.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=42
UNION ALL
SELECT 105, CONCAT(p.label_no,'-C3'), CONCAT('{"ID":"',p.label_no,'-C3','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('150mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*150/1000,4), 0.0000, 150.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=42
UNION ALL
SELECT 106, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('550mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*550/1000,4), 0.0000, 550.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-02', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=42
UNION ALL
SELECT 107, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('200mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*200/1000,4), 0.0000, 200.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=43
UNION ALL
SELECT 108, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('200mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*200/1000,4), 0.0000, 200.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=43
UNION ALL
SELECT 109, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('600mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*600/1000,4), 0.0000, 600.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-03', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=43
UNION ALL
SELECT 110, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('200mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*200/1000,4), 0.0000, 200.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=44
UNION ALL
SELECT 111, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('200mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*200/1000,4), 0.0000, 200.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=44
UNION ALL
SELECT 112, CONCAT(p.label_no,'-C3'), CONCAT('{"ID":"',p.label_no,'-C3','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('200mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*200/1000,4), 0.0000, 200.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=44
UNION ALL
SELECT 113, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('400mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*400/1000,4), 0.0000, 400.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-04', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=44
UNION ALL
SELECT 114, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=48
UNION ALL
SELECT 115, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=48
UNION ALL
SELECT 116, CONCAT(p.label_no,'-C3'), CONCAT('{"ID":"',p.label_no,'-C3','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=48
UNION ALL
SELECT 117, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('100mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*100/1000,4), 0.0000, 100.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-05', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=48
UNION ALL
SELECT 118, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('400mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*400/1000,4), 0.0000, 400.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=49
UNION ALL
SELECT 119, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=49
UNION ALL
SELECT 120, CONCAT(p.label_no,'-C3'), CONCAT('{"ID":"',p.label_no,'-C3','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=49
UNION ALL
SELECT 121, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('250mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*250/1000,4), 0.0000, 250.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=50
UNION ALL
SELECT 122, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('250mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*250/1000,4), 0.0000, 250.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=50
UNION ALL
SELECT 123, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('500mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*500/1000,4), 0.0000, 500.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-07', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=50
UNION ALL
SELECT 124, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=51
UNION ALL
SELECT 125, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('250mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*250/1000,4), 0.0000, 250.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=51
UNION ALL
SELECT 126, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('450mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*450/1000,4), 0.0000, 450.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-08', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=51
UNION ALL
SELECT 127, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('350mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*350/1000,4), 0.0000, 350.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=52
UNION ALL
SELECT 128, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=52
UNION ALL
SELECT 129, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('350mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*350/1000,4), 0.0000, 350.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-09', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=52
UNION ALL
SELECT 130, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('400mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*400/1000,4), 0.0000, 400.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=53
UNION ALL
SELECT 131, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('400mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*400/1000,4), 0.0000, 400.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=53
UNION ALL
SELECT 132, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('200mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*200/1000,4), 0.0000, 200.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-10', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=53
UNION ALL
SELECT 133, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('450mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*450/1000,4), 0.0000, 450.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=54
UNION ALL
SELECT 134, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('400mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*400/1000,4), 0.0000, 400.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=54
UNION ALL
SELECT 135, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('150mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*150/1000,4), 0.0000, 150.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-11', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=54
UNION ALL
SELECT 136, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('250mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*250/1000,4), 0.0000, 250.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=58
UNION ALL
SELECT 137, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('200mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*200/1000,4), 0.0000, 200.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=58
UNION ALL
SELECT 138, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('550mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*550/1000,4), 0.0000, 550.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-12', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=58
UNION ALL
SELECT 139, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=59
UNION ALL
SELECT 140, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=59
UNION ALL
SELECT 141, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('400mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*400/1000,4), 0.0000, 400.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-13', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=59
UNION ALL
SELECT 142, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('350mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*350/1000,4), 0.0000, 350.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=60
UNION ALL
SELECT 143, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('350mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*350/1000,4), 0.0000, 350.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=60
UNION ALL
SELECT 144, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('300mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*300/1000,4), 0.0000, 300.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-14', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=60
UNION ALL
SELECT 145, CONCAT(p.label_no,'-C1'), CONCAT('{"ID":"',p.label_no,'-C1','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('400mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*400/1000,4), 0.0000, 400.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=61
UNION ALL
SELECT 146, CONCAT(p.label_no,'-C2'), CONCAT('{"ID":"',p.label_no,'-C2','","TYPE":"2","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, p.material_name, CONCAT('400mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*400/1000,4), 0.0000, 400.00, p.length_per_roll, CONCAT('由母卷',p.label_no,'分切生成'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 2, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=61
UNION ALL
SELECT 147, CONCAT(p.label_no,'-R'), CONCAT('{"ID":"',p.label_no,'-R','","TYPE":"3","PARENT":"',p.label_no,'"}'), p.purchase_order_no, p.supplier_name, p.receive_date, p.material_code, CONCAT('余料',p.material_name), CONCAT('200mm×',IFNULL(p.length_per_roll,1000),'M'), p.unit, p.batch_no, ROUND(p.quantity*200/1000,4), 0.0000, 200.00, p.length_per_roll, CONCAT('分切', 'CUT-2026-09-25-15', '后剩余余料（母卷 ', p.label_no, '）'), p.color_code, p.mix_remark, p.warehouse_id, p.location_id, 1, 0, 0, p.id, 3, NULL, NULL, 1, 0 FROM inv_material_label p WHERE p.id=61;

-- 4) 分切记录
INSERT INTO inv_cutting_record
  (id,record_no,source_label_id,source_label_no,cut_width_str,original_width,cut_total_width,remain_width,operator_id,operator_name,cut_time,remark,status,create_time)
VALUES
(70, 'CUT-2026-09-25-01', 1, (SELECT label_no FROM inv_material_label WHERE id=1), '80+60', 1000.00, 140.00, 860.00, 6, '陈明', '2026-09-25 08:00:00', '生产排程分切：母卷按 80+60mm 分条，剩余 860mm 生成余料', 1, '2026-09-25 08:00:00'),
(71, 'CUT-2026-09-25-02', 42, (SELECT label_no FROM inv_material_label WHERE id=42), '150+150+150', 1000.00, 450.00, 550.00, 7, '赵磊', '2026-09-25 08:37:00', '生产排程分切：母卷按 150+150+150mm 分条，剩余 550mm 生成余料', 1, '2026-09-25 08:37:00'),
(72, 'CUT-2026-09-25-03', 43, (SELECT label_no FROM inv_material_label WHERE id=43), '200+200', 1000.00, 400.00, 600.00, 6, '陈明', '2026-09-25 09:14:00', '生产排程分切：母卷按 200+200mm 分条，剩余 600mm 生成余料', 1, '2026-09-25 09:14:00'),
(73, 'CUT-2026-09-25-04', 44, (SELECT label_no FROM inv_material_label WHERE id=44), '200+200+200', 1000.00, 600.00, 400.00, 7, '赵磊', '2026-09-25 09:51:00', '生产排程分切：母卷按 200+200+200mm 分条，剩余 400mm 生成余料', 1, '2026-09-25 09:51:00'),
(74, 'CUT-2026-09-25-05', 48, (SELECT label_no FROM inv_material_label WHERE id=48), '300+300+300', 1000.00, 900.00, 100.00, 6, '陈明', '2026-09-25 10:28:00', '生产排程分切：母卷按 300+300+300mm 分条，剩余 100mm 生成余料', 1, '2026-09-25 10:28:00'),
(75, 'CUT-2026-09-25-06', 49, (SELECT label_no FROM inv_material_label WHERE id=49), '400+300+300', 1000.00, 1000.00, 0.00, 7, '赵磊', '2026-09-25 11:05:00', '生产排程分切：母卷按 400+300+300mm 分条，剩余 0mm 生成余料', 1, '2026-09-25 11:05:00'),
(76, 'CUT-2026-09-25-07', 50, (SELECT label_no FROM inv_material_label WHERE id=50), '250+250', 1000.00, 500.00, 500.00, 6, '陈明', '2026-09-25 11:42:00', '生产排程分切：母卷按 250+250mm 分条，剩余 500mm 生成余料', 1, '2026-09-25 11:42:00'),
(77, 'CUT-2026-09-25-08', 51, (SELECT label_no FROM inv_material_label WHERE id=51), '300+250', 1000.00, 550.00, 450.00, 7, '赵磊', '2026-09-25 12:19:00', '生产排程分切：母卷按 300+250mm 分条，剩余 450mm 生成余料', 1, '2026-09-25 12:19:00'),
(78, 'CUT-2026-09-25-09', 52, (SELECT label_no FROM inv_material_label WHERE id=52), '350+300', 1000.00, 650.00, 350.00, 6, '陈明', '2026-09-25 12:56:00', '生产排程分切：母卷按 350+300mm 分条，剩余 350mm 生成余料', 1, '2026-09-25 12:56:00'),
(79, 'CUT-2026-09-25-10', 53, (SELECT label_no FROM inv_material_label WHERE id=53), '400+400', 1000.00, 800.00, 200.00, 7, '赵磊', '2026-09-25 13:33:00', '生产排程分切：母卷按 400+400mm 分条，剩余 200mm 生成余料', 1, '2026-09-25 13:33:00'),
(80, 'CUT-2026-09-25-11', 54, (SELECT label_no FROM inv_material_label WHERE id=54), '450+400', 1000.00, 850.00, 150.00, 6, '陈明', '2026-09-25 14:10:00', '生产排程分切：母卷按 450+400mm 分条，剩余 150mm 生成余料', 1, '2026-09-25 14:10:00'),
(81, 'CUT-2026-09-25-12', 58, (SELECT label_no FROM inv_material_label WHERE id=58), '250+200', 1000.00, 450.00, 550.00, 7, '赵磊', '2026-09-25 14:47:00', '生产排程分切：母卷按 250+200mm 分条，剩余 550mm 生成余料', 1, '2026-09-25 14:47:00'),
(82, 'CUT-2026-09-25-13', 59, (SELECT label_no FROM inv_material_label WHERE id=59), '300+300', 1000.00, 600.00, 400.00, 6, '陈明', '2026-09-25 15:24:00', '生产排程分切：母卷按 300+300mm 分条，剩余 400mm 生成余料', 1, '2026-09-25 15:24:00'),
(83, 'CUT-2026-09-25-14', 60, (SELECT label_no FROM inv_material_label WHERE id=60), '350+350', 1000.00, 700.00, 300.00, 7, '赵磊', '2026-09-25 16:01:00', '生产排程分切：母卷按 350+350mm 分条，剩余 300mm 生成余料', 1, '2026-09-25 16:01:00'),
(84, 'CUT-2026-09-25-15', 61, (SELECT label_no FROM inv_material_label WHERE id=61), '400+400', 1000.00, 800.00, 200.00, 6, '陈明', '2026-09-25 16:38:00', '生产排程分切：母卷按 400+400mm 分条，剩余 200mm 生成余料', 1, '2026-09-25 16:38:00');

-- 5) 分切明细
INSERT INTO inv_cutting_detail
  (id,record_id,new_label_id,new_label_no,cut_width,sequence,create_time)
VALUES
(70, 70, 100, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=1), 80.00, 1, '2026-09-25 08:00:00'),
(71, 70, 101, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=1), 60.00, 2, '2026-09-25 08:00:00'),
(72, 71, 103, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=42), 150.00, 1, '2026-09-25 08:37:00'),
(73, 71, 104, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=42), 150.00, 2, '2026-09-25 08:37:00'),
(74, 71, 105, (SELECT CONCAT(label_no,'-C3') FROM inv_material_label WHERE id=42), 150.00, 3, '2026-09-25 08:37:00'),
(75, 72, 107, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=43), 200.00, 1, '2026-09-25 09:14:00'),
(76, 72, 108, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=43), 200.00, 2, '2026-09-25 09:14:00'),
(77, 73, 110, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=44), 200.00, 1, '2026-09-25 09:51:00'),
(78, 73, 111, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=44), 200.00, 2, '2026-09-25 09:51:00'),
(79, 73, 112, (SELECT CONCAT(label_no,'-C3') FROM inv_material_label WHERE id=44), 200.00, 3, '2026-09-25 09:51:00'),
(80, 74, 114, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=48), 300.00, 1, '2026-09-25 10:28:00'),
(81, 74, 115, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=48), 300.00, 2, '2026-09-25 10:28:00'),
(82, 74, 116, (SELECT CONCAT(label_no,'-C3') FROM inv_material_label WHERE id=48), 300.00, 3, '2026-09-25 10:28:00'),
(83, 75, 118, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=49), 400.00, 1, '2026-09-25 11:05:00'),
(84, 75, 119, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=49), 300.00, 2, '2026-09-25 11:05:00'),
(85, 75, 120, (SELECT CONCAT(label_no,'-C3') FROM inv_material_label WHERE id=49), 300.00, 3, '2026-09-25 11:05:00'),
(86, 76, 121, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=50), 250.00, 1, '2026-09-25 11:42:00'),
(87, 76, 122, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=50), 250.00, 2, '2026-09-25 11:42:00'),
(88, 77, 124, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=51), 300.00, 1, '2026-09-25 12:19:00'),
(89, 77, 125, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=51), 250.00, 2, '2026-09-25 12:19:00'),
(90, 78, 127, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=52), 350.00, 1, '2026-09-25 12:56:00'),
(91, 78, 128, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=52), 300.00, 2, '2026-09-25 12:56:00'),
(92, 79, 130, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=53), 400.00, 1, '2026-09-25 13:33:00'),
(93, 79, 131, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=53), 400.00, 2, '2026-09-25 13:33:00'),
(94, 80, 133, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=54), 450.00, 1, '2026-09-25 14:10:00'),
(95, 80, 134, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=54), 400.00, 2, '2026-09-25 14:10:00'),
(96, 81, 136, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=58), 250.00, 1, '2026-09-25 14:47:00'),
(97, 81, 137, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=58), 200.00, 2, '2026-09-25 14:47:00'),
(98, 82, 139, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=59), 300.00, 1, '2026-09-25 15:24:00'),
(99, 82, 140, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=59), 300.00, 2, '2026-09-25 15:24:00'),
(100, 83, 142, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=60), 350.00, 1, '2026-09-25 16:01:00'),
(101, 83, 143, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=60), 350.00, 2, '2026-09-25 16:01:00'),
(102, 84, 145, (SELECT CONCAT(label_no,'-C1') FROM inv_material_label WHERE id=61), 400.00, 1, '2026-09-25 16:38:00'),
(103, 84, 146, (SELECT CONCAT(label_no,'-C2') FROM inv_material_label WHERE id=61), 400.00, 2, '2026-09-25 16:38:00');

-- 6) 母卷置已分切
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=860.00 WHERE id=1;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=550.00 WHERE id=42;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=600.00 WHERE id=43;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=400.00 WHERE id=44;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=100.00 WHERE id=48;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=0.00 WHERE id=49;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=500.00 WHERE id=50;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=450.00 WHERE id=51;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=350.00 WHERE id=52;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=200.00 WHERE id=53;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=150.00 WHERE id=54;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=550.00 WHERE id=58;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=400.00 WHERE id=59;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=300.00 WHERE id=60;
UPDATE inv_material_label SET is_cut=1, status=4, remaining_width=200.00 WHERE id=61;
