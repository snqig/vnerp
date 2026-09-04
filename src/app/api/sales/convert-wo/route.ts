import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { createWorkOrderFromSalesOrder } from '@/lib/services/sales-order-service';

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { salesOrderId } = body;

    if (!salesOrderId) {
      return errorResponse(ts('k_j0eq46'), 400);
    }

    const result = await createWorkOrderFromSalesOrder(salesOrderId);
    return successResponse(result, ts('k_1fy8enp'));
  },
  { logTitle: '销售订单转工单', logType: 'business' }
);
