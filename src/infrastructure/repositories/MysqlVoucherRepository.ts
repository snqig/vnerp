import { IVoucherRepository } from '@/domain/finance/repositories/IVoucherRepository';
import { Voucher, VoucherProps } from '@/domain/finance/aggregates/Voucher';
import { VoucherLineProps } from '@/domain/finance/entities/VoucherLine';
import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

const VOUCHER_COLUMNS = `id, voucher_no, period_code, voucher_date, voucher_type,
                         source_type, source_id, source_no, total_debit, total_credit,
                         status, summary, created_by, created_at, audited_by, audited_at,
                         posted_by, posted_at, create_time`;

const LINE_COLUMNS = `id, voucher_id, line_no, account_id, account_code, account_name,
                      summary, debit_amount, credit_amount, customer_id, supplier_id,
                      department_id, project_id`;

export class MysqlVoucherRepository implements IVoucherRepository {
  async findById(id: number): Promise<Voucher | null> {
    const rows = await query<any>(
      `SELECT ${VOUCHER_COLUMNS} FROM fin_voucher WHERE id = ? AND deleted = 0`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    return this.mapToAggregate(rows[0]);
  }

  async findByVoucherNo(voucherNo: string): Promise<Voucher | null> {
    const rows = await query<any>(
      `SELECT ${VOUCHER_COLUMNS} FROM fin_voucher WHERE voucher_no = ? AND deleted = 0`,
      [voucherNo]
    );
    if (!rows || rows.length === 0) return null;
    return this.mapToAggregate(rows[0]);
  }

  async findByPeriod(periodCode: string): Promise<Voucher[]> {
    const rows = await query<any>(
      `SELECT ${VOUCHER_COLUMNS} FROM fin_voucher
       WHERE period_code = ? AND deleted = 0
       ORDER BY voucher_date DESC, id DESC`,
      [periodCode]
    );
    if (!rows || rows.length === 0) return [];
    return this.batchMapToAggregates(rows);
  }

  async findBySource(sourceType: string, sourceId: number): Promise<Voucher | null> {
    const rows = await query<any>(
      `SELECT ${VOUCHER_COLUMNS} FROM fin_voucher
       WHERE source_type = ? AND source_id = ? AND deleted = 0
       LIMIT 1`,
      [sourceType, sourceId]
    );
    if (!rows || rows.length === 0) return null;
    return this.mapToAggregate(rows[0]);
  }

  async findByStatus(status: number): Promise<Voucher[]> {
    const rows = await query<any>(
      `SELECT ${VOUCHER_COLUMNS} FROM fin_voucher
       WHERE status = ? AND deleted = 0
       ORDER BY voucher_date DESC, id DESC`,
      [status]
    );
    if (!rows || rows.length === 0) return [];
    return this.batchMapToAggregates(rows);
  }

  async save(voucher: Voucher): Promise<number> {
    const voucherNo =
      voucher.voucherNo || (await generateDocumentNo('voucher'));
    const lines = voucher.lines;

    return transaction(async (conn) => {
      const [result]: any = await conn.execute(
        `INSERT INTO fin_voucher
         (voucher_no, period_code, voucher_date, voucher_type, source_type,
          source_id, source_no, total_debit, total_credit, status, summary,
          created_by, created_at, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          voucherNo,
          voucher.periodCode,
          voucher.voucherDate || null,
          voucher.voucherType,
          voucher.sourceType || null,
          voucher.sourceId ?? null,
          voucher.sourceNo || null,
          voucher.totalDebit.amount,
          voucher.totalCredit.amount,
          voucher.status.value,
          voucher.summary || null,
          voucher.createdBy || null,
        ]
      );

      const voucherId = result.insertId;

      for (const line of lines) {
        await conn.execute(
          `INSERT INTO fin_voucher_line
           (voucher_id, line_no, account_id, account_code, account_name,
            summary, debit_amount, credit_amount, customer_id, supplier_id,
            department_id, project_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            voucherId,
            line.lineNo,
            line.accountId,
            line.accountCode || null,
            line.accountName || null,
            line.summary || null,
            line.debitAmount,
            line.creditAmount,
            line.customerId ?? null,
            line.supplierId ?? null,
            line.departmentId ?? null,
            line.projectId ?? null,
          ]
        );
      }

      return voucherId;
    });
  }

  async updateStatus(
    id: number,
    status: number,
    auditedBy?: string,
    postedBy?: string
  ): Promise<void> {
    if (auditedBy) {
      await execute(
        `UPDATE fin_voucher
         SET status = ?, audited_by = ?, audited_at = NOW()
         WHERE id = ? AND deleted = 0`,
        [status, auditedBy, id]
      );
    } else if (postedBy) {
      await execute(
        `UPDATE fin_voucher
         SET status = ?, posted_by = ?, posted_at = NOW()
         WHERE id = ? AND deleted = 0`,
        [status, postedBy, id]
      );
    } else {
      await execute(
        `UPDATE fin_voucher SET status = ? WHERE id = ? AND deleted = 0`,
        [status, id]
      );
    }
  }

  async softDelete(id: number): Promise<void> {
    await execute(
      `UPDATE fin_voucher SET deleted = 1 WHERE id = ?`,
      [id]
    );
  }

  private async mapToAggregate(row: any): Promise<Voucher> {
    const lineRows = await query<any>(
      `SELECT ${LINE_COLUMNS} FROM fin_voucher_line WHERE voucher_id = ? ORDER BY line_no`,
      [row.id]
    );
    return this.toAggregate(row, lineRows);
  }

  private async batchMapToAggregates(rows: any[]): Promise<Voucher[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const lineRows = await query<any>(
      `SELECT ${LINE_COLUMNS} FROM fin_voucher_line
       WHERE voucher_id IN (${placeholders})
       ORDER BY voucher_id, line_no`,
      ids
    );

    const linesMap = new Map<number, any[]>();
    for (const line of lineRows) {
      if (!linesMap.has(line.voucher_id)) {
        linesMap.set(line.voucher_id, []);
      }
      linesMap.get(line.voucher_id)!.push(line);
    }

    return rows.map((row) =>
      this.toAggregate(row, linesMap.get(row.id) || [])
    );
  }

  private toAggregate(row: any, lineRows: any[]): Voucher {
    const lines: VoucherLineProps[] = lineRows.map((line) => ({
      id: line.id,
      voucherId: line.voucher_id,
      lineNo: line.line_no,
      accountId: line.account_id,
      accountCode: line.account_code || '',
      accountName: line.account_name || '',
      summary: line.summary || '',
      debitAmount: Number(line.debit_amount || 0),
      creditAmount: Number(line.credit_amount || 0),
      customerId: line.customer_id ?? undefined,
      supplierId: line.supplier_id ?? undefined,
      departmentId: line.department_id ?? undefined,
      projectId: line.project_id ?? undefined,
    }));

    const props: VoucherProps = {
      id: row.id,
      voucherNo: row.voucher_no,
      periodCode: row.period_code,
      voucherDate: row.voucher_date,
      voucherType: row.voucher_type,
      sourceType: row.source_type || '',
      sourceId: row.source_id ?? undefined,
      sourceNo: row.source_no || '',
      totalDebit: Number(row.total_debit || 0),
      totalCredit: Number(row.total_credit || 0),
      status: row.status,
      summary: row.summary || '',
      lines,
      createdBy: row.created_by || '',
      auditedBy: row.audited_by || '',
      postedBy: row.posted_by || '',
      auditedAt: row.audited_at,
      postedAt: row.posted_at,
      createTime: row.create_time,
    };
    return Voucher.reconstitute(props);
  }
}
