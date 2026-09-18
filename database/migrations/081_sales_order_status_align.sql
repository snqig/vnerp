-- =====================================================
-- 081: 销售订单状态码统一 —— 存量纠偏（BUG-ORD-002）
--
-- 唯一权威契约（live 库列注释 + i18n Orders 词条 + 列表页 + 导出，四方一致）：
--   sal_order.status tinyint DEFAULT 1
--   COMMENT '状态: 1-待确认, 2-已确认, 3-部分发货, 4-已完成, 5-已取消'
--
-- 修复前库内并存四套口径：
--   领域 SalesOrderStatus.fromDbCode : 0/1/2/3/4/6/9（draft/submitted/approved/…，无 API 调用点）
--   /api/orders/sales               : 1/2/3（草稿/已提交/已审核）→ 审核写 3
--   /api/orders                     : 字符串比较 'completed'/'cancelled'（与 tinyint 恒不等）
--   orders/export 与 contract-review: 1-5 / 10-60 / 20
-- 代码侧统一到 src/lib/order-status.ts；本迁移只处理**存量已错标**的数据。
--
-- 错标来源：/api/orders/sales 的 approve 分支把"审核通过"写成 status = 3，
--   而按契约 3 的含义是「部分发货」。此类订单的客观特征是：
--     status = 3，但既无发货单（sal_delivery），明细 delivered_qty 也全为 0。
--   这类订单从未发货，正确状态应为 2（已确认）。
--   反之，真实发生过发货的部分发货单（delivered_qty > 0 或有发货单）**不动**。
--
-- 幂等：条件命中一次后 status 已变为 2，重复执行影响 0 行。
-- =====================================================

-- 迁移前留痕（如需回滚可据此定位）
--   SELECT id, order_no, status FROM sal_order WHERE deleted = 0 AND status = 3;
-- 快照表备份建议（运维可选）：
--   CREATE TABLE sal_order_bak_081 AS SELECT * FROM sal_order;

UPDATE `sal_order` o
   SET o.`status` = 2,
       o.`update_time` = NOW()
 WHERE o.`deleted` = 0
   AND o.`status` = 3
   AND NOT EXISTS (
        SELECT 1 FROM `sal_delivery` d
         WHERE d.`order_id` = o.`id` AND d.`deleted` = 0
       )
   AND NOT EXISTS (
        SELECT 1 FROM `sal_order_detail` t
         WHERE t.`order_id` = o.`id` AND t.`deleted` = 0 AND t.`delivered_qty` > 0
       );

-- 迁移后自检（应分别返回 0 / 已知的部分发货单数）
--   SELECT COUNT(*) FROM sal_order WHERE deleted = 0
--    AND status = 3
--    AND id NOT IN (SELECT order_id FROM sal_delivery WHERE deleted = 0)
--    AND id NOT IN (SELECT order_id FROM sal_order_detail WHERE deleted = 0 AND delivered_qty > 0);
