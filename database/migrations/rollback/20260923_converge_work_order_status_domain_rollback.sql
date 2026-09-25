-- 人工回滚：还原 prod_work_order.status 的数字串遗留值（'1'）
--
-- ⚠️ 需人工执行。执行前确认快照表存在：
--   SELECT COUNT(*) FROM prod_work_order_status_legacy_bak_20260923;

UPDATE prod_work_order wo
  JOIN prod_work_order_status_legacy_bak_20260923 b ON b.id = wo.id
  SET wo.status = b.status;
