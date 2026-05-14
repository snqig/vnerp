-- 测试入库单数据查询
SELECT id, order_no, supplier_name, warehouse_id, status, total_quantity, total_amount
FROM inv_inbound_order 
WHERE deleted = 0 
ORDER BY create_time DESC 
LIMIT 10;

-- 检查是否有无效状态的数据
SELECT DISTINCT status FROM inv_inbound_order WHERE deleted = 0;
