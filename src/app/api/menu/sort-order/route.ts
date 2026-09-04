import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { jwtVerify } from 'jose';
import { secureLog } from '@/lib/logger';
import { getSecretKey } from '@/lib/auth';

// 验证JWT Token
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(getSecretKey()));
    return payload;
  } catch {
    return null;
  }
}

// POST - 保存菜单排序
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    // 获取token
    const authHeader = request.headers.get('authorization');
    secureLog('debug', 'Menu sort auth', { hasAuth: !!authHeader });
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return commonErrors.unauthorized(ts('k_1ydrtwl'));
    }

    const payload = await verifyToken(token);
    secureLog('debug', 'Menu sort token verified', { userId: payload?.userId });
    if (!payload) {
      return commonErrors.unauthorized(ts('k_1wf23nn'));
    }

    const body = await request.json();
    const { orders } = body;

    if (!Array.isArray(orders)) {
      return commonErrors.badRequest(ts('k_ihka3h'));
    }

    // 验证每个排序项
    for (const item of orders) {
      if (!item.id || typeof item.sort_order !== 'number') {
        return errorResponse(ts('k_vgb5nb'), 400, 400);
      }
    }

    // 使用事务更新排序
    await transaction(async (connection) => {
      for (const item of orders) {
        // 检查菜单是否存在
        const [menuResult] = await connection.execute('SELECT id FROM sys_menu WHERE id = ?', [
          item.id,
        ]);

        if (menuResult.length > 0) {
          await connection.execute('UPDATE sys_menu SET sort_order = ? WHERE id = ?', [
            item.sort_order,
            item.id,
          ]);
        }
      }
    });

    return successResponse(null, ts('k_1hpae80'));
  },
  { logTitle: '保存菜单排序' }
);
