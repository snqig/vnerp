import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

// 获取角色的数据权限配置
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');

  if (!roleId) {
    return errorResponse('角色ID不能为空', 400, 400);
  }

  const rows: Loose = await query(
    'SELECT id, role_id, scope_type, target_ids FROM sys_data_scope WHERE role_id = ?',
    [Number(roleId)]
  );

  // 转换为前端友好的格式
  const result: Record<string, number[]> = {};
  for (const row of rows as Loose[]) {
    const ids = (row.target_ids || '')
      .split(',')
      .map(Number)
      .filter((n: number) => !isNaN(n) && n > 0);
    result[row.scope_type] = ids;
  }

  return successResponse(result);
});

// 保存角色的数据权限配置
export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { roleId, scopes } = body as {
    roleId: number;
    scopes: Record<string, number[]>;
  };

  if (!roleId) {
    return errorResponse('角色ID不能为空', 400, 400);
  }

  // 先删除旧配置
  await execute('DELETE FROM sys_data_scope WHERE role_id = ?', [roleId]);

  // 插入新配置
  const validTypes = ['dept', 'warehouse', 'customer', 'supplier'];
  for (const [scopeType, targetIds] of Object.entries(scopes)) {
    if (!validTypes.includes(scopeType)) continue;
    if (!targetIds || targetIds.length === 0) continue;

    const targetIdsStr = targetIds.join(',');
    await execute('INSERT INTO sys_data_scope (role_id, scope_type, target_ids) VALUES (?, ?, ?)', [
      roleId,
      scopeType,
      targetIdsStr,
    ]);
  }

  return successResponse(null, '数据权限保存成功');
});
