-- Demo 用户
INSERT INTO sys_user (user_id, username, password, real_name, role_id, status)
VALUES 
  (1001, 'demo_ceo', '$2a$10$xxxxdemoceopwxxxxxxx', 'Demo CEO', 1, 1),
  (1002, 'demo_warehouse', '$2a$10$xxxxdemowarepwxxxxxx', '仓库主管', 2, 1);

-- 部分演示客户
INSERT INTO crm_customer (customer_id, customer_name, type, contact, phone)
VALUES 
  (1, '深圳示例客户', '企业', '张三', '13800008888'),
  (2, '上海经销商', '经销', '李四', '13900009999');

-- 常用物料/仓库/设备等
INSERT INTO inv_warehouse (warehouse_id, warehouse_name, location)
VALUES (10, '主仓库', '深圳龙岗'), (11, '成品仓', '深圳宝安');

INSERT INTO eqp_equipment (equipment_id, equipment_name, type, status)
VALUES (101, '12色印刷机', '印刷', '正常');