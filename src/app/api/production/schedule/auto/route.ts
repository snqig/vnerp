import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { autoScheduleWorkOrders, saveScheduleResult } from '@/lib/production-scheduling-enhanced';

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { work_order_ids, start_date, respect_deadline = true } = body;

    if (!work_order_ids || !Array.isArray(work_order_ids) || work_order_ids.length === 0) {
      return errorResponse('请提供工单ID列表', 400, 400);
    }

    const results = await autoScheduleWorkOrders(work_order_ids, {
      startDate: start_date,
      respectDeadline: respect_deadline,
    });

    const _savedCount = 0;
    for (const result of results) {
      if (result.conflicts.length === 0) {
        await saveScheduleResult(result);
      }
    }

    return successResponse(
      {
        results,
        summary: {
          total: results.length,
          scheduled: results.filter((r) => r.conflicts.length === 0).length,
          with_conflicts: results.filter((r) => r.conflicts.length > 0).length,
        },
      },
      '自动排程完成'
    );
  },
  { logTitle: '自动排产', logType: 'business' }
);
