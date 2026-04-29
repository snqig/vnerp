import { NextRequest } from 'next/server';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import { createWorkOrderFromSalesOrder } from '@/lib/services/sales-order-service';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { salesOrderId } = body;

  if (!salesOrderId) {
    return errorResponse('请提供salesOrderId', 400);
  }

  const result = await createWorkOrderFromSalesOrder(salesOrderId);
  return successResponse(result, '销售订单转工单成功');
});
