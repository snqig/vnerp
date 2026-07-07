import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getInventoryLogs } from '@/lib/inventory-sync';

// 获取库存流水
export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);

  const materialId = searchParams.get('materialId') ? parseInt(searchParams.get('materialId')!) : undefined;
  const warehouseId = searchParams.get('warehouseId') ? parseInt(searchParams.get('warehouseId')!) : undefined;
  const operationType = searchParams.get('operationType') ? parseInt(searchParams.get('operationType')!) : undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const result = await getInventoryLogs(
    materialId,
    warehouseId,
    operationType,
    startDate,
    endDate,
    page,
    pageSize
  );

  return successResponse(result, '获取库存流水成功');
});
