-- ============================================================================
-- 20260925_regen_qrcode_records.sql
-- Task #174 /qrcode 三层一致性治理 —— 二维码数据重生成（真实跨表关联）
-- qrcode_record 41 列（DDL 顺序）：
--   1 id(auto) 2 qr_code 3 qr_type 4 ref_id 5 ref_no 6 parent_qr_code
--   7 split_flag 8 split_index 9 batch_no 10 material_id 11 material_code
--   12 material_name 13 specification 14 quantity 15 unit
--   16 warehouse_id 17 warehouse_name 18 location
--   19 supplier_id 20 supplier_name
--   21 customer_id 22 customer_name
--   23 work_order_id 24 work_order_no 25 production_date 26 expiry_date
--   27 extra_data 28 status 29 remark 30 create_time 31 update_time 32 create_by
--   33 deleted 34 print_count 35 last_print_time 36 scan_count 37 last_scan_time
--   38 qr_image_url 39 trace_url 40 shipped_at 41 shipment_id
-- ============================================================================
CREATE TABLE IF NOT EXISTS qrcode_record_bak_20260925 AS SELECT * FROM qrcode_record;

DELETE FROM qrcode_record WHERE qr_code LIKE 'QR-2026-09-25-%';
DELETE FROM qrcode_record;

INSERT INTO qrcode_record (
  qr_code, qr_type, ref_id, ref_no, parent_qr_code,
  split_flag, split_index, batch_no,
  material_id, material_code, material_name, specification,
  quantity, unit,
  warehouse_id, warehouse_name, location,
  supplier_id, supplier_name,
  customer_id, customer_name,
  work_order_id, work_order_no,
  production_date, expiry_date,
  extra_data, status, remark,
  create_time, update_time, create_by,
  deleted, print_count, last_print_time, scan_count, last_scan_time,
  qr_image_url, trace_url, shipped_at, shipment_id
) VALUES
-- material × 10 (batch_no ↔ inv_inventory_batch, material_id ↔ inv_material)
('QR-2026-09-25-01','material',NULL,'IB-2026-09-14-RAW-01',NULL,0,0,'B2026-09-14-RAW-01',1,'MAT001','PET薄膜透明125μm','1000×1200mm',55,'张',1,'原材料仓',NULL,1,'东莞PET薄膜厂',NULL,NULL,NULL,NULL,'2026-09-14','2026-12-31',NULL,1,'原始物料批次二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,1,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-02','material',NULL,'IB-2026-09-14-RAW-02',NULL,0,0,'B2026-09-14-RAW-02',2,'MAT002','PET薄膜白色188μm','1000×1200mm',60,'张',1,'原材料仓',NULL,2,'深圳油墨公司',NULL,NULL,NULL,NULL,'2026-09-14','2026-12-31',NULL,1,'原始物料批次二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,2,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-03','material',NULL,'IB-2026-09-14-RAW-03',NULL,0,0,'B2026-09-14-RAW-03',3,'MAT003','PVC薄膜透明0.15mm','920×1100mm',65,'张',1,'原材料仓',NULL,4,'佛山PVC厂',NULL,NULL,NULL,NULL,'2026-09-14','2026-12-31',NULL,1,'原始物料批次二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,3,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-04','material',NULL,'IB-2026-09-14-RAW-04',NULL,0,0,'B2026-09-14-RAW-04',4,'MAT004','不干胶PET银色','600mm×200m',70,'卷',1,'原材料仓',NULL,3,'广州不干胶厂',NULL,NULL,NULL,NULL,'2026-09-14','2026-12-31',NULL,1,'原始物料批次二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,4,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-05','material',NULL,'IB-2026-09-14-RAW-05',NULL,0,0,'B2026-09-14-RAW-05',5,'MAT005','不干胶PVC白色','600mm×200m',75,'卷',1,'原材料仓',NULL,3,'广州不干胶厂',NULL,NULL,NULL,NULL,'2026-09-14','2026-12-31',NULL,1,'原始物料批次二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,5,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-06','material',NULL,'IB-2026-09-14-RAW-06',NULL,0,0,'B2026-09-14-RAW-06',6,'MAT006','丝印油墨-黑色','溶剂型/SK-1000',80,'kg',1,'原材料仓',NULL,2,'深圳油墨公司',NULL,NULL,NULL,NULL,'2026-09-14','2026-12-31',NULL,1,'原始物料批次二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,6,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-07','material',NULL,'IB-2026-09-14-RAW-07',NULL,0,0,'B2026-09-14-RAW-07',7,'MAT007','丝印油墨-白色','UV型/SK-2000',85,'kg',1,'原材料仓',NULL,5,'深圳特种油墨',NULL,NULL,NULL,NULL,'2026-09-14','2026-12-31',NULL,2,'批次已全部领用','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,7,1,NULL,NULL,NULL,NULL),
('QR-2026-09-25-08','material',NULL,'IB-2026-09-14-RAW-08',NULL,0,0,'B2026-09-14-RAW-08',8,'MAT008','导电银浆','AG-500',90,'kg',1,'原材料仓',NULL,5,'深圳特种油墨',NULL,NULL,NULL,NULL,'2026-09-14','2026-08-31',NULL,3,'保质期已过','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,8,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-09','material',NULL,'IB-2026-09-14-RAW-09',NULL,0,0,'B2026-09-14-RAW-09',1,'MAT001','PET薄膜透明125μm','1000×1200mm',95,'张',1,'原材料仓',NULL,1,'东莞PET薄膜厂',NULL,NULL,NULL,NULL,'2026-09-14','2026-07-31',NULL,3,'保质期已过','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,9,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-10','material',NULL,'IB-2026-09-14-RAW-10',NULL,0,0,'B2026-09-14-RAW-10',2,'MAT002','PET薄膜白色188μm','1000×1200mm',100,'张',1,'原材料仓',NULL,1,'东莞PET薄膜厂',NULL,NULL,NULL,NULL,'2026-09-14','2026-08-15',NULL,9,'人工作废','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,10,0,NULL,NULL,NULL,NULL),
-- product × 5 (product_id ↔ prod_work_order.product_id + mdm_product bridge)
('QR-2026-09-25-11','product',9260,'WO-00030',NULL,0,0,NULL,11,'MAT011','空调控制面板标签','120×80mm',48308,'张',3,'成品仓',NULL,NULL,NULL,61,'美的集团',9260,'WO-00030','2026-09-14','2026-12-31',NULL,1,'成品批次追溯二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,11,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-12','product',9262,'WO-00033',NULL,0,0,NULL,13,'MAT013','手机电池标签','50×30mm',65759,'张',3,'成品仓',NULL,NULL,NULL,61,'美的集团',9262,'WO-00033','2026-09-14','2026-12-31',NULL,1,'成品批次追溯二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,12,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-13','product',9256,'WO-00024',NULL,0,0,NULL,NULL,NULL,'医疗设备面板标签','200×150mm',32303,'张',3,'成品仓',NULL,NULL,NULL,61,'美的集团',9256,'WO-00024','2026-09-14','2026-12-31',NULL,1,'成品批次追溯二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,13,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-14','product',9257,'WO-00026',NULL,0,0,NULL,NULL,NULL,'无人机外壳标识','120×80mm',75227,'张',3,'成品仓',NULL,NULL,NULL,61,'美的集团',9257,'WO-00026','2026-09-14','2026-12-31',NULL,2,'批次已全部发货','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,14,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-15','product',9263,'WO-00034',NULL,0,0,NULL,NULL,NULL,'新能源汽车电池包标签','300×200mm',63327,'张',3,'成品仓',NULL,NULL,NULL,61,'美的集团',9263,'WO-00034','2026-09-14','2026-08-20',NULL,9,'人工作废','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,15,0,NULL,NULL,NULL,NULL),
-- workorder × 4 (product_id=0)
('QR-2026-09-25-16','workorder',9253,'WO-00021',NULL,0,0,NULL,NULL,NULL,'彩色标签打印机',NULL,51267,'张',1,'原材料仓',NULL,NULL,NULL,61,'美的集团',9253,'WO-00021','2026-09-10',NULL,NULL,1,'生产工单二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,16,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-17','workorder',9254,'WO-00022',NULL,0,0,NULL,NULL,NULL,'黑标标签打印机',NULL,93653,'张',1,'原材料仓',NULL,NULL,NULL,61,'美的集团',9254,'WO-00022','2026-09-11',NULL,NULL,1,'生产工单二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,17,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-18','workorder',9255,'WO-00023',NULL,0,0,NULL,NULL,NULL,'碳带',NULL,88040,'张',1,'原材料仓',NULL,NULL,NULL,61,'美的集团',9255,'WO-00023','2026-09-12','2026-06-30',NULL,3,'工单计划已过期','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,18,1,NULL,NULL,NULL,NULL),
('QR-2026-09-25-19','workorder',9258,'WO-00027',NULL,0,0,NULL,NULL,NULL,'标签机配件',NULL,83319,'张',1,'原材料仓',NULL,NULL,NULL,61,'美的集团',9258,'WO-00027','2026-09-12',NULL,NULL,9,'工单取消作废','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,19,0,NULL,NULL,NULL,NULL),
-- shipment × 3 (sal_delivery)
('QR-2026-09-25-20','shipment',35,'DL-2026-09-14-01',NULL,0,0,NULL,NULL,NULL,'成品发货',NULL,48800,'张',3,'成品仓',NULL,NULL,NULL,61,'美的集团',NULL,NULL,'2026-09-14',NULL,NULL,1,'销售发货单二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,20,0,NULL,'2026-09-14 16:00:00',35),
('QR-2026-09-25-21','shipment',36,'DL-2026-09-14-02',NULL,0,0,NULL,NULL,NULL,'成品发货',NULL,29500,'张',3,'成品仓',NULL,NULL,NULL,62,'格力电器',NULL,NULL,'2026-09-14',NULL,NULL,2,'销售发货单二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,21,0,NULL,'2026-09-14 17:00:00',36),
('QR-2026-09-25-22','shipment',37,'DL-2026-09-14-03',NULL,0,0,NULL,NULL,NULL,'成品发货',NULL,150000,'张',3,'成品仓',NULL,NULL,NULL,63,'华为技术',NULL,NULL,'2026-09-14',NULL,NULL,4,'批次已整体失效','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,22,0,NULL,NULL,37),
-- die × 2 (prd_die)
('QR-2026-09-25-23','die',1,'DIE-001',NULL,0,0,NULL,NULL,NULL,'A4标签刀模','210×297mm',1,'个',4,'辅料仓',NULL,NULL,NULL,NULL,NULL,'2026-07-23',NULL,NULL,1,'刀模资产二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,23,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-24','die',2,'DIE-002',NULL,0,0,NULL,NULL,NULL,'洗衣机面板刀模','180×100mm',1,'个',4,'辅料仓',NULL,NULL,NULL,NULL,NULL,'2026-07-23',NULL,NULL,9,'刀模报废作废','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,24,0,NULL,NULL,NULL,NULL),
-- screen_plate × 2 (prd_screen_plate)
('QR-2026-09-25-25','screen_plate',1,'SCR-001',NULL,0,0,NULL,NULL,NULL,'A4标签网版','350目',1,'个',4,'辅料仓',NULL,NULL,NULL,NULL,NULL,'2026-07-23',NULL,NULL,1,'网版资产二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,25,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-26','screen_plate',2,'SCR-002',NULL,0,0,NULL,NULL,NULL,'洗衣机面板网版','300目',1,'个',4,'辅料仓',NULL,NULL,NULL,NULL,NULL,'2026-07-23',NULL,NULL,4,'网版已回收失效','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,26,0,NULL,NULL,NULL,NULL),
-- ink_open × 2 (ink_opening_record)
('QR-2026-09-25-27','ink_open',1,'INK-OPEN-000001','INK-BATCH-000001',0,0,'INK-BATCH-000001',10,'MAT010','网版感光胶','溶剂型/SK-1000',15,'kg',5,'油墨仓',NULL,NULL,'深圳油墨公司',NULL,NULL,NULL,NULL,'2026-07-10','2026-07-12',NULL,3,'开罐后已过期','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,27,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-28','ink_open',2,'INK-OPEN-000002','INK-BATCH-000002',0,0,'INK-BATCH-000002',11,'MAT011','空调控制面板标签','溶剂型/SK-1000',15,'kg',5,'油墨仓',NULL,NULL,'深圳油墨公司',NULL,NULL,NULL,NULL,'2026-07-11','2026-07-13',NULL,1,'开罐油墨二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',2,0,28,0,NULL,NULL,NULL,NULL),
-- ink_mixed × 2 (ink_mixed_record)
('QR-2026-09-25-29','ink_mixed',1,'MIX-20260701-001','INK-BLK-001',0,0,'INK-BLK-001',NULL,NULL,'深黑色','BLK-D',30,'kg',5,'油墨仓',NULL,NULL,'深圳油墨公司',NULL,NULL,NULL,NULL,'2026-07-05','2026-07-15',NULL,1,'调色油墨二维码','2026-09-25 10:00:00','2026-09-25 10:00:00',6,0,29,0,NULL,NULL,NULL,NULL),
('QR-2026-09-25-30','ink_mixed',2,'MIX-20260701-002','INK-CYN-001',0,0,'INK-CYN-001',NULL,NULL,'特青色','CYN-S',25,'kg',5,'油墨仓',NULL,NULL,'深圳油墨公司',NULL,NULL,NULL,NULL,'2026-07-10','2026-07-20',NULL,2,'调色油墨已使用','2026-09-25 10:00:00','2026-09-25 10:00:00',7,0,30,1,NULL,NULL,NULL,NULL);
