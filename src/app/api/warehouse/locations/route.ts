import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 库位列表（仓库调拨等下拉场景）
 * GET /api/warehouse/locations?wh_id=1
 */
export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const whId = searchParams.get('wh_id');
    if (!whId) return errorResponse('缺少参数 wh_id', 400, 400);

    const rows = await query(
      `SELECT id, location_code, location_name, warehouse_id, zone, status
       FROM inv_location
       WHERE deleted = 0 AND warehouse_id = ?
       ORDER BY location_code`,
      [Number(whId)] as SqlValue[]
    );
    return successResponse(rows);
  },
  { errorMessage: '获取库位列表失败' }
);
