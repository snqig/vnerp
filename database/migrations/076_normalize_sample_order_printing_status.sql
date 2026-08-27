-- 归一化打样订单历史脏数据：status='printing' -> 'pending'
-- 背景：sal_sample_order.status 合法枚举仅为 pending/producing/completed/cancelled，
-- 'printing' 是旧版遗留脏数据，导致 /sample/orders 列表直接显示英文。
-- 前端已补 printing->待打样 映射，但根因在库内，本迁移将其统一为 pending，
-- 避免与正常 pending 记录重复显示「待打样」。
-- 幂等：若已无 printing 行，UPDATE 影响 0 行，可重复执行。
UPDATE sal_sample_order SET status = 'pending', update_time = NOW() WHERE status = 'printing' AND deleted = 0;
