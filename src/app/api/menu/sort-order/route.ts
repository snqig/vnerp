import { NextRequest } from 'next/server';
import { execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
} from '@/lib/api-response';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

const SECRET_KEY = JWT_SECRET || 'dev-only-secret-key';

// 菜单排序项接口
interface MenuSortItem {
  id: number;
  sort_order: number;
}

// 验证JWT Token
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(SECRET_KEY)
    );
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// POST - 保存菜单排序
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 获取token
  const authHeader = request.headers.get('authorization');
  console.log('Authorization header:', authHeader);
  const token = authHeader?.replace('Bearer ', '');
  console.log('Extracted token:', token);

  if (!token) {
    console.log('No token provided');
    return commonErrors.unauthorized('未登录');
  }

  // 验证token
  const payload = await verifyToken(token);
  console.log('Token payload:', payload);
  if (!payload) {
    console.log('Invalid token');
    return commonErrors.unauthorized('登录已过期');
  }

  const body = await request.json();
  const { orders } = body;

  if (!Array.isArray(orders)) {
    return commonErrors.badRequest('参数错误，orders必须是数组');
  }

  // 验证每个排序项
  for (const item of orders) {
    if (!item.id || typeof item.sort_order !== 'number') {
      return errorResponse(
        '排序项格式不正确，需要id和sort_order字段',
        400,
        400
      );
    }
  }

  // 使用事务更新排序
  await transaction(async (connection) => {
    for (const item of orders) {
      // 检查菜单是否存在
      const [menuResult]: any = await connection.execute(
        'SELECT id FROM sys_menu WHERE id = ?',
        [item.id]
      );

      if (menuResult.length > 0) {
        await connection.execute(
          'UPDATE sys_menu SET sort_order = ? WHERE id = ?',
          [item.sort_order, item.id]
        );
      }
    }
  });

  return successResponse(null, '菜单排序已保存');
}, '保存菜单排序失败');
