import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const rows: any = await query(
    'SELECT id, role_name, role_code, description, data_scope, status, permissions, create_time FROM sys_role WHERE deleted = 0 ORDER BY id'
  );
  return successResponse(rows);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { role_name, role_code, description, data_scope, status, permissions } = body;

  if (!role_name || !role_code) return errorResponse('角色名称和编码不能为空', 400, 400);

  const existing: any = await query('SELECT id FROM sys_role WHERE role_code = ? AND deleted = 0', [role_code]);
  if (existing.length > 0) return errorResponse('角色编码已存在', 400, 400);

  const result: any = await execute(
    'INSERT INTO sys_role (role_name, role_code, description, data_scope, status, permissions) VALUES (?, ?, ?, ?, ?, ?)',
    [role_name, role_code, description || null, data_scope || 1, status ?? 1, JSON.stringify(permissions || [])]
  );

  return successResponse({ id: result.insertId }, '角色创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, role_name, role_code, description, data_scope, status, permissions } = body;

  if (!id) return errorResponse('角色ID不能为空', 400, 400);

  const fields: string[] = [];
  const values: any[] = [];
  if (role_name !== undefined) { fields.push('role_name = ?'); values.push(role_name); }
  if (role_code !== undefined) { fields.push('role_code = ?'); values.push(role_code); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (data_scope !== undefined) { fields.push('data_scope = ?'); values.push(data_scope); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)); }

  if (fields.length === 0) return errorResponse('没有需要更新的字段', 400, 400);

  values.push(id);
  await execute(`UPDATE sys_role SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`, values);

  return successResponse(null, '角色更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('角色ID不能为空', 400, 400);

  await execute('UPDATE sys_role SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '角色删除成功');
});
