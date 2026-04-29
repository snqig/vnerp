import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const dictName = searchParams.get('dictName') || '';
  const dictType = searchParams.get('dictType') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (dictName) { where += ' AND dict_name LIKE ?'; params.push(`%${dictName}%`); }
  if (dictType) { where += ' AND dict_code LIKE ?'; params.push(`%${dictType}%`); }
  if (status !== '') { where += ' AND status = ?'; params.push(Number(status)); }

  const totalRows: any = await query(`SELECT COUNT(*) as total FROM sys_dict_type ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT * FROM sys_dict_type ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { dict_name, dict_code, status, description } = body;

  const result: any = await execute(
    `INSERT INTO sys_dict_type (dict_name, dict_code, status, description) VALUES (?, ?, ?, ?)`,
    [dict_name, dict_code, status ?? 1, description || null]
  );

  return successResponse({ id: result.insertId }, '创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, dict_name, dict_code, status, description } = body;

  await execute(
    `UPDATE sys_dict_type SET dict_name = ?, dict_code = ?, status = ?, description = ? WHERE id = ? AND deleted = 0`,
    [dict_name, dict_code, status ?? 1, description || null, id]
  );

  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  await execute(`UPDATE sys_dict_type SET deleted = 1 WHERE id = ?`, [Number(id)]);
  return successResponse(null, '删除成功');
});
