import { query, execute } from '@/lib/db';

export interface FixResult {
  fixName: string;
  affectedRows: number;
  detail: string;
}

export async function fixRequestItemMaterialId(): Promise<FixResult> {
  try {
    const [res]: Loose = await execute(`
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
  } catch (e) {
    return {
      fixName: 'fixRequestItemMaterialId',
      affectedRows: 0,
      detail: `修复失败: ${(e as Error).message}`,
    };
  }
}

export async function fixAttendanceEmpId(): Promise<FixResult> {
  try {
    const [res]: Loose = await execute(`
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
  } catch (_e) {
    try {
      const [res]: Loose = await execute(`
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
    } catch (e2) {
      return {
        fixName: 'fixAttendanceEmpId',
        affectedRows: 0,
        detail: `修复失败: ${(e2 as Error).message}`,
      };
    }
  }
}

export async function fixInventoryBatchConsistency(): Promise<FixResult> {
  try {
    const [rows]: Loose = await query(`
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
      const [res]: Loose = await execute(
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
  } catch (e) {
    return {
      fixName: 'fixInventoryBatchConsistency',
      affectedRows: 0,
      detail: `修复失败: ${(e as Error).message}`,
    };
  }
}

export async function fixPurchaseOrderLineMaterialRef(): Promise<FixResult> {
  try {
    const [res]: Loose = await execute(`
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
  } catch (e) {
    return {
      fixName: 'fixPurchaseOrderLineMaterialRef',
      affectedRows: 0,
      detail: `修复失败: ${(e as Error).message}`,
    };
  }
}

export async function fixBomLineMaterialRef(): Promise<FixResult> {
  try {
    const [res]: Loose = await execute(`
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
  } catch (e) {
    return {
      fixName: 'fixBomLineMaterialRef',
      affectedRows: 0,
      detail: `修复失败: ${(e as Error).message}`,
    };
  }
}

export async function scanGhostData(): Promise<FixResult[]> {
  const results: FixResult[] = [];

  try {
    const [outboundGhost]: Loose = await query(`
      SELECT COUNT(*) as cnt FROM inv_outbound_batch_allocation oba
      JOIN inv_inventory_batch ib ON oba.batch_id = ib.id
      WHERE ib.deleted = 1
    `);
    results.push({
      fixName: 'scanGhost_outbound_deleted_batch',
      affectedRows: outboundGhost?.[0]?.cnt || 0,
      detail: `出库分配引用已删除批次: ${outboundGhost?.[0]?.cnt || 0}条`,
    });
  } catch (e) {
    results.push({
      fixName: 'scanGhost_outbound_deleted_batch',
      affectedRows: 0,
      detail: `扫描失败: ${(e as Error).message}`,
    });
  }

  try {
    const [processCardGhost]: Loose = await query(`
      SELECT COUNT(*) as cnt FROM prd_process_card pc
      LEFT JOIN prod_work_order wo ON pc.work_order_id = wo.id
      WHERE wo.deleted = 1 OR wo.id IS NULL
    `);
    results.push({
      fixName: 'scanGhost_processcard_deleted_workorder',
      affectedRows: processCardGhost?.[0]?.cnt || 0,
      detail: `工艺卡引用已删除工单: ${processCardGhost?.[0]?.cnt || 0}条`,
    });
  } catch (e) {
    results.push({
      fixName: 'scanGhost_processcard_deleted_workorder',
      affectedRows: 0,
      detail: `扫描失败: ${(e as Error).message}`,
    });
  }

  try {
    const [payableGhost]: Loose = await query(`
      SELECT COUNT(*) as cnt FROM fin_payable fp
      LEFT JOIN inv_inbound_order io ON fp.source_id = io.id
      WHERE fp.source_type = 'inbound' AND (io.deleted = 1 OR io.id IS NULL)
    `);
    results.push({
      fixName: 'scanGhost_payable_deleted_inbound',
      affectedRows: payableGhost?.[0]?.cnt || 0,
      detail: `应付账款引用已删除入库单: ${payableGhost?.[0]?.cnt || 0}条`,
    });
  } catch (e) {
    results.push({
      fixName: 'scanGhost_payable_deleted_inbound',
      affectedRows: 0,
      detail: `扫描失败: ${(e as Error).message}`,
    });
  }

  try {
    const [expiredNormal]: Loose = await query(`
      SELECT COUNT(*) as cnt FROM inv_inventory_batch
      WHERE expire_date IS NOT NULL AND expire_date < CURDATE() AND status = 'normal' AND deleted = 0
    `);
    results.push({
      fixName: 'scanGhost_expired_normal_batch',
      affectedRows: expiredNormal?.[0]?.cnt || 0,
      detail: `已过期但状态仍为normal的批次: ${expiredNormal?.[0]?.cnt || 0}条`,
    });
  } catch (e) {
    results.push({
      fixName: 'scanGhost_expired_normal_batch',
      affectedRows: 0,
      detail: `扫描失败: ${(e as Error).message}`,
    });
  }

  return results;
}

export async function fixExpiredBatches(): Promise<FixResult> {
  try {
    const [res]: Loose = await execute(
      `UPDATE inv_inventory_batch SET status = 'expired', update_time = NOW() WHERE expire_date IS NOT NULL AND expire_date < CURDATE() AND status = 'normal' AND deleted = 0`
    );
    return {
      fixName: 'fixExpiredBatches',
      affectedRows: res.affectedRows,
      detail: `标记过期批次: ${res.affectedRows}行`,
    };
  } catch (e) {
    return {
      fixName: 'fixExpiredBatches',
      affectedRows: 0,
      detail: `修复失败: ${(e as Error).message}`,
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
  results.push(await fixExpiredBatches());

  await execute(
    `
    INSERT INTO sys_daily_check_log (check_date, check_type, error_count, error_detail, status)
    VALUES (CURDATE(), 'data_fix', ?, ?, 1)
  `,
    [
      results.filter((r) => r.affectedRows > 0).length,
      results.map((r) => `${r.fixName}: ${r.detail}`).join('\n'),
    ]
  );

  return results;
}
