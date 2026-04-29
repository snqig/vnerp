import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const userName = searchParams.get('userName') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (userName) {
    where += ' AND user_name LIKE ?';
    params.push('%' + userName + '%');
  }
  if (status !== '') {
    where += ' AND status = ?';
    params.push(Number(status));
  }

  const countSql = 'SELECT COUNT(*) as total FROM sys_login_log ' + where;
  const totalRows: any = await query(countSql, params);
  const total = totalRows[0]?.total || 0;

  const dataSql = 'SELECT * FROM sys_login_log ' + where + ' ORDER BY login_time DESC LIMIT ? OFFSET ?';
  const rows: any = await query(dataSql, [...params, pageSize, (page - 1) * pageSize]);

  return successResponse({ list: rows, total, page, pageSize });
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  await query('TRUNCATE TABLE sys_login_log');
  return successResponse(null, '清空成功');
});
