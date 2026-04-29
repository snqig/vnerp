import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const trainingName = searchParams.get('trainingName') || '';
  const trainingType = searchParams.get('trainingType') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (trainingName) { where += ' AND training_name LIKE ?'; params.push('%' + trainingName + '%'); }
  if (trainingType) { where += ' AND training_type = ?'; params.push(Number(trainingType)); }
  if (status) { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM hr_training ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query('SELECT * FROM hr_training ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?', [...params, pageSize, (page - 1) * pageSize]);
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { training_name, training_type, training_date, training_hours, trainer, training_content, training_place, remark, participants } = body;
  const now = new Date();
  const trainingNo = 'PX' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await execute(
    'INSERT INTO hr_training (training_no, training_name, training_type, training_date, training_hours, trainer, training_content, training_place, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [trainingNo, training_name, training_type || null, training_date, training_hours || null, trainer || null, training_content || null, training_place || null, remark || null]
  );

  if (participants && Array.isArray(participants)) {
    for (const p of participants) {
      await execute(
        'INSERT INTO hr_training_participant (training_id, employee_id, employee_name, score, is_qualified) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, p.employee_id, p.employee_name || null, p.score || null, p.is_qualified || null]
      );
    }
  }
  return successResponse({ id: result.insertId, training_no: trainingNo }, '培训记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;
  if (status !== undefined) await execute('UPDATE hr_training SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (remark !== undefined) await execute('UPDATE hr_training SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
  await execute('DELETE FROM hr_training_participant WHERE training_id = ?', [Number(id)]);
  await execute('UPDATE hr_training SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
