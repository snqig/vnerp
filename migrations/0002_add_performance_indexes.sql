-- ==========================================
-- 数据库性能优化索引
-- 创建时间: 2026-03-26
-- 说明: 为常用查询字段添加索引以提升性能
-- ==========================================

-- 用户表索引
ALTER TABLE sys_user ADD INDEX idx_username (username);
ALTER TABLE sys_user ADD INDEX idx_status_deleted (status, deleted);
ALTER TABLE sys_user ADD INDEX idx_department_id (department_id);

-- 角色表索引
ALTER TABLE sys_role ADD INDEX idx_role_code (role_code);
ALTER TABLE sys_role ADD INDEX idx_status (status);

-- 菜单表索引
ALTER TABLE sys_menu ADD INDEX idx_parent_id (parent_id);
ALTER TABLE sys_menu ADD INDEX idx_status_type (status, type);

-- 用户角色关联表索引
ALTER TABLE sys_user_role ADD INDEX idx_user_id (user_id);
ALTER TABLE sys_user_role ADD INDEX idx_role_id (role_id);
ALTER TABLE sys_user_role ADD UNIQUE INDEX idx_user_role (user_id, role_id);

-- 角色菜单关联表索引
ALTER TABLE sys_role_menu ADD INDEX idx_role_id (role_id);
ALTER TABLE sys_role_menu ADD INDEX idx_menu_id (menu_id);
ALTER TABLE sys_role_menu ADD UNIQUE INDEX idx_role_menu (role_id, menu_id);

-- 部门表索引
ALTER TABLE sys_department ADD INDEX idx_parent_id (parent_id);
ALTER TABLE sys_department ADD INDEX idx_status (status);

-- 入库单表索引
ALTER TABLE inv_inbound_order ADD INDEX idx_order_no (order_no);
ALTER TABLE inv_inbound_order ADD INDEX idx_status_deleted (status, deleted);
ALTER TABLE inv_inbound_order ADD INDEX idx_order_date (order_date);
ALTER TABLE inv_inbound_order ADD INDEX idx_warehouse_code (warehouse_code);
ALTER TABLE inv_inbound_order ADD INDEX idx_supplier_name (supplier_name);
ALTER TABLE inv_inbound_order ADD INDEX idx_create_time (create_time);

-- 入库明细表索引
ALTER TABLE inv_inbound_item ADD INDEX idx_order_id (order_id);
ALTER TABLE inv_inbound_item ADD INDEX idx_material_code (material_code);
ALTER TABLE inv_inbound_item ADD INDEX idx_deleted (deleted);

-- 仓库表索引
ALTER TABLE sys_warehouse ADD INDEX idx_warehouse_code (warehouse_code);
ALTER TABLE sys_warehouse ADD INDEX idx_status (status);

-- 样品订单表索引
ALTER TABLE sample_orders ADD INDEX idx_order_no (order_no);
ALTER TABLE sample_orders ADD INDEX idx_customer_name (customer_name);
ALTER TABLE sample_orders ADD INDEX idx_status (status);
ALTER TABLE sample_orders ADD INDEX idx_create_time (create_time);

-- 采购申请表索引
ALTER TABLE purchase_request ADD INDEX idx_request_no (request_no);
ALTER TABLE purchase_request ADD INDEX idx_status (status);
ALTER TABLE purchase_request ADD INDEX idx_applicant_id (applicant_id);
ALTER TABLE purchase_request ADD INDEX idx_create_time (create_time);

-- 客户表索引
ALTER TABLE customers ADD INDEX idx_customer_code (customer_code);
ALTER TABLE sample_orders ADD INDEX idx_customer_name (customer_name);
ALTER TABLE customers ADD INDEX idx_status (status);

-- 员工表索引
ALTER TABLE sys_employee ADD INDEX idx_employee_no (employee_no);
ALTER TABLE sys_employee ADD INDEX idx_department_id (department_id);
ALTER TABLE sys_employee ADD INDEX idx_status (status);

-- 库存表索引
ALTER TABLE inv_inventory ADD INDEX idx_material_code (material_code);
ALTER TABLE inv_inventory ADD INDEX idx_warehouse_code (warehouse_code);
ALTER TABLE inv_inventory ADD INDEX idx_location_code (location_code);

-- 送货车辆表索引
ALTER TABLE delivery_vehicles ADD INDEX idx_plate_number (plate_number);
ALTER TABLE delivery_vehicles ADD INDEX idx_status (status);

-- 标准卡表索引
ALTER TABLE standard_cards ADD INDEX idx_card_no (card_no);
ALTER TABLE standard_cards ADD INDEX idx_status (status);

-- 查询优化提示
-- 1. 定期执行 ANALYZE TABLE 来更新索引统计信息
-- 2. 使用 EXPLAIN 分析慢查询
-- 3. 监控慢查询日志，及时调整索引策略
