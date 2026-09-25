-- 人工回滚：恢复 prod_work_order.status_new / priority_new
--
-- ⚠️ DDL 不可事务回滚，本仓库的迁移执行器（scripts/migrate.ts）不执行 SQL 文件的 down，
--    故本脚本需**人工**在确认后执行。执行前请先确认备份表存在：
--      SELECT COUNT(*) FROM prod_work_order_status_new_bak_20260923;

ALTER TABLE prod_work_order
  ADD COLUMN priority_new TINYINT NOT NULL DEFAULT 2 COMMENT '优先级(新)' AFTER priority;

ALTER TABLE prod_work_order
  ADD COLUMN status_new TINYINT NOT NULL DEFAULT 1 COMMENT '状态(新)' AFTER status;

-- 从备份表恢复快照值（仅覆盖仍在工单表中的 id）
UPDATE prod_work_order wo
  JOIN prod_work_order_status_new_bak_20260923 b ON b.id = wo.id
  SET wo.status_new = b.status_new,
      wo.priority_new = b.priority_new;
