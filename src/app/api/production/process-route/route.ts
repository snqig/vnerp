import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `SELECT pr.*, m.material_name as product_name FROM prd_process_route pr LEFT JOIN inv_material m ON pr.product_id = m.id WHERE pr.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (pr.route_code LIKE ? OR pr.route_name LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like);
  }

  sql += ' ORDER BY pr.id ASC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM prd_process_route WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  for (const route of list as any[]) {
    const steps = await query('SELECT * FROM prd_process_route_step WHERE route_id = ? ORDER BY step_seq ASC', [route.id]);
    route.steps = steps;
  }

  return successResponse({ list, total: countResult?.total || 0, page, pageSize });
}, '获取工艺路线列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['route_code', 'route_name']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO prd_process_route (route_code, route_name, product_id, version, is_default, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [body.route_code, body.route_name, body.product_id || null, body.version || '1.0', body.is_default || 1, body.status || 1, body.remark || null]
    );

    const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
    const routeId = rows[0].id;

    if (body.steps && Array.isArray(body.steps)) {
      for (const step of body.steps) {
        await conn.execute(
          `INSERT INTO prd_process_route_step (route_id, step_seq, step_name, step_type, equipment_type, standard_time, setup_time, is_key_process, is_first_piece_required, quality_check, remark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [routeId, step.step_seq, step.step_name, step.step_type || null, step.equipment_type || null,
           step.standard_time || null, step.setup_time || null, step.is_key_process || 0,
           step.is_first_piece_required || 0, step.quality_check || 0, step.remark || null]
        );
      }
    }

    return { id: routeId, route_code: body.route_code };
  });

  return successResponse(result, '工艺路线创建成功');
}, '创建工艺路线失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('工艺路线ID不能为空');

  const existing = await queryOne('SELECT id FROM prd_process_route WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('工艺路线不存在');

  await execute(
    `UPDATE prd_process_route SET route_name = ?, version = ?, is_default = ?, status = ?, remark = ? WHERE id = ?`,
    [body.route_name, body.version, body.is_default, body.status, body.remark, body.id]
  );

  if (body.steps && Array.isArray(body.steps)) {
    await execute('DELETE FROM prd_process_route_step WHERE route_id = ?', [body.id]);
    for (const step of body.steps) {
      await execute(
        `INSERT INTO prd_process_route_step (route_id, step_seq, step_name, step_type, equipment_type, standard_time, setup_time, is_key_process, is_first_piece_required, quality_check, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [body.id, step.step_seq, step.step_name, step.step_type || null, step.equipment_type || null,
         step.standard_time || null, step.setup_time || null, step.is_key_process || 0,
         step.is_first_piece_required || 0, step.quality_check || 0, step.remark || null]
      );
    }
  }

  return successResponse(null, '工艺路线更新成功');
}, '更新工艺路线失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('工艺路线ID不能为空');

  await execute('UPDATE prd_process_route SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  await execute('DELETE FROM prd_process_route_step WHERE route_id = ?', [parseInt(id)]);
  return successResponse(null, '删除成功');
}, '删除工艺路线失败');
