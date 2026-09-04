import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

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

export const GET = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step') || 'all';
    const results: string[] = [];

    // ============================================================
    // 【1】统一采购订单表
    // ============================================================
    if (step === 'all' || step === '1') {
      results.push(ts('k_m0i19z'));

      if (!(await tableExists('std_purchase_order'))) {
        await execute(ts('k_1punx6o'));
        results.push('Created std_purchase_order');
      } else {
        results.push('Already exists: std_purchase_order');
      }

      if (!(await tableExists('std_purchase_order_line'))) {
        await execute(ts('k_644962'));
        results.push('Created std_purchase_order_line');
      } else {
        results.push('Already exists: std_purchase_order_line');
      }

      try {
        const po1Count = await query('SELECT COUNT(*) as cnt FROM pur_order WHERE deleted = 0');
        const cnt1 = (po1Count as DbRow[])[0]?.cnt || 0;
        if (cnt1 > 0) {
          await execute(`
          INSERT IGNORE INTO std_purchase_order (order_no, supplier_id, supplier_name, order_date, delivery_date, currency, exchange_rate, total_amount, tax_amount, grand_total, status, payment_terms, delivery_address, contact_person, contact_phone, remark, create_by, create_time, update_by, update_time, legacy_source, legacy_id)
          SELECT order_no, supplier_id, '', order_date, delivery_date, currency, exchange_rate, total_amount, tax_amount, total_with_tax,
            CASE status WHEN 1 THEN 0 WHEN 2 THEN 4 WHEN 3 THEN 5 WHEN 4 THEN 6 WHEN 5 THEN 8 ELSE 0 END,
            payment_terms, delivery_address, contact_name, contact_phone, remark, create_by, create_time, update_by, update_time, 'pur_order', id
          FROM pur_order WHERE deleted = 0
        `);
          results.push(`Migrated ${cnt1} rows from pur_order`);
        } else {
          results.push('No data in pur_order to migrate');
        }
      } catch (e) {
        results.push(`Migrate pur_order skipped: ${(e as Error).message}`);
      }

      try {
        const po2Count = await query(
          'SELECT COUNT(*) as cnt FROM pur_purchase_order WHERE deleted = 0'
        );
        const cnt2 = (po2Count as DbRow[])[0]?.cnt || 0;
        if (cnt2 > 0) {
          await execute(`
          INSERT IGNORE INTO std_purchase_order (order_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total, status, over_receipt_tolerance, payment_terms, delivery_address, contact_person, contact_phone, remark, create_by, create_time, update_by, update_time, approve_by, approve_time, close_by, close_time, close_reason, legacy_source, legacy_id)
          SELECT po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
            CASE status WHEN 10 THEN 0 WHEN 20 THEN 2 WHEN 30 THEN 4 WHEN 40 THEN 5 WHEN 50 THEN 6 WHEN 90 THEN 8 ELSE 0 END,
            over_receipt_tolerance, payment_terms, delivery_address, contact_person, contact_phone, remark, create_by, create_time, update_by, update_time, audit_by, audit_time, close_by, close_time, close_reason, 'pur_purchase_order', id
          FROM pur_purchase_order WHERE deleted = 0
        `);
          results.push(`Migrated ${cnt2} rows from pur_purchase_order`);
        } else {
          results.push('No data in pur_purchase_order to migrate');
        }
      } catch (e) {
        results.push(`Migrate pur_purchase_order skipped: ${(e as Error).message}`);
      }

      try {
        const pod1Count = await query('SELECT COUNT(*) as cnt FROM pur_order_detail');
        const cnt1 = (pod1Count as DbRow[])[0]?.cnt || 0;
        if (cnt1 > 0) {
          await execute(`
          INSERT IGNORE INTO std_purchase_order_line (order_id, line_no, material_id, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, tax_rate, tax_amount, line_total, require_date, remark, create_time)
          SELECT spo.id, ROW_NUMBER() OVER(PARTITION BY pod.order_id ORDER BY pod.id), pod.material_id, im.material_code, im.material_name, im.specification, pod.unit, pod.quantity, pod.received_qty, pod.unit_price, pod.amount, pod.tax_rate, pod.tax_amount, pod.total_amount, pod.delivery_date, pod.remark, pod.create_time
          FROM pur_order_detail pod
          JOIN pur_order po ON pod.order_id = po.id AND po.deleted = 0
          JOIN std_purchase_order spo ON spo.legacy_source = 'pur_order' AND spo.legacy_id = po.id
          LEFT JOIN inv_material im ON pod.material_id = im.id
        `);
          results.push(`Migrated ${cnt1} rows from pur_order_detail`);
        }
      } catch (e) {
        results.push(`Migrate pur_order_detail skipped: ${(e as Error).message}`);
      }

      try {
        const pod2Count = await query('SELECT COUNT(*) as cnt FROM pur_purchase_order_line');
        const cnt2 = (pod2Count as DbRow[])[0]?.cnt || 0;
        if (cnt2 > 0) {
          await execute(`
          INSERT IGNORE INTO std_purchase_order_line (order_id, line_no, material_id, material_code, material_name, material_spec, unit, order_qty, received_qty, returned_qty, unit_price, amount, tax_rate, tax_amount, line_total, require_date, closed_flag, closed_reason, remark, create_time, update_time)
          SELECT spo.id, pol.line_no, pol.material_id, pol.material_code, pol.material_name, pol.material_spec, pol.unit, pol.order_qty, pol.received_qty, pol.returned_qty, pol.unit_price, pol.amount, pol.tax_rate, pol.tax_amount, pol.line_total, pol.require_date, pol.closed_flag, pol.closed_reason, pol.remark, pol.create_time, pol.update_time
          FROM pur_purchase_order_line pol
          JOIN pur_purchase_order po ON pol.po_id = po.id AND po.deleted = 0
          JOIN std_purchase_order spo ON spo.legacy_source = 'pur_purchase_order' AND spo.legacy_id = po.id
        `);
          results.push(`Migrated ${cnt2} rows from pur_purchase_order_line`);
        }
      } catch (e) {
        results.push(`Migrate pur_purchase_order_line skipped: ${(e as Error).message}`);
      }
    }

    // ============================================================
    // 【2】统一BOM表
    // ============================================================
    if (step === 'all' || step === '2') {
      results.push(ts('k_11zwhk7'));

      if (!(await tableExists('std_bom_header'))) {
        await execute(ts('k_12xry1e'));
        results.push('Created std_bom_header');
      } else {
        results.push('Already exists: std_bom_header');
      }

      if (!(await tableExists('std_bom_line'))) {
        await execute(ts('k_4bd1me'));
        results.push('Created std_bom_line');
      } else {
        results.push('Already exists: std_bom_line');
      }

      try {
        const bom1Count = await query('SELECT COUNT(*) as cnt FROM prd_bom WHERE deleted = 0');
        const cnt1 = (bom1Count as DbRow[])[0]?.cnt || 0;
        if (cnt1 > 0) {
          await execute(`
          INSERT IGNORE INTO std_bom_header (bom_no, product_id, product_code, product_name, version, status, total_cost, remark, create_by, create_time, legacy_source, legacy_id)
          SELECT CONCAT('BOM-PRD-', pb.id), pb.product_id, '', pb.bom_name, pb.version,
            CASE pb.status WHEN 0 THEN 2 WHEN 1 THEN 1 ELSE 0 END,
            pb.total_cost, pb.remark, pb.create_by, pb.create_time, 'prd_bom', pb.id
          FROM prd_bom pb WHERE pb.deleted = 0
        `);
          results.push(`Migrated ${cnt1} rows from prd_bom`);
        }
      } catch (e) {
        results.push(`Migrate prd_bom skipped: ${(e as Error).message}`);
      }

      try {
        const bomDetailCount = await query('SELECT COUNT(*) as cnt FROM prd_bom_detail');
        const cnt = (bomDetailCount as DbRow[])[0]?.cnt || 0;
        if (cnt > 0) {
          await execute(`
          INSERT IGNORE INTO std_bom_line (bom_id, line_no, material_id, material_code, material_name, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, remark, create_time)
          SELECT sbh.id, ROW_NUMBER() OVER(PARTITION BY pbd.bom_id ORDER BY pbd.id), pbd.material_id, '', pbd.material_name, pbd.unit, pbd.quantity, pbd.loss_rate, pbd.quantity, pbd.unit_cost, pbd.total_cost,
            CASE pbd.item_type WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 ELSE 5 END,
            pbd.remark, pbd.create_time
          FROM prd_bom_detail pbd
          JOIN prd_bom pb ON pbd.bom_id = pb.id AND pb.deleted = 0
          JOIN std_bom_header sbh ON sbh.legacy_source = 'prd_bom' AND sbh.legacy_id = pb.id
        `);
          results.push(`Migrated ${cnt} rows from prd_bom_detail`);
        }
      } catch (e) {
        results.push(`Migrate prd_bom_detail skipped: ${(e as Error).message}`);
      }

      try {
        const bom2Count = await query('SELECT COUNT(*) as cnt FROM bom_header WHERE deleted = 0');
        const cnt2 = (bom2Count as DbRow[])[0]?.cnt || 0;
        if (cnt2 > 0) {
          await execute(`
          INSERT IGNORE INTO std_bom_header (bom_no, product_id, product_code, product_name, product_spec, version, is_default, status, unit, base_qty, total_material_count, total_cost, remark, create_by, create_time, update_by, update_time, approve_by, approve_time, publish_time, legacy_source, legacy_id)
          SELECT bh.bom_no, bh.product_id, bh.product_code, bh.product_name, bh.product_spec, bh.version, bh.is_default,
            CASE bh.status WHEN 10 THEN 0 WHEN 20 THEN 1 WHEN 30 THEN 2 ELSE 0 END,
            bh.unit, bh.base_qty, bh.total_material_count, bh.total_cost, bh.remark, bh.create_by, bh.create_time, bh.update_by, bh.update_time, bh.audit_by, bh.audit_time, bh.publish_time, 'bom_header', bh.id
          FROM bom_header bh WHERE bh.deleted = 0
        `);
          results.push(`Migrated ${cnt2} rows from bom_header`);
        }
      } catch (e) {
        results.push(`Migrate bom_header skipped: ${(e as Error).message}`);
      }

      try {
        const bomLineCount = await query('SELECT COUNT(*) as cnt FROM bom_line');
        const cnt = (bomLineCount as DbRow[])[0]?.cnt || 0;
        if (cnt > 0) {
          await execute(`
          INSERT IGNORE INTO std_bom_line (bom_id, line_no, parent_line_id, level, material_id, material_code, material_name, material_spec, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, is_key_material, position_no, process_seq, process_name, remark, create_time, update_time)
          SELECT sbh.id, bl.line_no, bl.parent_line_id, bl.level, bl.material_id, bl.material_code, bl.material_name, bl.material_spec, bl.unit, bl.consumption_qty, bl.loss_rate, bl.actual_qty, bl.unit_cost, bl.total_cost,
            CASE bl.material_type WHEN 'RAW' THEN 1 WHEN 'SEMI' THEN 2 WHEN 'SUB' THEN 3 WHEN 'PKG' THEN 4 ELSE 5 END,
            bl.is_key_material, bl.position_no, bl.process_seq, bl.process_name, bl.remark, bl.create_time, bl.update_time
          FROM bom_line bl
          JOIN bom_header bh ON bl.bom_id = bh.id AND bh.deleted = 0
          JOIN std_bom_header sbh ON sbh.legacy_source = 'bom_header' AND sbh.legacy_id = bh.id
        `);
          results.push(`Migrated ${cnt} rows from bom_line`);
        }
      } catch (e) {
        results.push(`Migrate bom_line skipped: ${(e as Error).message}`);
      }

      try {
        const bom3Count = await query('SELECT COUNT(*) as cnt FROM mdm_product_bom');
        const cnt3 = (bom3Count as DbRow[])[0]?.cnt || 0;
        if (cnt3 > 0) {
          results.push(`mdm_product_bom has ${cnt3} rows - requires manual mapping`);
        } else {
          results.push('No data in mdm_product_bom');
        }
      } catch (e) {
        results.push(`mdm_product_bom check skipped: ${(e as Error).message}`);
      }
    }

    // ============================================================
    // 【3】统一物料主档
    // ============================================================
    if (step === 'all' || step === '3') {
      results.push(ts('k_128x0p4'));

      if (!(await tableExists('std_material'))) {
        await execute(ts('k_88yie0'));
        results.push('Created std_material');
      } else {
        results.push('Already exists: std_material');
      }

      try {
        const invMatCount = await query(
          'SELECT COUNT(*) as cnt FROM inv_material WHERE deleted = 0'
        );
        const cnt = (invMatCount as DbRow[])[0]?.cnt || 0;
        if (cnt > 0) {
          await execute(`
          INSERT IGNORE INTO std_material (material_code, material_name, specification, category_id, material_type, unit, barcode, brand, safety_stock, max_stock, min_stock, purchase_price, sale_price, cost_price, warehouse_id, shelf_life, warning_days, is_batch_managed, is_serial_managed, status, remark, create_by, create_time, update_by, update_time, legacy_source, legacy_id)
          SELECT material_code, material_name, specification, category_id, material_type, unit, barcode, brand, safety_stock, max_stock, min_stock, purchase_price, sale_price, cost_price, warehouse_id, shelf_life, warning_days, is_batch_managed, is_serial_managed, status, remark, create_by, create_time, update_by, update_time, 'inv_material', id
          FROM inv_material WHERE deleted = 0
        `);
          results.push(`Migrated ${cnt} rows from inv_material`);
        }
      } catch (e) {
        results.push(`Migrate inv_material skipped: ${(e as Error).message}`);
      }

      try {
        const bomMatCount = await query(
          'SELECT COUNT(*) as cnt FROM bom_material WHERE deleted = 0'
        );
        const cnt = (bomMatCount as DbRow[])[0]?.cnt || 0;
        if (cnt > 0) {
          await execute(`
          INSERT IGNORE INTO std_material (material_code, material_name, specification, material_type, unit, cost_price, safety_stock, default_supplier_id, default_supplier_name, is_active, remark, create_time, update_time, legacy_source, legacy_id)
          SELECT material_code, material_name, material_spec,
            CASE material_type WHEN 'RAW' THEN 1 WHEN 'SEMI' THEN 2 WHEN 'FINISHED' THEN 3 WHEN 'SUB' THEN 4 WHEN 'PKG' THEN 5 ELSE 6 END,
            unit, unit_cost, safety_stock, default_supplier_id, default_supplier_name, is_active, remark, create_time, update_time, 'bom_material', id
          FROM bom_material WHERE deleted = 0
        `);
          results.push(`Migrated ${cnt} rows from bom_material`);
        }
      } catch (e) {
        results.push(`Migrate bom_material skipped: ${(e as Error).message}`);
      }

      try {
        const mdmMatCount = await query('SELECT COUNT(*) as cnt FROM mdm_material');
        const cnt = (mdmMatCount as DbRow[])[0]?.cnt || 0;
        if (cnt > 0) {
          results.push(`mdm_material has ${cnt} rows - requires field mapping`);
        }
      } catch (e) {
        results.push(`mdm_material check skipped: ${(e as Error).message}`);
      }
    }

    // ============================================================
    // 【4】修复HRM考勤表员工ID
    // ============================================================
    if (step === 'all' || step === '4') {
      results.push(ts('k_1sud5h'));

      if (!(await tableExists('hr_attendance'))) {
        await execute(ts('k_hvyn8j'));
        results.push('Created hr_attendance with employee_id_int');
      } else {
        try {
          results.push(
            await addColumnSafe(
              'hr_attendance',
              'employee_id_int',
              ts('k_1wc9gd3')
            )
          );

          await execute(`
          UPDATE hr_attendance ha
          LEFT JOIN sys_employee se ON ha.employee_id COLLATE utf8mb4_unicode_ci = CAST(se.id AS CHAR)
          SET ha.employee_id_int = se.id
          WHERE ha.employee_id_int IS NULL AND se.id IS NOT NULL
        `);
          results.push('Backfilled employee_id_int from sys_employee');

          const nullCount = await query(
            'SELECT COUNT(*) as cnt FROM hr_attendance WHERE employee_id_int IS NULL AND employee_id IS NOT NULL AND deleted = 0'
          );
          const nullCnt = (nullCount as DbRow[])[0]?.cnt || 0;
          if (nullCnt > 0) {
            results.push(`WARNING: ${nullCnt} rows could not be matched to sys_employee`);
          }

          results.push(
            await addIndexSafe(
              'hr_attendance',
              'idx_hr_attendance_employee_id_int',
              'employee_id_int'
            )
          );
        } catch (e) {
          results.push(`Fix hr_attendance skipped: ${(e as Error).message}`);
        }
      }
    }

    // ============================================================
    // 【5】创建出库批次分配表
    // ============================================================
    if (step === 'all' || step === '5') {
      results.push(ts('k_10kj6m6'));

      if (!(await tableExists('inv_outbound_batch_allocation'))) {
        await execute(ts('k_nlygmm'));
        results.push('Created inv_outbound_batch_allocation');
      } else {
        results.push('Already exists: inv_outbound_batch_allocation');
      }
    }

    return successResponse(results, ts('k_ey185t'));
  },
  { errorMessage: '迁移失败' }
);
