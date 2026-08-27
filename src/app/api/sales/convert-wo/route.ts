import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { createWorkOrderFromSalesOrder } from '@/lib/services/sales-order-service';

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { salesOrderId } = body;

    if (!salesOrderId) {
      return errorResponse('请提供salesOrderId', 400);
    }

    const result = await createWorkOrderFromSalesOrder(salesOrderId);
    return successResponse(result, '销售订单转工单成功');
  },
  { logTitle: '销售订单转工单', logType: 'business' }
);
