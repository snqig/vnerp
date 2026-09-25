-- 人工回滚：还原 prod_work_order.status 的 'migrated' 来源标记
--
-- ⚠️ DML 可用事务包住，但本仓库执行器不跑 SQL 文件的 down，故需人工执行。
--    执行前确认快照表存在：SELECT COUNT(*) FROM prod_work_order_status_migrated_bak_20260923;

UPDATE prod_work_order wo
  JOIN prod_work_order_status_migrated_bak_20260923 b ON b.id = wo.id
  SET wo.status = b.status;
