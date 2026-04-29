import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const equipment_type = searchParams.get('equipment_type');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `SELECT * FROM eqp_equipment WHERE deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (equipment_code LIKE ? OR equipment_name LIKE ? OR brand LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like, like);
  }
  if (equipment_type) {
    sql += ' AND equipment_type = ?';
    values.push(parseInt(equipment_type));
  }
  if (status) {
    sql += ' AND status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY id ASC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM eqp_equipment WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  const typeStats = await query(
    `SELECT equipment_type, COUNT(*) as count, AVG(oee) as avg_oee FROM eqp_equipment WHERE deleted = 0 GROUP BY equipment_type`
  ) as any[];

  return successResponse({ list, total: countResult?.total || 0, page, pageSize, typeStats });
}, '获取设备列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['equipment_code', 'equipment_name']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const existing = await queryOne('SELECT id FROM eqp_equipment WHERE equipment_code = ? AND deleted = 0', [body.equipment_code]);
  if (existing) {
    return errorResponse('设备编码已存在', 409, 409);
  }

  const result = await execute(
    `INSERT INTO eqp_equipment (equipment_code, equipment_name, equipment_type, brand, model, serial_no, location, purchase_date, manufacturer, rated_capacity, oee, availability, performance, quality_rate, current_status, status, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [body.equipment_code, body.equipment_name, body.equipment_type || null, body.brand || null, body.model || null, body.serial_no || null, body.location || null, body.purchase_date || null, body.manufacturer || null, body.rated_capacity || null, body.oee || 0, body.availability || 0, body.performance || 0, body.quality_rate || 0, body.current_status || 1, body.remark || null]
  );

  return successResponse({ id: result.insertId }, '设备创建成功');
}, '创建设备失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) {
    return commonErrors.badRequest('设备ID不能为空');
  }

  const existing = await queryOne('SELECT id FROM eqp_equipment WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) {
    return commonErrors.notFound('设备不存在');
  }

  await execute(
    `UPDATE eqp_equipment SET equipment_name = ?, equipment_type = ?, brand = ?, model = ?, location = ?, rated_capacity = ?, oee = ?, availability = ?, performance = ?, quality_rate = ?, current_status = ?, status = ?, remark = ? WHERE id = ?`,
    [body.equipment_name, body.equipment_type, body.brand, body.model, body.location, body.rated_capacity, body.oee, body.availability, body.performance, body.quality_rate, body.current_status, body.status, body.remark, body.id]
  );

  return successResponse(null, '设备更新成功');
}, '更新设备失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('设备ID不能为空');

  await execute('UPDATE eqp_equipment SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  return successResponse(null, '设备删除成功');
}, '删除设备失败');
