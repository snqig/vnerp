import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import type { NextRequest } from 'next/server';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const workOrderId = searchParams.get('workOrderId');
  const plateId = searchParams.get('plateId');

  if (id) {
    const rows = await query(`
      SELECT iu.*, bi.ink_code, bi.ink_name, bi.unit, sp.plate_code
      FROM ink_usage iu
      LEFT JOIN base_ink bi ON iu.ink_id = bi.id
      LEFT JOIN prd_screen_plate sp ON iu.screen_plate_id = sp.id
      WHERE iu.id = ? AND iu.deleted = 0
    `, [id]);
    return successResponse((rows as any[])[0], '油墨耗用详情');
  }

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  let whereClause = 'iu.deleted = 0';
  const params: any[] = [];

  if (workOrderId) {
    whereClause += ' AND iu.work_order_id = ?';
    params.push(workOrderId);
  }
  if (plateId) {
    whereClause += ' AND iu.screen_plate_id = ?';
    params.push(plateId);
  }

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if (startDate) {
    whereClause += ' AND iu.usage_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    whereClause += ' AND iu.usage_date <= ?';
    params.push(endDate);
  }

  const [rows, countResult] = await Promise.all([
    query(`
      SELECT iu.*, bi.ink_code, bi.ink_name, bi.unit, sp.plate_code
      FROM ink_usage iu
      LEFT JOIN base_ink bi ON iu.ink_id = bi.id
      LEFT JOIN prd_screen_plate sp ON iu.screen_plate_id = sp.id
      WHERE ${whereClause}
      ORDER BY iu.usage_date DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]),
    query(`SELECT COUNT(*) as total FROM ink_usage iu WHERE ${whereClause}`, params)
  ]);

  return successResponse({
    list: rows,
    total: (countResult as any[])[0].total,
    page,
    pageSize
  }, '油墨耗用列表');
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { workOrderId, screenPlateId, inkId, usageQty, unit, usageDate, operatorId, operatorName, remark } = body;

  if (!inkId || !usageQty) {
    return errorResponse('缺少必要参数', 400);
  }

  const inkInfo = await query(`SELECT ink_code, ink_name, unit FROM base_ink WHERE id = ?`, [inkId]);
  const ink = (inkInfo as any[])[0];

  if (!ink) {
    return errorResponse('油墨不存在', 404);
  }

  const result = await execute(`
    INSERT INTO ink_usage (
      work_order_id, screen_plate_id, ink_id, ink_code, ink_name,
      usage_qty, unit, usage_date, operator_id, operator_name, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    workOrderId ?? null, screenPlateId ?? null, inkId, ink.ink_code, ink.ink_name,
    usageQty, unit || ink.unit, usageDate || new Date(), operatorId ?? null, operatorName ?? null, remark ?? null
  ]);

  return successResponse({ id: (result as any).insertId }, '油墨耗用记录成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('缺少记录ID', 400);
  }

  await execute('UPDATE ink_usage SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);

  return successResponse(null, '油墨耗用记录删除成功');
});
