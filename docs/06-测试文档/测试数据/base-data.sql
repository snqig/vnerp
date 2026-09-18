-- 基础测试数据
-- 用于所有测试场景的基础数据初始化

-- 清空表（按依赖顺序）
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sys_user;
TRUNCATE TABLE sys_role;
TRUNCATE TABLE bas_warehouse;
TRUNCATE TABLE bas_material;
TRUNCATE TABLE bas_supplier;
TRUNCATE TABLE bas_customer;
SET FOREIGN_KEY_CHECKS = 1;

-- 系统用户
INSERT INTO sys_user (id, username, password, real_name, role, status) VALUES
(1, 'admin', '$2b$10$hashed_password', '系统管理员', 'admin', 1),
(2, 'production_mgr', '$2b$10$hashed_password', '生产经理', 'production_manager', 1),
(3, 'warehouse_mgr', '$2b$10$hashed_password', '仓库管理员', 'warehouse_manager', 1),
(4, 'purchase_mgr', '$2b$10$hashed_password', '采购员', 'purchase_staff', 1),
(5, 'quality_mgr', '$2b$10$hashed_password', '品质检验员', 'quality_inspector', 1),
(6, 'finance_mgr', '$2b$10$hashed_password', '财务人员', 'finance_staff', 1);

-- 系统角色
INSERT INTO sys_role (id, role_name, role_code, status) VALUES
(1, '系统管理员', 'admin', 1),
(2, '生产经理', 'production_manager', 1),
(3, '仓库管理员', 'warehouse_manager', 1),
(4, '采购员', 'purchase_staff', 1),
(5, '品质检验员', 'quality_inspector', 1),
(6, '财务人员', 'finance_staff', 1);

-- 仓库
INSERT INTO bas_warehouse (id, warehouse_code, warehouse_name, warehouse_type, status) VALUES
(1, 'WH-RAW', '原材料仓', 1, 1),
(2, 'WH-WIP', '在制品仓', 2, 1),
(3, 'WH-FG', '成品仓', 3, 1),
(4, 'WH-INK', '油墨仓', 4, 1);

-- 物料
INSERT INTO bas_material (id, material_code, material_name, material_type, unit, standard_split_qty, safety_stock, status) VALUES
(1, 'MAT-INK-BK001', '黑色油墨-大桶', 1, '桶', 5, 10, 1),
(2, 'MAT-INK-WH001', '白色油墨-大桶', 1, '桶', 5, 10, 1),
(3, 'MAT-PVC-001', 'PVC薄膜-卷', 2, '卷', 10, 20, 1),
(4, 'MAT-SCREEN-001', '丝网版-200目', 3, '张', 1, 5, 1),
(5, 'MAT-DIE-001', '模切刀具-A型', 4, '把', 1, 3, 1);

-- 供应商
INSERT INTO bas_supplier (id, supplier_code, supplier_name, contact_person, phone, status) VALUES
(1, 'SUP-001', '油墨供应商A', '张三', '13800138001', 1),
(2, 'SUP-002', '薄膜供应商B', '李四', '13800138002', 1),
(3, 'SUP-003', '网版供应商C', '王五', '13800138003', 1);

-- 客户
INSERT INTO bas_customer (id, customer_code, customer_name, contact_person, phone, status) VALUES
(1, 'CUS-001', '包装公司A', '赵六', '13900139001', 1),
(2, 'CUS-002', '印刷公司B', '钱七', '13900139002', 1);
