import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { adjustInventory } from '@/lib/inventory-sync';

// 库存调整（统一入口）
export const POST = withPermission(async (request: NextRequest, _userInfo) => {
  const body = await request.json();
  const {
    materialId,
    warehouseId,
    batchNo,
    quantity,
    operationType,
    businessType,
    businessNo,
    remark,
    operatorId,
  } = body;

  if (!materialId || !warehouseId || quantity === undefined || !businessNo) {
    return errorResponse('缺少必要参数: materialId, warehouseId, quantity, businessNo', 400, 400);
  }

  const result = await adjustInventory({
    materialId,
    warehouseId,
    batchNo,
    quantity,
    operationType: operationType || 'adjust',
    businessType: businessType || '库存调整',
    businessNo,
    remark,
    operatorId,
  });

  if (!result.success) {
    return errorResponse(result.message, 400, 400);
  }

  return successResponse(
    {
      currentStock: result.currentStock,
      availableStock: result.availableStock,
    },
    result.message
  );
});
