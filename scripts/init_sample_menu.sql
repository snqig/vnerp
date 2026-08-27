-- 初始化打样订单菜单
-- 执行此脚本添加打样订单管理菜单到系统

-- 首先检查是否已存在"打样中心"菜单
SET @sample_center_id = (SELECT id FROM sys_menu WHERE menu_code = 'sample_center' LIMIT 1);

-- 如果不存在打样中心菜单，则创建
IF @sample_center_id IS NULL THEN
    INSERT INTO sys_menu (
        menu_name, menu_code, parent_id, menu_type, icon, path, 
        component, permission, sort_order, status, is_visible
    ) VALUES (
        '打样中心', 'sample_center', 0, 1, 'Printer', '/sample',
        NULL, 'sample:view', 15, 1, 1
    );
    SET @sample_center_id = LAST_INSERT_ID();
END IF;

-- 检查是否已存在"打样订单"子菜单
SET @sample_order_id = (SELECT id FROM sys_menu WHERE menu_code = 'sample_orders' LIMIT 1);

-- 如果不存在打样订单菜单，则创建
IF @sample_order_id IS NULL THEN
    INSERT INTO sys_menu (
        menu_name, menu_code, parent_id, menu_type, icon, path, 
        component, permission, sort_order, status, is_visible
    ) VALUES (
        '打样订单', 'sample_orders', @sample_center_id, 2, 'FileText', '/sample/orders',
        'sample/orders/index', 'sample:orders:view', 1, 1, 1
    );
    SET @sample_order_id = LAST_INSERT_ID();
ELSE
    -- 更新现有菜单的路径
    UPDATE sys_menu SET 
        path = '/sample/orders',
        component = 'sample/orders/index',
        status = 1,
        is_visible = 1
    WHERE id = @sample_order_id;
END IF;

-- 为管理员角色(假设role_id=1)添加菜单权限
INSERT IGNORE INTO sys_role_menu (role_id, menu_id) VALUES (1, @sample_center_id);
INSERT IGNORE INTO sys_role_menu (role_id, menu_id) VALUES (1, @sample_order_id);

-- 添加打样订单相关按钮权限
SET @sample_add_id = (SELECT id FROM sys_menu WHERE menu_code = 'sample_orders:add' LIMIT 1);
IF @sample_add_id IS NULL THEN
    INSERT INTO sys_menu (
        menu_name, menu_code, parent_id, menu_type, permission, sort_order, status, is_visible
    ) VALUES (
        '新增', 'sample_orders:add', @sample_order_id, 3, 'sample:orders:add', 1, 1, 0
    );
    INSERT IGNORE INTO sys_role_menu (role_id, menu_id) VALUES (1, LAST_INSERT_ID());
END IF;

SET @sample_edit_id = (SELECT id FROM sys_menu WHERE menu_code = 'sample_orders:edit' LIMIT 1);
IF @sample_edit_id IS NULL THEN
    INSERT INTO sys_menu (
        menu_name, menu_code, parent_id, menu_type, permission, sort_order, status, is_visible
    ) VALUES (
        '编辑', 'sample_orders:edit', @sample_order_id, 3, 'sample:orders:edit', 2, 1, 0
    );
    INSERT IGNORE INTO sys_role_menu (role_id, menu_id) VALUES (1, LAST_INSERT_ID());
END IF;

SET @sample_delete_id = (SELECT id FROM sys_menu WHERE menu_code = 'sample_orders:delete' LIMIT 1);
IF @sample_delete_id IS NULL THEN
    INSERT INTO sys_menu (
        menu_name, menu_code, parent_id, menu_type, permission, sort_order, status, is_visible
    ) VALUES (
        '删除', 'sample_orders:delete', @sample_order_id, 3, 'sample:orders:delete', 3, 1, 0
    );
    INSERT IGNORE INTO sys_role_menu (role_id, menu_id) VALUES (1, LAST_INSERT_ID());
END IF;

SET @sample_export_id = (SELECT id FROM sys_menu WHERE menu_code = 'sample_orders:export' LIMIT 1);
IF @sample_export_id IS NULL THEN
    INSERT INTO sys_menu (
        menu_name, menu_code, parent_id, menu_type, permission, sort_order, status, is_visible
    ) VALUES (
        '导出', 'sample_orders:export', @sample_order_id, 3, 'sample:orders:export', 4, 1, 0
    );
    INSERT IGNORE INTO sys_role_menu (role_id, menu_id) VALUES (1, LAST_INSERT_ID());
END IF;

SELECT '打样订单菜单初始化完成！' AS result;
