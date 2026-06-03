import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const title = searchParams.get('title') || '';
  const operName = searchParams.get('operName') || '';

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (title) {
    where += ' AND (operation LIKE ? OR request_url LIKE ?)';
    params.push(`%${title}%`, `%${title}%`);
  }
  if (operName) {
    where += ' AND username LIKE ?';
    params.push(`%${operName}%`);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM sys_operation_log ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT id, COALESCE(operation, '') as title, COALESCE(username, '') as oper_name, COALESCE(operation, '') as oper_type, COALESCE(method, '') as oper_method, COALESCE(request_url, '') as oper_url, COALESCE(ip, '') as oper_ip, COALESCE(create_time, NOW()) as oper_time, status FROM sys_operation_log ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id) {
    await query(`DELETE FROM sys_operation_log WHERE id = ?`, [Number(id)]);
    return successResponse(null, '删除成功');
  }
  await query(`TRUNCATE TABLE sys_operation_log`);
  return successResponse(null, '清空成功');
});
