import { NextRequest } from 'next/server';
import { escapeId } from 'mysql2';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * 往来账龄分析 API
 *
 * 按账龄区间统计应收/应付款，识别坏账风险
 */

export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'receivable';
  const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().slice(0, 10);

  const isReceivable = type === 'receivable';
  const tableName = isReceivable ? 'fin_receivable' : 'fin_payable';
  const partnerTable = isReceivable ? 'crm_customer' : 'pur_supplier';
  const partnerIdCol = isReceivable ? 'customer_id' : 'supplier_id';
  const partnerNameCol = isReceivable ? 'customer_name' : 'supplier_name';
  const docNoCol = isReceivable ? 'receivable_no' : 'payable_no';

  const escTable = escapeId(tableName);
  const escPartnerTable = escapeId(partnerTable);
  const escPartnerIdCol = escapeId(partnerIdCol);
  const escPartnerNameCol = escapeId(partnerNameCol);
  const escDocNoCol = escapeId(docNoCol);

  // 账龄区间
  const ageBuckets = [
    { label: '未到期', min: -9999, max: 0 },
    { label: '1-30天', min: 1, max: 30 },
    { label: '31-60天', min: 31, max: 60 },
    { label: '61-90天', min: 61, max: 90 },
    { label: '91-180天', min: 91, max: 180 },
    { label: '181-365天', min: 181, max: 365 },
    { label: '365天以上', min: 366, max: 9999 },
  ];

  const rows: any = await query(
    `SELECT r.id, r.${escDocNoCol} as doc_no, r.${escPartnerIdCol} as partner_id, r.amount, r.balance,
              r.due_date, r.status,
              DATEDIFF(?, r.due_date) as age_days,
              p.${escPartnerNameCol} as partner_name
       FROM ${escTable} r
       LEFT JOIN ${escPartnerTable} p ON r.${escPartnerIdCol} = p.id
       WHERE r.status != 3 AND r.balance > 0 AND r.deleted = 0
       ORDER BY r.due_date ASC`,
    [asOfDate]
  );

  const partnerSummary: Record<string, any> = {};

  for (const row of rows) {
    const partnerId = row.partner_id || 0;
    const partnerName = row.partner_name || '未知';

    if (!partnerSummary[partnerId]) {
      partnerSummary[partnerId] = {
        partner_id: partnerId,
        partner_name: partnerName,
        total_amount: 0,
        remaining_amount: 0,
        buckets: ageBuckets.map((b) => ({ ...b, amount: 0, count: 0 })),
      };
    }

    const ageDays = Number(row.age_days || 0);
    const remaining = Number(row.balance || 0);

    partnerSummary[partnerId].total_amount += Number(row.amount || 0);
    partnerSummary[partnerId].remaining_amount += remaining;

    for (const bucket of partnerSummary[partnerId].buckets) {
      if (ageDays >= bucket.min && ageDays <= bucket.max) {
        bucket.amount += remaining;
        bucket.count += 1;
        break;
      }
    }
  }

  // 总计
  const totalSummary = {
    total_amount: 0,
    remaining_amount: 0,
    buckets: ageBuckets.map((b) => ({ ...b, amount: 0, count: 0 })),
  };

  for (const summary of Object.values(partnerSummary) as any[]) {
    totalSummary.total_amount += summary.total_amount;
    totalSummary.remaining_amount += summary.remaining_amount;
    for (let i = 0; i < summary.buckets.length; i++) {
      totalSummary.buckets[i].amount += summary.buckets[i].amount;
      totalSummary.buckets[i].count += summary.buckets[i].count;
    }
  }

  return successResponse({
    type,
    asOfDate,
    partnerList: Object.values(partnerSummary),
    total: totalSummary,
    ageBuckets: ageBuckets.map((b) => b.label),
  });
});
