import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';
import { createMultiColorWorkOrder } from '@/lib/multi-color-printing';

// 从工艺卡创建多色套印工单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { standardCardId, salesOrderId, planQty, printArea, substrateType } = body;

  if (!standardCardId || !salesOrderId || !planQty) {
    return errorResponse('缺少必要参数: standardCardId, salesOrderId, planQty', 400, 400);
  }

  const result = await createMultiColorWorkOrder(
    Number(standardCardId),
    Number(salesOrderId),
    Number(planQty),
    Number(printArea) || 100,
    substrateType || 'paper'
  );

  if (!result.success) {
    return errorResponse(result.message, 400, 400);
  }

  return successResponse(
    {
      workOrderId: result.workOrderId,
      colorSequences: result.colorSequences,
    },
    result.message
  );
});
