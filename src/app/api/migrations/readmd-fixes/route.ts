import { getTranslations } from 'next-intl/server';

;
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import type { NextRequest } from 'next/server';

import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
async function tableExists(name: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return (rows as DbRow[]).length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return (rows as DbRow[]).length > 0;
}

async function addColumnSafe(table: string, column: string, definition: string) {
  if (!(await columnExists(table, column))) {
    await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return `Added ${table}.${column}`;
  }
  return `Already exists: ${table}.${column}`;
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return (rows as DbRow[]).length > 0;
}

async function addIndexSafe(table: string, indexName: string, columns: string) {
  if (!(await indexExists(table, indexName))) {
    await execute(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columns})`);
    return `Added index ${indexName} on ${table}`;
  }
  return `Already exists: index ${indexName} on ${table}`;
}

export const GET = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const step = searchParams.get('step') || 'all';
  const results: string[] = [];

  // ============================================================
  // 【1】标准物料主档 inv_material_std（三合一）
  // ============================================================
  if (step === 'all' || step === '1') {
    results.push(ts('k_1wj3wm1'));

    if (!(await tableExists('inv_material_std'))) {
      await execute(ts('k_1ub4ibq'));
      results.push('Created inv_material_std');
    } else {
      results.push('Already exists: inv_material_std');
    }

    if (await tableExists('inv_material')) {
      const res = await execute(ts('k_mtc4m7'));
      results.push(`Migrated ${res.affectedRows} rows from inv_material`);
    }

    if (await tableExists('bom_material')) {
      const res = await execute(ts('k_ep75eu'));
      results.push(`Migrated ${res.affectedRows} rows from bom_material`);
    }

    if (await tableExists('mdm_material')) {
      try {
        const res = await execute(ts('k_idnhf5'));
        results.push(`Migrated ${res.affectedRows} rows from mdm_material`);
      } catch (e) {
        results.push(`mdm_material migration skipped: ${(e as Error).message}`);
      }
    }
  }

  // ============================================================
  // 【2】标准BOM prd_bom_std + prd_bom_line_std（三合一）
  // ============================================================
  if (step === 'all' || step === '2') {
    results.push(ts('k_1byl4d9'));

    if (!(await tableExists('prd_bom_std'))) {
      await execute(ts('k_1cbfjnx'));
      results.push('Created prd_bom_std');
    } else {
      results.push('Already exists: prd_bom_std');
    }

    if (!(await tableExists('prd_bom_line_std'))) {
      await execute(ts('k_3zicj'));
      results.push('Created prd_bom_line_std');
    } else {
      results.push('Already exists: prd_bom_line_std');
    }

    if (await tableExists('prd_bom')) {
      const res = await execute(`
        INSERT IGNORE INTO prd_bom_std (bom_code, product_id, product_name, version, effective_date, status, legacy_source, legacy_id)
        SELECT
          COALESCE(bom_name, CONCAT('BOM-', pb.id)),
          COALESCE(product_id, 0),
          '',
          COALESCE(version, 'V1.0'),
          CURDATE(),
          CASE
            WHEN status IN (0,1,2) THEN status
            ELSE 1
          END,
          'prd_bom',
          pb.id
        FROM prd_bom pb
        WHERE pb.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from prd_bom`);
    }

    if (await tableExists('prd_bom_detail')) {
      const res = await execute(`
        INSERT IGNORE INTO prd_bom_line_std (bom_id, line_no, material_id, material_code, material_name, consumption_qty, waste_rate, material_type)
        SELECT
          bs.id,
          ROW_NUMBER() OVER (PARTITION BY pbd.bom_id ORDER BY pbd.id),
          COALESCE(pbd.material_id, 0),
          '',
          COALESCE(pbd.material_name, ''),
          COALESCE(pbd.quantity, 0),
          COALESCE(pbd.loss_rate, 0),
          COALESCE(pbd.item_type, 1)
        FROM prd_bom_detail pbd
        JOIN prd_bom_std bs ON bs.legacy_source = 'prd_bom' AND bs.legacy_id = pbd.bom_id
      `);
      results.push(`Migrated ${res.affectedRows} rows from prd_bom_detail`);
    }

    if (await tableExists('bom_header')) {
      // bom_header 可能缺 publish_time，按探测结果动态选择生效日期表达式
      const effectiveExpr = (await columnExists('bom_header', 'publish_time'))
        ? 'COALESCE(publish_time, create_time, CURDATE())'
        : 'COALESCE(create_time, CURDATE())';

      const res = await execute(`
        INSERT IGNORE INTO prd_bom_std (bom_code, product_id, product_name, version, effective_date, status, legacy_source, legacy_id)
        SELECT
          COALESCE(bom_no, CONCAT('BOMH-', bh.id)),
          COALESCE(product_id, 0),
          COALESCE(product_name, ''),
          COALESCE(version, 'V1.0'),
          ${effectiveExpr},
          CASE
            WHEN status IN (0,1,2) THEN status
            ELSE 1
          END,
          'bom_header',
          bh.id
        FROM bom_header bh
        WHERE bh.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from bom_header`);

      if (await tableExists('bom_line')) {
        // bom_line 历史版本列名不统一：单耗可能是 consumption_qty 或 usage_qty，
        // 且 material_type 列可能不存在，需按探测结果动态拼装。
        const qtyCol = (await columnExists('bom_line', 'consumption_qty'))
          ? 'consumption_qty'
          : (await columnExists('bom_line', 'usage_qty'))
            ? 'usage_qty'
            : null;
        const hasMaterialType = await columnExists('bom_line', 'material_type');

        if (qtyCol) {
          const materialTypeExpr = hasMaterialType
            ? `CASE
                 WHEN bl.material_type = 'raw' THEN 1
                 WHEN bl.material_type = 'semi' THEN 2
                 WHEN bl.material_type = 'finished' THEN 3
                 ELSE 1
               END`
            : '1';

          const res2 = await execute(`
            INSERT IGNORE INTO prd_bom_line_std (bom_id, line_no, material_id, material_code, material_name, consumption_qty, waste_rate, material_type)
            SELECT
              bs.id,
              COALESCE(bl.line_no, ROW_NUMBER() OVER (PARTITION BY bl.bom_id ORDER BY bl.id)),
              COALESCE(bl.material_id, 0),
              COALESCE(bl.material_code, ''),
              COALESCE(bl.material_name, ''),
              COALESCE(bl.${qtyCol}, 0),
              COALESCE(bl.loss_rate, 0),
              ${materialTypeExpr}
            FROM bom_line bl
            JOIN prd_bom_std bs ON bs.legacy_source = 'bom_header' AND bs.legacy_id = bl.bom_id
          `);
          results.push(`Migrated ${res2.affectedRows} rows from bom_line (qty col: ${qtyCol})`);
        } else {
          results.push(ts('k_1v2b3ji'));
        }
      }
    }
  }

  // ============================================================
  // 【3】标准采购订单 pur_order_std + pur_order_line_std（二合一）
  // ============================================================
  if (step === 'all' || step === '3') {
    results.push(ts('k_y7gdlr'));

    if (!(await tableExists('pur_order_std'))) {
      await execute(ts('k_1c5epkb'));
      results.push('Created pur_order_std');
    } else {
      results.push('Already exists: pur_order_std');
    }

    if (!(await tableExists('pur_order_line_std'))) {
      await execute(ts('k_18q9fax'));
      results.push('Created pur_order_line_std');
    } else {
      results.push('Already exists: pur_order_line_std');
    }

    if (await tableExists('pur_order')) {
      const res = await execute(`
        INSERT IGNORE INTO pur_order_std (po_code, request_id, supplier_id, supplier_name, order_date, delivery_date, total_amount, tax_amount, grand_total, status, payment_terms, delivery_address, contact_person, contact_phone, remark, legacy_source, legacy_id)
        SELECT
          COALESCE(order_no, CONCAT('PO-', po.id)),
          NULL,
          COALESCE(supplier_id, 0),
          '',
          COALESCE(order_date, CURDATE()),
          COALESCE(delivery_date, NULL),
          COALESCE(total_amount, 0),
          COALESCE(tax_amount, 0),
          COALESCE(total_with_tax, 0),
          CASE
            WHEN status IN (0,1,2,3,4,5,6,9) THEN status
            ELSE 0
          END,
          COALESCE(payment_terms, NULL),
          COALESCE(delivery_address, NULL),
          COALESCE(contact_name, NULL),
          COALESCE(contact_phone, NULL),
          COALESCE(remark, NULL),
          'pur_order',
          po.id
        FROM pur_order po
        WHERE po.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from pur_order`);

      if (await tableExists('pur_order_detail')) {
        const res2 = await execute(`
          INSERT IGNORE INTO pur_order_line_std (po_id, line_no, material_id, material_code, material_name, material_spec, order_qty, price, amount, received_qty)
          SELECT
            ps.id,
            ROW_NUMBER() OVER (PARTITION BY pod.order_id ORDER BY pod.id),
            COALESCE(pod.material_id, 0),
            '',
            '',
            '',
            COALESCE(pod.quantity, 0),
            COALESCE(pod.unit_price, 0),
            COALESCE(pod.amount, 0),
            COALESCE(pod.received_qty, 0)
          FROM pur_order_detail pod
          JOIN pur_order_std ps ON ps.legacy_source = 'pur_order' AND ps.legacy_id = pod.order_id
        `);
        results.push(`Migrated ${res2.affectedRows} rows from pur_order_detail`);
      }
    }

    if (await tableExists('pur_purchase_order')) {
      const res = await execute(`
        INSERT IGNORE INTO pur_order_std (po_code, request_id, supplier_id, supplier_name, order_date, delivery_date, total_amount, tax_amount, grand_total, status, payment_terms, delivery_address, contact_person, contact_phone, remark, legacy_source, legacy_id)
        SELECT
          COALESCE(po_no, CONCAT('PPO-', ppo.id)),
          NULL,
          COALESCE(supplier_id, 0),
          COALESCE(supplier_name, ''),
          COALESCE(order_date, CURDATE()),
          COALESCE(delivery_date, NULL),
          COALESCE(total_amount, 0),
          COALESCE(tax_amount, 0),
          COALESCE(grand_total, 0),
          CASE
            WHEN status IN (0,1,2,3,4,5,6,9) THEN status
            WHEN status = 10 THEN 0
            WHEN status = 20 THEN 2
            WHEN status = 30 THEN 3
            WHEN status = 40 THEN 5
            WHEN status = 50 THEN 6
            WHEN status = 90 THEN 9
            ELSE 0
          END,
          COALESCE(payment_terms, NULL),
          COALESCE(delivery_address, NULL),
          COALESCE(contact_person, NULL),
          COALESCE(contact_phone, NULL),
          COALESCE(remark, NULL),
          'pur_purchase_order',
          ppo.id
        FROM pur_purchase_order ppo
        WHERE ppo.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from pur_purchase_order`);

      if (await tableExists('pur_purchase_order_line')) {
        const res2 = await execute(`
          INSERT IGNORE INTO pur_order_line_std (po_id, line_no, material_id, material_code, material_name, material_spec, order_qty, price, amount, received_qty)
          SELECT
            ps.id,
            COALESCE(ppol.line_no, ROW_NUMBER() OVER (PARTITION BY ppol.po_id ORDER BY ppol.id)),
            COALESCE(ppol.material_id, 0),
            COALESCE(ppol.material_code, ''),
            COALESCE(ppol.material_name, ''),
            COALESCE(ppol.material_spec, ''),
            COALESCE(ppol.order_qty, 0),
            COALESCE(ppol.unit_price, 0),
            COALESCE(ppol.amount, 0),
            COALESCE(ppol.received_qty, 0)
          FROM pur_purchase_order_line ppol
          JOIN pur_order_std ps ON ps.legacy_source = 'pur_purchase_order' AND ps.legacy_id = ppol.po_id
        `);
        results.push(`Migrated ${res2.affectedRows} rows from pur_purchase_order_line`);
      }
    }
  }

  // ============================================================
  // 【4】HR考勤ID修复
  // ============================================================
  if (step === 'all' || step === '4') {
    results.push(ts('k_sj8935'));

    if (await tableExists('hr_attendance')) {
      const r1 = await addColumnSafe(
        'hr_attendance',
        'emp_id',
        ts('k_1ummi5s')
      );
      results.push(r1);

      try {
        const res = await execute(`
          UPDATE hr_attendance a
          JOIN sys_employee e ON a.employee_id COLLATE utf8mb4_unicode_ci = CONCAT('EMP', LPAD(e.id, 3, '0')) COLLATE utf8mb4_unicode_ci
          SET a.emp_id = e.id
          WHERE a.emp_id IS NULL
        `);
        results.push(`Backfilled emp_id from sys_employee: ${res.affectedRows} rows`);
      } catch (_e) {
        try {
          const res = await execute(`
            UPDATE hr_attendance a
            JOIN sys_employee e ON CAST(a.employee_id AS UNSIGNED) = e.id
            SET a.emp_id = e.id
            WHERE a.emp_id IS NULL
          `);
          results.push(`Backfilled emp_id (numeric match): ${res.affectedRows} rows`);
        } catch (e2) {
          results.push(`emp_id backfill skipped: ${(e2 as Error).message}`);
        }
      }

      const r2 = await addIndexSafe('hr_attendance', 'idx_hr_attendance_emp_id', 'emp_id');
      results.push(r2);
    } else {
      await execute(ts('k_16dlhys'));
      results.push('Created hr_attendance with emp_id');
    }
  }

  // ============================================================
  // 【5】出库批次分配表 inv_outbound_batch_allocation
  // ============================================================
  if (step === 'all' || step === '5') {
    results.push(ts('k_o3rxxd'));

    if (!(await tableExists('inv_outbound_batch_allocation'))) {
      await execute(ts('k_16od12'));
      results.push('Created inv_outbound_batch_allocation');
    } else {
      results.push('Already exists: inv_outbound_batch_allocation');
    }
  }

  // ============================================================
  // 【6】巡检日志表 sys_daily_check_log
  // ============================================================
  if (step === 'all' || step === '6') {
    results.push(ts('k_m3ulav'));

    if (!(await tableExists('sys_daily_check_log'))) {
      await execute(ts('k_1y4cwve'));
      results.push('Created sys_daily_check_log');
    } else {
      results.push('Already exists: sys_daily_check_log');
    }
  }

  // ============================================================
  // 【7】请购单FK字段补充
  // ============================================================
  if (step === 'all' || step === '7') {
    results.push(ts('k_11f5tzl'));

    if (await tableExists('pur_request')) {
      const r1 = await addColumnSafe(
        'pur_request',
        'request_dept_id',
        ts('k_sto4br')
      );
      results.push(r1);
      const r2 = await addColumnSafe(
        'pur_request',
        'requester_id',
        ts('k_1sv1r1b')
      );
      results.push(r2);
      const r3 = await addColumnSafe(
        'pur_request',
        'reviewer_id',
        ts('k_qgrah3')
      );
      results.push(r3);
      const r4 = await addColumnSafe(
        'pur_request',
        'approver_id',
        ts('k_2ueuay')
      );
      results.push(r4);
    }

    if (await tableExists('pur_request_item')) {
      const r5 = await addColumnSafe(
        'pur_request_item',
        'material_id',
        ts('k_mic47r')
      );
      results.push(r5);

      try {
        const res = await execute(`
          UPDATE pur_request_item pri
          JOIN inv_material_std m ON pri.material_code = m.material_code
          SET pri.material_id = m.id
          WHERE pri.material_id IS NULL
        `);
        results.push(`Backfilled material_id from inv_material_std: ${res.affectedRows} rows`);
      } catch (e) {
        results.push(`material_id backfill skipped: ${(e as Error).message}`);
      }
    }
  }

  // ============================================================
  // 【8】菜单数据更新
  // ============================================================
  if (step === 'all' || step === '8') {
    results.push(ts('k_yqhxi5'));

    const newMenuItems = [
      {
        parent_code: 'purchase',
        menu_name: ts('k_reg2r7'),
        menu_code: 'purchase_request_new',
        menu_type: 2,
        icon: null,
        path: '/purchase/request',
        component: '/purchase/request',
        permission: 'purchase:request:*',
        sort_order: 3,
      },
      {
        parent_code: 'finance',
        menu_name: ts('k_10rbyfa'),
        menu_code: 'fin_payable',
        menu_type: 2,
        icon: null,
        path: '/finance/payable',
        component: '/finance/payable',
        permission: 'finance:payable:*',
        sort_order: 2,
      },
      {
        parent_code: 'finance',
        menu_name: ts('k_15l95eg'),
        menu_code: 'finance_payment',
        menu_type: 2,
        icon: null,
        path: '/finance/payment',
        component: '/finance/payment',
        permission: 'finance:payment:*',
        sort_order: 3,
      },
      {
        parent_code: 'settings',
        menu_name: ts('k_1sril1e'),
        menu_code: 'settings_daily_check',
        menu_type: 2,
        icon: null,
        path: '/settings/daily-check',
        component: '/settings/daily-check',
        permission: 'settings:daily-check:*',
        sort_order: 10,
      },
    ];

    for (const menu of newMenuItems) {
      const [parent] = await query(
        'SELECT id FROM sys_menu WHERE menu_code = ? AND parent_id = 0',
        [menu.parent_code]
      );
      if (parent && parent.length > 0) {
        const [existing] = await query('SELECT id FROM sys_menu WHERE menu_code = ?', [
          menu.menu_code,
        ]);
        if (!existing || existing.length === 0) {
          await execute(
            'INSERT INTO sys_menu (parent_id, menu_name, menu_code, menu_type, icon, path, component, permission, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              parent[0].id,
              menu.menu_name,
              menu.menu_code,
              menu.menu_type,
              menu.icon,
              menu.path,
              menu.component,
              menu.permission,
              menu.sort_order,
              1,
            ]
          );
          results.push(`Created menu: ${menu.menu_code}`);
        } else {
          results.push(`Menu already exists: ${menu.menu_code}`);
        }
      } else {
        results.push(`Parent menu not found: ${menu.parent_code}`);
      }
    }
  }

  return successResponse(results, ts('k_ey185t'));
});
