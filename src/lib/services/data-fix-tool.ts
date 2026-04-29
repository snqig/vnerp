import { query, execute, transaction } from '@/lib/db';

export interface FixResult {
  fixName: string;
  affectedRows: number;
  detail: string;
}

export async function fixRequestItemMaterialId(): Promise<FixResult> {
  try {
    const [res]: any = await execute(`
      UPDATE pur_request_item pri
      JOIN inv_material_std m ON pri.material_code = m.material_code
      SET pri.material_id = m.id
      WHERE pri.material_id IS NULL AND pri.material_code IS NOT NULL AND pri.material_code != ''
    `);
    return {
      fixName: 'fixRequestItemMaterialId',
      affectedRows: res.affectedRows,
      detail: `修复请购单明细缺失material_id: ${res.affectedRows}行`,
    };
  } catch (e: any) {
    return {
      fixName: 'fixRequestItemMaterialId',
      affectedRows: 0,
      detail: `修复失败: ${e.message}`,
    };
  }
}

export async function fixAttendanceEmpId(): Promise<FixResult> {
  try {
    const [res]: any = await execute(`
      UPDATE hr_attendance a
      JOIN sys_employee e ON CAST(a.employee_id AS UNSIGNED) = e.id
      SET a.emp_id = e.id
      WHERE a.emp_id IS NULL AND a.employee_id IS NOT NULL
    `);
    return {
      fixName: 'fixAttendanceEmpId',
      affectedRows: res.affectedRows,
      detail: `修复考勤emp_id: ${res.affectedRows}行`,
    };
  } catch (e: any) {
    try {
      const [res]: any = await execute(`
        UPDATE hr_attendance a
        JOIN sys_employee e ON a.employee_id COLLATE utf8mb4_unicode_ci = e.name COLLATE utf8mb4_unicode_ci
        SET a.emp_id = e.id
        WHERE a.emp_id IS NULL AND a.employee_id IS NOT NULL
      `);
      return {
        fixName: 'fixAttendanceEmpId',
        affectedRows: res.affectedRows,
        detail: `修复考勤emp_id(姓名匹配): ${res.affectedRows}行`,
      };
    } catch (e2: any) {
      return {
        fixName: 'fixAttendanceEmpId',
        affectedRows: 0,
        detail: `修复失败: ${e2.message}`,
      };
    }
  }
}

export async function fixInventoryBatchConsistency(): Promise<FixResult> {
  try {
    const [rows]: any = await query(`
      SELECT i.material_id, i.warehouse_id, i.quantity AS inv_qty,
             COALESCE(SUM(b.available_qty), 0) AS batch_qty
      FROM inv_inventory i
      LEFT JOIN inv_inventory_batch b ON i.material_id = b.material_id AND i.warehouse_id = b.warehouse_id AND b.deleted = 0
      WHERE i.deleted = 0
      GROUP BY i.material_id, i.warehouse_id, i.quantity
      HAVING ABS(i.quantity - batch_qty) > 0.001
    `);

    if (!rows || rows.length === 0) {
      return {
        fixName: 'fixInventoryBatchConsistency',
        affectedRows: 0,
        detail: '库存与批次余额一致，无需修复',
      };
    }

    let fixedCount = 0;
    for (const row of rows) {
      const [res]: any = await execute(
        `UPDATE inv_inventory SET quantity = ? WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [row.batch_qty, row.material_id, row.warehouse_id]
      );
      fixedCount += res.affectedRows;
    }

    return {
      fixName: 'fixInventoryBatchConsistency',
      affectedRows: fixedCount,
      detail: `修复库存与批次不一致: ${fixedCount}行，差异记录${rows.length}条`,
    };
  } catch (e: any) {
    return {
      fixName: 'fixInventoryBatchConsistency',
      affectedRows: 0,
      detail: `修复失败: ${e.message}`,
    };
  }
}

export async function fixPurchaseOrderLineMaterialRef(): Promise<FixResult> {
  try {
    const [res]: any = await execute(`
      UPDATE pur_order_line_std pol
      JOIN inv_material_std m ON pol.material_code = m.material_code
      SET pol.material_id = m.id
      WHERE pol.material_id = 0 OR pol.material_id IS NULL
    `);
    return {
      fixName: 'fixPurchaseOrderLineMaterialRef',
      affectedRows: res.affectedRows,
      detail: `修复采购订单行物料引用: ${res.affectedRows}行`,
    };
  } catch (e: any) {
    return {
      fixName: 'fixPurchaseOrderLineMaterialRef',
      affectedRows: 0,
      detail: `修复失败: ${e.message}`,
    };
  }
}

export async function fixBomLineMaterialRef(): Promise<FixResult> {
  try {
    const [res]: any = await execute(`
      UPDATE prd_bom_line_std bl
      JOIN inv_material_std m ON bl.material_code = m.material_code
      SET bl.material_id = m.id
      WHERE bl.material_id = 0 OR bl.material_id IS NULL
    `);
    return {
      fixName: 'fixBomLineMaterialRef',
      affectedRows: res.affectedRows,
      detail: `修复BOM行物料引用: ${res.affectedRows}行`,
    };
  } catch (e: any) {
    return {
      fixName: 'fixBomLineMaterialRef',
      affectedRows: 0,
      detail: `修复失败: ${e.message}`,
    };
  }
}

export async function runAllFixes(): Promise<FixResult[]> {
  const results: FixResult[] = [];

  results.push(await fixRequestItemMaterialId());
  results.push(await fixAttendanceEmpId());
  results.push(await fixInventoryBatchConsistency());
  results.push(await fixPurchaseOrderLineMaterialRef());
  results.push(await fixBomLineMaterialRef());

  await execute(`
    INSERT INTO sys_daily_check_log (check_date, check_type, error_count, error_detail, status)
    VALUES (CURDATE(), 'data_fix', ?, ?, 1)
  `, [
    results.filter(r => r.affectedRows > 0).length,
    results.map(r => `${r.fixName}: ${r.detail}`).join('\n'),
  ]);

  return results;
}
