import mysql from 'mysql2/promise';
import {
  IPurchaseReconciliationRepository,
  Pagination,
  PaginatedResult,
} from '@/domain/purchase/repositories/IPurchaseReconciliationRepository';
import {
  PurchaseReconciliation,
  PurchaseReconciliationProps,
  PurchaseReconciliationLineProps,
} from '@/domain/purchase/aggregates/PurchaseReconciliation';
import { PurchaseWriteOffRecordProps } from '@/domain/purchase/entities/PurchaseWriteOffRecord';
import { PurchaseReconciliationStatusValue } from '@/domain/purchase/value-objects/PurchaseReconciliationStatus';
import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

type SqlValue = string | number | null | boolean | Date;

/** pur_purchase_reconciliation 表行类型 */
interface PurPurchaseReconciliationRow {
  id: number;
  reconciliation_no: string;
  status: number;
  supplier_id: number;
  supplier_name: string;
  period_start: string;
  period_end: string;
  receipt_amount: number | string;
  return_amount: number | string;
  net_amount: number | string | null;
  discount_amount: number | string | null;
  paid_amount: number | string | null;
  balance_amount: number | string | null;
  remark: string | null;
  create_by: number | null;
  confirm_by: number | null;
  confirm_time: string | null;
  close_by: number | null;
  close_time: string | null;
  create_time: string;
  update_time: string;
  deleted: number;
}

/** pur_purchase_reconciliation_writeoff 表行类型 */
interface PurPurchaseReconciliationWriteoffRow {
  id: number;
  reconciliation_id: number;
  payable_id: number;
  amount: number | string;
  write_off_date: string;
  remark: string | null;
  create_time: string;
}

const RECON_COLUMNS = `id, reconciliation_no, status, supplier_id, supplier_name,
  period_start, period_end, receipt_amount, return_amount, net_amount,
  discount_amount, paid_amount, balance_amount, remark,
  create_by, confirm_by, confirm_time, close_by, close_time,
  create_time, update_time`;

export class MysqlPurchaseReconciliationRepository implements IPurchaseReconciliationRepository {
  async findById(id: number): Promise<PurchaseReconciliation | null> {
    const rows = await query<PurPurchaseReconciliationRow>(
      `SELECT ${RECON_COLUMNS} FROM pur_purchase_reconciliation WHERE id = ? AND deleted = 0`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const writeOffs = await query<PurPurchaseReconciliationWriteoffRow>(
      `SELECT id, reconciliation_id, payable_id, amount, write_off_date, remark, create_time
       FROM pur_purchase_reconciliation_writeoff
       WHERE reconciliation_id = ? ORDER BY write_off_date DESC, id DESC`,
      [id]
    );
    return this.mapToAggregate(rows[0], writeOffs);
  }

  async findByReconciliationNo(reconciliationNo: string): Promise<PurchaseReconciliation | null> {
    const rows = await query<PurPurchaseReconciliationRow>(
      `SELECT ${RECON_COLUMNS} FROM pur_purchase_reconciliation WHERE reconciliation_no = ? AND deleted = 0`,
      [reconciliationNo]
    );
    if (!rows || rows.length === 0) return null;
    const writeOffs = await query<PurPurchaseReconciliationWriteoffRow>(
      `SELECT id, reconciliation_id, payable_id, amount, write_off_date, remark, create_time
       FROM pur_purchase_reconciliation_writeoff
       WHERE reconciliation_id = ? ORDER BY write_off_date DESC, id DESC`,
      [rows[0].id]
    );
    return this.mapToAggregate(rows[0], writeOffs);
  }

  async findBySupplierId(supplierId: number): Promise<PurchaseReconciliation[]> {
    const rows = await query<PurPurchaseReconciliationRow>(
      `SELECT ${RECON_COLUMNS} FROM pur_purchase_reconciliation
       WHERE supplier_id = ? AND deleted = 0 ORDER BY create_time DESC`,
      [supplierId]
    );
    if (!rows || rows.length === 0) return [];
    const reconIds = rows.map((r) => r.id);
    const allWriteOffs = await query<PurPurchaseReconciliationWriteoffRow>(
      `SELECT id, reconciliation_id, payable_id, amount, write_off_date, remark, create_time
       FROM pur_purchase_reconciliation_writeoff
       WHERE reconciliation_id IN (?) ORDER BY reconciliation_id, write_off_date DESC`,
      [reconIds]
    );
    return rows.map((r) => {
      const writeOffs = allWriteOffs.filter((w) => w.reconciliation_id === r.id);
      return this.mapToAggregate(r, writeOffs);
    });
  }

  async findByStatus(
    status: number,
    pagination: Pagination,
    filters?: { keyword?: string; supplierId?: number; startDate?: string; endDate?: string }
  ): Promise<PaginatedResult<PurchaseReconciliation>> {
    const where: string[] = ['deleted = 0', 'status = ?'];
    const values: SqlValue[] = [status];
    if (filters?.keyword) {
      where.push('(reconciliation_no LIKE ? OR supplier_name LIKE ?)');
      const like = `%${filters.keyword}%`;
      values.push(like, like);
    }
    if (filters?.supplierId) {
      where.push('supplier_id = ?');
      values.push(filters.supplierId);
    }
    if (filters?.startDate) {
      where.push('period_start >= ?');
      values.push(filters.startDate);
    }
    if (filters?.endDate) {
      where.push('period_end <= ?');
      values.push(filters.endDate);
    }
    const whereClause = where.join(' AND ');

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM pur_purchase_reconciliation WHERE ${whereClause}`,
      values
    );
    const total = countRows[0]?.total || 0;

    const offset = (pagination.page - 1) * pagination.pageSize;
    const rows = await query<PurPurchaseReconciliationRow>(
      `SELECT ${RECON_COLUMNS} FROM pur_purchase_reconciliation
       WHERE ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...values, pagination.pageSize, offset]
    );

    if (!rows || rows.length === 0) {
      return {
        data: [],
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total,
          totalPages: Math.ceil(total / pagination.pageSize) || 0,
        },
      };
    }

    const reconIds = rows.map((r) => r.id);
    const allWriteOffs = await query<PurPurchaseReconciliationWriteoffRow>(
      `SELECT id, reconciliation_id, payable_id, amount, write_off_date, remark, create_time
       FROM pur_purchase_reconciliation_writeoff
       WHERE reconciliation_id IN (?) ORDER BY reconciliation_id, write_off_date DESC`,
      [reconIds]
    );

    const data = rows.map((r) => {
      const writeOffs = allWriteOffs.filter((w) => w.reconciliation_id === r.id);
      return this.mapToAggregate(r, writeOffs);
    });

    return {
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize) || 0,
      },
    };
  }

  async save(recon: PurchaseReconciliation): Promise<{ id: number; reconciliationNo: string }> {
    const reconciliationNo =
      recon.reconciliationNo || (await generateDocumentNo('purchase_reconcile'));

    return transaction(async (conn) => {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO pur_purchase_reconciliation
         (reconciliation_no, status, supplier_id, supplier_name,
          period_start, period_end, receipt_amount, return_amount, net_amount,
          discount_amount, paid_amount, balance_amount, remark, create_by,
          create_time, update_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
        [
          reconciliationNo,
          recon.status.value,
          recon.supplierId,
          recon.supplierName,
          recon.periodStart,
          recon.periodEnd,
          recon.receiptAmount,
          recon.returnAmount,
          recon.netAmount,
          recon.discountAmount,
          recon.paidAmount,
          recon.balanceAmount,
          recon.remark,
          recon.createBy ?? null,
        ]
      );

      return { id: result.insertId, reconciliationNo };
    });
  }

  async updateStatus(id: number, status: number): Promise<void> {
    await execute(
      `UPDATE pur_purchase_reconciliation SET status = ?, update_time = NOW() WHERE id = ?`,
      [status, id]
    );
  }

  async updateConfirmInfo(id: number, confirmBy: number, confirmTime: string): Promise<void> {
    await execute(
      `UPDATE pur_purchase_reconciliation
       SET status = 2, confirm_by = ?, confirm_time = ?, update_time = NOW()
       WHERE id = ?`,
      [confirmBy, confirmTime, id]
    );
  }

  async updateCloseInfo(id: number, closeBy: number, closeTime: string): Promise<void> {
    await execute(
      `UPDATE pur_purchase_reconciliation
       SET status = 9, close_by = ?, close_time = ?, update_time = NOW()
       WHERE id = ?`,
      [closeBy, closeTime, id]
    );
  }

  async addWriteOffRecord(
    reconciliationId: number,
    payableId: number,
    amount: number,
    paidAmount: number,
    balance: number,
    status: number,
    writeOffDate: string
  ): Promise<void> {
    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO pur_purchase_reconciliation_writeoff
         (reconciliation_id, payable_id, amount, write_off_date, create_time)
         VALUES (?, ?, ?, ?, NOW())`,
        [reconciliationId, payableId, amount, writeOffDate]
      );

      await conn.execute(
        `UPDATE pur_purchase_reconciliation
         SET paid_amount = ?, balance_amount = ?, status = ?, update_time = NOW()
         WHERE id = ?`,
        [paidAmount, balance, status, reconciliationId]
      );
    });
  }

  async softDelete(id: number): Promise<void> {
    await execute(
      `UPDATE pur_purchase_reconciliation SET deleted = 1, update_time = NOW() WHERE id = ?`,
      [id]
    );
  }

  private mapToAggregate(
    row: PurPurchaseReconciliationRow,
    writeOffs: PurPurchaseReconciliationWriteoffRow[]
  ): PurchaseReconciliation {
    const writeOffProps: PurchaseWriteOffRecordProps[] = (writeOffs || []).map((w) => ({
      id: w.id,
      reconciliationId: w.reconciliation_id,
      payableId: w.payable_id,
      amount: Number(w.amount),
      writeOffDate: w.write_off_date ? String(w.write_off_date) : '',
      remark: w.remark || '',
      createTime: w.create_time ? String(w.create_time) : undefined,
    }));

    const props: PurchaseReconciliationProps = {
      id: row.id,
      reconciliationNo: row.reconciliation_no,
      status: row.status as PurchaseReconciliationStatusValue,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || '',
      periodStart: row.period_start ? String(row.period_start) : '',
      periodEnd: row.period_end ? String(row.period_end) : '',
      receiptAmount: Number(row.receipt_amount || 0),
      returnAmount: Number(row.return_amount || 0),
      netAmount: Number(row.net_amount || 0),
      discountAmount: Number(row.discount_amount || 0),
      paidAmount: Number(row.paid_amount || 0),
      balanceAmount: row.balance_amount !== null ? Number(row.balance_amount) : undefined,
      remark: row.remark || '',
      createBy: row.create_by ?? undefined,
      confirmBy: row.confirm_by ?? undefined,
      confirmTime: row.confirm_time ? String(row.confirm_time) : undefined,
      closeBy: row.close_by ?? undefined,
      closeTime: row.close_time ? String(row.close_time) : undefined,
      createTime: row.create_time ? String(row.create_time) : undefined,
      updateTime: row.update_time ? String(row.update_time) : undefined,
      lines: [],
      writeOffRecords: writeOffProps,
    };
    return PurchaseReconciliation.reconstitute(props);
  }
}
