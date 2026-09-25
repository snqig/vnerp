-- =============================================================================
-- 20260925_regen_outbound_orders.sql
-- /warehouse/outbound 三层一致性治理：删除 QA 测试数据，重生成跨表关联真实数据
--
-- 背景：inv_outbound_order 502 active 行几乎全是 QA 造数
--   - warehouse 悬挂 491（测试仓库 514/238）、material 悬挂 492、spec 492 全空
--   - status 混旧码 '2'、total_amount 全 0、operator_name=测试操作员
-- 口径：软删全部旧行（可按备份表还原），重生成 20 单跨表关联真实数据
--   - 关联链：warehouse→WH001原材料仓 / batch_no→inv_inventory_batch真实批次
--            sales 单 customer_id+sales_order_id+sales_order_no→sal_order⨝crm_customer
--            production 单 remark→真实工单号；operator→库管员(陈明6/赵磊7)
--   - status 分布：completed 13 / pending 4 / draft 2 / cancelled 1（状态机值域）
--   - completed 单以 batch_no 关联真实批次，但【不做二次库存扣减】
--     （inv_inventory_batch 是当前库存快照，二次扣减会破坏重跑幂等 + 上轮 inventory 数据）
--
-- 幂等：uk_order_no 为普通唯一键(不含 deleted)。软删步骤排除自有前缀
--       'OUT-20260925-'；INSERT 均带 NOT EXISTS 守卫 → 可安全重跑。
-- 回滚：见文末 ROLLBACK 注释（按备份表还原 + 删除本迁移生成行）。
-- =============================================================================

-- 0. 备份（存在才建，避免重跑报错）
CREATE TABLE IF NOT EXISTS inv_outbound_order_bak_20260925 AS
  SELECT * FROM inv_outbound_order WHERE order_no NOT LIKE 'OUT-20260925-%';
CREATE TABLE IF NOT EXISTS inv_outbound_item_bak_20260925 AS
  SELECT * FROM inv_outbound_item
  WHERE order_id NOT IN (SELECT id FROM inv_outbound_order WHERE order_no LIKE 'OUT-20260925-%');

-- 1. 软删旧数据（排除本迁移自有前缀，保证重跑不误删自身；幂等）
UPDATE inv_outbound_order
   SET deleted = 1, update_time = NOW()
 WHERE deleted = 0 AND order_no NOT LIKE 'OUT-20260925-%';
UPDATE inv_outbound_item i
   SET i.deleted = 1
 WHERE (i.deleted = 0 OR i.deleted IS NULL)
   AND i.order_id NOT IN (SELECT id FROM inv_outbound_order WHERE order_no LIKE 'OUT-20260925-%');

-- 2. 插入 20 张出库单主表（关联真实主数据；NOT EXISTS 幂等守卫）
--    status_new 映射(060)：draft=1 pending=2 approved=3 shipped=4 cancelled=5
--    audit_status_new：pending=0 approved=1 rejected=2
INSERT INTO inv_outbound_order
  (order_no, order_date, outbound_type, warehouse_id, warehouse_code, warehouse_name,
   total_qty, total_amount, currency, status, status_new, remark,
   operator_id, operator_name, audit_status, audit_status_new, auditor_name, audit_time,
   customer_id, sales_order_id, customer_name, sales_order_no,
   create_by, create_time, update_time, deleted)
SELECT
  h.order_no, h.order_date, h.outbound_type, 1, 'WH001', '原材料仓',
  0, 0, 'CNY', h.status, h.status_new, h.remark,
  h.op_id, h.op_name, h.audit, h.audit_new,
  CASE WHEN h.status='completed' THEN h.op_name ELSE NULL END,
  CASE WHEN h.status='completed' THEN CONCAT(h.order_date,' 15:30:00') ELSE NULL END,
  so.customer_id, so.id, cu.customer_name, so.order_no,
  h.op_id, CONCAT(h.order_date,' 09:00:00'), CONCAT(h.order_date,' 09:00:00'), 0
FROM (
  SELECT 'OUT-20260925-01' order_no,'2026-09-14' order_date,'sales' outbound_type,'completed' status,4 status_new,'销售出库-美的' remark,6 op_id,'陈明' op_name,'approved' audit,1 audit_new,141 sal_id
  UNION ALL SELECT 'OUT-20260925-02','2026-09-15','sales','completed',4,'销售出库-格力',6,'陈明','approved',1,142
  UNION ALL SELECT 'OUT-20260925-03','2026-09-16','sales','completed',4,'销售出库-华为',7,'赵磊','approved',1,143
  UNION ALL SELECT 'OUT-20260925-04','2026-09-17','sales','completed',4,'销售出库-比亚迪',7,'赵磊','approved',1,144
  UNION ALL SELECT 'OUT-20260925-05','2026-09-18','sales','completed',4,'销售出库-迈瑞',6,'陈明','approved',1,145
  UNION ALL SELECT 'OUT-20260925-06','2026-09-18','production','completed',4,'生产领料 工单WO-00027',6,'陈明','approved',1,NULL
  UNION ALL SELECT 'OUT-20260925-07','2026-09-19','production','completed',4,'生产领料 工单WO-00026',7,'赵磊','approved',1,NULL
  UNION ALL SELECT 'OUT-20260925-08','2026-09-19','production','completed',4,'生产领料 工单WO-00024',6,'陈明','approved',1,NULL
  UNION ALL SELECT 'OUT-20260925-09','2026-09-20','production','completed',4,'生产领料 工单WO-00022',6,'陈明','approved',1,NULL
  UNION ALL SELECT 'OUT-20260925-10','2026-09-20','production','completed',4,'生产领料 工单WO-00021',7,'赵磊','approved',1,NULL
  UNION ALL SELECT 'OUT-20260925-11','2026-09-21','return','completed',4,'供应商退货出库',6,'陈明','approved',1,NULL
  UNION ALL SELECT 'OUT-20260925-12','2026-09-22','transfer','completed',4,'调拨出库至半成品仓',7,'赵磊','approved',1,NULL
  UNION ALL SELECT 'OUT-20260925-13','2026-09-22','other','completed',4,'报废领用出库',6,'陈明','approved',1,NULL
  UNION ALL SELECT 'OUT-20260925-14','2026-09-23','sales','pending',2,'销售出库-汇川(待审核)',6,'陈明','pending',0,146
  UNION ALL SELECT 'OUT-20260925-15','2026-09-24','production','pending',2,'生产领料 工单WO-00032',7,'赵磊','pending',0,NULL
  UNION ALL SELECT 'OUT-20260925-16','2026-09-24','production','pending',2,'生产领料 工单WO-00033',6,'陈明','pending',0,NULL
  UNION ALL SELECT 'OUT-20260925-17','2026-09-24','sales','pending',2,'销售出库-联想(待审核)',7,'赵磊','pending',0,147
  UNION ALL SELECT 'OUT-20260925-18','2026-09-25','production','draft',1,'生产领料 草稿 工单WO-00032',6,'陈明','pending',0,NULL
  UNION ALL SELECT 'OUT-20260925-19','2026-09-25','other','draft',1,'其他出库 草稿',7,'赵磊','pending',0,NULL
  UNION ALL SELECT 'OUT-20260925-20','2026-09-23','sales','cancelled',5,'销售出库-美的(已取消)',6,'陈明','rejected',2,141
) h
LEFT JOIN sal_order so ON so.id = h.sal_id AND so.deleted = 0
LEFT JOIN crm_customer cu ON cu.id = so.customer_id AND cu.deleted = 0
WHERE NOT EXISTS (SELECT 1 FROM inv_outbound_order x WHERE x.order_no = h.order_no);

-- 3. 插入出库明细（关联真实物料+批次；单价取批次 unit_price；spec/unit 取自物料）
INSERT INTO inv_outbound_item
  (order_id, material_id, batch_id, original_inbound_date, material_name, material_spec,
   quantity, unit, unit_price, amount, batch_no, remark, create_time, deleted, is_raw_material)
SELECT
  o.id, l.material_id, NULL, b.inbound_date, m.material_name, m.specification,
  l.qty, m.unit, l.price, l.qty * l.price, l.batch_no, NULL, o.create_time, 0, 1
FROM (
  SELECT 'OUT-20260925-01' on_,'B2026-09-14-RAW-01' batch_no,1 material_id,20 qty,5 price
  UNION ALL SELECT 'OUT-20260925-01','B2026-09-14-RAW-04',4,6,5
  UNION ALL SELECT 'OUT-20260925-02','B2026-09-14-RAW-02',2,25,5
  UNION ALL SELECT 'OUT-20260925-03','B2026-09-14-RAW-03',3,30,5
  UNION ALL SELECT 'OUT-20260925-04','B2026-09-14-RAW-04',4,20,5
  UNION ALL SELECT 'OUT-20260925-05','B2026-09-14-RAW-05',5,25,5
  UNION ALL SELECT 'OUT-20260925-06','B2026-09-14-RAW-06',6,40,5
  UNION ALL SELECT 'OUT-20260925-06','B2026-09-14-RAW-07',7,10,5
  UNION ALL SELECT 'OUT-20260925-07','B2026-09-14-RAW-07',7,40,5
  UNION ALL SELECT 'OUT-20260925-08','B2026-09-14-RAW-08',8,30,5
  UNION ALL SELECT 'OUT-20260925-09','B2026-09-14-RAW-09',1,30,5
  UNION ALL SELECT 'OUT-20260925-10','B2026-09-14-RAW-10',2,30,5
  UNION ALL SELECT 'OUT-20260925-11','B2026-09-14-RAW-11',3,15,5
  UNION ALL SELECT 'OUT-20260925-12','B2026-09-14-RAW-12',4,20,5
  UNION ALL SELECT 'OUT-20260925-13','B2026-09-14-RAW-13',5,10,5
  UNION ALL SELECT 'OUT-20260925-14','B2026-09-14-RAW-14',6,50,5
  UNION ALL SELECT 'OUT-20260925-15','B2026-09-14-RAW-15',7,60,5
  UNION ALL SELECT 'OUT-20260925-16','B2026-09-14-RAW-01',1,10,5
  UNION ALL SELECT 'OUT-20260925-16','B2026-09-14-RAW-02',2,8,5
  UNION ALL SELECT 'OUT-20260925-17','B2026-09-14-RAW-02',2,15,5
  UNION ALL SELECT 'OUT-20260925-18','B2026-09-14-RAW-03',3,8,5
  UNION ALL SELECT 'OUT-20260925-19','B2026-09-14-RAW-04',4,5,5
  UNION ALL SELECT 'OUT-20260925-20','B2026-09-14-RAW-05',5,12,5
) l
JOIN inv_outbound_order o ON o.order_no = l.on_ AND o.deleted = 0
JOIN inv_material m ON m.id = l.material_id AND m.deleted = 0
JOIN inv_inventory_batch b ON b.batch_no = l.batch_no AND b.deleted = 0
WHERE NOT EXISTS (
  SELECT 1 FROM inv_outbound_item ii WHERE ii.order_id = o.id AND (ii.deleted = 0 OR ii.deleted IS NULL)
);

-- 4. 表头汇总一致性重算：total_qty/total_amount = SUM(明细)（保证不变量+幂等）
UPDATE inv_outbound_order o
JOIN (
  SELECT order_id, SUM(quantity) q, SUM(amount) a
  FROM inv_outbound_item WHERE deleted = 0
  GROUP BY order_id
) t ON t.order_id = o.id
SET o.total_qty = t.q, o.total_amount = t.a, o.update_time = NOW()
WHERE o.deleted = 0 AND o.order_no LIKE 'OUT-20260925-%';

-- ROLLBACK（如需还原迁移前状态）：
--   DELETE FROM inv_outbound_item WHERE order_id IN (SELECT id FROM inv_outbound_order WHERE order_no LIKE 'OUT-20260925-%');
--   DELETE FROM inv_outbound_order WHERE order_no LIKE 'OUT-20260925-%';
--   UPDATE inv_outbound_order o JOIN inv_outbound_order_bak_20260925 b ON o.id=b.id SET o.deleted=b.deleted;
--   UPDATE inv_outbound_item i JOIN inv_outbound_item_bak_20260925 b ON i.id=b.id SET i.deleted=b.deleted;
