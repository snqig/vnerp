const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.DEMO_MODE === 'true';

export function isDemoMode(): boolean {
  return DEMO;
}

export const demoUser = {
  id: 1,
  username: 'admin',
  real_name: '演示管理员',
  password: '$2a$10$dummy', // demo 模式不校验密码
  avatar: null,
  email: 'admin@demo.com',
  phone: '13800138000',
  department_id: 1,
  status: 1,
  first_login: 0,
  login_fail_count: 0,
  lock_time: null,
};

export const demoRoles = [
  { id: 1, role_code: 'admin', role_name: '超级管理员', data_scope: 'all' },
];

export const demoPermissions = [
  'warehouse:view',
  'warehouse:create',
  'warehouse:update',
  'warehouse:delete',
  'inventory:view',
  'inbound:create',
  'inbound:approve',
  'outbound:create',
  'outbound:confirm',
  'outbound:cancel',
  'workorder:view',
  'workorder:create',
  'workorder:update',
  'workorder:delete',
  'purchase:view',
  'purchase:create',
  'purchase:update',
  'sales:view',
  'sales:create',
  'sales:update',
  'finance:view',
  'settings:view',
  'settings:edit',
  'dcprint:view',
  'dcprint:create',
  'dcprint:update',
  'sample:view',
  'sample:create',
  'sample:update',
  'quality:view',
  'quality:create',
  'report:view',
  'dashboard:view',
];

export function demoQuery(sql: string, _values?: unknown[]): unknown[] {
  if (/SELECT.*FROM\s+sys_user/i.test(sql)) {
    if (/last_login_ip/i.test(sql)) {
      return [{ last_login_ip: '127.0.0.1' }];
    }
    return [demoUser];
  }
  if (/SELECT.*FROM\s+sys_role/i.test(sql)) {
    return demoRoles;
  }
  if (/SELECT.*FROM\s+sys_user_role.*JOIN\s+sys_role/i.test(sql)) {
    return demoRoles;
  }
  if (/SELECT.*FROM\s+sys_department/i.test(sql)) {
    return [{ dept_name: '演示部门' }];
  }
  if (/SELECT.*FROM\s+sys_menu.*WHERE.*permission/i.test(sql)) {
    return demoPermissions.map((p) => ({ permission: p }));
  }
  if (/SELECT.*FROM\s+sys_menu/i.test(sql)) {
    return getDemoMenus();
  }
  if (/SELECT.*FROM\s+sys_role_menu/i.test(sql)) {
    return getDemoMenuRoleMappings();
  }
  if (/INFORMATION_SCHEMA/i.test(sql)) {
    return [];
  }
  if (/SELECT\s+COUNT/i.test(sql) || /SUM\(/i.test(sql) || /COALESCE.*SUM/i.test(sql)) {
    return [{ total: 42, today: 5, pending: 8, producing: 12, completed_today: 3, amount: 888888 }];
  }
  if (/SELECT.*FROM\s+sys_data_scope/i.test(sql)) {
    return [];
  }
  return [];
}

function getDemoMenuRoleMappings(): { role_id: number; menu_id: number }[] {
  const menuIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  return menuIds.map((id) => ({ role_id: 1, menu_id: id }));
}

export function demoExecute(
  _sql: string,
  _values?: unknown[]
): { affectedRows: number; insertId: number } {
  return { affectedRows: 1, insertId: 1 };
}

function getDemoMenus() {
  return [
    {
      id: 1,
      menu_name: '仪表盘',
      menu_code: 'dashboard',
      icon: 'LayoutDashboard',
      path: '/dashboard',
      component: null,
      permission: 'dashboard:view',
      sort_order: 1,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 2,
      menu_name: '仓储管理',
      menu_code: 'warehouse',
      icon: 'Warehouse',
      path: '/warehouse',
      component: null,
      permission: null,
      sort_order: 2,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 3,
      menu_name: '入库管理',
      menu_code: 'inbound',
      path: '/warehouse/inbound',
      parent_id: 2,
      sort_order: 1,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'inbound:create',
    },
    {
      id: 4,
      menu_name: '出库管理',
      menu_code: 'outbound',
      path: '/warehouse/outbound',
      parent_id: 2,
      sort_order: 2,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'outbound:create',
    },
    {
      id: 5,
      menu_name: '库存查询',
      menu_code: 'inventory',
      path: '/warehouse/inventory',
      parent_id: 2,
      sort_order: 3,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'inventory:view',
    },
    {
      id: 6,
      menu_name: '生产管理',
      menu_code: 'production',
      icon: 'Factory',
      path: '/production',
      component: null,
      permission: null,
      sort_order: 3,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 7,
      menu_name: '生产工单',
      menu_code: 'workorder',
      path: '/production/work-order',
      parent_id: 6,
      sort_order: 1,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'workorder:view',
    },
    {
      id: 8,
      menu_name: '排产管理',
      menu_code: 'schedule',
      path: '/production/schedule',
      parent_id: 6,
      sort_order: 2,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'production:schedule',
    },
    {
      id: 9,
      menu_name: '领料管理',
      menu_code: 'picking',
      path: '/production/picking',
      parent_id: 6,
      sort_order: 3,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'production:picking',
    },
    {
      id: 10,
      menu_name: '销售管理',
      menu_code: 'sales',
      icon: 'ShoppingCart',
      path: '/sales',
      component: null,
      permission: null,
      sort_order: 4,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 11,
      menu_name: '销售订单',
      menu_code: 'sales_order',
      path: '/sales/orders',
      parent_id: 10,
      sort_order: 1,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'order:view',
    },
    {
      id: 12,
      menu_name: '发货管理',
      menu_code: 'delivery',
      path: '/sales/delivery',
      parent_id: 10,
      sort_order: 2,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'order:delivery',
    },
    {
      id: 13,
      menu_name: '采购管理',
      menu_code: 'purchase',
      icon: 'Truck',
      path: '/purchase',
      component: null,
      permission: null,
      sort_order: 5,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 14,
      menu_name: '采购订单',
      menu_code: 'purchase_order',
      path: '/purchase/orders',
      parent_id: 13,
      sort_order: 1,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'purchase:view',
    },
    {
      id: 15,
      menu_name: '印前管理',
      menu_code: 'dcprint',
      icon: 'Palette',
      path: '/dcprint',
      component: null,
      permission: null,
      sort_order: 6,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 16,
      menu_name: '油墨管理',
      menu_code: 'ink',
      path: '/dcprint/ink',
      parent_id: 15,
      sort_order: 1,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'dcprint:view',
    },
    {
      id: 17,
      menu_name: '刀模管理',
      menu_code: 'die',
      path: '/dcprint/die',
      parent_id: 15,
      sort_order: 2,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'dcprint:view',
    },
    {
      id: 18,
      menu_name: '打样管理',
      menu_code: 'sample',
      icon: 'FlaskConical',
      path: '/sample',
      component: null,
      permission: null,
      sort_order: 7,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 19,
      menu_name: '打样订单',
      menu_code: 'sample_order',
      path: '/sample/orders',
      parent_id: 18,
      sort_order: 1,
      menu_type: 'C',
      status: 1,
      icon: null,
      component: null,
      permission: 'sample:view',
    },
    {
      id: 20,
      menu_name: '质量管理',
      menu_code: 'quality',
      icon: 'ClipboardCheck',
      path: '/quality',
      component: null,
      permission: null,
      sort_order: 8,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 21,
      menu_name: '财务管理',
      menu_code: 'finance',
      icon: 'DollarSign',
      path: '/finance',
      component: null,
      permission: null,
      sort_order: 9,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
    {
      id: 22,
      menu_name: '系统设置',
      menu_code: 'settings',
      icon: 'Settings',
      path: '/settings',
      component: null,
      permission: null,
      sort_order: 10,
      parent_id: 0,
      menu_type: 'M',
      status: 1,
    },
  ];
}
