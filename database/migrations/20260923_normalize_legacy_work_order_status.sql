-- 归一 prod_work_order 的遗留 status='migrated'（本批 ① 状态词表统一的收口）
--
-- 来源：20260923_unify_work_order_tables.sql 把 prd_work_order 的行迁入 prod_work_order 时，
--       把 status 硬编码为 'migrated'（作来源标记），并把原始 tinyint 状态写进 status_new。
--       已核实：这 2 行的 status_new = 1，而 prd_work_order 的列注释为「1-待开工」，
--       planned_qty=1 / completed_qty=0 亦印证未开工。
--
-- 处置：把来源标记从 status 列移出（order_no 仍为 SO-LEGACY-*，且备份表留存原值），
--       status 归一为规范值 'pending'（未开工），使 prod_work_order.status 取值域收敛到
--       唯一真相源 src/lib/constants.ts 的 WorkOrderStatus 五值。
--
-- 依赖核实：全仓 0 处代码引用 'migrated'（仅注释提及），无视图 / 报表 / 索引依赖。

CREATE TABLE IF NOT EXISTS prod_work_order_status_migrated_bak_20260923 AS
SELECT id, work_order_no, order_no, status, planned_qty, completed_qty, create_time
FROM prod_work_order
WHERE status = 'migrated';

UPDATE prod_work_order
SET status = 'pending', update_time = NOW()
WHERE status = 'migrated';
