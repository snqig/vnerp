import { transaction, query, execute, queryPaginated } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { NotFoundError, DomainError } from '@/domain/shared/DomainTypes';

export class FinanceApplicationService {
  async getPayableList(params: {
    page: number;
    pageSize: number;
    supplierId?: number;
    status?: number;
    startDate?: string;
    endDate?: string;
  }) {
    let sql = 'SELECT * FROM fin_payable WHERE deleted = 0';
    let countSql = 'SELECT COUNT(*) as total FROM fin_payable WHERE deleted = 0';
    const queryParams: any[] = [];

    if (params.supplierId) {
      sql += ' AND supplier_id = ?';
      countSql += ' AND supplier_id = ?';
      queryParams.push(params.supplierId);
    }
    if (params.status !== undefined) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      queryParams.push(params.status);
    }
    if (params.startDate) {
      sql += ' AND create_time >= ?';
      countSql += ' AND create_time >= ?';
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ' AND create_time <= ?';
      countSql += ' AND create_time <= ?';
      queryParams.push(params.endDate);
    }

    sql += ' ORDER BY create_time DESC';
    return queryPaginated(sql, countSql, queryParams, {
      page: params.page,
      pageSize: params.pageSize,
    });
  }

  async getReceivableList(params: {
    page: number;
    pageSize: number;
    customerId?: number;
    status?: number;
    startDate?: string;
    endDate?: string;
  }) {
    let sql = 'SELECT * FROM fin_receivable WHERE deleted = 0';
    let countSql = 'SELECT COUNT(*) as total FROM fin_receivable WHERE deleted = 0';
    const queryParams: any[] = [];

    if (params.customerId) {
      sql += ' AND customer_id = ?';
      countSql += ' AND customer_id = ?';
      queryParams.push(params.customerId);
    }
    if (params.status !== undefined) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      queryParams.push(params.status);
    }
    if (params.startDate) {
      sql += ' AND create_time >= ?';
      countSql += ' AND create_time >= ?';
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ' AND create_time <= ?';
      countSql += ' AND create_time <= ?';
      queryParams.push(params.endDate);
    }

    sql += ' ORDER BY create_time DESC';
    return queryPaginated(sql, countSql, queryParams, {
      page: params.page,
      pageSize: params.pageSize,
    });
  }

  async recordPayment(params: {
    payableId: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    remark?: string;
    createBy?: number;
  }): Promise<{ paymentNo: string }> {
    return await transaction(async (conn) => {
      const [payableRows]: any = await conn.execute(
        'SELECT id, payable_no, amount, paid_amount, status FROM fin_payable WHERE id = ? AND deleted = 0 FOR UPDATE',
        [params.payableId]
      );

      if (!payableRows || payableRows.length === 0) {
        throw new NotFoundError('应付账款不存在');
      }

      const payable = payableRows[0];
      const remaining = parseFloat(payable.amount) - parseFloat(payable.paid_amount);

      if (params.amount <= 0) throw new DomainError('付款金额必须大于0');
      if (params.amount > remaining) {
        throw new DomainError(`付款金额超限: 剩余应付${remaining}, 本次付款${params.amount}`);
      }

      const paymentNo = 'PAY' + Date.now();
      await conn.execute(
        `INSERT INTO fin_payment (payment_no, payable_id, amount, payment_date, payment_method, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          paymentNo,
          params.payableId,
          params.amount,
          params.paymentDate,
          params.paymentMethod,
          params.remark || null,
          params.createBy || null,
        ]
      );

      const newPaidAmount = parseFloat(payable.paid_amount) + params.amount;
      const newStatus = newPaidAmount >= parseFloat(payable.amount) ? 3 : 2;

      await conn.execute(
        'UPDATE fin_payable SET paid_amount = ?, status = ?, update_time = NOW() WHERE id = ?',
        [newPaidAmount, newStatus, params.payableId]
      );

      secureLog('info', 'Payment recorded', {
        paymentNo,
        payableId: params.payableId,
        amount: params.amount,
      });
      return { paymentNo };
    });
  }

  async recordReceipt(params: {
    receivableId: number;
    amount: number;
    receiptDate: string;
    receiptMethod: string;
    remark?: string;
    createBy?: number;
  }): Promise<{ receiptNo: string }> {
    return await transaction(async (conn) => {
      const [receivableRows]: any = await conn.execute(
        'SELECT id, receivable_no, amount, received_amount, status FROM fin_receivable WHERE id = ? AND deleted = 0 FOR UPDATE',
        [params.receivableId]
      );

      if (!receivableRows || receivableRows.length === 0) {
        throw new NotFoundError('应收账款不存在');
      }

      const receivable = receivableRows[0];
      const remaining = parseFloat(receivable.amount) - parseFloat(receivable.received_amount);

      if (params.amount <= 0) throw new DomainError('收款金额必须大于0');
      if (params.amount > remaining) {
        throw new DomainError(`收款金额超限: 剩余应收${remaining}, 本次收款${params.amount}`);
      }

      const receiptNo = 'RCV' + Date.now();
      await conn.execute(
        `INSERT INTO fin_receipt (receipt_no, receivable_id, amount, receipt_date, receipt_method, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          receiptNo,
          params.receivableId,
          params.amount,
          params.receiptDate,
          params.receiptMethod,
          params.remark || null,
          params.createBy || null,
        ]
      );

      const newReceivedAmount = parseFloat(receivable.received_amount) + params.amount;
      const newStatus = newReceivedAmount >= parseFloat(receivable.amount) ? 3 : 2;

      await conn.execute(
        'UPDATE fin_receivable SET received_amount = ?, status = ?, update_time = NOW() WHERE id = ?',
        [newReceivedAmount, newStatus, params.receivableId]
      );

      secureLog('info', 'Receipt recorded', {
        receiptNo,
        receivableId: params.receivableId,
        amount: params.amount,
      });
      return { receiptNo };
    });
  }

  async getPayableSummary(params: {
    supplierId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalPayable: number;
    totalPaid: number;
    totalRemaining: number;
    overdueCount: number;
  }> {
    let sql = `SELECT
      COALESCE(SUM(amount), 0) as total_payable,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(amount - paid_amount), 0) as total_remaining,
      SUM(CASE WHEN due_date < CURDATE() AND status != 3 THEN 1 ELSE 0 END) as overdue_count
    FROM fin_payable WHERE deleted = 0`;
    const queryParams: any[] = [];

    if (params.supplierId) {
      sql += ' AND supplier_id = ?';
      queryParams.push(params.supplierId);
    }
    if (params.startDate) {
      sql += ' AND create_time >= ?';
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ' AND create_time <= ?';
      queryParams.push(params.endDate);
    }

    const rows: any = await query(sql, queryParams);
    const row = rows[0];
    return {
      totalPayable: parseFloat(row.total_payable),
      totalPaid: parseFloat(row.total_paid),
      totalRemaining: parseFloat(row.total_remaining),
      overdueCount: parseInt(row.overdue_count),
    };
  }

  async getReceivableSummary(params: {
    customerId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalReceivable: number;
    totalReceived: number;
    totalRemaining: number;
    overdueCount: number;
  }> {
    let sql = `SELECT
      COALESCE(SUM(amount), 0) as total_receivable,
      COALESCE(SUM(received_amount), 0) as total_received,
      COALESCE(SUM(amount - received_amount), 0) as total_remaining,
      SUM(CASE WHEN due_date < CURDATE() AND status != 3 THEN 1 ELSE 0 END) as overdue_count
    FROM fin_receivable WHERE deleted = 0`;
    const queryParams: any[] = [];

    if (params.customerId) {
      sql += ' AND customer_id = ?';
      queryParams.push(params.customerId);
    }
    if (params.startDate) {
      sql += ' AND create_time >= ?';
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ' AND create_time <= ?';
      queryParams.push(params.endDate);
    }

    const rows: any = await query(sql, queryParams);
    const row = rows[0];
    return {
      totalReceivable: parseFloat(row.total_receivable),
      totalReceived: parseFloat(row.total_received),
      totalRemaining: parseFloat(row.total_remaining),
      overdueCount: parseInt(row.overdue_count),
    };
  }

  async getIncomeExpenseDetail(params: {
    startDate: string;
    endDate: string;
    page: number;
    pageSize: number;
  }) {
    let sql = `SELECT 'income' as type, receipt_no as doc_no, customer_name as counterpart, amount, receipt_date as doc_date, receipt_method as method
               FROM fin_receipt WHERE 1=1`;
    let countSql = `SELECT COUNT(*) as total FROM fin_receipt WHERE 1=1`;
    const queryParams: any[] = [];

    if (params.startDate) {
      sql += ' AND receipt_date >= ?';
      countSql += ' AND receipt_date >= ?';
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ' AND receipt_date <= ?';
      countSql += ' AND receipt_date <= ?';
      queryParams.push(params.endDate);
    }

    sql += ` UNION ALL
             SELECT 'expense' as type, payment_no as doc_no, supplier_name as counterpart, amount, payment_date as doc_date, payment_method as method
             FROM fin_payment WHERE 1=1`;

    if (params.startDate) {
      sql += ' AND payment_date >= ?';
      countSql += ' UNION ALL SELECT COUNT(*) as total FROM fin_payment WHERE payment_date >= ?';
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ' AND payment_date <= ?';
      countSql += ' AND payment_date <= ?';
      queryParams.push(params.endDate);
    }

    sql += ' ORDER BY doc_date DESC';

    return queryPaginated(sql, countSql, queryParams, {
      page: params.page,
      pageSize: params.pageSize,
    });
  }
}
