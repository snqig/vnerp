import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const dictTypeId = searchParams.get('dictTypeId') || '';
  const dictLabel = searchParams.get('dictLabel') || '';

  let where = 'WHERE d.deleted = 0';
  const params: any[] = [];
  if (dictTypeId) { where += ' AND d.dict_type_id = ?'; params.push(Number(dictTypeId)); }
  if (dictLabel) { where += ' AND d.dict_label LIKE ?'; params.push(`%${dictLabel}%`); }

  const totalRows: any = await query(`SELECT COUNT(*) as total FROM sys_dict_data d ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT d.*, t.dict_name, t.dict_code as dict_type_code FROM sys_dict_data d LEFT JOIN sys_dict_type t ON d.dict_type_id = t.id ${where} ORDER BY d.sort_order ASC, d.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { dict_type_id, dict_label, dict_value, sort_order, status, remark } = body;

  if (!dict_type_id) return NextResponse.json({ success: false, message: '字典类型ID不能为空' }, { status: 400 });

  const result: any = await execute(
    `INSERT INTO sys_dict_data (dict_type_id, dict_label, dict_value, sort_order, status, remark) VALUES (?, ?, ?, ?, ?, ?)`,
    [dict_type_id, dict_label, dict_value, sort_order || 0, status ?? 1, remark || null]
  );

  return successResponse({ id: result.insertId }, '创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, dict_type_id, dict_label, dict_value, sort_order, status, remark } = body;

  await execute(
    `UPDATE sys_dict_data SET dict_type_id = ?, dict_label = ?, dict_value = ?, sort_order = ?, status = ?, remark = ? WHERE id = ? AND deleted = 0`,
    [dict_type_id, dict_label, dict_value, sort_order || 0, status ?? 1, remark || null, id]
  );

  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  await execute(`UPDATE sys_dict_data SET deleted = 1 WHERE id = ?`, [Number(id)]);
  return successResponse(null, '删除成功');
});
