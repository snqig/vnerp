import { IReceivableRepository } from '@/domain/finance/repositories/IReceivableRepository';
import { IPayableRepository } from '@/domain/finance/repositories/IPayableRepository';
import { IVoucherRepository } from '@/domain/finance/repositories/IVoucherRepository';
import { Receivable, ReceivableProps } from '@/domain/finance/aggregates/Receivable';
import { Payable, PayableProps } from '@/domain/finance/aggregates/Payable';
import { Voucher, VoucherProps } from '@/domain/finance/aggregates/Voucher';
import {
  DomainError,
  DomainEvent,
  NotFoundError,
} from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction, query, queryPaginated, PaginatedResult, type SqlValue } from '@/lib/db';
import { MysqlReceivableRepository } from '@/infrastructure/repositories/MysqlReceivableRepository';
import { MysqlPayableRepository } from '@/infrastructure/repositories/MysqlPayableRepository';
import { MysqlVoucherRepository } from '@/infrastructure/repositories/MysqlVoucherRepository';
import { generateDocumentNo } from '@/lib/document-numbering';

/** 应收款列表行类型 */
interface ReceivableRow {
  id: number;
  receivable_no: string;
  customer_id: number;
  receivable_amount: number;
  received_amount: number;
  balance: number;
  status: number;
  receivable_date: Date;
  due_date: Date;
  [key: string]: unknown;
}

/** 应付款列表行类型 */
interface PayableRow {
  id: number;
  payable_no: string;
  supplier_id: number;
  payable_amount: number;
  paid_amount: number;
  balance: number;
  status: number;
  payable_date: Date;
  due_date: Date;
  [key: string]: unknown;
}

/** 汇总行类型 */
interface SummaryRow {
  total_amount: number;
  total_received: number;
  total_paid: number;
  total_balance: number;
  count: number;
  overdue_amount: number;
  overdue_count: number;
}

export interface RecordReceiptInput {
  receivableId: number;
  amount: number;
  receiptDate?: string;
  receiptMethod?: string;
  bankAccount?: string;
  referenceNo?: string;
  handlerId?: number;
  createBy?: number;
  remark?: string;
}

export interface RecordPaymentInput {
  payableId: number;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  bankAccount?: string;
  referenceNo?: string;
  handlerId?: number;
  createBy?: number;
  remark?: string;
}

export interface ReceivableListQuery {
  page: number;
  pageSize: number;
  customerId?: number;
  status?: number;
  startDate?: string;
  endDate?: string;
}

export interface PayableListQuery {
  page: number;
  pageSize: number;
  supplierId?: number;
  status?: number;
  startDate?: string;
  endDate?: string;
}

export interface FinanceSummaryQuery {
  customerId?: number;
  supplierId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ReceivableSummary {
  totalAmount: number;
  totalReceived: number;
  totalBalance: number;
  count: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface PayableSummary {
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  count: number;
  overdueAmount: number;
  overdueCount: number;
}

export class FinanceApplicationService {
  constructor(
    private readonly receivableRepo: IReceivableRepository,
    private readonly payableRepo: IPayableRepository,
    private readonly voucherRepo: IVoucherRepository
  ) {}

  static create(): FinanceApplicationService {
    return new FinanceApplicationService(
      new MysqlReceivableRepository(),
      new MysqlPayableRepository(),
      new MysqlVoucherRepository()
    );
  }

  // ==================== 应收款列表与汇总 ====================

  async getReceivableList(q: ReceivableListQuery): Promise<PaginatedResult<ReceivableRow>> {
    const where: string[] = ['deleted = 0'];
    const values: SqlValue[] = [];
    if (q.customerId !== undefined) {
      where.push('customer_id = ?');
      values.push(q.customerId);
    }
    if (q.status !== undefined) {
      where.push('status = ?');
      values.push(q.status);
    }
    if (q.startDate) {
      where.push('receivable_date >= ?');
      values.push(q.startDate);
    }
    if (q.endDate) {
      where.push('receivable_date <= ?');
      values.push(q.endDate);
    }
    const whereClause = where.join(' AND ');
    const sql = `SELECT * FROM fin_receivable WHERE ${whereClause} ORDER BY create_time DESC`;
    const countSql = `SELECT COUNT(*) as total FROM fin_receivable WHERE ${whereClause}`;
    return queryPaginated<ReceivableRow>(
      sql,
      countSql,
      values,
      { page: q.page, pageSize: q.pageSize }
    );
  }

  async getReceivableSummary(q: FinanceSummaryQuery): Promise<ReceivableSummary> {
    const where: string[] = ['deleted = 0'];
    const values: SqlValue[] = [];
    if (q.customerId !== undefined) {
      where.push('customer_id = ?');
      values.push(q.customerId);
    }
    if (q.startDate) {
      where.push('receivable_date >= ?');
      values.push(q.startDate);
    }
    if (q.endDate) {
      where.push('receivable_date <= ?');
      values.push(q.endDate);
    }
    const whereClause = where.join(' AND ');
    const rows = await query<SummaryRow>(
      `SELECT
         COALESCE(SUM(receivable_amount), 0) AS total_amount,
         COALESCE(SUM(received_amount), 0) AS total_received,
         COALESCE(SUM(balance), 0) AS total_balance,
         COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN due_date < CURDATE() AND status IN (1, 2) THEN balance ELSE 0 END), 0) AS overdue_amount,
         SUM(CASE WHEN due_date < CURDATE() AND status IN (1, 2) THEN 1 ELSE 0 END) AS overdue_count
       FROM fin_receivable
       WHERE ${whereClause}`,
      values
    );
    const r = rows[0] || ({} as SummaryRow);
    return {
      totalAmount: Number(r.total_amount) || 0,
      totalReceived: Number(r.total_received) || 0,
      totalBalance: Number(r.total_balance) || 0,
      count: Number(r.count) || 0,
      overdueAmount: Number(r.overdue_amount) || 0,
      overdueCount: Number(r.overdue_count) || 0,
    };
  }

  // ==================== 应付款列表与汇总 ====================

  async getPayableList(q: PayableListQuery): Promise<PaginatedResult<PayableRow>> {
    const where: string[] = ['deleted = 0'];
    const values: SqlValue[] = [];
    if (q.supplierId !== undefined) {
      where.push('supplier_id = ?');
      values.push(q.supplierId);
    }
    if (q.status !== undefined) {
      where.push('status = ?');
      values.push(q.status);
    }
    if (q.startDate) {
      where.push('payable_date >= ?');
      values.push(q.startDate);
    }
    if (q.endDate) {
      where.push('payable_date <= ?');
      values.push(q.endDate);
    }
    const whereClause = where.join(' AND ');
    const sql = `SELECT * FROM fin_payable WHERE ${whereClause} ORDER BY create_time DESC`;
    const countSql = `SELECT COUNT(*) as total FROM fin_payable WHERE ${whereClause}`;
    return queryPaginated<PayableRow>(
      sql,
      countSql,
      values,
      { page: q.page, pageSize: q.pageSize }
    );
  }

  async getPayableSummary(q: FinanceSummaryQuery): Promise<PayableSummary> {
    const where: string[] = ['deleted = 0'];
    const values: SqlValue[] = [];
    if (q.supplierId !== undefined) {
      where.push('supplier_id = ?');
      values.push(q.supplierId);
    }
    if (q.startDate) {
      where.push('payable_date >= ?');
      values.push(q.startDate);
    }
    if (q.endDate) {
      where.push('payable_date <= ?');
      values.push(q.endDate);
    }
    const whereClause = where.join(' AND ');
    const rows = await query<SummaryRow>(
      `SELECT
         COALESCE(SUM(payable_amount), 0) AS total_amount,
         COALESCE(SUM(paid_amount), 0) AS total_paid,
         COALESCE(SUM(balance), 0) AS total_balance,
         COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN due_date < CURDATE() AND status IN (1, 2) THEN balance ELSE 0 END), 0) AS overdue_amount,
         SUM(CASE WHEN due_date < CURDATE() AND status IN (1, 2) THEN 1 ELSE 0 END) AS overdue_count
       FROM fin_payable
       WHERE ${whereClause}`,
      values
    );
    const r = rows[0] || ({} as SummaryRow);
    return {
      totalAmount: Number(r.total_amount) || 0,
      totalPaid: Number(r.total_paid) || 0,
      totalBalance: Number(r.total_balance) || 0,
      count: Number(r.count) || 0,
      overdueAmount: Number(r.overdue_amount) || 0,
      overdueCount: Number(r.overdue_count) || 0,
    };
  }

  // ==================== 应收款 ====================

  async getReceivableById(id: number): Promise<Receivable> {
    const receivable = await this.receivableRepo.findById(id);
    if (!receivable) {
      throw new NotFoundError('应收款不存在');
    }
    return receivable;
  }

  async createReceivable(props: ReceivableProps): Promise<{ id: number; receivableNo: string }> {
    const receivable = Receivable.create(props);
    const id = await this.receivableRepo.save(receivable);
    await this.persistAndPublishEvents('Receivable', id, receivable);
    return { id, receivableNo: receivable.receivableNo };
  }

  async recordReceipt(input: RecordReceiptInput): Promise<{ receiptNo: string; status: number }> {
    const receivable = await this.getReceivableById(input.receivableId);

    const receiptNo = await generateDocumentNo('receipt');
    receivable.recordReceipt(input.amount, receiptNo);

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO fin_receipt_record
         (receipt_no, receivable_id, customer_id, amount, receipt_date,
          receipt_method, bank_account, reference_no, handler_id, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          receiptNo,
          input.receivableId,
          receivable.customerId,
          input.amount,
          input.receiptDate || null,
          input.receiptMethod || null,
          input.bankAccount || null,
          input.referenceNo || null,
          input.createBy ?? input.handlerId ?? null,
          input.remark || null,
        ]
      );

      await conn.execute(
        `UPDATE fin_receivable
         SET received_amount = ?, balance = ?, status = ?, update_time = NOW()
         WHERE id = ?`,
        [
          receivable.receivedAmount.amount,
          receivable.balance.amount,
          receivable.status.value,
          input.receivableId,
        ]
      );

      const events = receivable.getDomainEvents();
      if (events.length > 0) {
        await getDomainEventOutbox().saveEvents(conn, 'Receivable', input.receivableId, events);
      }
    });

    receivable.clearDomainEvents();
    return { receiptNo, status: receivable.status.value };
  }

  async writeOffReceivable(id: number, reason?: string): Promise<{ status: number }> {
    const receivable = await this.getReceivableById(id);
    receivable.writeOff(reason);

    await this.receivableRepo.updateStatus(id, receivable.status.value);
    await this.persistAndPublishEvents('Receivable', id, receivable);

    return { status: receivable.status.value };
  }

  async listReceivablesByStatus(status: number): Promise<Receivable[]> {
    return this.receivableRepo.findByStatus(status);
  }

  async listOverdueReceivables(date?: string): Promise<Receivable[]> {
    return this.receivableRepo.findOverdue(date);
  }

  async deleteReceivable(id: number): Promise<void> {
    const receivable = await this.getReceivableById(id);
    if (receivable.status.value !== 4) {
      throw new DomainError('仅已坏账状态的应收款可删除');
    }
    await this.receivableRepo.softDelete(id);
  }

  // ==================== 应付款 ====================

  async getPayableById(id: number): Promise<Payable> {
    const payable = await this.payableRepo.findById(id);
    if (!payable) {
      throw new NotFoundError('应付款不存在');
    }
    return payable;
  }

  async createPayable(props: PayableProps): Promise<{ id: number; payableNo: string }> {
    const payable = Payable.create(props);
    const id = await this.payableRepo.save(payable);
    await this.persistAndPublishEvents('Payable', id, payable);
    return { id, payableNo: payable.payableNo };
  }

  async recordPayment(input: RecordPaymentInput): Promise<{ paymentNo: string; status: number }> {
    const payable = await this.getPayableById(input.payableId);

    const paymentNo = await generateDocumentNo('payment');
    payable.recordPayment(input.amount, paymentNo);

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO fin_payment_record
         (payment_no, payable_id, supplier_id, amount, payment_date,
          payment_method, bank_account, reference_no, handler_id, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          paymentNo,
          input.payableId,
          payable.supplierId,
          input.amount,
          input.paymentDate || null,
          input.paymentMethod || null,
          input.bankAccount || null,
          input.referenceNo || null,
          input.createBy ?? input.handlerId ?? null,
          input.remark || null,
        ]
      );

      await conn.execute(
        `UPDATE fin_payable
         SET paid_amount = ?, balance = ?, status = ?, update_time = NOW()
         WHERE id = ?`,
        [
          payable.paidAmount.amount,
          payable.balance.amount,
          payable.status.value,
          input.payableId,
        ]
      );

      const events = payable.getDomainEvents();
      if (events.length > 0) {
        await getDomainEventOutbox().saveEvents(conn, 'Payable', input.payableId, events);
      }
    });

    payable.clearDomainEvents();
    return { paymentNo, status: payable.status.value };
  }

  async listPayablesByStatus(status: number): Promise<Payable[]> {
    return this.payableRepo.findByStatus(status);
  }

  async listOverduePayables(date?: string): Promise<Payable[]> {
    return this.payableRepo.findOverdue(date);
  }

  async deletePayable(id: number): Promise<void> {
    const payable = await this.getPayableById(id);
    if (payable.status.value !== 3) {
      throw new DomainError('仅已结清状态的应付款可删除');
    }
    await this.payableRepo.softDelete(id);
  }

  // ==================== 凭证 ====================

  async getVoucherById(id: number): Promise<Voucher> {
    const voucher = await this.voucherRepo.findById(id);
    if (!voucher) {
      throw new NotFoundError('凭证不存在');
    }
    return voucher;
  }

  async createVoucher(props: VoucherProps): Promise<{ id: number; voucherNo: string }> {
    const voucher = Voucher.create(props);
    const id = await this.voucherRepo.save(voucher);
    await this.persistAndPublishEvents('Voucher', id, voucher);
    return { id, voucherNo: voucher.voucherNo };
  }

  async submitVoucher(id: number): Promise<{ status: number }> {
    const voucher = await this.getVoucherById(id);
    voucher.submit();
    await this.voucherRepo.updateStatus(id, voucher.status.value);
    await this.persistAndPublishEvents('Voucher', id, voucher);
    return { status: voucher.status.value };
  }

  async auditVoucher(id: number, auditedBy: string): Promise<{ status: number }> {
    const voucher = await this.getVoucherById(id);
    voucher.audit(auditedBy);
    await this.voucherRepo.updateStatus(id, voucher.status.value, auditedBy);
    await this.persistAndPublishEvents('Voucher', id, voucher);
    return { status: voucher.status.value };
  }

  async postVoucher(id: number, postedBy: string): Promise<{ status: number }> {
    const voucher = await this.getVoucherById(id);
    voucher.post(postedBy);
    await this.voucherRepo.updateStatus(id, voucher.status.value, undefined, postedBy);
    await this.persistAndPublishEvents('Voucher', id, voucher);
    return { status: voucher.status.value };
  }

  async voidVoucher(id: number, reason?: string): Promise<{ status: number }> {
    const voucher = await this.getVoucherById(id);
    voucher.void(reason);
    await this.voucherRepo.updateStatus(id, voucher.status.value);
    await this.persistAndPublishEvents('Voucher', id, voucher);
    return { status: voucher.status.value };
  }

  async listVouchersByStatus(status: number): Promise<Voucher[]> {
    return this.voucherRepo.findByStatus(status);
  }

  async listVouchersByPeriod(periodCode: string): Promise<Voucher[]> {
    return this.voucherRepo.findByPeriod(periodCode);
  }

  async deleteVoucher(id: number): Promise<void> {
    const voucher = await this.getVoucherById(id);
    if (!voucher.canDelete()) {
      throw new DomainError('仅草稿状态的凭证可删除');
    }
    await this.voucherRepo.softDelete(id);
  }

  // ==================== 共用 ====================

  private async persistAndPublishEvents(
    aggregateType: string,
    aggregateId: number,
    aggregate: { getDomainEvents(): DomainEvent[]; clearDomainEvents(): void }
  ): Promise<void> {
    const events = aggregate.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });

    aggregate.clearDomainEvents();
  }
}
