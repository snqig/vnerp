-- 收敛 prod_work_order.status 的取值域（本批 ① 的收尾）
--
-- 目标：使该列的取值域 == 唯一真相源 src/lib/constants.ts 的 WorkOrderStatus 五值，
--       从而根除「数字码」幻觉 —— 正是这一幻觉导致 mrp-engine 写出 status IN (1, 2)
--       而字符串与整数比较恒不成立、MRP 各时间桶需求恒为 0。
--
-- 现存越界值：'1'（220 行，全部 deleted=1）。来源为批量种子工单被软删后遗留，
--             其语义等于 prd_work_order 列注释的「1-待开工」，故归一为 'pending'。
--             （'migrated' 2 行已由 20260923_normalize_legacy_work_order_status.sql 处理）
--
-- 依赖核实：全仓 0 处代码按数字串比较工单状态；这 220 行均已软删除，不参与任何业务查询。

CREATE TABLE IF NOT EXISTS prod_work_order_status_legacy_bak_20260923 AS
SELECT id, work_order_no, status, deleted, create_time
FROM prod_work_order
WHERE status IS NOT NULL
  AND status NOT IN ('pending', 'confirmed', 'producing', 'completed', 'cancelled');

UPDATE prod_work_order
SET status = 'pending', update_time = NOW()
WHERE status = '1';
