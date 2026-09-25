-- 退役 prod_work_order 的 status_new / priority_new
-- （迁移 060_unify_status_codes.sql 遗留的失败半成品，2026-09-23）
--
-- 背景（运行时核实）：
--   1. 060 按 status = 'scheduled' / 'in_progress' 回填，而线上真实词表是 'confirmed' / 'producing'，
--      这两条 UPDATE 命中 0 行 → status_new 停留在 DEFAULT 1；只有 'completed' 命中（2 行 → 4）。
--   2. 全仓 0 处代码读取这两列（仅 Drizzle schema 声明），无视图 / 报表 / 索引 / 外键依赖。
--   3. 该列的存在会误导读者以为工单状态是数字码 —— 已实际导致 mrp-engine 写出 status IN (1, 2)，
--      字符串与整数比较恒不成立，使 MRP 各时间桶需求恒为 0。
--
-- 统一后的唯一真相源：prod_work_order.status（varchar 词表），
-- 见 src/lib/constants.ts 的 WorkOrderStatus / WORK_ORDER_STATUSES_OPEN / normalizeWorkOrderStatus()。
--
-- 退役前先把原值快照进备份表（CTAS 继承源表列类型与排序规则），便于追溯。

CREATE TABLE IF NOT EXISTS prod_work_order_status_new_bak_20260923 AS
SELECT id, work_order_no, status, status_new, priority, priority_new
FROM prod_work_order;

ALTER TABLE prod_work_order DROP COLUMN status_new;

ALTER TABLE prod_work_order DROP COLUMN priority_new;
