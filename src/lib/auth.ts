import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

const SECRET_KEY = JWT_SECRET || 'dev-only-secret-key';

// 用户信息接口
export interface UserInfo {
  userId: number;
  username: string;
  realName: string;
  roles: string[];
  permissions: string[];
  departmentId?: number;
  dataScope?: DataScope;
}

// 数据权限范围
export interface DataScope {
  type: 'all' | 'dept' | 'self' | 'dept_and_self';
  deptIds?: number[];
}

// 从请求中提取Token
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// 验证JWT Token
export async function verifyToken(token: string): Promise<UserInfo | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(SECRET_KEY)
    );

    return {
      userId: payload.userId as number,
      username: payload.username as string,
      realName: payload.realName as string,
      roles: payload.roles as string[],
      permissions: [],
    };
  } catch (error) {
    return null;
  }
}

// 获取用户完整信息（包括权限和数据范围）
export async function getUserInfo(userId: number): Promise<UserInfo | null> {
  // 查询用户基本信息
  const users = await query(
    `SELECT id, username, real_name, department_id FROM sys_user 
     WHERE id = ? AND deleted = 0 AND status = 1`,
    [userId]
  );

  if (!users || (users as any[]).length === 0) {
    return null;
  }

  const user = (users as any[])[0];

  // 查询用户角色
  const roles = await query(
    `SELECT r.role_code, r.data_scope FROM sys_role r
     JOIN sys_user_role ur ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.status = 1`,
    [userId]
  );

  const roleCodes = (roles as any[]).map(r => r.role_code);
  const dataScopes = (roles as any[]).map(r => r.data_scope).filter(Boolean);

  // 确定数据权限范围（取最宽松的范围）
  let dataScope: DataScope = { type: 'self' };
  if (dataScopes.includes('all')) {
    dataScope = { type: 'all' };
  } else if (dataScopes.includes('dept_and_self')) {
    dataScope = { type: 'dept_and_self', deptIds: user.department_id ? [user.department_id] : [] };
  } else if (dataScopes.includes('dept')) {
    dataScope = { type: 'dept', deptIds: user.department_id ? [user.department_id] : [] };
  }

  // 查询用户权限
  const permissions = await query(
    `SELECT DISTINCT m.permission FROM sys_menu m
     JOIN sys_role_menu rm ON m.id = rm.menu_id
     JOIN sys_user_role ur ON rm.role_id = ur.role_id
     WHERE ur.user_id = ? AND m.permission IS NOT NULL AND m.permission != ''`,
    [userId]
  );

  return {
    userId: user.id,
    username: user.username,
    realName: user.real_name,
    roles: roleCodes,
    permissions: (permissions as any[]).map(p => p.permission),
    departmentId: user.department_id,
    dataScope,
  };
}

// 检查用户是否有指定权限
export function hasPermission(userInfo: UserInfo, permission: string): boolean {
  return userInfo.permissions.includes(permission) || userInfo.roles.includes('admin');
}

// 检查用户是否有指定角色
export function hasRole(userInfo: UserInfo, role: string): boolean {
  return userInfo.roles.includes(role);
}

// 构建数据权限SQL条件
export function buildDataScopeSql(
  userInfo: UserInfo,
  tableAlias: string = 't',
  deptField: string = 'department_id',
  userField: string = 'create_by'
): { sql: string; params: any[] } {
  const { dataScope, userId, departmentId } = userInfo;

  if (!dataScope || dataScope.type === 'all') {
    return { sql: '', params: [] };
  }

  if (dataScope.type === 'self') {
    return {
      sql: ` AND ${tableAlias}.${userField} = ?`,
      params: [userId],
    };
  }

  if (dataScope.type === 'dept') {
    return {
      sql: ` AND ${tableAlias}.${deptField} = ?`,
      params: [departmentId],
    };
  }

  if (dataScope.type === 'dept_and_self') {
    return {
      sql: ` AND (${tableAlias}.${deptField} = ? OR ${tableAlias}.${userField} = ?)`,
      params: [departmentId, userId],
    };
  }

  return { sql: '', params: [] };
}

// 验证资源访问权限（防止横向越权）
export async function validateResourceAccess(
  userInfo: UserInfo,
  resourceType: 'order' | 'workorder' | 'inbound' | 'outbound',
  resourceId: string | number
): Promise<boolean> {
  let sql = '';
  let params: any[] = [];

  switch (resourceType) {
    case 'order':
      sql = 'SELECT create_by, department_id FROM sal_order WHERE order_no = ? AND deleted = 0';
      params = [resourceId];
      break;
    case 'workorder':
      sql = 'SELECT create_by FROM prod_work_order WHERE work_order_no = ? AND deleted = 0';
      params = [resourceId];
      break;
    case 'inbound':
      sql = 'SELECT operator_id as create_by FROM inv_inbound_order WHERE id = ? AND deleted = 0';
      params = [resourceId];
      break;
    case 'outbound':
      sql = 'SELECT operator_id as create_by FROM inv_outbound_order WHERE id = ? AND deleted = 0';
      params = [resourceId];
      break;
    default:
      return false;
  }

  const results = await query(sql, params);
  if (!results || (results as any[]).length === 0) {
    return false;
  }

  const resource = (results as any[])[0];

  // 管理员可以访问所有资源
  if (userInfo.roles.includes('admin')) {
    return true;
  }

  // 检查数据权限
  const { dataScope } = userInfo;
  if (dataScope?.type === 'all') {
    return true;
  }

  if (dataScope?.type === 'self') {
    return resource.create_by === userInfo.userId;
  }

  if (dataScope?.type === 'dept') {
    return resource.department_id === userInfo.departmentId;
  }

  if (dataScope?.type === 'dept_and_self') {
    return resource.department_id === userInfo.departmentId || resource.create_by === userInfo.userId;
  }

  return false;
}
