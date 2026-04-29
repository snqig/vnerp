import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const work_order_id = searchParams.get('work_order_id');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `SELECT wr.*, e.equipment_name FROM prd_work_report wr LEFT JOIN eqp_equipment e ON wr.equipment_id = e.id WHERE wr.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (wr.report_no LIKE ? OR wr.work_order_no LIKE ? OR wr.operator_name LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like, like);
  }
  if (work_order_id) {
    sql += ' AND wr.work_order_id = ?';
    values.push(parseInt(work_order_id));
  }

  sql += ' ORDER BY wr.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM prd_work_report WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  const summaryStats = await query(
    `SELECT COALESCE(SUM(completed_qty), 0) as total_completed, COALESCE(SUM(qualified_qty), 0) as total_qualified, COALESCE(SUM(defective_qty), 0) as total_defective, COALESCE(SUM(scrap_qty), 0) as total_scrap FROM prd_work_report WHERE deleted = 0`
  ) as any[];

  return successResponse({ list, total: countResult?.total || 0, page, pageSize, summaryStats: summaryStats[0] || {} });
}, '获取报工记录失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['work_order_id', 'process_name']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const reportNo = `WR${Date.now()}`;

    const completedQty = parseFloat(body.completed_qty) || 0;
    const qualifiedQty = parseFloat(body.qualified_qty) || 0;
    const defectiveQty = parseFloat(body.defective_qty) || 0;
    const scrapQty = parseFloat(body.scrap_qty) || 0;

    await conn.execute(
      `INSERT INTO prd_work_report (report_no, work_order_id, work_order_no, process_name, process_seq, equipment_id, operator_id, operator_name, plan_qty, completed_qty, qualified_qty, defective_qty, scrap_qty, start_time, end_time, work_hours, is_first_piece, first_piece_status, first_piece_inspector, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportNo, body.work_order_id, body.work_order_no || null, body.process_name, body.process_seq || null,
       body.equipment_id || null, body.operator_id || null, body.operator_name || null,
       body.plan_qty || 0, completedQty, qualifiedQty, defectiveQty, scrapQty,
       body.start_time || null, body.end_time || null, body.work_hours || 0,
       body.is_first_piece || 0, body.first_piece_status || null, body.first_piece_inspector || null, body.remark || null]
    );

    const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
    const reportId = rows[0].id;

    if (body.die_template_id) {
      const [dieRows]: any = await conn.execute(
        'SELECT id, template_code, cumulative_impressions, max_impressions, warning_threshold, pieces_per_impression, die_status FROM prd_die_template WHERE id = ? AND deleted = 0',
        [body.die_template_id]
      );
      const die = dieRows?.[0];

      if (die) {
        const piecesPerImpression = die.pieces_per_impression || 1;
        const impressionsToAdd = Math.ceil(completedQty / piecesPerImpression);
        const newCumulative = (die.cumulative_impressions || 0) + impressionsToAdd;

        let newDieStatus = die.die_status;
        if (die.max_impressions > 0) {
          const pct = (newCumulative / die.max_impressions) * 100;
          if (pct >= 95) newDieStatus = 're_rule_needed';
          else if (pct >= (die.warning_threshold || 80)) newDieStatus = 'maintenance_needed';
          else newDieStatus = 'available';
        }

        await conn.execute(
          `UPDATE prd_die_template
           SET cumulative_impressions = ?,
               current_usage = ?,
               remaining_usage = GREATEST(max_usage - ?, 0),
               last_used_date = CURDATE(),
               die_status = ?,
               status = CASE
                 WHEN ? >= max_usage THEN 3
                 WHEN ? >= warning_usage THEN 2
                 ELSE 1
               END
           WHERE id = ?`,
          [newCumulative, newCumulative, newCumulative, newDieStatus, newCumulative, newCumulative, body.die_template_id]
        );

        await conn.execute(
          `INSERT INTO prd_die_usage_log (die_id, die_code, work_report_id, work_order_id, work_order_no, process_name, impressions, cumulative_after, operator_id, operator_name, equipment_id, usage_date, remark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
          [
            body.die_template_id, die.template_code,
            reportId, body.work_order_id, body.work_order_no || null,
            body.process_name, impressionsToAdd, newCumulative,
            body.operator_id || null, body.operator_name || null,
            body.equipment_id || null, null,
          ]
        );
      }
    }

    return { id: reportId, report_no: reportNo };
  });

  return successResponse(result, '报工记录创建成功');
}, '创建报工记录失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('报工ID不能为空');

  const existing = await queryOne('SELECT id FROM prd_work_report WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('报工记录不存在');

  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['completed_qty', 'qualified_qty', 'defective_qty', 'scrap_qty', 'end_time', 'work_hours', 'first_piece_status', 'first_piece_inspector', 'remark'];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length > 0) {
    values.push(body.id);
    await execute(`UPDATE prd_work_report SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return successResponse(null, '报工记录更新成功');
}, '更新报工记录失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('报工ID不能为空');

  await execute('UPDATE prd_work_report SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  return successResponse(null, '删除成功');
}, '删除报工记录失败');
