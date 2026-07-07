import { NextRequest } from 'next/server';
import {
  successResponse,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * 往来账龄分析 API
 * 
 * 按账龄区间统计应收/应付款，识别坏账风险
 */

export const GET = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'receivable'; // receivable应付/payable应付
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().slice(0, 10);

    const tableName = type === 'receivable' ? 'finance_receivable' : 'finance_payable';
    const partnerType = type === 'receivable' ? 'customer' : 'supplier';

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

    // 查询所有未结清的往来款
    const rows: any = await query(
      `SELECT r.*, DATEDIFF(?, r.due_date) as age_days
       FROM ${tableName} r
       WHERE r.status != 'settled' AND r.remaining_amount > 0
       ORDER BY r.due_date ASC`,
      [asOfDate]
    );

    // 按往来单位汇总
    const partnerSummary: Record<string, any> = {};

    for (const row of rows) {
      const partnerId = row.partner_id || row.customer_id || row.supplier_id || 0;
      const partnerName = row.partner_name || row.customer_name || row.supplier_name || '未知';

      if (!partnerSummary[partnerId]) {
        partnerSummary[partnerId] = {
          partner_id: partnerId,
          partner_name: partnerName,
          total_amount: 0,
          remaining_amount: 0,
          buckets: ageBuckets.map(b => ({ ...b, amount: 0, count: 0 })),
        };
      }

      const ageDays = Number(row.age_days || 0);
      const remaining = Number(row.remaining_amount || 0);

      partnerSummary[partnerId].total_amount += Number(row.amount || 0);
      partnerSummary[partnerId].remaining_amount += remaining;

      // 分配到账龄区间
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
      buckets: ageBuckets.map(b => ({ ...b, amount: 0, count: 0 })),
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
      ageBuckets: ageBuckets.map(b => b.label),
    });
  }
);
