import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const receivableSummary = await queryOne(`SELECT
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(SUM(received_amount), 0) as total_received,
    COALESCE(SUM(balance), 0) as total_balance,
    COALESCE(SUM(CASE WHEN status = 1 THEN balance ELSE 0 END), 0) as unpaid_balance,
    COALESCE(SUM(CASE WHEN status = 2 THEN balance ELSE 0 END), 0) as partial_balance,
    COALESCE(SUM(CASE WHEN due_date < CURDATE() AND status IN (1, 2) THEN balance ELSE 0 END), 0) as overdue_balance
  FROM fin_receivable WHERE deleted = 0`) as any;

  const payableSummary = await queryOne(`SELECT
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(SUM(paid_amount), 0) as total_paid,
    COALESCE(SUM(balance), 0) as total_balance,
    COALESCE(SUM(CASE WHEN status = 1 THEN balance ELSE 0 END), 0) as unpaid_balance,
    COALESCE(SUM(CASE WHEN status = 2 THEN balance ELSE 0 END), 0) as partial_balance,
    COALESCE(SUM(CASE WHEN due_date < CURDATE() AND status IN (1, 2) THEN balance ELSE 0 END), 0) as overdue_balance
  FROM fin_payable WHERE deleted = 0`) as any;

  const receivableByStatus = await query(`SELECT
    status,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as amount,
    COALESCE(SUM(balance), 0) as balance
  FROM fin_receivable WHERE deleted = 0 GROUP BY status`);

  const payableByStatus = await query(`SELECT
    status,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as amount,
    COALESCE(SUM(balance), 0) as balance
  FROM fin_payable WHERE deleted = 0 GROUP BY status`);

  const recentReceipts = await query(`SELECT r.*, c.customer_name
    FROM fin_receipt_record r
    LEFT JOIN crm_customer c ON r.customer_id = c.id
    WHERE r.deleted = 0
    ORDER BY r.receipt_date DESC LIMIT 5`);

  const recentPayments = await query(`SELECT p.*, s.supplier_name
    FROM fin_payment_record p
    LEFT JOIN pur_supplier s ON p.supplier_id = s.id
    WHERE p.deleted = 0
    ORDER BY p.payment_date DESC LIMIT 5`);

  const topReceivables = await query(`SELECT r.*, c.customer_name
    FROM fin_receivable r
    LEFT JOIN crm_customer c ON r.customer_id = c.id
    WHERE r.deleted = 0 AND r.status IN (1, 2)
    ORDER BY r.balance DESC LIMIT 10`);

  const topPayables = await query(`SELECT p.*, s.supplier_name
    FROM fin_payable p
    LEFT JOIN pur_supplier s ON p.supplier_id = s.id
    WHERE p.deleted = 0 AND p.status IN (1, 2)
    ORDER BY p.balance DESC LIMIT 10`);

  return successResponse({
    receivable: {
      total_amount: parseFloat(receivableSummary?.total_amount || 0),
      total_received: parseFloat(receivableSummary?.total_received || 0),
      total_balance: parseFloat(receivableSummary?.total_balance || 0),
      unpaid_balance: parseFloat(receivableSummary?.unpaid_balance || 0),
      partial_balance: parseFloat(receivableSummary?.partial_balance || 0),
      overdue_balance: parseFloat(receivableSummary?.overdue_balance || 0),
      by_status: receivableByStatus,
    },
    payable: {
      total_amount: parseFloat(payableSummary?.total_amount || 0),
      total_paid: parseFloat(payableSummary?.total_paid || 0),
      total_balance: parseFloat(payableSummary?.total_balance || 0),
      unpaid_balance: parseFloat(payableSummary?.unpaid_balance || 0),
      partial_balance: parseFloat(payableSummary?.partial_balance || 0),
      overdue_balance: parseFloat(payableSummary?.overdue_balance || 0),
      by_status: payableByStatus,
    },
    recent_receipts: recentReceipts,
    recent_payments: recentPayments,
    top_receivables: topReceivables,
    top_payables: topPayables,
  });
}, '获取财务统计失败');
