import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  getWorkOrderColorSequencesDetail,
  calculateWorkOrderInkCost,
} from '@/lib/multi-color-printing';

// 获取工单色序详情
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const workOrderId = searchParams.get('workOrderId');

  if (!workOrderId) {
    return successResponse([], '请提供工单ID');
  }

  const details = await getWorkOrderColorSequencesDetail(Number(workOrderId));
  return successResponse(details, '获取色序详情成功');
});

// 计算工单油墨成本
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { workOrderId, printArea, planQty } = body;

    if (!workOrderId || !printArea || !planQty) {
      return successResponse(null, '缺少必要参数');
    }

    const result = await calculateWorkOrderInkCost(
      Number(workOrderId),
      Number(printArea),
      Number(planQty)
    );

    return successResponse(result, '计算油墨成本成功');
  },
  { logTitle: '计算工单油墨成本', logType: 'business' }
);
