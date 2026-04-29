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

  let hasDeletedCol = false;
  try {
    const colCheck: any = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sys_operation_log' AND COLUMN_NAME = 'deleted'`
    );
    hasDeletedCol = colCheck.length > 0;
  } catch (e) { /* ignore */ }

  if (hasDeletedCol) {
    where += ' AND deleted = 0';
  }

  if (title) { where += ' AND (title LIKE ? OR oper_url LIKE ?)'; params.push(`%${title}%`, `%${title}%`); }
  if (operName) { where += ' AND oper_name LIKE ?'; params.push(`%${operName}%`); }

  const totalRows: any = await query(`SELECT COUNT(*) as total FROM sys_operation_log ${where}`, params);
  const total = totalRows[0]?.total || 0;

  let orderByCol = 'oper_time';
  try {
    const timeColCheck: any = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sys_operation_log' AND COLUMN_NAME IN ('oper_time', 'create_time') ORDER BY FIELD(COLUMN_NAME, 'oper_time', 'create_time')`
    );
    if (timeColCheck.length > 0) {
      orderByCol = timeColCheck[0].COLUMN_NAME;
    }
  } catch (e) { /* ignore */ }

  const rows: any = await query(
    `SELECT id, COALESCE(title, module, '') as title, COALESCE(oper_name, username, '') as oper_name, COALESCE(oper_type, operation, '') as oper_type, COALESCE(oper_method, request_method, '') as oper_method, COALESCE(oper_url, request_url, '') as oper_url, COALESCE(oper_ip, ip_address, '') as oper_ip, COALESCE(${orderByCol}, NOW()) as oper_time, status FROM sys_operation_log ${where} ORDER BY ${orderByCol} DESC LIMIT ? OFFSET ?`,
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
