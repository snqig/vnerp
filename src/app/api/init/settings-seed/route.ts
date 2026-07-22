import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async (_request: NextRequest, _userInfo) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const businessTables = [
      'inv_inventory',
      'inv_inventory_batch',
      'inv_inventory_log',
      'inv_inventory_transaction',
      'inv_inbound_order',
      'inv_inbound_item',
      'inv_outbound_order',
      'inv_outbound_item',
      'inv_outbound_batch_allocation',
      'inv_warehouse',
      'inv_location',
      'inv_material',
      'inv_material_label',
      'inv_cutting_record',
      'inv_cutting_detail',
      'inv_production_inbound',
      'inv_production_inbound_item',
      'inv_sales_outbound',
      'inv_sales_outbound_item',
      'inv_stock_adjust',
      'inv_stock_adjust_item',
      'inv_stocktaking',
      'inv_stocktaking_item',
      'inv_transfer_order',
      'inv_transfer_item',
      'inv_trace_record',
      'inv_trace_detail',
      'inv_scan_log',
      'prod_work_order',
      'prod_work_order_item',
      'prod_work_order_material_req',
      'prd_process_card',
      'prd_process_card_material',
      'prd_product_label',
      'prd_material_issue',
      'prd_material_issue_item',
      'prd_material_return',
      'prd_material_return_item',
      'prd_screen_plate',
      'prd_die',
      'prd_ink',
      'prd_bom',
      'prd_bom_detail',
      'prd_process_route',
      'prd_process_route_step',
      'prd_die_template',
      'pur_order',
      'pur_order_detail',
      'pur_request',
      'pur_request_item',
      'pur_request_approve',
      'pur_return_order',
      'pur_supplier',
      'crm_customer',
      'crm_customer_contact',
      'crm_customer_analysis',
      'crm_follow_record',
      'sal_order',
      'sal_order_detail',
      'sal_delivery',
      'sal_delivery_detail',
      'sal_return',
      'sal_return_detail',
      'sal_reconciliation',
      'sal_reconciliation_line',
      'sal_reconciliation_writeoff',
      'sal_sample_order',
      'fin_cost_record',
      'fin_payable',
      'fin_receivable',
      'fin_payment_record',
      'fin_receipt_record',
      'eqp_equipment',
      'eqp_maintenance_plan',
      'eqp_maintenance_record',
      'eqp_calibration',
      'eqp_repair',
      'eqp_scrap',
      'qc_incoming_inspection',
      'qc_incoming_inspection_item',
      'qc_process_inspection',
      'qc_final_inspection',
      'qc_unqualified',
      'base_ink',
      'bom_alternative',
      'bom_line',
      'ink_mixed_record',
      'ink_opening_record',
      'mdm_product',
      'mdm_product_bom',
      'mdm_product_route',
      'plm_product_lifecycle',
      'plm_eco',
      'delivery_vehicle',
      'delivery_vehicle_cost',
      'delivery_vehicle_repair',
      'hr_training',
      'hr_training_participant',
      'qrcode_record',
      'qrcode_scan_log',
      'label_template',
      'print_log',
    ];

    let clearedCount = 0;
    for (const table of businessTables) {
      try {
        await conn.execute(`DELETE FROM ${table}`);
        await conn.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        clearedCount++;
      } catch (_e) {}
    }
    stats.businessTablesCleared = clearedCount;

    const settingsTables = [
      'sys_role_menu',
      'sys_department',
      'sys_warehouse_category',
      'inv_material_category',
      'sys_dict_type',
      'sys_dict_data',
      'sys_config',
      'sys_notice',
      'sys_login_log',
      'sys_oper_log',
      'sys_operation_log',
    ];
    for (const table of settingsTables) {
      try {
        await conn.execute(`DELETE FROM ${table}`);
        await conn.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (_e) {}
    }

    const departments = [
      { dept_code: 'DEPT001', dept_name: '管理部', parent_id: null, sort_order: 1 },
      { dept_code: 'DEPT002', dept_name: '业务部', parent_id: null, sort_order: 2 },
      { dept_code: 'DEPT003', dept_name: '工程技术部', parent_id: null, sort_order: 3 },
      { dept_code: 'DEPT004', dept_name: '生产部', parent_id: null, sort_order: 4 },
      { dept_code: 'DEPT00401', dept_name: '模切车间', parent_id: null, sort_order: 1 },
      { dept_code: 'DEPT00402', dept_name: '商标车间', parent_id: null, sort_order: 2 },
      { dept_code: 'DEPT005', dept_name: '仓库管理部', parent_id: null, sort_order: 5 },
      { dept_code: 'DEPT006', dept_name: '采购部', parent_id: null, sort_order: 6 },
      { dept_code: 'DEPT007', dept_name: '品质部', parent_id: null, sort_order: 7 },
      { dept_code: 'DEPT008', dept_name: '财务行政部', parent_id: null, sort_order: 8 },
    ];
    for (const dept of departments) {
      await conn.execute(
        `INSERT IGNORE INTO sys_department (dept_code, dept_name, parent_id, sort_order, status, create_time, update_time) VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        [dept.dept_code, dept.dept_name, dept.parent_id, dept.sort_order]
      );
    }
    const [deptRows]: Loose = await conn.execute(
      'SELECT id, dept_name FROM sys_department ORDER BY id'
    );
    const deptMap: Record<string, number> = {};
    for (const row of deptRows) {
      deptMap[row.dept_name] = row.id;
    }
    const prodDeptId = deptMap['生产部'];
    if (prodDeptId) {
      await conn.execute('UPDATE sys_department SET parent_id = ? WHERE dept_name IN (?, ?)', [
        prodDeptId,
        '模切车间',
        '商标车间',
      ]);
    }
    stats.sys_department = departments.length;

    const roles = [
      {
        role_name: '超级管理员',
        role_code: 'super_admin',
        description: '系统超级管理员，拥有所有权限',
        data_scope: 1,
        status: 1,
        permissions: JSON.stringify(['*']),
      },
      {
        role_name: '业务经理',
        role_code: 'business_manager',
        description: '业务部门经理，管理订单和客户',
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['orders:*', 'crm:*']),
      },
      {
        role_name: '业务员',
        role_code: 'sales',
        description: '业务人员，处理日常订单',
        data_scope: 5,
        status: 1,
        permissions: JSON.stringify(['orders:sales:*', 'orders:customers:*']),
      },
      {
        role_name: '工程师',
        role_code: 'engineer',
        description: '工程技术部工程师',
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['engineering:*', 'sample:*']),
      },
      {
        role_name: '生产主管',
        role_code: 'production_manager',
        description: '生产部门主管',
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['production:*', 'warehouse:inventory:*']),
      },
      {
        role_name: '仓库主管',
        role_code: 'warehouse_manager',
        description: '仓库管理部门主管',
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['warehouse:*']),
      },
      {
        role_name: '仓管员',
        role_code: 'warehouse_keeper',
        description: '仓库日常操作人员',
        data_scope: 5,
        status: 1,
        permissions: JSON.stringify(['warehouse:inbound:*', 'warehouse:outbound:*']),
      },
      {
        role_name: '采购员',
        role_code: 'purchaser',
        description: '采购部门采购员',
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['purchase:*']),
      },
      {
        role_name: '品质检验员',
        role_code: 'qc_inspector',
        description: '品质部门检验员',
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['quality:*']),
      },
      {
        role_name: '财务',
        role_code: 'accountant',
        description: '财务部门人员',
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['finance:*']),
      },
    ];
    for (const role of roles) {
      await conn.execute(
        `INSERT IGNORE INTO sys_role (role_name, role_code, description, data_scope, status, permissions) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          role.role_name,
          role.role_code,
          role.description,
          role.data_scope,
          role.status,
          role.permissions,
        ]
      );
    }
    const [roleRows]: Loose = await conn.execute('SELECT id, role_code FROM sys_role ORDER BY id');
    const roleMap: Record<string, number> = {};
    for (const row of roleRows) {
      roleMap[row.role_code] = row.id;
    }
    stats.sys_role = roles.length;

    const passwordHash = '$2b$10$ccc80YYeNdn3/h8lEJIYAuAstgboQYYmJa8B.0gEIebjMreLjvTVa';
    const users = [
      {
        username: 'admin',
        real_name: '超级管理员',
        email: 'admin@dcprint.com',
        phone: '13800000001',
        dept_name: '管理部',
        role_code: 'super_admin',
      },
      {
        username: 'zhangwei',
        real_name: '张伟',
        email: 'zhangwei@dcprint.com',
        phone: '13800000002',
        dept_name: '业务部',
        role_code: 'business_manager',
      },
      {
        username: 'lina',
        real_name: '李娜',
        email: 'lina@dcprint.com',
        phone: '13800000003',
        dept_name: '业务部',
        role_code: 'sales',
      },
      {
        username: 'wangqiang',
        real_name: '王强',
        email: 'wangqiang@dcprint.com',
        phone: '13800000004',
        dept_name: '工程技术部',
        role_code: 'engineer',
      },
      {
        username: 'liuyang',
        real_name: '刘洋',
        email: 'liuyang@dcprint.com',
        phone: '13800000005',
        dept_name: '生产部',
        role_code: 'production_manager',
      },
      {
        username: 'chenming',
        real_name: '陈明',
        email: 'chenming@dcprint.com',
        phone: '13800000006',
        dept_name: '仓库管理部',
        role_code: 'warehouse_keeper',
      },
      {
        username: 'zhaolei',
        real_name: '赵磊',
        email: 'zhaolei@dcprint.com',
        phone: '13800000007',
        dept_name: '仓库管理部',
        role_code: 'warehouse_manager',
      },
      {
        username: 'sunli',
        real_name: '孙丽',
        email: 'sunli@dcprint.com',
        phone: '13800000008',
        dept_name: '采购部',
        role_code: 'purchaser',
      },
      {
        username: 'zhoujie',
        real_name: '周杰',
        email: 'zhoujie@dcprint.com',
        phone: '13800000009',
        dept_name: '品质部',
        role_code: 'qc_inspector',
      },
      {
        username: 'wufang',
        real_name: '吴芳',
        email: 'wufang@dcprint.com',
        phone: '13800000010',
        dept_name: '财务行政部',
        role_code: 'accountant',
      },
    ];
    for (const user of users) {
      const deptId = deptMap[user.dept_name] || null;
      await conn.execute(
        `INSERT IGNORE INTO sys_user (username, password, real_name, email, phone, department_id, status, first_login) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
        [user.username, passwordHash, user.real_name, user.email, user.phone, deptId]
      );
      const [userRow]: Loose = await conn.execute('SELECT id FROM sys_user WHERE username = ?', [
        user.username,
      ]);
      const userId = userRow[0]?.id;
      if (!userId) continue;
      const roleId = roleMap[user.role_code];
      if (roleId) {
        try {
          await conn.execute('INSERT IGNORE INTO sys_user_role (user_id, role_id) VALUES (?, ?)', [
            userId,
            roleId,
          ]);
        } catch {}
      }
    }
    stats.sys_user = users.length;

    const warehouseCategories = [
      {
        code: 'WHCAT001',
        name: '原材料仓',
        description: '存放PET薄膜、PVC薄膜等原材料',
        sort_order: 1,
      },
      {
        code: 'WHCAT002',
        name: '半成品仓',
        description: '存放丝印后待模切的半成品',
        sort_order: 2,
      },
      { code: 'WHCAT003', name: '成品仓', description: '存放已完成检验的成品标签', sort_order: 3 },
      {
        code: 'WHCAT004',
        name: '辅料仓',
        description: '存放不干胶、保护膜等辅助材料',
        sort_order: 4,
      },
      {
        code: 'WHCAT005',
        name: '油墨仓',
        description: '存放丝印油墨、UV油墨、溶剂等',
        sort_order: 5,
      },
      {
        code: 'WHCAT006',
        name: '危化品仓',
        description: '存放易燃易爆化学品，需特殊管理',
        sort_order: 6,
      },
      {
        code: 'WHCAT007',
        name: '冷藏仓',
        description: '存放需低温保存的特殊油墨和银浆',
        sort_order: 7,
      },
      { code: 'WHCAT008', name: '待检仓', description: '存放待检验的来料和成品', sort_order: 8 },
      {
        code: 'WHCAT009',
        name: '退货仓',
        description: '存放客户退货和供应商退货物品',
        sort_order: 9,
      },
      { code: 'WHCAT010', name: '废品仓', description: '存放不合格品和生产废料', sort_order: 10 },
    ];
    for (const cat of warehouseCategories) {
      await conn.execute(
        `INSERT IGNORE INTO sys_warehouse_category (code, name, description, sort_order, status) VALUES (?, ?, ?, ?, ?)`,
        [cat.code, cat.name, cat.description, cat.sort_order, 1]
      );
    }
    stats.sys_warehouse_category = warehouseCategories.length;

    const materialCategories = [
      {
        category_code: 'MATCAT001',
        category_name: '薄膜材料',
        parent_id: null,
        category_type: 1,
        sort_order: 1,
      },
      {
        category_code: 'MATCAT002',
        category_name: '油墨材料',
        parent_id: null,
        category_type: 2,
        sort_order: 2,
      },
      {
        category_code: 'MATCAT003',
        category_name: '辅助材料',
        parent_id: null,
        category_type: 3,
        sort_order: 3,
      },
      {
        category_code: 'MATCAT004',
        category_name: '成品',
        parent_id: null,
        category_type: 4,
        sort_order: 4,
      },
      {
        category_code: 'MATCAT01001',
        category_name: 'PET薄膜',
        parent_id: null,
        category_type: 1,
        sort_order: 1,
      },
      {
        category_code: 'MATCAT01002',
        category_name: 'PVC薄膜',
        parent_id: null,
        category_type: 1,
        sort_order: 2,
      },
      {
        category_code: 'MATCAT02001',
        category_name: '溶剂型油墨',
        parent_id: null,
        category_type: 2,
        sort_order: 1,
      },
      {
        category_code: 'MATCAT02002',
        category_name: 'UV油墨',
        parent_id: null,
        category_type: 2,
        sort_order: 2,
      },
      {
        category_code: 'MATCAT03001',
        category_name: '网版材料',
        parent_id: null,
        category_type: 3,
        sort_order: 1,
      },
      {
        category_code: 'MATCAT04001',
        category_name: '标签成品',
        parent_id: null,
        category_type: 4,
        sort_order: 1,
      },
    ];
    for (const cat of materialCategories) {
      await conn.execute(
        `INSERT IGNORE INTO inv_material_category (category_code, category_name, parent_id, sort_order, status) VALUES (?, ?, ?, ?, 1)`,
        [cat.category_code, cat.category_name, cat.parent_id, cat.sort_order]
      );
    }
    const [matCatRows]: Loose = await conn.execute(
      'SELECT id, category_code, category_name FROM inv_material_category ORDER BY id'
    );
    const matCatMap: Record<string, number> = {};
    for (const row of matCatRows) {
      matCatMap[row.category_name] = row.id;
    }
    const parentUpdates: [number, string][] = [
      [matCatMap['PET薄膜'], '薄膜材料'],
      [matCatMap['PVC薄膜'], '薄膜材料'],
      [matCatMap['溶剂型油墨'], '油墨材料'],
      [matCatMap['UV油墨'], '油墨材料'],
      [matCatMap['网版材料'], '辅助材料'],
      [matCatMap['标签成品'], '成品'],
    ];
    for (const [childId, parentName] of parentUpdates) {
      if (childId && matCatMap[parentName]) {
        await conn.execute('UPDATE inv_material_category SET parent_id = ? WHERE id = ?', [
          matCatMap[parentName],
          childId,
        ]);
      }
    }
    stats.inv_material_category = materialCategories.length;

    const dictTypes = [
      {
        dict_name: '仓库类型',
        dict_code: 'warehouse_type',
        status: 1,
        description: '仓库分类类型',
      },
      { dict_name: '物料类型', dict_code: 'material_type', status: 1, description: '物料分类类型' },
      {
        dict_name: '入库状态',
        dict_code: 'inbound_status',
        status: 1,
        description: '入库单据状态',
      },
      {
        dict_name: '出库状态',
        dict_code: 'outbound_status',
        status: 1,
        description: '出库单据状态',
      },
      {
        dict_name: '工单状态',
        dict_code: 'work_order_status',
        status: 1,
        description: '生产工单状态',
      },
      {
        dict_name: '检验结果',
        dict_code: 'quality_result',
        status: 1,
        description: '品质检验结果',
      },
      { dict_name: '优先级', dict_code: 'priority', status: 1, description: '任务优先级' },
      {
        dict_name: '结算方式',
        dict_code: 'settlement_type',
        status: 1,
        description: '付款结算方式',
      },
      { dict_name: '通知类型', dict_code: 'notice_type', status: 1, description: '系统通知类型' },
      { dict_name: '是否', dict_code: 'yes_no', status: 1, description: '通用是否选项' },
    ];
    for (const dt of dictTypes) {
      await conn.execute(
        `INSERT IGNORE INTO sys_dict_type (dict_name, dict_code, status, description) VALUES (?, ?, ?, ?)`,
        [dt.dict_name, dt.dict_code, dt.status, dt.description]
      );
    }
    const [dictTypeRows]: Loose = await conn.execute(
      'SELECT id, dict_code FROM sys_dict_type ORDER BY id'
    );
    const dictTypeMap: Record<string, number> = {};
    for (const row of dictTypeRows) {
      dictTypeMap[row.dict_code] = row.id;
    }
    stats.sys_dict_type = dictTypes.length;

    const dictDataList = [
      {
        dict_type: 'warehouse_type',
        items: [
          { label: '原材料仓', value: '1' },
          { label: '半成品仓', value: '2' },
          { label: '成品仓', value: '3' },
          { label: '辅料仓', value: '4' },
          { label: '油墨仓', value: '5' },
          { label: '危化品仓', value: '6' },
          { label: '冷藏仓', value: '7' },
          { label: '待检仓', value: '8' },
          { label: '退货仓', value: '9' },
          { label: '废品仓', value: '10' },
        ],
      },
      {
        dict_type: 'material_type',
        items: [
          { label: '薄膜', value: '1' },
          { label: '油墨', value: '2' },
          { label: '辅助材料', value: '3' },
          { label: '成品', value: '4' },
          { label: '网版', value: '5' },
          { label: '刀模', value: '6' },
          { label: '溶剂', value: '7' },
          { label: '光油', value: '8' },
          { label: '银浆', value: '9' },
          { label: '其他', value: '10' },
        ],
      },
      {
        dict_type: 'inbound_status',
        items: [
          { label: '草稿', value: '0' },
          { label: '待审核', value: '1' },
          { label: '已审核', value: '2' },
          { label: '已完成', value: '3' },
          { label: '已取消', value: '4' },
          { label: '已关闭', value: '5' },
          { label: '审核中', value: '6' },
          { label: '已驳回', value: '7' },
          { label: '部分完成', value: '8' },
          { label: '异常', value: '9' },
        ],
      },
      {
        dict_type: 'outbound_status',
        items: [
          { label: '草稿', value: '0' },
          { label: '待审核', value: '1' },
          { label: '已完成', value: '2' },
          { label: '已取消', value: '3' },
          { label: '审核中', value: '4' },
          { label: '已驳回', value: '5' },
          { label: '部分完成', value: '6' },
          { label: '异常', value: '7' },
          { label: '待出库', value: '8' },
          { label: '已关闭', value: '9' },
        ],
      },
      {
        dict_type: 'work_order_status',
        items: [
          { label: '待确认', value: '0' },
          { label: '已确认', value: '1' },
          { label: '备料中', value: '2' },
          { label: '生产中', value: '3' },
          { label: '已完成', value: '4' },
          { label: '已取消', value: '5' },
          { label: '暂停', value: '6' },
          { label: '待排产', value: '7' },
          { label: '已关闭', value: '8' },
          { label: '异常', value: '9' },
        ],
      },
      {
        dict_type: 'quality_result',
        items: [
          { label: '待检', value: '0' },
          { label: '合格', value: '1' },
          { label: '不合格', value: '2' },
          { label: '让步接收', value: '3' },
          { label: '待复检', value: '4' },
          { label: '特采', value: '5' },
          { label: '挑选', value: '6' },
          { label: '返工', value: '7' },
          { label: '报废', value: '8' },
          { label: '待判定', value: '9' },
        ],
      },
      {
        dict_type: 'priority',
        items: [
          { label: '紧急', value: '1' },
          { label: '高', value: '2' },
          { label: '普通', value: '3' },
          { label: '低', value: '4' },
          { label: '最低', value: '5' },
          { label: '特急', value: '6' },
          { label: '一般', value: '7' },
          { label: '较高', value: '8' },
          { label: '较低', value: '9' },
          { label: '无优先级', value: '10' },
        ],
      },
      {
        dict_type: 'settlement_type',
        items: [
          { label: '货到付款', value: '1' },
          { label: '月结30天', value: '2' },
          { label: '月结60天', value: '3' },
          { label: '月结90天', value: '4' },
          { label: '预付款', value: '5' },
          { label: '分期付款', value: '6' },
          { label: '银行承兑', value: '7' },
          { label: '商业承兑', value: '8' },
          { label: '现金', value: '9' },
          { label: '其他', value: '10' },
        ],
      },
      {
        dict_type: 'notice_type',
        items: [
          { label: '通知', value: '1' },
          { label: '公告', value: '2' },
          { label: '提醒', value: '3' },
          { label: '预警', value: '4' },
          { label: '审批', value: '5' },
          { label: '系统', value: '6' },
          { label: '任务', value: '7' },
          { label: '变更', value: '8' },
          { label: '异常', value: '9' },
          { label: '其他', value: '10' },
        ],
      },
      {
        dict_type: 'yes_no',
        items: [
          { label: '是', value: '1' },
          { label: '否', value: '0' },
          { label: '启用', value: '1' },
          { label: '禁用', value: '0' },
          { label: '有效', value: '1' },
          { label: '无效', value: '0' },
          { label: '开启', value: '1' },
          { label: '关闭', value: '0' },
          { label: '允许', value: '1' },
          { label: '禁止', value: '0' },
        ],
      },
    ];
    let dictDataCount = 0;
    for (const dt of dictDataList) {
      const dictTypeId = dictTypeMap[dt.dict_type];
      if (!dictTypeId) continue;
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i];
        await conn.execute(
          `INSERT IGNORE INTO sys_dict_data (dict_type_id, dict_label, dict_value, sort_order, status, remark) VALUES (?, ?, ?, ?, ?, ?)`,
          [dictTypeId, item.label, item.value, i + 1, 1, null]
        );
        dictDataCount++;
      }
    }
    stats.sys_dict_data = dictDataCount;

    const configs = [
      {
        config_name: '公司名称',
        config_key: 'company_name',
        config_value: '越南达昌丝网印刷有限公司',
        config_type: '1',
        remark: '公司全称',
      },
      {
        config_name: '公司简称',
        config_key: 'company_short_name',
        config_value: '达昌印刷',
        config_type: '1',
        remark: '公司简称',
      },
      {
        config_name: '公司编码',
        config_key: 'company_code',
        config_value: 'DCPRINT',
        config_type: '1',
        remark: '公司编码简称',
      },
      {
        config_name: '默认仓库',
        config_key: 'default_warehouse',
        config_value: 'WH001',
        config_type: '1',
        remark: '系统默认仓库编码',
      },
      {
        config_name: '先进先出模式',
        config_key: 'fifo_mode',
        config_value: 'true',
        config_type: '2',
        remark: '出库是否启用先进先出',
      },
      {
        config_name: '入库自动审核',
        config_key: 'auto_inbound_approve',
        config_value: 'false',
        config_type: '2',
        remark: '入库单是否自动审核',
      },
      {
        config_name: '批次号前缀',
        config_key: 'batch_no_prefix',
        config_value: 'B',
        config_type: '1',
        remark: '自动生成批次号前缀',
      },
      {
        config_name: '订单号前缀',
        config_key: 'order_no_prefix',
        config_value: 'ORD',
        config_type: '1',
        remark: '自动生成订单号前缀',
      },
      {
        config_name: '币种',
        config_key: 'currency',
        config_value: 'CNY',
        config_type: '1',
        remark: '系统默认币种',
      },
      {
        config_name: '税率(%)',
        config_key: 'tax_rate',
        config_value: '13',
        config_type: '1',
        remark: '默认增值税税率',
      },
      {
        config_name: '入库打印标签',
        config_key: 'print_label_on_inbound',
        config_value: 'true',
        config_type: '2',
        remark: '入库时是否自动打印标签',
      },
      // ===== 系统配置中心（六大分组，命名空间 key）=====
      // 库存配置
      {
        config_name: '库存允许负数',
        config_key: 'inventory.allow_negative',
        config_value: 'false',
        config_type: '2',
        remark: '是否允许库存数量为负数',
      },
      {
        config_name: '库存预警阈值',
        config_key: 'inventory.alert_threshold',
        config_value: '10',
        config_type: '1',
        remark: '低于此数量触发库存预警',
      },
      {
        config_name: '库存盘点差异审批',
        config_key: 'inventory.stocktake_approval',
        config_value: 'true',
        config_type: '2',
        remark: '盘点差异是否需要审批',
      },
      {
        config_name: '默认仓库编码',
        config_key: 'inventory.default_warehouse',
        config_value: 'WH001',
        config_type: '1',
        remark: '新建单据默认带出的仓库编码',
      },
      {
        config_name: '库存数量精度',
        config_key: 'inventory.decimal_precision',
        config_value: '2',
        config_type: '1',
        remark: '库存数量保留的小数位数',
      },
      {
        config_name: '安全库存比例',
        config_key: 'inventory.safety_stock_ratio',
        config_value: '20',
        config_type: '1',
        remark: '安全库存占日均销量的百分比',
      },
      {
        config_name: '自动生成批次号',
        config_key: 'inventory.auto_batch',
        config_value: 'true',
        config_type: '2',
        remark: '入库时是否自动生成批次号',
      },
      {
        config_name: '批次过期预警天数',
        config_key: 'inventory.batch_expire_warn_days',
        config_value: '30',
        config_type: '1',
        remark: '距批次失效还有多少天时进行预警',
      },
      {
        config_name: '库存盘点周期',
        config_key: 'inventory.stocktake_cycle_days',
        config_value: '90',
        config_type: '1',
        remark: '默认库存盘点周期（天）',
      },
      {
        config_name: '负库存预警提醒',
        config_key: 'inventory.negative_warning',
        config_value: 'true',
        config_type: '2',
        remark: '出现负库存时是否发送预警提醒',
      },
      {
        config_name: '入库单号前缀',
        config_key: 'inbound.prefix',
        config_value: 'INB',
        config_type: '1',
        remark: '入库单号前缀',
      },
      {
        config_name: '出库单号前缀',
        config_key: 'outbound.prefix',
        config_value: 'OTB',
        config_type: '1',
        remark: '出库单号前缀',
      },
      // 订单配置
      {
        config_name: '订单号前缀',
        config_key: 'order.prefix',
        config_value: 'ORD',
        config_type: '1',
        remark: '销售订单号前缀',
      },
      {
        config_name: '订单自动审核',
        config_key: 'order.auto_approve',
        config_value: 'false',
        config_type: '2',
        remark: '订单提交后是否自动审核通过',
      },
      {
        config_name: '缺货处理方式',
        config_key: 'order.out_of_stock_action',
        config_value: 'warn',
        config_type: '1',
        remark: 'warn=提醒，block=禁止下单，allow=允许超卖',
      },
      {
        config_name: '订单超期提醒',
        config_key: 'order.overdue_remind_days',
        config_value: '7',
        config_type: '1',
        remark: '订单超过承诺交货期多少天触发提醒',
      },
      {
        config_name: '允许修改已审核订单',
        config_key: 'order.allow_edit_approved',
        config_value: 'false',
        config_type: '2',
        remark: '已审核订单是否允许编辑',
      },
      {
        config_name: '默认交货周期',
        config_key: 'order.default_delivery_days',
        config_value: '7',
        config_type: '1',
        remark: '新建销售订单默认的承诺交货天数',
      },
      {
        config_name: '订单价格精度',
        config_key: 'order.price_precision',
        config_value: '2',
        config_type: '1',
        remark: '订单单价与金额保留的小数位数',
      },
      {
        config_name: '最低订单金额',
        config_key: 'order.min_amount',
        config_value: '0',
        config_type: '1',
        remark: '低于此金额的订单将被拒绝，0表示不限制',
      },
      {
        config_name: '客户信用额度控制',
        config_key: 'order.credit_control',
        config_value: 'true',
        config_type: '2',
        remark: '下单时是否校验客户可用信用额度',
      },
      {
        config_name: '退货期限',
        config_key: 'order.return_deadline_days',
        config_value: '15',
        config_type: '1',
        remark: '销售订单允许退货的天数',
      },
      {
        config_name: '未付款自动取消',
        config_key: 'order.auto_cancel_unpaid_days',
        config_value: '3',
        config_type: '1',
        remark: '未付款订单超过多少天自动取消，0表示不取消',
      },
      // 采购配置
      {
        config_name: '采购单号前缀',
        config_key: 'purchase.prefix',
        config_value: 'PO',
        config_type: '1',
        remark: '采购订单号前缀',
      },
      {
        config_name: '采购价格上限控制',
        config_key: 'purchase.price_control',
        config_value: 'true',
        config_type: '2',
        remark: '采购价超过历史最高价时是否拦截',
      },
      {
        config_name: '采购到货提醒',
        config_key: 'purchase.arrival_remind_days',
        config_value: '3',
        config_type: '1',
        remark: '距预计到货日期多少天发送提醒',
      },
      {
        config_name: '采购允差比例',
        config_key: 'purchase.tolerance_ratio',
        config_value: '5',
        config_type: '1',
        remark: '到货数量与订单数量的允许偏差百分比',
      },
      {
        config_name: '供应商评估周期',
        config_key: 'purchase.supplier_eval_cycle',
        config_value: '90',
        config_type: '1',
        remark: '供应商绩效评估周期（天）',
      },
      {
        config_name: '采购默认税率',
        config_key: 'purchase.tax_rate',
        config_value: '13',
        config_type: '1',
        remark: '采购单据默认税率（%）',
      },
      {
        config_name: '采购到货自动入库',
        config_key: 'purchase.auto_stock_in',
        config_value: 'false',
        config_type: '2',
        remark: '采购到货确认后是否自动生成入库单',
      },
      {
        config_name: '采购审批金额阈值',
        config_key: 'purchase.approval_threshold',
        config_value: '10000',
        config_type: '1',
        remark: '超过此金额的采购单需要审批',
      },
      {
        config_name: '最小采购批量',
        config_key: 'purchase.min_qty',
        config_value: '1',
        config_type: '1',
        remark: '采购明细默认最小起订数量',
      },
      {
        config_name: '采购退货期限',
        config_key: 'purchase.return_deadline_days',
        config_value: '30',
        config_type: '1',
        remark: '采购订单允许退货的天数',
      },
      // 财务配置
      {
        config_name: '默认付款期限',
        config_key: 'finance.payment_terms_days',
        config_value: '30',
        config_type: '1',
        remark: '默认付款期限天数',
      },
      {
        config_name: '税率',
        config_key: 'finance.tax_rate',
        config_value: '13',
        config_type: '1',
        remark: '默认增值税税率（%）',
      },
      {
        config_name: '默认币种',
        config_key: 'finance.default_currency',
        config_value: 'CNY',
        config_type: '1',
        remark: '系统默认结算币种',
      },
      {
        config_name: '财务结账日',
        config_key: 'finance.settlement_day',
        config_value: '1',
        config_type: '1',
        remark: '每月财务结账日（日期）',
      },
      {
        config_name: '应收账款预警',
        config_key: 'finance.ar_receivable_warn_days',
        config_value: '30',
        config_type: '1',
        remark: '应收账款超过多少天未收回触发预警',
      },
      {
        config_name: '启用多币种',
        config_key: 'finance.multi_currency',
        config_value: 'false',
        config_type: '2',
        remark: '是否启用多币种核算',
      },
      {
        config_name: '默认发票类型',
        config_key: 'finance.invoice_type',
        config_value: 'vat',
        config_type: '1',
        remark: 'vat=增值税专用发票，normal=普通发票',
      },
      {
        config_name: '成本计价方法',
        config_key: 'finance.cost_method',
        config_value: 'moving_avg',
        config_type: '1',
        remark: 'moving_avg=移动平均，fifo=先进先出，weighted=加权平均',
      },
      {
        config_name: '现金折扣率',
        config_key: 'finance.cash_discount_rate',
        config_value: '2',
        config_type: '1',
        remark: '提前付款可享受的现金折扣率（%）',
      },
      {
        config_name: '金额舍入方式',
        config_key: 'finance.rounding_mode',
        config_value: 'round_half_up',
        config_type: '1',
        remark: 'round_half_up=四舍五入，round_up=向上，round_down=向下',
      },
      // 系统配置
      {
        config_name: '密码最小长度',
        config_key: 'system.password_min_length',
        config_value: '6',
        config_type: '1',
        remark: '用户密码最小长度要求',
      },
      {
        config_name: '登录失败锁定次数',
        config_key: 'system.login_fail_lock_count',
        config_value: '5',
        config_type: '1',
        remark: '连续登录失败多少次后锁定账号',
      },
      {
        config_name: '登录锁定时间',
        config_key: 'system.login_lock_minutes',
        config_value: '30',
        config_type: '1',
        remark: '账号锁定持续时间（分钟）',
      },
      {
        config_name: '密码过期天数',
        config_key: 'system.password_expire_days',
        config_value: '90',
        config_type: '1',
        remark: '0表示永不过期',
      },
      {
        config_name: '初始密码强制修改',
        config_key: 'system.force_change_password',
        config_value: 'true',
        config_type: '2',
        remark: '首次登录是否强制修改密码',
      },
      {
        config_name: '操作日志保留天数',
        config_key: 'system.log_retention_days',
        config_value: '180',
        config_type: '1',
        remark: '操作日志保留天数，0表示永久保留',
      },
      {
        config_name: '会话超时',
        config_key: 'system.session_timeout',
        config_value: '120',
        config_type: '1',
        remark: '用户会话超时时间（分钟）',
      },
      {
        config_name: '系统名称',
        config_key: 'system.name',
        config_value: 'DC ERP',
        config_type: '1',
        remark: '系统登录页与标题显示的名称',
      },
      {
        config_name: '默认语言',
        config_key: 'system.default_language',
        config_value: 'zh-CN',
        config_type: '1',
        remark: '新用户默认语言',
      },
      {
        config_name: '系统默认时区',
        config_key: 'system.timezone',
        config_value: 'Asia/Shanghai',
        config_type: '1',
        remark: '系统时间显示使用的时区',
      },
      {
        config_name: '数据备份周期',
        config_key: 'system.backup_cycle_days',
        config_value: '7',
        config_type: '1',
        remark: '自动数据备份周期（天）',
      },
      {
        config_name: '启用双因素认证',
        config_key: 'system.two_factor_auth',
        config_value: 'false',
        config_type: '2',
        remark: '登录时是否启用双因素认证（2FA）',
      },
      {
        config_name: '系统维护模式',
        config_key: 'system.maintenance_mode',
        config_value: 'false',
        config_type: '2',
        remark: '开启后仅管理员可登录系统',
      },
      // 其他配置
      {
        config_name: '公司名称',
        config_key: 'company.name',
        config_value: '某某科技有限公司',
        config_type: '1',
        remark: '打印单据与报表抬头显示的公司名称',
      },
      {
        config_name: '公司地址',
        config_key: 'company.address',
        config_value: '',
        config_type: '1',
        remark: '公司注册地址',
      },
      {
        config_name: '客服电话',
        config_key: 'company.phone',
        config_value: '400-000-0000',
        config_type: '1',
        remark: '对外公布的客服联系电话',
      },
      {
        config_name: '纳税人识别号',
        config_key: 'company.tax_no',
        config_value: '',
        config_type: '1',
        remark: '公司纳税人识别号（开票使用）',
      },
      {
        config_name: '启用邮件通知',
        config_key: 'notify.email',
        config_value: 'true',
        config_type: '2',
        remark: '业务事件是否发送邮件通知',
      },
      {
        config_name: '启用短信通知',
        config_key: 'notify.sms',
        config_value: 'false',
        config_type: '2',
        remark: '业务事件是否发送短信通知',
      },
      {
        config_name: '导出文件编码',
        config_key: 'export.encoding',
        config_value: 'UTF-8',
        config_type: '1',
        remark: '数据导出文件的字符编码',
      },
      {
        config_name: '默认分页大小',
        config_key: 'ui.page_size',
        config_value: '20',
        config_type: '1',
        remark: '列表页默认每页显示条数',
      },
      {
        config_name: '显示演示数据',
        config_key: 'ui.demo_data',
        config_value: 'false',
        config_type: '2',
        remark: '是否在演示环境中显示示例数据',
      },
    ];
    for (const cfg of configs) {
      await conn.execute(
        `INSERT IGNORE INTO sys_config (config_name, config_key, config_value, config_type, description) VALUES (?, ?, ?, ?, ?)`,
        [cfg.config_name, cfg.config_key, cfg.config_value, cfg.config_type, cfg.remark]
      );
    }
    stats.sys_config = configs.length;

    const [allMenus]: Loose = await conn.execute(
      'SELECT id, menu_code, parent_id FROM sys_menu WHERE status = 1'
    );
    const menuCodeToId: Record<string, number> = {};
    const menuParentMap: Record<number, string> = {};
    for (const m of allMenus) {
      menuCodeToId[m.menu_code] = m.id;
      menuParentMap[m.id] = m.menu_code;
    }

    const topLevelCodes = [
      'dashboard_center',
      'orders',
      'engineering',
      'production',
      'warehouse',
      'purchase',
      'quality',
      'finance',
      'hr',
      'settings',
    ];
    const _topLevelIds = topLevelCodes.filter((c) => menuCodeToId[c]).map((c) => menuCodeToId[c]);

    function getMenuIdsByParentCode(parentCode: string): number[] {
      const parentId = menuCodeToId[parentCode];
      if (!parentId) return [];
      return allMenus.filter((m: Loose) => m.parent_id === parentId).map((m: Loose) => m.id);
    }

    const dashboardMenuIds = getMenuIdsByParentCode('dashboard_center');
    const dashboardTopId = menuCodeToId['dashboard_center']
      ? [menuCodeToId['dashboard_center']]
      : [];
    const ordersMenuIds = getMenuIdsByParentCode('orders');
    const ordersTopId = menuCodeToId['orders'] ? [menuCodeToId['orders']] : [];
    const engineeringMenuIds = getMenuIdsByParentCode('engineering');
    const engineeringTopId = menuCodeToId['engineering'] ? [menuCodeToId['engineering']] : [];
    const productionMenuIds = getMenuIdsByParentCode('production');
    const productionTopId = menuCodeToId['production'] ? [menuCodeToId['production']] : [];
    const warehouseMenuIds = getMenuIdsByParentCode('warehouse');
    const warehouseTopId = menuCodeToId['warehouse'] ? [menuCodeToId['warehouse']] : [];
    const purchaseMenuIds = getMenuIdsByParentCode('purchase');
    const purchaseTopId = menuCodeToId['purchase'] ? [menuCodeToId['purchase']] : [];
    const qualityMenuIds = getMenuIdsByParentCode('quality');
    const qualityTopId = menuCodeToId['quality'] ? [menuCodeToId['quality']] : [];
    const financeMenuIds = getMenuIdsByParentCode('finance');
    const financeTopId = menuCodeToId['finance'] ? [menuCodeToId['finance']] : [];

    const roleMenuAssignments: Record<string, number[]> = {
      super_admin: allMenus.map((m: Loose) => m.id),
      business_manager: [...dashboardTopId, ...dashboardMenuIds, ...ordersTopId, ...ordersMenuIds],
      sales: [
        ...dashboardTopId,
        ...dashboardMenuIds,
        ...ordersTopId,
        ordersMenuIds[0] || 0,
        ordersMenuIds[1] || 0,
      ].filter(Boolean),
      engineer: [
        ...dashboardTopId,
        ...dashboardMenuIds,
        ...engineeringTopId,
        ...engineeringMenuIds,
      ],
      production_manager: [
        ...dashboardTopId,
        ...dashboardMenuIds,
        ...productionTopId,
        ...productionMenuIds,
        ...warehouseTopId,
        warehouseMenuIds[0] || 0,
        warehouseMenuIds[2] || 0,
      ].filter(Boolean),
      warehouse_manager: [
        ...dashboardTopId,
        ...dashboardMenuIds,
        ...warehouseTopId,
        ...warehouseMenuIds,
      ],
      warehouse_keeper: [
        ...dashboardTopId,
        ...dashboardMenuIds,
        ...warehouseTopId,
        warehouseMenuIds[0] || 0,
        warehouseMenuIds[1] || 0,
        warehouseMenuIds[2] || 0,
      ].filter(Boolean),
      purchaser: [...dashboardTopId, ...dashboardMenuIds, ...purchaseTopId, ...purchaseMenuIds],
      qc_inspector: [...dashboardTopId, ...dashboardMenuIds, ...qualityTopId, ...qualityMenuIds],
      accountant: [...dashboardTopId, ...dashboardMenuIds, ...financeTopId, ...financeMenuIds],
    };

    let roleMenuCount = 0;
    for (const [roleCode, menuIds] of Object.entries(roleMenuAssignments)) {
      const roleId = roleMap[roleCode];
      if (!roleId) continue;
      for (const menuId of menuIds) {
        if (!menuId) continue;
        await conn.execute(`INSERT IGNORE INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)`, [
          roleId,
          menuId,
        ]);
        roleMenuCount++;
      }
    }
    stats.sys_role_menu = roleMenuCount;

    const notices = [
      {
        notice_title: 'DC印刷ERP系统上线通知',
        notice_type: 2,
        notice_content: 'DC印刷ERP系统已正式上线，请各部门及时登录使用，如有问题请联系管理部。',
        status: 1,
      },
      {
        notice_title: '4月份生产计划安排',
        notice_type: 1,
        notice_content:
          '4月份重点生产任务：美的空调面板标签50000张、格力洗衣机面板30000张，请生产部做好排产准备。',
        status: 1,
      },
      {
        notice_title: '原材料到货通知',
        notice_type: 3,
        notice_content: '东莞PET薄膜500000张已到货，请仓库管理部安排入库检验。',
        status: 1,
      },
      {
        notice_title: '丝印油墨安全操作规程更新',
        notice_type: 1,
        notice_content: '新版丝印油墨安全操作规程已发布，请生产车间全体人员认真学习并严格执行。',
        status: 1,
      },
      {
        notice_title: '品质部月度检验报告',
        notice_type: 1,
        notice_content: '3月份来料检验合格率99.8%，成品检验合格率99.5%，请各部门继续保持。',
        status: 1,
      },
      {
        notice_title: '仓库盘点安排通知',
        notice_type: 3,
        notice_content: '定于4月25日进行月度仓库盘点，请仓管员提前做好准备，暂停非紧急出入库操作。',
        status: 1,
      },
      {
        notice_title: '导电银浆到货提醒',
        notice_type: 3,
        notice_content:
          '深圳特种油墨公司导电银浆10kg已到货，该材料需冷藏保存，请仓库注意存储条件。',
        status: 1,
      },
      {
        notice_title: '五一劳动节放假通知',
        notice_type: 2,
        notice_content: '5月1日至5月5日放假，5月6日正常上班。请各部门提前安排好生产和工作计划。',
        status: 1,
      },
      {
        notice_title: '客户退货处理通知',
        notice_type: 3,
        notice_content:
          '美的集团退回空调面板标签2000张，原因：丝印偏色。请品质部和生产部跟进处理。',
        status: 1,
      },
      {
        notice_title: '新员工入职培训通知',
        notice_type: 1,
        notice_content:
          '4月份新入职员工培训安排：ERP系统操作培训、安全生产培训、品质标准培训，请相关人员准时参加。',
        status: 1,
      },
    ];
    for (const notice of notices) {
      await conn.execute(
        `INSERT IGNORE INTO sys_notice (notice_title, notice_type, notice_content, status) VALUES (?, ?, ?, ?)`,
        [notice.notice_title, notice.notice_type, notice.notice_content, notice.status]
      );
    }
    stats.sys_notice = notices.length;

    const loginLogs = [
      {
        username: 'admin',
        ip_address: '192.168.1.100',
        login_location: '内网-管理部',
        browser: 'Chrome 120',
        os: 'Windows 11',
        status: 1,
        remark: '超级管理员登录',
      },
      {
        username: 'zhangwei',
        ip_address: '192.168.1.101',
        login_location: '内网-业务部',
        browser: 'Chrome 120',
        os: 'Windows 11',
        status: 1,
        remark: '业务经理登录',
      },
      {
        username: 'lina',
        ip_address: '192.168.1.102',
        login_location: '内网-业务部',
        browser: 'Firefox 121',
        os: 'Windows 10',
        status: 1,
        remark: '业务员登录',
      },
      {
        username: 'wangqiang',
        ip_address: '192.168.1.103',
        login_location: '内网-工程技术部',
        browser: 'Chrome 120',
        os: 'Windows 11',
        status: 1,
        remark: '工程师登录',
      },
      {
        username: 'liuyang',
        ip_address: '192.168.1.104',
        login_location: '内网-生产部',
        browser: 'Edge 120',
        os: 'Windows 10',
        status: 1,
        remark: '生产主管登录',
      },
      {
        username: 'chenming',
        ip_address: '192.168.1.105',
        login_location: '内网-仓库管理部',
        browser: 'Chrome 120',
        os: 'Windows 10',
        status: 1,
        remark: '仓管员登录',
      },
      {
        username: 'zhaolei',
        ip_address: '192.168.1.106',
        login_location: '内网-仓库管理部',
        browser: 'Chrome 119',
        os: 'Windows 11',
        status: 1,
        remark: '仓库主管登录',
      },
      {
        username: 'sunli',
        ip_address: '192.168.1.107',
        login_location: '内网-采购部',
        browser: 'Chrome 120',
        os: 'macOS 14',
        status: 1,
        remark: '采购员登录',
      },
      {
        username: 'zhoujie',
        ip_address: '192.168.1.108',
        login_location: '内网-品质部',
        browser: 'Firefox 121',
        os: 'Windows 11',
        status: 1,
        remark: '品质检验员登录',
      },
      {
        username: 'wufang',
        ip_address: '192.168.1.109',
        login_location: '内网-财务行政部',
        browser: 'Chrome 120',
        os: 'Windows 10',
        status: 1,
        remark: '财务登录',
      },
    ];
    for (const log of loginLogs) {
      try {
        await conn.execute(
          `INSERT INTO sys_login_log (username, ip, location, user_agent, status, error_msg) VALUES (?, ?, ?, ?, ?, ?)`,
          [log.username, log.ip_address, log.login_location, log.browser, log.status, log.remark]
        );
      } catch (_e) {}
    }
    stats.sys_login_log = loginLogs.length;

    const operLogs = [
      {
        title: '用户管理',
        business_type: 1,
        method: '/api/system/user',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/system/user',
        oper_ip: '192.168.1.100',
      },
      {
        title: '角色权限',
        business_type: 2,
        method: '/api/system/roles',
        request_method: 'PUT',
        oper_name: 'admin',
        oper_url: '/api/system/roles',
        oper_ip: '192.168.1.100',
      },
      {
        title: '菜单管理',
        business_type: 1,
        method: '/api/init/menus',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/init/menus',
        oper_ip: '192.168.1.100',
      },
      {
        title: '组织架构',
        business_type: 1,
        method: '/api/hr/departments',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/hr/departments',
        oper_ip: '192.168.1.100',
      },
      {
        title: '仓库分类',
        business_type: 1,
        method: '/api/organization/warehouse-category',
        request_method: 'POST',
        oper_name: 'zhaolei',
        oper_url: '/api/organization/warehouse-category',
        oper_ip: '192.168.1.106',
      },
      {
        title: '物料分类',
        business_type: 1,
        method: '/api/base-data/material-category',
        request_method: 'POST',
        oper_name: 'wangqiang',
        oper_url: '/api/base-data/material-category',
        oper_ip: '192.168.1.103',
      },
      {
        title: '系统配置',
        business_type: 2,
        method: '/api/system/config',
        request_method: 'PUT',
        oper_name: 'admin',
        oper_url: '/api/system/config',
        oper_ip: '192.168.1.100',
      },
      {
        title: '字典管理',
        business_type: 1,
        method: '/api/system/dict-type',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/system/dict-type',
        oper_ip: '192.168.1.100',
      },
      {
        title: '通知公告',
        business_type: 1,
        method: '/api/system/notice',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/system/notice',
        oper_ip: '192.168.1.100',
      },
      {
        title: '数据初始化',
        business_type: 1,
        method: '/api/init/settings-seed',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/init/settings-seed',
        oper_ip: '192.168.1.100',
      },
    ];
    for (const log of operLogs) {
      try {
        await conn.execute(
          `INSERT INTO sys_oper_log (title, business_type, method, request_method, oper_name, oper_url, oper_ip, status, oper_time) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
          [
            log.title,
            log.business_type,
            log.method,
            log.request_method,
            log.oper_name,
            log.oper_url,
            log.oper_ip,
          ]
        );
      } catch (_e) {}
    }
    stats.sys_oper_log = operLogs.length;

    const operationLogs = [
      {
        module: '用户管理',
        operation: '新增用户',
        oper_name: 'admin',
        oper_type: 'create',
        oper_method: 'POST',
        oper_url: '/api/system/user',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: '创建用户成功',
        status: 1,
      },
      {
        module: '角色权限',
        operation: '修改角色',
        oper_name: 'admin',
        oper_type: 'update',
        oper_method: 'PUT',
        oper_url: '/api/system/roles',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: '更新角色成功',
        status: 1,
      },
      {
        module: '菜单管理',
        operation: '查询菜单',
        oper_name: 'admin',
        oper_type: 'query',
        oper_method: 'GET',
        oper_url: '/api/menu',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: '查询菜单成功',
        status: 1,
      },
      {
        module: '组织架构',
        operation: '新增部门',
        oper_name: 'admin',
        oper_type: 'create',
        oper_method: 'POST',
        oper_url: '/api/hr/departments',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: '创建部门成功',
        status: 1,
      },
      {
        module: '仓库分类',
        operation: '查询仓库分类',
        oper_name: 'zhaolei',
        oper_type: 'query',
        oper_method: 'GET',
        oper_url: '/api/organization/warehouse-category',
        oper_ip: '192.168.1.106',
        oper_param: null,
        oper_result: '查询仓库分类成功',
        status: 1,
      },
      {
        module: '物料分类',
        operation: '查询物料分类',
        oper_name: 'wangqiang',
        oper_type: 'query',
        oper_method: 'GET',
        oper_url: '/api/base-data/material-category',
        oper_ip: '192.168.1.103',
        oper_param: null,
        oper_result: '查询物料分类成功',
        status: 1,
      },
      {
        module: '系统配置',
        operation: '修改配置',
        oper_name: 'admin',
        oper_type: 'update',
        oper_method: 'PUT',
        oper_url: '/api/system/config',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: '更新配置成功',
        status: 1,
      },
      {
        module: '字典管理',
        operation: '查询字典',
        oper_name: 'admin',
        oper_type: 'query',
        oper_method: 'GET',
        oper_url: '/api/system/dict-type',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: '查询字典成功',
        status: 1,
      },
      {
        module: '通知公告',
        operation: '新增通知',
        oper_name: 'admin',
        oper_type: 'create',
        oper_method: 'POST',
        oper_url: '/api/system/notice',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: '创建通知成功',
        status: 1,
      },
      {
        module: '数据初始化',
        operation: '系统初始化',
        oper_name: 'admin',
        oper_type: 'create',
        oper_method: 'POST',
        oper_url: '/api/init/settings-seed',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: '初始化成功',
        status: 1,
      },
    ];
    for (const log of operationLogs) {
      try {
        await conn.execute(
          `INSERT INTO sys_operation_log (module, operation, oper_name, oper_type, oper_method, oper_url, oper_ip, oper_param, oper_result, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.module,
            log.operation,
            log.oper_name,
            log.oper_type,
            log.oper_method,
            log.oper_url,
            log.oper_ip,
            log.oper_param,
            log.oper_result,
            log.status,
          ]
        );
      } catch (_e) {}
    }
    stats.sys_operation_log = operationLogs.length;

    const labelTemplates = [
      {
        name: '原料入库标签（默认）',
        scenario: 'inbound',
        width_mm: 60, height_mm: 40, qr_size_mm: 20,
        html_template: '<div style="text-align:center;font-family:sans-serif;padding:4px"><img src="{qrDataUrl}" style="width:40mm;height:40mm"/><p style="font-size:10px;margin:2px 0">{materialName}</p><p style="font-size:9px;margin:2px 0">{batchNo}</p><p style="font-size:8px;margin:2px 0">{quantity} {unit}</p></div>',
        status: 1,
      },
      {
        name: '分切子码标签',
        scenario: 'split',
        width_mm: 50, height_mm: 30, qr_size_mm: 20,
        html_template: '<div style="text-align:center;font-family:sans-serif;padding:2px"><img src="{qrDataUrl}" style="width:28mm;height:28mm"/><p style="font-size:9px;margin:1px 0">{materialName}</p><p style="font-size:8px;margin:1px 0">{splitIndex}/{totalSplits}</p></div>',
        status: 1,
      },
      {
        name: '成品标签',
        scenario: 'finished',
        width_mm: 80, height_mm: 50, qr_size_mm: 20,
        html_template: '<div style="text-align:center;font-family:sans-serif;padding:4px"><img src="{qrDataUrl}" style="width:40mm;height:40mm"/><p style="font-size:12px;margin:2px 0;font-weight:bold">{productName}</p><p style="font-size:9px;margin:2px 0">{batchNo}</p><p style="font-size:9px;margin:2px 0">{quantity} {unit}</p></div>',
        status: 1,
      },
    ];
    for (const tpl of labelTemplates) {
      await conn.execute(
        `INSERT IGNORE INTO label_template (name, scenario, html_template, width_mm, height_mm, qr_size_mm, status, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [tpl.name, tpl.scenario, tpl.html_template, tpl.width_mm, tpl.height_mm, tpl.qr_size_mm]
      );
    }
    stats.label_template = labelTemplates.length;

    return stats;
  });

  return successResponse(result, '设置模块种子数据初始化成功');
});
