import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    let overview: any = { totalReceivable: 0, totalPayable: 0, monthRevenue: 0, monthExpense: 0, revenueChange: 0, expenseChange: 0, netProfit: 0 };
    try {
      const recRows: any = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM fin_receivable WHERE deleted = 0 AND status = 1`);
      const payRows: any = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM fin_payable WHERE deleted = 0 AND status = 1`);
      if (Array.isArray(recRows) && recRows.length > 0) overview.totalReceivable = Number(recRows[0].total || 0);
      if (Array.isArray(payRows) && payRows.length > 0) overview.totalPayable = Number(payRows[0].total || 0);
      overview.netProfit = overview.totalReceivable - overview.totalPayable;
    } catch (e) { console.error('finance overview failed:', e); }

    try {
      const revRows: any = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM fin_receipt_record WHERE deleted = 0 AND DATE(receipt_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
      const expRows: any = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM fin_payment_record WHERE deleted = 0 AND DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
      if (Array.isArray(revRows) && revRows.length > 0) overview.monthRevenue = Number(revRows[0].total || 0);
      if (Array.isArray(expRows) && expRows.length > 0) overview.monthExpense = Number(expRows[0].total || 0);
    } catch (e) { console.error('finance monthly failed:', e); }

    let revenueTrend: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DATE(receipt_date) as date, COALESCE(SUM(amount), 0) as amount
        FROM fin_receipt_record WHERE deleted = 0 AND receipt_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(receipt_date) ORDER BY date
      `);
      revenueTrend = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('finance revenueTrend failed:', e); }

    let expenseTrend: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DATE(payment_date) as date, COALESCE(SUM(amount), 0) as amount
        FROM fin_payment_record WHERE deleted = 0 AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(payment_date) ORDER BY date
      `);
      expenseTrend = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('finance expenseTrend failed:', e); }

    let receivableAging: any[] = [];
    try {
      const rows: any = await query(`
        SELECT
          CASE
            WHEN DATEDIFF(CURDATE(), create_time) <= 30 THEN '0-30天'
            WHEN DATEDIFF(CURDATE(), create_time) <= 60 THEN '31-60天'
            WHEN DATEDIFF(CURDATE(), create_time) <= 90 THEN '61-90天'
            ELSE '90天以上'
          END as aging,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total
        FROM fin_receivable WHERE deleted = 0 AND status = 1 GROUP BY aging
      `);
      receivableAging = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('finance aging failed:', e); }

    let recentTransactions: any[] = [];
    try {
      const recRows: any = await query(`
        SELECT 'receipt' as type, id, amount, receipt_date as date, remark FROM fin_receipt_record WHERE deleted = 0 ORDER BY receipt_date DESC LIMIT 5
      `);
      const payRows: any = await query(`
        SELECT 'payment' as type, id, amount, payment_date as date, remark FROM fin_payment_record WHERE deleted = 0 ORDER BY payment_date DESC LIMIT 5
      `);
      const receipts = Array.isArray(recRows) ? recRows : [];
      const payments = Array.isArray(payRows) ? payRows : [];
      recentTransactions = [...receipts, ...payments].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    } catch (e) { console.error('finance recent failed:', e); }

    let topPayables: any[] = [];
    try {
      const rows: any = await query(`
        SELECT supplier_name, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM fin_payable WHERE deleted = 0 AND status = 1 GROUP BY supplier_name ORDER BY total DESC LIMIT 5
      `);
      topPayables = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('finance topPayables failed:', e); }

    return NextResponse.json({
      success: true,
      data: { overview, revenueTrend, expenseTrend, receivableAging, recentTransactions, topPayables },
    });
  } catch (error) {
    console.error('获取财务看板数据失败:', error);
    return NextResponse.json({ success: false, message: '获取财务看板数据失败' }, { status: 500 });
  }
}
