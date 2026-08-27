import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  convertRequestToPurchaseOrder,
  batchConvertRequestToPurchaseOrder,
} from '@/lib/services/purchase-request-service';

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { requestId, requestIds } = body;

    if (requestIds && Array.isArray(requestIds)) {
      const results = await batchConvertRequestToPurchaseOrder(requestIds);
      return successResponse(results, `批量转采购完成: ${results.length}/${requestIds.length}成功`);
    }

    if (!requestId) {
      return errorResponse('请提供requestId或requestIds', 400);
    }

    const result = await convertRequestToPurchaseOrder(requestId);
    return successResponse(result, '请购单转采购订单成功');
  },
  { logTitle: '请购单转采购订单', logType: 'business' }
);
