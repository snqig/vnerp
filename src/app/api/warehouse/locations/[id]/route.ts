import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { UserInfo } from '@/lib/auth';

/**
 * 库位详情 PUT / DELETE
 */
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const params = request.nextUrl.pathname.split('/').pop();
    const id = params || '';
    const body = await request.json();
    const { location_code, location_name, warehouse_id, zone, row_no, column_no, layer_no, location_type, status, remark } = body;

    const updates: string[] = [];
    const updateParams: unknown[] = [];

    if (location_code) { updates.push('location_code = ?'); updateParams.push(location_code); }
    if (location_name) { updates.push('location_name = ?'); updateParams.push(location_name); }
    if (warehouse_id) { updates.push('warehouse_id = ?'); updateParams.push(warehouse_id); }
    if (zone !== undefined) { updates.push('zone = ?'); updateParams.push(zone); }
    if (row_no !== undefined) { updates.push('row_no = ?'); updateParams.push(row_no); }
    if (column_no !== undefined) { updates.push('column_no = ?'); updateParams.push(column_no); }
    if (layer_no !== undefined) { updates.push('layer_no = ?'); updateParams.push(layer_no); }
    if (location_type !== undefined) { updates.push('location_type = ?'); updateParams.push(location_type); }
    if (status !== undefined) { updates.push('status = ?'); updateParams.push(status); }
    if (remark !== undefined) { updates.push('remark = ?'); updateParams.push(remark); }

    if (updates.length === 0) {
      return errorResponse('无更新字段', 400, 400);
    }

    updates.push('update_time = NOW()');
    updateParams.push(id);

    await execute(`UPDATE inv_location SET ${updates.join(', ')} WHERE id = ?`, updateParams as import('@/lib/db').SqlValue[]);

    return successResponse(null, '库位更新成功');
  },
  { errorMessage: '更新库位失败' }
);

export const DELETE = withPermission(
  async (_request: NextRequest, userInfo: UserInfo) => {
    const params = _request.nextUrl.pathname.split('/').pop();
    const id = params || '';
    await execute('UPDATE inv_location SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);
    return successResponse(null, '库位删除成功');
  },
  { errorMessage: '删除库位失败' }
);
