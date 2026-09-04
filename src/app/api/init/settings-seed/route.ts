import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

export const POST = withPermission(async (_request: NextRequest, _userInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
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
      { dept_code: 'DEPT001', dept_name: ts('k_1f4z30i'), parent_id: null, sort_order: 1 },
      { dept_code: 'DEPT002', dept_name: ts('k_axb29w'), parent_id: null, sort_order: 2 },
      { dept_code: 'DEPT003', dept_name: ts('k_boxyuc'), parent_id: null, sort_order: 3 },
      { dept_code: 'DEPT004', dept_name: ts('k_18glq49'), parent_id: null, sort_order: 4 },
      { dept_code: 'DEPT00401', dept_name: ts('k_18ldhlf'), parent_id: null, sort_order: 1 },
      { dept_code: 'DEPT00402', dept_name: ts('k_8zopts'), parent_id: null, sort_order: 2 },
      { dept_code: 'DEPT005', dept_name: ts('k_qe62zc'), parent_id: null, sort_order: 5 },
      { dept_code: 'DEPT006', dept_name: ts('k_1rgc4zf'), parent_id: null, sort_order: 6 },
      { dept_code: 'DEPT007', dept_name: ts('k_11g5fpo'), parent_id: null, sort_order: 7 },
      { dept_code: 'DEPT008', dept_name: ts('k_1jqantr'), parent_id: null, sort_order: 8 },
    ];
    for (const dept of departments) {
      await conn.execute(
        `INSERT IGNORE INTO sys_department (dept_code, dept_name, parent_id, sort_order, status, create_time, update_time) VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        [dept.dept_code, dept.dept_name, dept.parent_id, dept.sort_order]
      );
    }
    const [deptRows] = await conn.execute('SELECT id, dept_name FROM sys_department ORDER BY id');
    const deptMap: Record<string, number> = {};
    for (const row of deptRows) {
      deptMap[row.dept_name] = row.id;
    }
    const prodDeptId = deptMap[ts('k_18glq49')];
    if (prodDeptId) {
      await conn.execute('UPDATE sys_department SET parent_id = ? WHERE dept_name IN (?, ?)', [
        prodDeptId,
        ts('k_18ldhlf'),
        ts('k_8zopts'),
      ]);
    }
    stats.sys_department = departments.length;

    const roles = [
      {
        role_name: ts('k_1fcdmqa'),
        role_code: 'super_admin',
        description: ts('k_1wbi1ii'),
        data_scope: 1,
        status: 1,
        permissions: JSON.stringify(['*']),
      },
      {
        role_name: ts('k_ojn305'),
        role_code: 'business_manager',
        description: ts('k_1bw4lhk'),
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['orders:*', 'crm:*']),
      },
      {
        role_name: ts('k_15vw6tw'),
        role_code: 'sales',
        description: ts('k_vwp988'),
        data_scope: 5,
        status: 1,
        permissions: JSON.stringify(['orders:sales:*', 'orders:customers:*']),
      },
      {
        role_name: ts('k_1tyjla3'),
        role_code: 'engineer',
        description: ts('k_1p7svpc'),
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['engineering:*', 'sample:*']),
      },
      {
        role_name: ts('k_d1s7gj'),
        role_code: 'production_manager',
        description: ts('k_urfobv'),
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['production:*', 'warehouse:inventory:*']),
      },
      {
        role_name: ts('k_1bngyff'),
        role_code: 'warehouse_manager',
        description: ts('k_150714g'),
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['warehouse:*']),
      },
      {
        role_name: ts('k_hdkgmr'),
        role_code: 'warehouse_keeper',
        description: ts('k_1b6oo9h'),
        data_scope: 5,
        status: 1,
        permissions: JSON.stringify(['warehouse:inbound:*', 'warehouse:outbound:*']),
      },
      {
        role_name: ts('k_epyr6z'),
        role_code: 'purchaser',
        description: ts('k_o9zhlz'),
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['purchase:*']),
      },
      {
        role_name: ts('k_l5ij28'),
        role_code: 'qc_inspector',
        description: ts('k_1nzw62o'),
        data_scope: 2,
        status: 1,
        permissions: JSON.stringify(['quality:*']),
      },
      {
        role_name: ts('k_8s57ik'),
        role_code: 'accountant',
        description: ts('k_gc2eni'),
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
    const [roleRows] = await conn.execute('SELECT id, role_code FROM sys_role ORDER BY id');
    const roleMap: Record<string, number> = {};
    for (const row of roleRows) {
      roleMap[row.role_code] = row.id;
    }
    stats.sys_role = roles.length;

    const passwordHash = '$2b$10$ccc80YYeNdn3/h8lEJIYAuAstgboQYYmJa8B.0gEIebjMreLjvTVa';
    const users = [
      {
        username: 'admin',
        real_name: ts('k_1fcdmqa'),
        email: 'admin@dcprint.com',
        phone: '13800000001',
        dept_name: ts('k_1f4z30i'),
        role_code: 'super_admin',
      },
      {
        username: 'zhangwei',
        real_name: ts('k_3vr19c'),
        email: 'zhangwei@dcprint.com',
        phone: '13800000002',
        dept_name: ts('k_axb29w'),
        role_code: 'business_manager',
      },
      {
        username: 'lina',
        real_name: ts('k_o5eojb'),
        email: 'lina@dcprint.com',
        phone: '13800000003',
        dept_name: ts('k_axb29w'),
        role_code: 'sales',
      },
      {
        username: 'wangqiang',
        real_name: ts('k_nqtivk'),
        email: 'wangqiang@dcprint.com',
        phone: '13800000004',
        dept_name: ts('k_boxyuc'),
        role_code: 'engineer',
      },
      {
        username: 'liuyang',
        real_name: ts('k_9nfhqc'),
        email: 'liuyang@dcprint.com',
        phone: '13800000005',
        dept_name: ts('k_18glq49'),
        role_code: 'production_manager',
      },
      {
        username: 'chenming',
        real_name: ts('k_orolx7'),
        email: 'chenming@dcprint.com',
        phone: '13800000006',
        dept_name: ts('k_qe62zc'),
        role_code: 'warehouse_keeper',
      },
      {
        username: 'zhaolei',
        real_name: ts('k_qkv38u'),
        email: 'zhaolei@dcprint.com',
        phone: '13800000007',
        dept_name: ts('k_qe62zc'),
        role_code: 'warehouse_manager',
      },
      {
        username: 'sunli',
        real_name: ts('k_wrfy17'),
        email: 'sunli@dcprint.com',
        phone: '13800000008',
        dept_name: ts('k_1rgc4zf'),
        role_code: 'purchaser',
      },
      {
        username: 'zhoujie',
        real_name: ts('k_1gmpisl'),
        email: 'zhoujie@dcprint.com',
        phone: '13800000009',
        dept_name: ts('k_11g5fpo'),
        role_code: 'qc_inspector',
      },
      {
        username: 'wufang',
        real_name: ts('k_vy0n74'),
        email: 'wufang@dcprint.com',
        phone: '13800000010',
        dept_name: ts('k_1jqantr'),
        role_code: 'accountant',
      },
    ];
    for (const user of users) {
      const deptId = deptMap[user.dept_name] || null;
      await conn.execute(
        `INSERT IGNORE INTO sys_user (username, password, real_name, email, phone, department_id, status, first_login) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
        [user.username, passwordHash, user.real_name, user.email, user.phone, deptId]
      );
      const [userRow] = await conn.execute('SELECT id FROM sys_user WHERE username = ?', [
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
        code: 'WH-CAT-001',
        name: ts('k_tkxvoe'),
        description: ts('k_15gdr19'),
        sort_order: 1,
      },
      {
        code: 'WH-CAT-002',
        name: ts('k_llwvwj'),
        description: ts('k_1tfculi'),
        sort_order: 2,
      },
      {
        code: 'WH-CAT-003',
        name: ts('k_93mh3v'),
        description: ts('k_pwjzaj'),
        sort_order: 3,
      },
      {
        code: 'WH-CAT-004',
        name: ts('k_6jdwbc'),
        description: ts('k_aep7hu'),
        sort_order: 4,
      },
      {
        code: 'WH-CAT-005',
        name: ts('k_359r5x'),
        description: ts('k_149n1ei'),
        sort_order: 5,
      },
      {
        code: 'WH-CAT-006',
        name: ts('k_mm26ai'),
        description: ts('k_1mrers3'),
        sort_order: 6,
      },
      {
        code: 'WH-CAT-007',
        name: ts('k_15ys8xk'),
        description: ts('k_eu39vz'),
        sort_order: 7,
      },
      { code: 'WH-CAT-008', name: ts('k_1r16jah'), description: ts('k_5c2cx3'), sort_order: 8 },
      {
        code: 'WH-CAT-009',
        name: ts('k_1degaw1'),
        description: ts('k_1lp7oz1'),
        sort_order: 9,
      },
      { code: 'WH-CAT-010', name: ts('k_mjllii'), description: ts('k_19kqzi1'), sort_order: 10 },
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
        category_name: ts('k_1yrdt7u'),
        parent_id: null,
        category_type: 1,
        sort_order: 1,
      },
      {
        category_code: 'MATCAT002',
        category_name: ts('k_6nt4pb'),
        parent_id: null,
        category_type: 2,
        sort_order: 2,
      },
      {
        category_code: 'MATCAT003',
        category_name: ts('k_1m3pn7s'),
        parent_id: null,
        category_type: 3,
        sort_order: 3,
      },
      {
        category_code: 'MATCAT004',
        category_name: ts('k_19fnn2i'),
        parent_id: null,
        category_type: 4,
        sort_order: 4,
      },
      {
        category_code: 'MATCAT01001',
        category_name: ts('k_1nvc7li'),
        parent_id: null,
        category_type: 1,
        sort_order: 1,
      },
      {
        category_code: 'MATCAT01002',
        category_name: ts('k_qa51ew'),
        parent_id: null,
        category_type: 1,
        sort_order: 2,
      },
      {
        category_code: 'MATCAT02001',
        category_name: ts('k_chmbxj'),
        parent_id: null,
        category_type: 2,
        sort_order: 1,
      },
      {
        category_code: 'MATCAT02002',
        category_name: ts('k_445c63'),
        parent_id: null,
        category_type: 2,
        sort_order: 2,
      },
      {
        category_code: 'MATCAT03001',
        category_name: ts('k_ppfavb'),
        parent_id: null,
        category_type: 3,
        sort_order: 1,
      },
      {
        category_code: 'MATCAT04001',
        category_name: ts('k_19bsl0r'),
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
    const [matCatRows] = await conn.execute(
      'SELECT id, category_code, category_name FROM inv_material_category ORDER BY id'
    );
    const matCatMap: Record<string, number> = {};
    for (const row of matCatRows) {
      matCatMap[row.category_name] = row.id;
    }
    const parentUpdates: [number, string][] = [
      [matCatMap[ts('k_1nvc7li')], ts('k_1yrdt7u')],
      [matCatMap[ts('k_qa51ew')], ts('k_1yrdt7u')],
      [matCatMap[ts('k_chmbxj')], ts('k_6nt4pb')],
      [matCatMap[ts('k_445c63')], ts('k_6nt4pb')],
      [matCatMap[ts('k_ppfavb')], ts('k_1m3pn7s')],
      [matCatMap[ts('k_19bsl0r')], ts('k_19fnn2i')],
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
        dict_name: ts('k_biv5ix'),
        dict_code: 'warehouse_type',
        status: 1,
        description: ts('k_11yvzay'),
      },
      { dict_name: ts('k_ssvost'), dict_code: 'material_type', status: 1, description: ts('k_1xiw28m') },
      {
        dict_name: ts('k_1lnvyro'),
        dict_code: 'inbound_status',
        status: 1,
        description: ts('k_1ehrb9n'),
      },
      {
        dict_name: ts('k_y7t6an'),
        dict_code: 'outbound_status',
        status: 1,
        description: ts('k_12k31ms'),
      },
      {
        dict_name: ts('k_1boblgu'),
        dict_code: 'work_order_status',
        status: 1,
        description: ts('k_1fhfae8'),
      },
      {
        dict_name: ts('k_zokwm'),
        dict_code: 'quality_result',
        status: 1,
        description: ts('k_osag53'),
      },
      { dict_name: ts('k_f4scha'), dict_code: 'priority', status: 1, description: ts('k_1jpeyi2') },
      {
        dict_name: ts('k_134ro7'),
        dict_code: 'settlement_type',
        status: 1,
        description: ts('k_on2gm1'),
      },
      { dict_name: ts('k_314zqu'), dict_code: 'notice_type', status: 1, description: ts('k_snygdo') },
      { dict_name: ts('k_14t8f6w'), dict_code: 'yes_no', status: 1, description: ts('k_zldt94') },
    ];
    for (const dt of dictTypes) {
      await conn.execute(
        `INSERT IGNORE INTO sys_dict_type (dict_name, dict_code, status, description) VALUES (?, ?, ?, ?)`,
        [dt.dict_name, dt.dict_code, dt.status, dt.description]
      );
    }
    const [dictTypeRows] = await conn.execute(
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
          { label: ts('k_tkxvoe'), value: '1' },
          { label: ts('k_llwvwj'), value: '2' },
          { label: ts('k_93mh3v'), value: '3' },
          { label: ts('k_6jdwbc'), value: '4' },
          { label: ts('k_359r5x'), value: '5' },
          { label: ts('k_mm26ai'), value: '6' },
          { label: ts('k_15ys8xk'), value: '7' },
          { label: ts('k_1r16jah'), value: '8' },
          { label: ts('k_1degaw1'), value: '9' },
          { label: ts('k_mjllii'), value: '10' },
        ],
      },
      {
        dict_type: 'material_type',
        items: [
          { label: ts('k_1bjxal9'), value: '1' },
          { label: ts('k_w1cwb8'), value: '2' },
          { label: ts('k_1m3pn7s'), value: '3' },
          { label: ts('k_19fnn2i'), value: '4' },
          { label: ts('k_cu41ng'), value: '5' },
          { label: ts('k_1c01k7u'), value: '6' },
          { label: ts('k_1xxx1ch'), value: '7' },
          { label: ts('k_120z5rb'), value: '8' },
          { label: ts('k_1fshh99'), value: '9' },
          { label: ts('k_dcd4ul'), value: '10' },
        ],
      },
      {
        dict_type: 'inbound_status',
        items: [
          { label: ts('k_oc54qp'), value: '0' },
          { label: ts('k_a2uv9t'), value: '1' },
          { label: ts('k_7j2xv0'), value: '2' },
          { label: ts('k_19j4h'), value: '3' },
          { label: ts('k_1d8x36r'), value: '4' },
          { label: ts('k_q0bjhp'), value: '5' },
          { label: ts('k_kbfttv'), value: '6' },
          { label: ts('k_pg1cf8'), value: '7' },
          { label: ts('k_1vrgkfr'), value: '8' },
          { label: ts('k_1uz4mvb'), value: '9' },
        ],
      },
      {
        dict_type: 'outbound_status',
        items: [
          { label: ts('k_oc54qp'), value: '0' },
          { label: ts('k_a2uv9t'), value: '1' },
          { label: ts('k_19j4h'), value: '2' },
          { label: ts('k_1d8x36r'), value: '3' },
          { label: ts('k_kbfttv'), value: '4' },
          { label: ts('k_pg1cf8'), value: '5' },
          { label: ts('k_1vrgkfr'), value: '6' },
          { label: ts('k_1uz4mvb'), value: '7' },
          { label: tc('pendingIssue'), value: '8' },
          { label: ts('k_q0bjhp'), value: '9' },
        ],
      },
      {
        dict_type: 'work_order_status',
        items: [
          { label: ts('k_vlu9xm'), value: '0' },
          { label: ts('k_nmir1b'), value: '1' },
          { label: ts('k_zta3ls'), value: '2' },
          { label: ts('k_1rcb0fm'), value: '3' },
          { label: ts('k_19j4h'), value: '4' },
          { label: ts('k_1d8x36r'), value: '5' },
          { label: ts('k_72kamz'), value: '6' },
          { label: ts('k_1sprrfn'), value: '7' },
          { label: ts('k_q0bjhp'), value: '8' },
          { label: ts('k_1uz4mvb'), value: '9' },
        ],
      },
      {
        dict_type: 'quality_result',
        items: [
          { label: ts('k_1txhqm8'), value: '0' },
          { label: ts('k_109sg5t'), value: '1' },
          { label: ts('k_1ujsxic'), value: '2' },
          { label: ts('k_m3wj5o'), value: '3' },
          { label: ts('k_7eww2d'), value: '4' },
          { label: ts('k_1j2hkcp'), value: '5' },
          { label: ts('k_ey5ecv'), value: '6' },
          { label: ts('k_r5apxu'), value: '7' },
          { label: ts('k_19qx965'), value: '8' },
          { label: ts('k_pf6yte'), value: '9' },
        ],
      },
      {
        dict_type: 'priority',
        items: [
          { label: ts('k_9tbknt'), value: '1' },
          { label: ts('k_pk6gtj'), value: '2' },
          { label: ts('k_6y5tbl'), value: '3' },
          { label: ts('k_1kffmxd'), value: '4' },
          { label: tc('lowest'), value: '5' },
          { label: ts('k_rgtt6r'), value: '6' },
          { label: ts('k_1bqnj9l'), value: '7' },
          { label: ts('k_15ds21q'), value: '8' },
          { label: ts('k_axr9ys'), value: '9' },
          { label: ts('k_8y91e8'), value: '10' },
        ],
      },
      {
        dict_type: 'settlement_type',
        items: [
          { label: ts('k_16x2l80'), value: '1' },
          { label: ts('k_isj9pm'), value: '2' },
          { label: ts('k_g2lx0p'), value: '3' },
          { label: ts('k_yyuqrw'), value: '4' },
          { label: ts('k_1hc10e5'), value: '5' },
          { label: ts('k_19g1z5s'), value: '6' },
          { label: ts('k_1n7njqb'), value: '7' },
          { label: ts('k_1l94ird'), value: '8' },
          { label: tc('cash'), value: '9' },
          { label: ts('k_dcd4ul'), value: '10' },
        ],
      },
      {
        dict_type: 'notice_type',
        items: [
          { label: tc('notice'), value: '1' },
          { label: ts('k_153oaxf'), value: '2' },
          { label: ts('k_ubat5z'), value: '3' },
          { label: ts('k_1qswpkf'), value: '4' },
          { label: ts('k_1fb3cb3'), value: '5' },
          { label: ts('k_p0ysv3'), value: '6' },
          { label: ts('k_cm180x'), value: '7' },
          { label: ts('k_j1lqcp'), value: '8' },
          { label: ts('k_1uz4mvb'), value: '9' },
          { label: ts('k_dcd4ul'), value: '10' },
        ],
      },
      {
        dict_type: 'yes_no',
        items: [
          { label: ts('k_btshni'), value: '1' },
          { label: ts('k_9sspjt'), value: '0' },
          { label: ts('k_5pm2ma'), value: '1' },
          { label: ts('k_1dcdrxo'), value: '0' },
          { label: ts('k_kgwvlw'), value: '1' },
          { label: tc('invalid'), value: '0' },
          { label: ts('k_z2u55c'), value: '1' },
          { label: ts('k_g0fanx'), value: '0' },
          { label: ts('k_11bz44c'), value: '1' },
          { label: ts('k_1xx5uzu'), value: '0' },
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
        config_name: tc('companyName'),
        config_key: 'company_name',
        config_value: ts('k_1pyz0ii'),
        config_type: '1',
        remark: tc('companyFullName'),
      },
      {
        config_name: tc('companyShortName'),
        config_key: 'company_short_name',
        config_value: ts('k_af493q'),
        config_type: '1',
        remark: tc('companyShortName'),
      },
      {
        config_name: tc('companyCode'),
        config_key: 'company_code',
        config_value: 'DCPRINT',
        config_type: '1',
        remark: ts('k_ik3j6c'),
      },
      {
        config_name: ts('k_1yczi2f'),
        config_key: 'default_warehouse',
        config_value: 'WH001',
        config_type: '1',
        remark: ts('k_156hrs4'),
      },
      {
        config_name: ts('k_qre4qy'),
        config_key: 'fifo_mode',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_jv4s2v'),
      },
      {
        config_name: ts('k_17jtwje'),
        config_key: 'auto_inbound_approve',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_sxp79y'),
      },
      {
        config_name: ts('k_ul0wdp'),
        config_key: 'batch_no_prefix',
        config_value: 'B',
        config_type: '1',
        remark: ts('k_10dem3q'),
      },
      {
        config_name: ts('k_r5v7c8'),
        config_key: 'order_no_prefix',
        config_value: 'ORD',
        config_type: '1',
        remark: ts('k_e9j4hb'),
      },
      {
        config_name: ts('k_1ypqs7n'),
        config_key: 'currency',
        config_value: 'CNY',
        config_type: '1',
        remark: ts('k_2skgf5'),
      },
      {
        config_name: ts('k_m2gk8o'),
        config_key: 'tax_rate',
        config_value: '13',
        config_type: '1',
        remark: ts('k_1fzh470'),
      },
      {
        config_name: ts('k_y43tbv'),
        config_key: 'print_label_on_inbound',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_1nuyja4'),
      },
      // ===== 系统配置中心（六大分组，命名空间 key）=====
      // 库存配置
      {
        config_name: ts('k_2ohm40'),
        config_key: 'inventory.allow_negative',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_1khkpmk'),
      },
      {
        config_name: ts('k_1dajs8k'),
        config_key: 'inventory.alert_threshold',
        config_value: '10',
        config_type: '1',
        remark: ts('k_19umbv6'),
      },
      {
        config_name: ts('k_f4xnl3'),
        config_key: 'inventory.stocktake_approval',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_a4wiy6'),
      },
      {
        config_name: ts('k_1xddkom'),
        config_key: 'inventory.default_warehouse',
        config_value: 'WH001',
        config_type: '1',
        remark: ts('k_kezy3f'),
      },
      {
        config_name: ts('k_1xayavz'),
        config_key: 'inventory.decimal_precision',
        config_value: '2',
        config_type: '1',
        remark: ts('k_1ctys81'),
      },
      {
        config_name: ts('k_5smqom'),
        config_key: 'inventory.safety_stock_ratio',
        config_value: '20',
        config_type: '1',
        remark: ts('k_a5fbik'),
      },
      {
        config_name: ts('k_1unvjuj'),
        config_key: 'inventory.auto_batch',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_lxy9co'),
      },
      {
        config_name: ts('k_1i3hs12'),
        config_key: 'inventory.batch_expire_warn_days',
        config_value: '30',
        config_type: '1',
        remark: ts('k_1b6uy9r'),
      },
      {
        config_name: ts('k_1b21fss'),
        config_key: 'inventory.stocktake_cycle_days',
        config_value: '90',
        config_type: '1',
        remark: ts('k_udjj3q'),
      },
      {
        config_name: ts('k_zt37yt'),
        config_key: 'inventory.negative_warning',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_1vgrnvs'),
      },
      {
        config_name: ts('k_1751md0'),
        config_key: 'inbound.prefix',
        config_value: 'INB',
        config_type: '1',
        remark: ts('k_1751md0'),
      },
      {
        config_name: ts('k_13eubnv'),
        config_key: 'outbound.prefix',
        config_value: 'OTB',
        config_type: '1',
        remark: ts('k_13eubnv'),
      },
      // 订单配置
      {
        config_name: ts('k_r5v7c8'),
        config_key: 'order.prefix',
        config_value: 'ORD',
        config_type: '1',
        remark: ts('k_1aescyq'),
      },
      {
        config_name: ts('k_7amfoj'),
        config_key: 'order.auto_approve',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_1n7c98n'),
      },
      {
        config_name: ts('k_jdmvn8'),
        config_key: 'order.out_of_stock_action',
        config_value: 'warn',
        config_type: '1',
        remark: ts('k_1j6gygh'),
      },
      {
        config_name: ts('k_1u3hipi'),
        config_key: 'order.overdue_remind_days',
        config_value: '7',
        config_type: '1',
        remark: ts('k_w1r4ks'),
      },
      {
        config_name: ts('k_39ri85'),
        config_key: 'order.allow_edit_approved',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_tunha4'),
      },
      {
        config_name: ts('k_1yhn23p'),
        config_key: 'order.default_delivery_days',
        config_value: '7',
        config_type: '1',
        remark: ts('k_cakh15'),
      },
      {
        config_name: ts('k_kwsyqj'),
        config_key: 'order.price_precision',
        config_value: '2',
        config_type: '1',
        remark: ts('k_1rhbkmc'),
      },
      {
        config_name: ts('k_1tw03sc'),
        config_key: 'order.min_amount',
        config_value: '0',
        config_type: '1',
        remark: ts('k_dl6mcn'),
      },
      {
        config_name: ts('k_1umg6gx'),
        config_key: 'order.credit_control',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_1rfrtbr'),
      },
      {
        config_name: ts('k_jv0bhb'),
        config_key: 'order.return_deadline_days',
        config_value: '15',
        config_type: '1',
        remark: ts('k_ouaq1n'),
      },
      {
        config_name: ts('k_ol2wjj'),
        config_key: 'order.auto_cancel_unpaid_days',
        config_value: '3',
        config_type: '1',
        remark: ts('k_1frqvud'),
      },
      // 采购配置
      {
        config_name: ts('k_ujkzyk'),
        config_key: 'purchase.prefix',
        config_value: 'PO',
        config_type: '1',
        remark: ts('k_1a2a7ec'),
      },
      {
        config_name: ts('k_n0r2jd'),
        config_key: 'purchase.price_control',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_1kkp5qy'),
      },
      {
        config_name: ts('k_1ntm7du'),
        config_key: 'purchase.arrival_remind_days',
        config_value: '3',
        config_type: '1',
        remark: ts('k_1orggbu'),
      },
      {
        config_name: ts('k_1fkrfeb'),
        config_key: 'purchase.tolerance_ratio',
        config_value: '5',
        config_type: '1',
        remark: ts('k_1yti19l'),
      },
      {
        config_name: ts('k_1r8ug0l'),
        config_key: 'purchase.supplier_eval_cycle',
        config_value: '90',
        config_type: '1',
        remark: ts('k_1thydqq'),
      },
      {
        config_name: ts('k_11giv8q'),
        config_key: 'purchase.tax_rate',
        config_value: '13',
        config_type: '1',
        remark: ts('k_4c141l'),
      },
      {
        config_name: ts('k_1agrhna'),
        config_key: 'purchase.auto_stock_in',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_18w86yf'),
      },
      {
        config_name: ts('k_aexw71'),
        config_key: 'purchase.approval_threshold',
        config_value: '10000',
        config_type: '1',
        remark: ts('k_1ap7ce3'),
      },
      {
        config_name: ts('k_1qedb8'),
        config_key: 'purchase.min_qty',
        config_value: '1',
        config_type: '1',
        remark: ts('k_84l0ag'),
      },
      {
        config_name: ts('k_1jywspn'),
        config_key: 'purchase.return_deadline_days',
        config_value: '30',
        config_type: '1',
        remark: ts('k_ae67p1'),
      },
      // 财务配置
      {
        config_name: ts('k_1cezans'),
        config_key: 'finance.payment_terms_days',
        config_value: '30',
        config_type: '1',
        remark: ts('k_xoog95'),
      },
      {
        config_name: ts('k_dpqe8y'),
        config_key: 'finance.tax_rate',
        config_value: '13',
        config_type: '1',
        remark: ts('k_2dtaye'),
      },
      {
        config_name: ts('k_1fcxwcf'),
        config_key: 'finance.default_currency',
        config_value: 'CNY',
        config_type: '1',
        remark: ts('k_lmuobn'),
      },
      {
        config_name: ts('k_m29ypo'),
        config_key: 'finance.settlement_day',
        config_value: '1',
        config_type: '1',
        remark: ts('k_1ynt88m'),
      },
      {
        config_name: ts('k_pfuhcl'),
        config_key: 'finance.ar_receivable_warn_days',
        config_value: '30',
        config_type: '1',
        remark: ts('k_yqypzq'),
      },
      {
        config_name: ts('k_6nkp3m'),
        config_key: 'finance.multi_currency',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_14dw7eg'),
      },
      {
        config_name: ts('k_1iqsylq'),
        config_key: 'finance.invoice_type',
        config_value: 'vat',
        config_type: '1',
        remark: ts('k_11faguk'),
      },
      {
        config_name: ts('k_60yi97'),
        config_key: 'finance.cost_method',
        config_value: 'moving_avg',
        config_type: '1',
        remark: ts('k_1mkcjnb'),
      },
      {
        config_name: ts('k_1upst1k'),
        config_key: 'finance.cash_discount_rate',
        config_value: '2',
        config_type: '1',
        remark: ts('k_1spp3o2'),
      },
      {
        config_name: ts('k_osv0zt'),
        config_key: 'finance.rounding_mode',
        config_value: 'round_half_up',
        config_type: '1',
        remark: ts('k_1n7vc1x'),
      },
      // 系统配置
      {
        config_name: ts('k_1qaae20'),
        config_key: 'system.password_min_length',
        config_value: '6',
        config_type: '1',
        remark: ts('k_14sd3lu'),
      },
      {
        config_name: ts('k_t3du1p'),
        config_key: 'system.login_fail_lock_count',
        config_value: '5',
        config_type: '1',
        remark: ts('k_6b711k'),
      },
      {
        config_name: ts('k_ajhuo0'),
        config_key: 'system.login_lock_minutes',
        config_value: '30',
        config_type: '1',
        remark: ts('k_1qvy3vb'),
      },
      {
        config_name: ts('k_q6sr93'),
        config_key: 'system.password_expire_days',
        config_value: '90',
        config_type: '1',
        remark: ts('k_h0cd50'),
      },
      {
        config_name: ts('k_1vxfpk5'),
        config_key: 'system.force_change_password',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_1sq91ct'),
      },
      {
        config_name: ts('k_1gj547b'),
        config_key: 'system.log_retention_days',
        config_value: '180',
        config_type: '1',
        remark: ts('k_1eavrck'),
      },
      {
        config_name: ts('k_130raxn'),
        config_key: 'system.session_timeout',
        config_value: '120',
        config_type: '1',
        remark: ts('k_4v9xz2'),
      },
      {
        config_name: ts('k_oe1kuq'),
        config_key: 'system.name',
        config_value: 'DC ERP',
        config_type: '1',
        remark: ts('k_83fxsc'),
      },
      {
        config_name: ts('k_r5ygdw'),
        config_key: 'system.default_language',
        config_value: 'zh-CN',
        config_type: '1',
        remark: ts('k_j7onjz'),
      },
      {
        config_name: ts('k_1t3cn3'),
        config_key: 'system.timezone',
        config_value: 'Asia/Shanghai',
        config_type: '1',
        remark: ts('k_1e74x06'),
      },
      {
        config_name: ts('k_9vdlp6'),
        config_key: 'system.backup_cycle_days',
        config_value: '7',
        config_type: '1',
        remark: ts('k_17cxe7q'),
      },
      {
        config_name: ts('k_1k5yykh'),
        config_key: 'system.two_factor_auth',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_1tvfte8'),
      },
      {
        config_name: ts('k_12zkthb'),
        config_key: 'system.maintenance_mode',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_zhak71'),
      },
      // 其他配置
      {
        config_name: tc('companyName'),
        config_key: 'company.name',
        config_value: ts('k_110ztm9'),
        config_type: '1',
        remark: ts('k_1r0shcx'),
      },
      {
        config_name: ts('k_1fpcbs1'),
        config_key: 'company.address',
        config_value: '',
        config_type: '1',
        remark: ts('k_1lb6h7p'),
      },
      {
        config_name: ts('k_kyh71a'),
        config_key: 'company.phone',
        config_value: '400-000-0000',
        config_type: '1',
        remark: ts('k_1mtn06b'),
      },
      {
        config_name: ts('k_yrkf9q'),
        config_key: 'company.tax_no',
        config_value: '',
        config_type: '1',
        remark: ts('k_1070jlk'),
      },
      {
        config_name: ts('k_idnzqr'),
        config_key: 'notify.email',
        config_value: 'true',
        config_type: '2',
        remark: ts('k_kj4963'),
      },
      {
        config_name: ts('k_eweg59'),
        config_key: 'notify.sms',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_irtbrp'),
      },
      {
        config_name: ts('k_uoen97'),
        config_key: 'export.encoding',
        config_value: 'UTF-8',
        config_type: '1',
        remark: ts('k_rk8ors'),
      },
      {
        config_name: ts('k_1g51nue'),
        config_key: 'ui.page_size',
        config_value: '20',
        config_type: '1',
        remark: ts('k_1hyvkoo'),
      },
      {
        config_name: ts('k_f804rd'),
        config_key: 'ui.demo_data',
        config_value: 'false',
        config_type: '2',
        remark: ts('k_d5mequ'),
      },
    ];
    for (const cfg of configs) {
      await conn.execute(
        `INSERT IGNORE INTO sys_config (config_name, config_key, config_value, config_type, description) VALUES (?, ?, ?, ?, ?)`,
        [cfg.config_name, cfg.config_key, cfg.config_value, cfg.config_type, cfg.remark]
      );
    }
    stats.sys_config = configs.length;

    const [allMenus] = await conn.execute(
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
      return allMenus.filter((m: DbRow) => m.parent_id === parentId).map((m: DbRow) => m.id);
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
      super_admin: allMenus.map((m: DbRow) => m.id),
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
        notice_title: ts('k_4dofzq'),
        notice_type: 2,
        notice_content: ts('k_q4h58l'),
        status: 1,
      },
      {
        notice_title: ts('k_1jjeota'),
        notice_type: 1,
        notice_content:
          ts('k_15kxxok'),
        status: 1,
      },
      {
        notice_title: ts('k_14b32zx'),
        notice_type: 3,
        notice_content: ts('k_sagthl'),
        status: 1,
      },
      {
        notice_title: ts('k_qnxico'),
        notice_type: 1,
        notice_content: ts('k_1m99gi5'),
        status: 1,
      },
      {
        notice_title: ts('k_tdidz1'),
        notice_type: 1,
        notice_content: ts('k_18hx25e'),
        status: 1,
      },
      {
        notice_title: ts('k_n8xczu'),
        notice_type: 3,
        notice_content: ts('k_88w4x4'),
        status: 1,
      },
      {
        notice_title: ts('k_nbb8zx'),
        notice_type: 3,
        notice_content:
          ts('k_pjs9g9'),
        status: 1,
      },
      {
        notice_title: ts('k_o6ofs6'),
        notice_type: 2,
        notice_content: ts('k_k87ql5'),
        status: 1,
      },
      {
        notice_title: ts('k_11fftvc'),
        notice_type: 3,
        notice_content:
          ts('k_ymeyor'),
        status: 1,
      },
      {
        notice_title: ts('k_1xpcsvq'),
        notice_type: 1,
        notice_content:
          ts('k_1sii2os'),
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
        login_location: ts('k_qjq97r'),
        browser: 'Chrome 120',
        os: 'Windows 11',
        status: 1,
        remark: ts('k_31h4ze'),
      },
      {
        username: 'zhangwei',
        ip_address: '192.168.1.101',
        login_location: ts('k_hjjyq9'),
        browser: 'Chrome 120',
        os: 'Windows 11',
        status: 1,
        remark: ts('k_1dw9wct'),
      },
      {
        username: 'lina',
        ip_address: '192.168.1.102',
        login_location: ts('k_hjjyq9'),
        browser: 'Firefox 121',
        os: 'Windows 10',
        status: 1,
        remark: ts('k_vuok3c'),
      },
      {
        username: 'wangqiang',
        ip_address: '192.168.1.103',
        login_location: ts('k_2nykrd'),
        browser: 'Chrome 120',
        os: 'Windows 11',
        status: 1,
        remark: ts('k_1rrpz2n'),
      },
      {
        username: 'liuyang',
        ip_address: '192.168.1.104',
        login_location: ts('k_evnkb4'),
        browser: 'Edge 120',
        os: 'Windows 10',
        status: 1,
        remark: ts('k_1xz6tdz'),
      },
      {
        username: 'chenming',
        ip_address: '192.168.1.105',
        login_location: ts('k_ikfpjx'),
        browser: 'Chrome 120',
        os: 'Windows 10',
        status: 1,
        remark: ts('k_ri1apj'),
      },
      {
        username: 'zhaolei',
        ip_address: '192.168.1.106',
        login_location: ts('k_ikfpjx'),
        browser: 'Chrome 119',
        os: 'Windows 11',
        status: 1,
        remark: ts('k_1qtqm1r'),
      },
      {
        username: 'sunli',
        ip_address: '192.168.1.107',
        login_location: ts('k_11aedsi'),
        browser: 'Chrome 120',
        os: 'macOS 14',
        status: 1,
        remark: ts('k_iaypq7'),
      },
      {
        username: 'zhoujie',
        ip_address: '192.168.1.108',
        login_location: ts('k_11gevpl'),
        browser: 'Firefox 121',
        os: 'Windows 11',
        status: 1,
        remark: ts('k_j5g84c'),
      },
      {
        username: 'wufang',
        ip_address: '192.168.1.109',
        login_location: ts('k_18ei45e'),
        browser: 'Chrome 120',
        os: 'Windows 10',
        status: 1,
        remark: ts('k_yswfgg'),
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
        title: ts('k_1oim33'),
        business_type: 1,
        method: '/api/system/user',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/system/user',
        oper_ip: '192.168.1.100',
      },
      {
        title: ts('k_qea0w6'),
        business_type: 2,
        method: '/api/system/roles',
        request_method: 'PUT',
        oper_name: 'admin',
        oper_url: '/api/system/roles',
        oper_ip: '192.168.1.100',
      },
      {
        title: ts('k_1u2bhqt'),
        business_type: 1,
        method: '/api/init/menus',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/init/menus',
        oper_ip: '192.168.1.100',
      },
      {
        title: ts('k_m2i11q'),
        business_type: 1,
        method: '/api/hr/departments',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/hr/departments',
        oper_ip: '192.168.1.100',
      },
      {
        title: ts('k_1vvmozw'),
        business_type: 1,
        method: '/api/organization/warehouse-category',
        request_method: 'POST',
        oper_name: 'zhaolei',
        oper_url: '/api/organization/warehouse-category',
        oper_ip: '192.168.1.106',
      },
      {
        title: ts('k_195l80o'),
        business_type: 1,
        method: '/api/base-data/material-category',
        request_method: 'POST',
        oper_name: 'wangqiang',
        oper_url: '/api/base-data/material-category',
        oper_ip: '192.168.1.103',
      },
      {
        title: ts('k_j28prc'),
        business_type: 2,
        method: '/api/system/config',
        request_method: 'PUT',
        oper_name: 'admin',
        oper_url: '/api/system/config',
        oper_ip: '192.168.1.100',
      },
      {
        title: ts('k_hldx6d'),
        business_type: 1,
        method: '/api/system/dict-type',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/system/dict-type',
        oper_ip: '192.168.1.100',
      },
      {
        title: ts('k_11hk6gy'),
        business_type: 1,
        method: '/api/system/notice',
        request_method: 'POST',
        oper_name: 'admin',
        oper_url: '/api/system/notice',
        oper_ip: '192.168.1.100',
      },
      {
        title: ts('k_1is553z'),
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
        module: ts('k_1oim33'),
        operation: ts('k_183giky'),
        oper_name: 'admin',
        oper_type: 'create',
        oper_method: 'POST',
        oper_url: '/api/system/user',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: ts('k_n2pqpk'),
        status: 1,
      },
      {
        module: ts('k_qea0w6'),
        operation: ts('k_1d5cwh0'),
        oper_name: 'admin',
        oper_type: 'update',
        oper_method: 'PUT',
        oper_url: '/api/system/roles',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: ts('k_ppodpo'),
        status: 1,
      },
      {
        module: ts('k_1u2bhqt'),
        operation: ts('k_arp8ht'),
        oper_name: 'admin',
        oper_type: 'query',
        oper_method: 'GET',
        oper_url: '/api/menu',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: ts('k_f2wahg'),
        status: 1,
      },
      {
        module: ts('k_m2i11q'),
        operation: ts('k_1as41yz'),
        oper_name: 'admin',
        oper_type: 'create',
        oper_method: 'POST',
        oper_url: '/api/hr/departments',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: ts('k_10486y5'),
        status: 1,
      },
      {
        module: ts('k_1vvmozw'),
        operation: ts('k_1cmuif'),
        oper_name: 'zhaolei',
        oper_type: 'query',
        oper_method: 'GET',
        oper_url: '/api/organization/warehouse-category',
        oper_ip: '192.168.1.106',
        oper_param: null,
        oper_result: ts('k_1nmjk9a'),
        status: 1,
      },
      {
        module: ts('k_195l80o'),
        operation: ts('k_1wcjoyn'),
        oper_name: 'wangqiang',
        oper_type: 'query',
        oper_method: 'GET',
        oper_url: '/api/base-data/material-category',
        oper_ip: '192.168.1.103',
        oper_param: null,
        oper_result: ts('k_1lt54x2'),
        status: 1,
      },
      {
        module: ts('k_j28prc'),
        operation: ts('k_1mbmohf'),
        oper_name: 'admin',
        oper_type: 'update',
        oper_method: 'PUT',
        oper_url: '/api/system/config',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: ts('k_1fvtqhz'),
        status: 1,
      },
      {
        module: ts('k_hldx6d'),
        operation: ts('k_1896pa9'),
        oper_name: 'admin',
        oper_type: 'query',
        oper_method: 'GET',
        oper_url: '/api/system/dict-type',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: ts('k_105juxg'),
        status: 1,
      },
      {
        module: ts('k_11hk6gy'),
        operation: ts('k_1fdyv7e'),
        oper_name: 'admin',
        oper_type: 'create',
        oper_method: 'POST',
        oper_url: '/api/system/notice',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: ts('k_18fklgk'),
        status: 1,
      },
      {
        module: ts('k_1is553z'),
        operation: ts('k_ltox03'),
        oper_name: 'admin',
        oper_type: 'create',
        oper_method: 'POST',
        oper_url: '/api/init/settings-seed',
        oper_ip: '192.168.1.100',
        oper_param: null,
        oper_result: ts('k_1kl40uw'),
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
        name: ts('k_1g2loxf'),
        scenario: 'inbound',
        width_mm: 60,
        height_mm: 40,
        qr_size_mm: 20,
        html_template:
          '<div style="text-align:center;font-family:sans-serif;padding:4px"><img src="{qrDataUrl}" style="width:40mm;height:40mm"/><p style="font-size:10px;margin:2px 0">{materialName}</p><p style="font-size:9px;margin:2px 0">{batchNo}</p><p style="font-size:8px;margin:2px 0">{quantity} {unit}</p></div>',
        status: 1,
      },
      {
        name: ts('k_1sougio'),
        scenario: 'split',
        width_mm: 50,
        height_mm: 30,
        qr_size_mm: 20,
        html_template:
          '<div style="text-align:center;font-family:sans-serif;padding:2px"><img src="{qrDataUrl}" style="width:28mm;height:28mm"/><p style="font-size:9px;margin:1px 0">{materialName}</p><p style="font-size:8px;margin:1px 0">{splitIndex}/{totalSplits}</p></div>',
        status: 1,
      },
      {
        name: ts('k_s7ph9n'),
        scenario: 'finished',
        width_mm: 80,
        height_mm: 50,
        qr_size_mm: 20,
        html_template:
          '<div style="text-align:center;font-family:sans-serif;padding:4px"><img src="{qrDataUrl}" style="width:40mm;height:40mm"/><p style="font-size:12px;margin:2px 0;font-weight:bold">{productName}</p><p style="font-size:9px;margin:2px 0">{batchNo}</p><p style="font-size:9px;margin:2px 0">{quantity} {unit}</p></div>',
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

  return successResponse(result, ts('k_cinktx'));
});
