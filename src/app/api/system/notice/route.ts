import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const noticeTitle = searchParams.get('noticeTitle') || '';
  const noticeType = searchParams.get('noticeType') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (noticeTitle) {
    where += ' AND notice_title LIKE ?';
    params.push('%' + noticeTitle + '%');
  }
  if (noticeType) {
    where += ' AND notice_type = ?';
    params.push(Number(noticeType));
  }

  const countSql = 'SELECT COUNT(*) as total FROM sys_notice ' + where;
  const totalRows: any = await query(countSql, params);
  const total = totalRows[0]?.total || 0;

  const dataSql =
    'SELECT * FROM sys_notice ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
  const rows: any = await query(dataSql, [...params, pageSize, (page - 1) * pageSize]);

  return successResponse({ list: rows, total, page, pageSize });
}, { logTitle: '获取通知列表', logType: 'system' });

export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const body = await request.json();
  const { notice_title, notice_type, notice_content, status } = body;

  const result: any = await execute(
    'INSERT INTO sys_notice (notice_title, notice_type, notice_content, status) VALUES (?, ?, ?, ?)',
    [notice_title, notice_type, notice_content || null, status ?? 1]
  );

  return successResponse({ id: result.insertId }, '创建成功');
}, { logTitle: '创建通知', logType: 'system' });

export const PUT = withPermission(async (request: NextRequest, userInfo) => {
  const body = await request.json();
  const { id, notice_title, notice_type, notice_content, status } = body;

  await execute(
    'UPDATE sys_notice SET notice_title = ?, notice_type = ?, notice_content = ?, status = ? WHERE id = ? AND deleted = 0',
    [notice_title, notice_type, notice_content || null, status ?? 1, id]
  );

  return successResponse(null, '更新成功');
}, { logTitle: '更新通知', logType: 'system' });

export const DELETE = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  await execute('UPDATE sys_notice SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
}, { logTitle: '删除通知', logType: 'system' });
