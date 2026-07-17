import mysql from 'mysql2/promise';
import { IReconciliationRepository } from '@/domain/sales/repositories/IReconciliationRepository';
import {
  Reconciliation,
  ReconciliationProps,
  ReconciliationLineProps,
} from '@/domain/sales/aggregates/Reconciliation';
import { WriteOffRecordProps } from '@/domain/sales/entities/WriteOffRecord';
import { ReconciliationStatusValue } from '@/domain/sales/value-objects/ReconciliationStatus';
import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

type SqlValue = string | number | null | boolean | Date;

/** sal_reconciliation 表行类型 */
interface SalReconciliationRow {
  id: number;
  reconciliation_no: string;
  status: number;
  customer_id: number;
  customer_name: string | null;
  period_start: string | null;
  period_end: string | null;
  currency: string | null;
  exchange_rate: number | string | null;
  delivery_amount: number | string | null;
  return_amount: number | string | null;
  net_amount: number | string | null;
  discount_amount: number | string | null;
  received_amount: number | string | null;
  balance_amount: number | string | null;
  base_delivery_amount: number | string;
  base_return_amount: number | string;
  base_net_amount: number | string;
  base_discount_amount: number | string;
  base_received_amount: number | string;
  base_balance_amount: number | string;
  confirm_by: number | null;
  confirm_time: string | null;
  close_by: number | null;
  close_time: string | null;
  remark: string | null;
  create_by: number | null;
  create_time: string | null;
  update_time: string | null;
  deleted: number;
}

/** sal_reconciliation_line 表行类型 */
interface SalReconciliationLineRow {
  id: number;
  reconciliation_id: number;
  source_type: number;
  source_id: number;
  source_no: string | null;
  source_date: string | null;
  amount: number | string;
  remark: string | null;
  deleted: number;
}

/** sal_reconciliation_writeoff 表行类型 */
interface SalReconciliationWriteoffRow {
  id: number;
  reconciliation_id: number;
  receivable_id: number;
  amount: number | string;
  write_off_date: string | null;
  remark: string | null;
  create_by: number | null;
  create_time: string | null;
  deleted: number;
}

const MAIN_COLUMNS = `id, reconciliation_no, status, customer_id, customer_name,
                      period_start, period_end,
                      currency, exchange_rate,
                      delivery_amount, return_amount, net_amount,
                      discount_amount, received_amount, balance_amount,
                      base_delivery_amount, base_return_amount, base_net_amount,
                      base_discount_amount, base_received_amount, base_balance_amount,
                      confirm_by, confirm_time, close_by, close_time,
                      remark, create_by, create_time, update_time`;

const LINE_COLUMNS = `id, reconciliation_id, source_type, source_id, source_no,
                      source_date, amount, remark`;

const WRITEOFF_COLUMNS = `id, reconciliation_id, receivable_id, amount, write_off_date,
                          remark, create_by, create_time`;

export class MysqlReconciliationRepository implements IReconciliationRepository {
  async findById(id: number): Promise<Reconciliation | null> {
    const rows = await query<SalReconciliationRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_reconciliation WHERE id = ? AND deleted = 0`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const [lines, writeOffs] = await Promise.all([
      this.findLines(rows[0].id),
      this.findWriteOffs(rows[0].id),
    ]);
    return this.mapToAggregate(rows[0], lines, writeOffs);
  }

  async findByReconciliationNo(reconciliationNo: string): Promise<Reconciliation | null> {
    const rows = await query<SalReconciliationRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_reconciliation WHERE reconciliation_no = ? AND deleted = 0`,
      [reconciliationNo]
    );
    if (!rows || rows.length === 0) return null;
    const [lines, writeOffs] = await Promise.all([
      this.findLines(rows[0].id),
      this.findWriteOffs(rows[0].id),
    ]);
    return this.mapToAggregate(rows[0], lines, writeOffs);
  }

  async findByCustomerId(customerId: number): Promise<Reconciliation[]> {
    const rows = await query<SalReconciliationRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_reconciliation WHERE customer_id = ? AND deleted = 0 ORDER BY create_time DESC`,
      [customerId]
    );
    return Promise.all(
      rows.map(async (r) => {
        const [lines, writeOffs] = await Promise.all([
          this.findLines(r.id),
          this.findWriteOffs(r.id),
        ]);
        return this.mapToAggregate(r, lines, writeOffs);
      })
    );
  }

  async findByStatus(status: number): Promise<Reconciliation[]> {
    const rows = await query<SalReconciliationRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_reconciliation WHERE status = ? AND deleted = 0 ORDER BY create_time DESC`,
      [status]
    );
    return Promise.all(
      rows.map(async (r) => {
        const [lines, writeOffs] = await Promise.all([
          this.findLines(r.id),
          this.findWriteOffs(r.id),
        ]);
        return this.mapToAggregate(r, lines, writeOffs);
      })
    );
  }

  async save(reconciliation: Reconciliation): Promise<number> {
    const reconciliationNo =
      reconciliation.reconciliationNo || (await generateDocumentNo('reconciliation'));

    return transaction(async (conn) => {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO sal_reconciliation
         (reconciliation_no, status, customer_id, customer_name, period_start, period_end,
          currency, exchange_rate,
          delivery_amount, return_amount, net_amount, discount_amount, received_amount,
          balance_amount,
          base_delivery_amount, base_return_amount, base_net_amount,
          base_discount_amount, base_received_amount, base_balance_amount,
          remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          reconciliationNo,
          reconciliation.status.value,
          reconciliation.customerId,
          reconciliation.customerName || null,
          reconciliation.periodStart,
          reconciliation.periodEnd,
          reconciliation.currency,
          reconciliation.exchangeRate,
          reconciliation.deliveryAmount,
          reconciliation.returnAmount,
          reconciliation.netAmount,
          reconciliation.discountAmount,
          reconciliation.receivedAmount,
          reconciliation.balanceAmount,
          reconciliation.baseDeliveryAmount,
          reconciliation.baseReturnAmount,
          reconciliation.baseNetAmount,
          reconciliation.baseDiscountAmount,
          reconciliation.baseReceivedAmount,
          reconciliation.baseBalanceAmount,
          reconciliation.remark || null,
          reconciliation.createBy ?? null,
        ]
      );

      const newId = result.insertId;

      for (const line of reconciliation.lines) {
        await conn.execute(
          `INSERT INTO sal_reconciliation_line
           (reconciliation_id, source_type, source_id, source_no, source_date, amount, create_time)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [newId, line.sourceType, line.sourceId, line.sourceNo, line.sourceDate, line.amount]
        );
      }

      return newId;
    });
  }

  async updateWriteOff(
    id: number,
    receivedAmount: number,
    balanceAmount: number,
    status: number
  ): Promise<void> {
    await execute(
      `UPDATE sal_reconciliation
       SET received_amount = ?, balance_amount = ?, status = ?, update_time = NOW()
       WHERE id = ?`,
      [receivedAmount, balanceAmount, status, id]
    );
  }

  async saveWriteOffRecord(
    reconciliationId: number,
    receivableId: number,
    amount: number,
    writeOffDate: string,
    createBy?: number,
    remark?: string
  ): Promise<void> {
    await execute(
      `INSERT INTO sal_reconciliation_writeoff
       (reconciliation_id, receivable_id, amount, write_off_date, remark, create_by, create_time)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [reconciliationId, receivableId, amount, writeOffDate, remark || null, createBy ?? null]
    );
  }

  async updateStatus(id: number, status: number): Promise<void> {
    await execute(`UPDATE sal_reconciliation SET status = ?, update_time = NOW() WHERE id = ?`, [
      status,
      id,
    ]);
  }

  async updateConfirmation(
    id: number,
    status: number,
    confirmBy: number,
    confirmTime: string
  ): Promise<void> {
    await execute(
      `UPDATE sal_reconciliation
       SET status = ?, confirm_by = ?, confirm_time = ?, update_time = NOW()
       WHERE id = ?`,
      [status, confirmBy, confirmTime, id]
    );
  }

  async updateClosure(
    id: number,
    status: number,
    closeBy: number,
    closeTime: string
  ): Promise<void> {
    await execute(
      `UPDATE sal_reconciliation
       SET status = ?, close_by = ?, close_time = ?, update_time = NOW()
       WHERE id = ?`,
      [status, closeBy, closeTime, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute(`UPDATE sal_reconciliation SET deleted = 1, update_time = NOW() WHERE id = ?`, [
      id,
    ]);
  }

  private async findLines(reconciliationId: number): Promise<SalReconciliationLineRow[]> {
    return query<SalReconciliationLineRow>(
      `SELECT ${LINE_COLUMNS} FROM sal_reconciliation_line
       WHERE reconciliation_id = ? AND deleted = 0
       ORDER BY source_date, id`,
      [reconciliationId]
    );
  }

  private async findWriteOffs(reconciliationId: number): Promise<SalReconciliationWriteoffRow[]> {
    return query<SalReconciliationWriteoffRow>(
      `SELECT ${WRITEOFF_COLUMNS} FROM sal_reconciliation_writeoff
       WHERE reconciliation_id = ? AND deleted = 0
       ORDER BY write_off_date, id`,
      [reconciliationId]
    );
  }

  private mapToAggregate(
    row: SalReconciliationRow,
    lines: SalReconciliationLineRow[],
    writeOffs: SalReconciliationWriteoffRow[]
  ): Reconciliation {
    const lineProps: ReconciliationLineProps[] = lines.map((l) => ({
      id: l.id,
      sourceType: l.source_type as 1 | 2,
      sourceId: l.source_id,
      sourceNo: l.source_no || '',
      sourceDate: l.source_date ? new Date(l.source_date).toISOString().slice(0, 10) : '',
      amount: Number(l.amount),
    }));

    const writeOffProps: WriteOffRecordProps[] = writeOffs.map((w) => ({
      id: w.id,
      reconciliationId: w.reconciliation_id,
      receivableId: w.receivable_id,
      amount: Number(w.amount),
      writeOffDate: w.write_off_date ? new Date(w.write_off_date).toISOString().slice(0, 10) : '',
      remark: w.remark || '',
      createTime: w.create_time ?? undefined,
    }));

    const props: ReconciliationProps = {
      id: row.id,
      reconciliationNo: row.reconciliation_no,
      status: row.status as ReconciliationStatusValue,
      customerId: row.customer_id,
      customerName: row.customer_name || '',
      periodStart: row.period_start ? new Date(row.period_start).toISOString().slice(0, 10) : '',
      periodEnd: row.period_end ? new Date(row.period_end).toISOString().slice(0, 10) : '',
      currency: row.currency || 'CNY',
      exchangeRate: Number(row.exchange_rate) || 1.0,
      baseCurrency: 'CNY',
      deliveryAmount: Number(row.delivery_amount || 0),
      returnAmount: Number(row.return_amount || 0),
      netAmount: Number(row.net_amount || 0),
      discountAmount: Number(row.discount_amount || 0),
      receivedAmount: Number(row.received_amount || 0),
      balanceAmount: Number(row.balance_amount || 0),
      baseDeliveryAmount: Number(row.base_delivery_amount) || 0,
      baseReturnAmount: Number(row.base_return_amount) || 0,
      baseNetAmount: Number(row.base_net_amount) || 0,
      baseDiscountAmount: Number(row.base_discount_amount) || 0,
      baseReceivedAmount: Number(row.base_received_amount) || 0,
      baseBalanceAmount: Number(row.base_balance_amount) || 0,
      confirmBy: row.confirm_by ?? undefined,
      confirmTime: row.confirm_time
        ? new Date(row.confirm_time).toISOString().slice(0, 19).replace('T', ' ')
        : undefined,
      closeBy: row.close_by ?? undefined,
      closeTime: row.close_time
        ? new Date(row.close_time).toISOString().slice(0, 19).replace('T', ' ')
        : undefined,
      remark: row.remark || '',
      createBy: row.create_by ?? undefined,
      lines: lineProps,
      writeOffRecords: writeOffProps,
      createTime: row.create_time ?? undefined,
      updateTime: row.update_time ?? undefined,
    };
    return Reconciliation.reconstitute(props);
  }
}
