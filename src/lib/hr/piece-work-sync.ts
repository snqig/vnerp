import { getDrizzleDb } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { sysEmployee, hrPieceRate, hrPieceWorkDetail } from '@/lib/db/schema';

const db = getDrizzleDb();

export interface PieceWorkRecord {
  employeeId: number;
  employeeNo: string;
  processCode: string;
  productCode: string;
  quantity: number;
  defectiveQuantity: number;
  workDate: string;
  machineId?: string;
  shiftCode?: string;
  batchNo?: string;
  mesSyncId: string;
}

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: { record: string; reason: string }[];
}

export async function syncPieceWorkFromMes(records: PieceWorkRecord[]): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

  for (const record of records) {
    try {
      if (!record.employeeNo || !record.processCode || !record.mesSyncId) {
        result.errors.push({ record: JSON.stringify(record), reason: '缺少必填字段(employeeNo/processCode/mesSyncId)' });
        continue;
      }

      const existing = await db.select({ id: hrPieceWorkDetail.id })
        .from(hrPieceWorkDetail)
        .where(eq(hrPieceWorkDetail.mesSyncId, record.mesSyncId))
        .then(rows => rows[0]);

      if (existing) {
        result.skipped++;
        continue;
      }

      const employee = await db.select({ id: sysEmployee.id })
        .from(sysEmployee)
        .where(and(
          eq(sysEmployee.employeeNo, record.employeeNo),
          eq(sysEmployee.deleted, 0),
        ))
        .then(rows => rows[0]);

      if (!employee) {
        result.errors.push({ record: record.mesSyncId, reason: `员工编号 ${record.employeeNo} 不存在` });
        continue;
      }

      const pieceRate = await db.select({ unitPrice: hrPieceRate.unitPrice })
        .from(hrPieceRate)
        .where(and(
          eq(hrPieceRate.processCode, record.processCode),
          eq(hrPieceRate.status, 1),
          eq(hrPieceRate.deleted, 0),
        ))
        .orderBy(hrPieceRate.effectiveDate)
        .limit(1)
        .then(rows => rows[0]);

      const unitPrice = pieceRate ? Number(pieceRate.unitPrice) : 0;
      const qty = record.quantity || 0;
      const defective = record.defectiveQuantity || 0;
      const defectiveRate = qty > 0 ? defective / qty : 0;
      const amount = qty * unitPrice * (1 - defectiveRate);

      await db.insert(hrPieceWorkDetail).values({
        employeeId: employee.id,
        workDate: new Date(record.workDate),
        processCode: record.processCode,
        productCode: record.productCode || null,
        quantity: qty,
        defectiveQuantity: defective,
        unitPrice: unitPrice.toFixed(4),
        amount: amount.toFixed(2),
        machineId: record.machineId || null,
        mesSyncId: record.mesSyncId,
        syncStatus: 1,
      });

      result.synced++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ record: record.mesSyncId || 'unknown', reason: message });
    }
  }

  return result;
}
