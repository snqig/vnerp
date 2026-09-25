-- 数据治理：清洗销售退货单越界状态
--
-- 背景：
--   sal_return 的合法状态值域由领域层 ReturnOrderStatus 定义为 1-待审核 / 2-已审核 / 3-已完成 / 9-已取消。
--   库内存在 status = 0 的历史脏数据（id=4, SR-2026-003），领域层 ReturnOrderStatus.from(0) 会直接抛
--   DomainError「无效的退货单状态: 0」，使该单据无法审批 / 完成 / 取消 / 删除。
--   该单据同时存在引用完整性问题：order_id = 3 在 sal_order 中不存在（孤儿），
--   无法通过「退货数量 ≤ 已发货量」校验，故不具备继续流转的条件。
--
-- 处置：置为 9（已取消，终态），并在 remark 中留痕；加 status = 0 条件保证幂等。
UPDATE sal_return
SET status = 9,
    remark = CONCAT(IFNULL(remark, ''),
      ' | [数据治理 2026-09-26] 原状态 0 为非法值且关联销售订单(order_id=3)不存在，置为已取消')
WHERE id = 4
  AND status = 0;
