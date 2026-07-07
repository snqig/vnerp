import { IReceivableRepository } from '@/domain/finance/repositories/IReceivableRepository';
import { Receivable, ReceivableProps } from '@/domain/finance/aggregates/Receivable';
import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

const COLUMNS = `id, receivable_no, source_type, source_id, source_no, customer_id,
                 amount, received_amount, balance, due_date, status, remark,
                 create_time, update_time`;

export class MysqlReceivableRepository implements IReceivableRepository {
  async findById(id: number): Promise<Receivable | null> {
    const rows = await query<any>(
      `SELECT ${COLUMNS} FROM fin_receivable WHERE id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    return this.mapToAggregate(rows[0]);
  }

  async findByReceivableNo(receivableNo: string): Promise<Receivable | null> {
    const rows = await query<any>(
      `SELECT ${COLUMNS} FROM fin_receivable WHERE receivable_no = ?`,
      [receivableNo]
    );
    if (!rows || rows.length === 0) return null;
    return this.mapToAggregate(rows[0]);
  }

  async findByCustomerId(customerId: number): Promise<Receivable[]> {
    const rows = await query<any>(
      `SELECT ${COLUMNS} FROM fin_receivable WHERE customer_id = ? ORDER BY create_time DESC`,
      [customerId]
    );
    return rows.map((r) => this.mapToAggregate(r));
  }

  async findByStatus(status: number): Promise<Receivable[]> {
    const rows = await query<any>(
      `SELECT ${COLUMNS} FROM fin_receivable WHERE status = ? ORDER BY create_time DESC`,
      [status]
    );
    return rows.map((r) => this.mapToAggregate(r));
  }

  async findOverdue(date?: string): Promise<Receivable[]> {
    const checkDate = date || new Date().toISOString().slice(0, 10);
    const rows = await query<any>(
      `SELECT ${COLUMNS} FROM fin_receivable
       WHERE due_date < ? AND status IN (1, 2)
       ORDER BY due_date ASC`,
      [checkDate]
    );
    return rows.map((r) => this.mapToAggregate(r));
  }

  async save(receivable: Receivable): Promise<number> {
    const receivableNo =
      receivable.receivableNo || (await generateDocumentNo('receivable'));

    return transaction(async (conn) => {
      const [result]: any = await conn.execute(
        `INSERT INTO fin_receivable
         (receivable_no, source_type, source_id, source_no, customer_id,
          amount, received_amount, balance, due_date, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receivableNo,
          receivable.sourceType,
          receivable.sourceId ?? null,
          receivable.sourceNo,
          receivable.customerId,
          receivable.amount.amount,
          receivable.receivedAmount.amount,
          receivable.balance.amount,
          receivable.dueDate || null,
          receivable.status.value,
          receivable.remark || null,
        ]
      );

      const newId = result.insertId;
      if (receivable.id) {
        await conn.execute(
          `UPDATE fin_receivable SET update_time = NOW() WHERE id = ?`,
          [receivable.id]
        );
        return receivable.id;
      }
      return newId;
    });
  }

  async updateReceivedAmount(
    id: number,
    receivedAmount: number,
    balance: number,
    status: number
  ): Promise<void> {
    await execute(
      `UPDATE fin_receivable
       SET received_amount = ?, balance = ?, status = ?, update_time = NOW()
       WHERE id = ?`,
      [receivedAmount, balance, status, id]
    );
  }

  async updateStatus(id: number, status: number): Promise<void> {
    await execute(
      `UPDATE fin_receivable SET status = ?, update_time = NOW() WHERE id = ?`,
      [status, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    // fin_receivable 表当前没有 deleted 列，使用状态标记实现逻辑删除。
    // 状态 4 (BAD_DEBT) 已用于坏账；此处采用物理删除以避免状态语义冲突。
    // TODO: 通过迁移添加 deleted 列后改为标准的 UPDATE SET deleted = 1。
    await execute(`DELETE FROM fin_receivable WHERE id = ?`, [id]);
  }

  private mapToAggregate(row: any): Receivable {
    const props: ReceivableProps = {
      id: row.id,
      receivableNo: row.receivable_no,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceNo: row.source_no || '',
      customerId: row.customer_id,
      amount: Number(row.amount),
      receivedAmount: Number(row.received_amount || 0),
      balance: row.balance !== null ? Number(row.balance) : undefined,
      dueDate: row.due_date || '',
      status: row.status,
      remark: row.remark || '',
      createTime: row.create_time,
      updateTime: row.update_time,
    };
    return Receivable.reconstitute(props);
  }
}
