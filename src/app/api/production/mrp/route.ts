import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';
import { query, transaction } from '@/lib/db';
import {
  explodeBOM,
  calculateTimeBuckets,
  calculateNetRequirements,
  generatePlannedOrders,
  generatePurchaseRequestsFromMRP,
  runFullMRP,
} from '@/lib/mrp-engine';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { work_order_ids, warehouse_id, auto_generate_pr = false } = body;

  if (!work_order_ids || !Array.isArray(work_order_ids) || work_order_ids.length === 0) {
    return errorResponse('请提供工单ID列表', 400, 400);
  }

  const result = await transaction(async (conn) => {
    return await runFullMRP(
      conn,
      work_order_ids,
      warehouse_id || 1,
      null,
      'system',
      auto_generate_pr
    );
  });

  return successResponse(result);
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'bom-explode') {
    const productId = parseInt(searchParams.get('product_id') || '0');
    const quantity = parseFloat(searchParams.get('quantity') || '1');
    if (!productId) return errorResponse('请提供产品ID', 400, 400);
    const result = await transaction(async (conn) => {
      return await explodeBOM(conn, productId, quantity);
    });
    return successResponse(result);
  }

  if (action === 'time-buckets') {
    const materialId = parseInt(searchParams.get('material_id') || '0');
    const warehouseId = parseInt(searchParams.get('warehouse_id') || '1');
    const startDate = searchParams.get('start_date') || new Date().toISOString().slice(0, 10);
    const endDate =
      searchParams.get('end_date') ||
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const bucketSize = (searchParams.get('bucket_size') || 'week') as 'day' | 'week' | 'month';
    if (!materialId) return errorResponse('请提供物料ID', 400, 400);
    const result = await transaction(async (conn) => {
      return await calculateTimeBuckets(
        conn,
        materialId,
        warehouseId,
        startDate,
        endDate,
        bucketSize
      );
    });
    return successResponse(result);
  }

  if (action === 'net-requirements') {
    const idsStr = searchParams.get('work_order_ids') || '';
    const warehouseId = parseInt(searchParams.get('warehouse_id') || '1');
    const workOrderIds = idsStr
      .split(',')
      .map(Number)
      .filter((n) => n > 0);
    if (workOrderIds.length === 0) return errorResponse('请提供工单ID列表', 400, 400);
    const result = await transaction(async (conn) => {
      return await calculateNetRequirements(conn, workOrderIds, warehouseId);
    });
    return successResponse(result);
  }

  return errorResponse('未知操作', 400, 400);
});
