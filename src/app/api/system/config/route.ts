import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const configName = searchParams.get('configName') || '';
  const configKey = searchParams.get('configKey') || '';

  let where = 'WHERE deleted = 0';
  const params: any[] = [];
  if (configName) { where += ' AND config_name LIKE ?'; params.push(`%${configName}%`); }
  if (configKey) { where += ' AND config_key LIKE ?'; params.push(`%${configKey}%`); }

  const totalRows: any = await query(`SELECT COUNT(*) as total FROM sys_config ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT * FROM sys_config ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { config_name, config_key, config_value, config_type, description } = body;

  const result: any = await execute(
    `INSERT INTO sys_config (config_name, config_key, config_value, config_type, description) VALUES (?, ?, ?, ?, ?)`,
    [config_name, config_key, config_value, config_type ?? 1, description || null]
  );

  return successResponse({ id: result.insertId }, '创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, config_name, config_key, config_value, config_type, description } = body;

  await execute(
    `UPDATE sys_config SET config_name = ?, config_key = ?, config_value = ?, config_type = ?, description = ? WHERE id = ? AND deleted = 0`,
    [config_name, config_key, config_value, config_type ?? 1, description || null, id]
  );

  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  await execute(`UPDATE sys_config SET deleted = 1 WHERE id = ?`, [Number(id)]);
  return successResponse(null, '删除成功');
});
