import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

// 按钮权限接口
interface ButtonPermission {
  code: string;
  name: string;
}

// GET - 获取角色的按钮权限
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');

  if (!roleId) {
    return commonErrors.badRequest(ts('k_2gmrs2'));
  }

  const roleIdNum = parseInt(roleId);

  // 检查角色是否存在
  const existingRole = await queryOne<{ id: number; permissions: string | null }>(
    'SELECT id, permissions FROM sys_role WHERE id = ? AND deleted = 0',
    [roleIdNum]
  );

  if (!existingRole) {
    return commonErrors.notFound(ts('k_lrx46w'));
  }

  // 注意：sys_role.permissions 是 MySQL JSON 列，mysql2 会自动解析为 JS 数组，
  // 此时再 JSON.parse 会抛 SyntaxError（500）。需同时兼容「已是数组」与「仍是 JSON 字符串」两种形态。
  const raw = existingRole.permissions;
  let permissions: string[] = [];
  if (Array.isArray(raw)) {
    permissions = raw as string[];
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      permissions = Array.isArray(parsed) ? parsed : [parsed as unknown as string];
    } catch {
      permissions = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return successResponse(permissions);
});

// POST - 保存角色的按钮权限
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { role_id, permissions } = body;

    // 验证必填字段
    const validation = validateRequestBody(body, ['role_id']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const roleIdNum = parseInt(role_id);

    // 检查角色是否存在
    const existingRole = await queryOne<{ id: number }>(
      'SELECT id FROM sys_role WHERE id = ? AND deleted = 0',
      [roleIdNum]
    );

    if (!existingRole) {
      return commonErrors.notFound(ts('k_lrx46w'));
    }

    // 验证权限格式
    if (permissions && !Array.isArray(permissions)) {
      return errorResponse(ts('k_18wrj2r'), 400, 400);
    }

    // 更新角色权限
    const result = await execute('UPDATE sys_role SET permissions = ? WHERE id = ?', [
      JSON.stringify(permissions || []),
      roleIdNum,
    ]);

    if (result.affectedRows === 0) {
      return commonErrors.notFound(ts('k_lrx46w'));
    }

    return successResponse(null, ts('k_drgmjh'));
  },
  { logTitle: '保存按钮权限' }
);
