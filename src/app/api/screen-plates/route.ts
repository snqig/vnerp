import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import type { NextRequest } from 'next/server';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const plateCode = searchParams.get('plateCode');

  if (id) {
    const rows = await query(`
      SELECT sp.*, c.customer_name, w.warehouse_name, l.location_name
      FROM prd_screen_plate sp
      LEFT JOIN crm_customer c ON sp.customer_id = c.id
      LEFT JOIN inv_warehouse w ON sp.warehouse_id = w.id
      LEFT JOIN inv_location l ON sp.location_id = l.id
      WHERE sp.id = ? AND sp.deleted = 0
    `, [id]);
    return successResponse((rows as any[])[0], '网版详情');
  }

  if (plateCode) {
    const rows = await query(`
      SELECT sp.*, c.customer_name, w.warehouse_name, l.location_name
      FROM prd_screen_plate sp
      LEFT JOIN crm_customer c ON sp.customer_id = c.id
      LEFT JOIN inv_warehouse w ON sp.warehouse_id = w.id
      LEFT JOIN inv_location l ON sp.location_id = l.id
      WHERE sp.plate_code = ? AND sp.deleted = 0
    `, [plateCode]);
    return successResponse((rows as any[])[0], '网版详情');
  }

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;
  const status = searchParams.get('status');
  const customerName = searchParams.get('customerName');

  let whereClause = 'sp.deleted = 0';
  const params: any[] = [];

  if (status) {
    whereClause += ' AND sp.status = ?';
    params.push(status);
  }
  if (customerName) {
    whereClause += ' AND c.customer_name LIKE ?';
    params.push(`%${customerName}%`);
  }

  const [rows, countResult] = await Promise.all([
    query(`
      SELECT sp.*, c.customer_name, w.warehouse_name, l.location_name
      FROM prd_screen_plate sp
      LEFT JOIN crm_customer c ON sp.customer_id = c.id
      LEFT JOIN inv_warehouse w ON sp.warehouse_id = w.id
      LEFT JOIN inv_location l ON sp.location_id = l.id
      WHERE ${whereClause}
      ORDER BY sp.create_time DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]),
    query(`SELECT COUNT(*) as total FROM prd_screen_plate sp LEFT JOIN crm_customer c ON sp.customer_id = c.id WHERE ${whereClause}`, params)
  ]);

  return successResponse({
    list: rows,
    total: (countResult as any[])[0].total,
    page,
    pageSize
  }, '网版列表');
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const {
    plateCode,
    plateName,
    plateType,
    meshCount,
    meshMaterial,
    size,
    tensionValue,
    frameType,
    customerId,
    maxUseCount,
    warehouseId,
    locationId,
    remark
  } = body;

  if (!plateCode || !plateName) {
    return errorResponse('缺少必要参数：plateCode, plateName', 400);
  }

  const result = await execute(`
    INSERT INTO prd_screen_plate (
      plate_code, plate_name, plate_type, mesh_count, mesh_material, size,
      tension_value, frame_type, customer_id, max_use_count, used_count,
      remaining_count, warehouse_id, location_id, status, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, ?)
  `, [
    plateCode, plateName, plateType || 1, meshCount ?? null, meshMaterial ?? null, size ?? null,
    tensionValue ?? null, frameType ?? null, customerId ?? null, maxUseCount || 800,
    maxUseCount || 800, warehouseId ?? null, locationId ?? null, remark ?? null
  ]);

  const plateId = (result as any).insertId;

  await execute(`
    INSERT INTO screen_plate_history (screen_plate_id, action, operator_name, remark)
    VALUES (?, 'Created', ?, '网版创建')
  `, [plateId, body.operatorName || '系统']);

  return successResponse({ id: plateId, plateCode }, '网版创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return errorResponse('缺少网版ID', 400);
  }

  const updateFields: string[] = [];
  const params: any[] = [];

  const fieldMap: Record<string, string> = {
    plateName: 'plate_name',
    plateType: 'plate_type',
    meshCount: 'mesh_count',
    meshMaterial: 'mesh_material',
    size: 'size',
    tensionValue: 'tension_value',
    tensionDate: 'tension_date',
    frameType: 'frame_type',
    customerId: 'customer_id',
    maxUseCount: 'max_use_count',
    warehouseId: 'warehouse_id',
    locationId: 'location_id',
    status: 'status',
    remark: 'remark',
    scrapReason: 'scrap_reason',
    storageLocation: 'storage_location'
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      updateFields.push(`${col} = ?`);
      params.push(body[key]);
    }
  }

  if (updateFields.length === 0) {
    return errorResponse('没有需要更新的字段', 400);
  }

  updateFields.push('update_time = NOW()');
  params.push(id);

  await execute(`UPDATE prd_screen_plate SET ${updateFields.join(', ')} WHERE id = ?`, params);

  return successResponse(null, '网版更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('缺少网版ID', 400);
  }

  await execute('UPDATE prd_screen_plate SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);

  await execute(`
    INSERT INTO screen_plate_history (screen_plate_id, action, operator_name, remark)
    VALUES (?, 'Scrapped', ?, '网版删除')
  `, [id, '系统']);

  return successResponse(null, '网版删除成功');
});
