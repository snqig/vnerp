import mysql from 'mysql2/promise';
import { IPayableRepository } from '@/domain/finance/repositories/IPayableRepository';
import { Payable, PayableProps } from '@/domain/finance/aggregates/Payable';
import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

/** fin_payable 表行类型 */
interface FinPayableRow {
  id: number;
  payable_no: string;
  source_type: number | null;
  source_id: number | null;
  source_no: string | null;
  supplier_id: number;
  amount: number | string;
  paid_amount: number | string | null;
  balance: number | string | null;
  due_date: string | null;
  status: number;
  remark: string | null;
  create_time: string | null;
  update_time: string | null;
}

const COLUMNS = `id, payable_no, source_type, source_id, source_no, supplier_id,
                 amount, paid_amount, balance, due_date, status, remark,
                 create_time, update_time`;

export class MysqlPayableRepository implements IPayableRepository {
  async findById(id: number): Promise<Payable | null> {
    const rows = await query<FinPayableRow>(
      `SELECT ${COLUMNS} FROM fin_payable WHERE id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    return this.mapToAggregate(rows[0]);
  }

  async findByPayableNo(payableNo: string): Promise<Payable | null> {
    const rows = await query<FinPayableRow>(
      `SELECT ${COLUMNS} FROM fin_payable WHERE payable_no = ?`,
      [payableNo]
    );
    if (!rows || rows.length === 0) return null;
    return this.mapToAggregate(rows[0]);
  }

  async findBySupplierId(supplierId: number): Promise<Payable[]> {
    const rows = await query<FinPayableRow>(
      `SELECT ${COLUMNS} FROM fin_payable WHERE supplier_id = ? ORDER BY create_time DESC`,
      [supplierId]
    );
    return rows.map((r) => this.mapToAggregate(r));
  }

  async findByStatus(status: number): Promise<Payable[]> {
    const rows = await query<FinPayableRow>(
      `SELECT ${COLUMNS} FROM fin_payable WHERE status = ? ORDER BY create_time DESC`,
      [status]
    );
    return rows.map((r) => this.mapToAggregate(r));
  }

  async findOverdue(date?: string): Promise<Payable[]> {
    const checkDate = date || new Date().toISOString().slice(0, 10);
    const rows = await query<FinPayableRow>(
      `SELECT ${COLUMNS} FROM fin_payable
       WHERE due_date < ? AND status IN (1, 2)
       ORDER BY due_date ASC`,
      [checkDate]
    );
    return rows.map((r) => this.mapToAggregate(r));
  }

  async save(payable: Payable): Promise<number> {
    const payableNo =
      payable.payableNo || (await generateDocumentNo('payable'));

    return transaction(async (conn) => {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO fin_payable
         (payable_no, source_type, source_id, source_no, supplier_id,
          amount, paid_amount, balance, due_date, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payableNo,
          payable.sourceType,
          payable.sourceId ?? null,
          payable.sourceNo,
          payable.supplierId,
          payable.amount.amount,
          payable.paidAmount.amount,
          payable.balance.amount,
          payable.dueDate || null,
          payable.status.value,
          payable.remark || null,
        ]
      );

      const newId = result.insertId;
      if (payable.id) {
        await conn.execute(
          `UPDATE fin_payable SET update_time = NOW() WHERE id = ?`,
          [payable.id]
        );
        return payable.id;
      }
      return newId;
    });
  }

  async updatePaidAmount(
    id: number,
    paidAmount: number,
    balance: number,
    status: number
  ): Promise<void> {
    await execute(
      `UPDATE fin_payable
       SET paid_amount = ?, balance = ?, status = ?, update_time = NOW()
       WHERE id = ?`,
      [paidAmount, balance, status, id]
    );
  }

  async updateStatus(id: number, status: number): Promise<void> {
    await execute(
      `UPDATE fin_payable SET status = ?, update_time = NOW() WHERE id = ?`,
      [status, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    // fin_payable 表当前没有 deleted 列，使用物理删除实现。
    // TODO: 通过迁移添加 deleted 列后改为标准的 UPDATE SET deleted = 1。
    await execute(`DELETE FROM fin_payable WHERE id = ?`, [id]);
  }

  private mapToAggregate(row: FinPayableRow): Payable {
    const props: PayableProps = {
      id: row.id,
      payableNo: row.payable_no,
      sourceType: row.source_type ?? undefined,
      sourceId: row.source_id ?? undefined,
      sourceNo: row.source_no || '',
      supplierId: row.supplier_id,
      amount: Number(row.amount),
      paidAmount: Number(row.paid_amount || 0),
      balance: row.balance !== null ? Number(row.balance) : undefined,
      dueDate: row.due_date || '',
      status: row.status,
      remark: row.remark || '',
      createTime: row.create_time ?? undefined,
      updateTime: row.update_time ?? undefined,
    };
    return Payable.reconstitute(props);
  }
}
