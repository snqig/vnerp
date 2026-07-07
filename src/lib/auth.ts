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
  /**
   * JWT 签发时间（毫秒），由 verifyToken 从 payload.iat 填充。
   * 用于用户级 token 撤销判断（修改密码后让旧 token 立即失效）。
   */
  iat?: number;
  /**
   * 是否首次登录（需强制改密）。true 时除白名单外所有 API 返回 403。
   */
  firstLogin?: boolean;
}

// 数据权限范围
export interface DataScope {
  type: 'all' | 'dept' | 'self' | 'dept_and_self' | 'custom';
  deptIds?: number[];
  warehouseIds?: number[];
  customerIds?: number[];
  supplierIds?: number[];
}

// 数据库行类型
interface UserRow {
  id: number;
  username: string;
  real_name: string;
  department_id: number | null;
  first_login: number;
}

interface RoleRow {
  id?: number;
  role_code: string;
  data_scope: string;
}

interface DataScopeRow {
  role_id: number;
  scope_type: string;
  target_ids: string;
}

interface PermissionRow {
  permission: string;
}

interface ResourceRow {
  create_by: number;
  department_id?: number;
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
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET_KEY));

    const userId = payload.userId as number;
    // jose 将 iat 解析为秒级 number
    const iatMs = typeof payload.iat === 'number' ? payload.iat * 1000 : undefined;
    const fullUserInfo = await getUserInfo(userId);
    if (fullUserInfo) {
      return { ...fullUserInfo, iat: iatMs };
    }

    return {
      userId: payload.userId as number,
      username: payload.username as string,
      realName: payload.realName as string,
      roles: payload.roles as string[],
      permissions: [],
      iat: iatMs,
    };
  } catch (error) {
    return null;
  }
}

// 获取用户完整信息（包括权限和数据范围）
export async function getUserInfo(userId: number): Promise<UserInfo | null> {
  // 查询用户基本信息
  const users = await query<UserRow>(
    `SELECT id, username, real_name, department_id, first_login FROM sys_user
     WHERE id = ? AND deleted = 0 AND status = 1`,
    [userId]
  );

  if (!users || users.length === 0) {
    return null;
  }

  const user = users[0];

  // 查询用户角色
  const roles = await query<RoleRow>(
    `SELECT r.role_code, r.data_scope FROM sys_role r
     JOIN sys_user_role ur ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.status = 1`,
    [userId]
  );

  const roleCodes = roles.map((r) => r.role_code);
  const dataScopes = roles.map((r) => r.data_scope).filter(Boolean);

  // 确定数据权限范围（最小权限原则：取最严格的范围）
  let dataScope: DataScope = { type: 'self' };
  if (dataScopes.length > 0) {
    const scopePriority: Record<string, number> = {
      self: 1,
      dept: 2,
      dept_and_self: 3,
      custom: 4,
      all: 5,
    };

    const minPriority = Math.min(...dataScopes.map((s) => scopePriority[s] || 0));
    const mostRestrictive =
      Object.entries(scopePriority).find(([_, p]) => p === minPriority)?.[0] || 'self';

    if (mostRestrictive === 'all') {
      dataScope = { type: 'all' };
    } else if (mostRestrictive === 'dept_and_self') {
      dataScope = {
        type: 'dept_and_self',
        deptIds: user.department_id ? [user.department_id] : [],
      };
    } else if (mostRestrictive === 'dept') {
      dataScope = { type: 'dept', deptIds: user.department_id ? [user.department_id] : [] };
    } else if (mostRestrictive === 'custom') {
      dataScope = { type: 'custom', deptIds: user.department_id ? [user.department_id] : [] };
    } else {
      dataScope = { type: 'self' };
    }
  }

  // 查询角色的仓库、客户、供应商数据权限
  const roleIds = roles.map((r) => r.id).filter((id): id is number => Boolean(id));
  if (roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',');
    const scopeRows = await query<DataScopeRow>(
      `SELECT role_id, scope_type, target_ids FROM sys_data_scope WHERE role_id IN (${placeholders})`,
      roleIds
    );
    const warehouseIds: number[] = [];
    const customerIds: number[] = [];
    const supplierIds: number[] = [];
    for (const row of scopeRows) {
      const ids = (row.target_ids || '')
        .split(',')
        .map(Number)
        .filter((n: number) => !isNaN(n) && n > 0);
      if (row.scope_type === 'warehouse') warehouseIds.push(...ids);
      if (row.scope_type === 'customer') customerIds.push(...ids);
      if (row.scope_type === 'supplier') supplierIds.push(...ids);
    }
    if (warehouseIds.length > 0) dataScope.warehouseIds = [...new Set(warehouseIds)];
    if (customerIds.length > 0) dataScope.customerIds = [...new Set(customerIds)];
    if (supplierIds.length > 0) dataScope.supplierIds = [...new Set(supplierIds)];
  }

  // 查询用户权限
  const permissions = await query<PermissionRow>(
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
    permissions: permissions.map((p) => p.permission),
    departmentId: user.department_id ?? undefined,
    dataScope,
    firstLogin: Boolean(user.first_login),
  };
}

// 检查用户是否有指定权限
export function hasPermission(userInfo: UserInfo, permission: string): boolean {
  return (
    userInfo.permissions.includes(permission) ||
    userInfo.permissions.includes('*') ||
    userInfo.roles.includes('admin') ||
    userInfo.roles.includes('super_admin')
  );
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
  userField: string = 'create_by',
  options?: {
    warehouseField?: string;
    customerField?: string;
    supplierField?: string;
  }
): { sql: string; params: unknown[] } {
  const { dataScope, userId, departmentId } = userInfo;

  if (!dataScope || dataScope.type === 'all') {
    return { sql: '', params: [] };
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  // 部门/本人维度
  if (dataScope.type === 'self') {
    conditions.push(`${tableAlias}.${userField} = ?`);
    params.push(userId);
  } else if (dataScope.type === 'dept') {
    conditions.push(`${tableAlias}.${deptField} = ?`);
    params.push(departmentId);
  } else if (dataScope.type === 'dept_and_self') {
    conditions.push(`(${tableAlias}.${deptField} = ? OR ${tableAlias}.${userField} = ?)`);
    params.push(departmentId, userId);
  }

  // 仓库维度
  if (dataScope.warehouseIds && dataScope.warehouseIds.length > 0 && options?.warehouseField) {
    const whPlaceholders = dataScope.warehouseIds.map(() => '?').join(',');
    conditions.push(`${tableAlias}.${options.warehouseField} IN (${whPlaceholders})`);
    params.push(...dataScope.warehouseIds);
  }

  // 客户维度
  if (dataScope.customerIds && dataScope.customerIds.length > 0 && options?.customerField) {
    const custPlaceholders = dataScope.customerIds.map(() => '?').join(',');
    conditions.push(`${tableAlias}.${options.customerField} IN (${custPlaceholders})`);
    params.push(...dataScope.customerIds);
  }

  // 供应商维度
  if (dataScope.supplierIds && dataScope.supplierIds.length > 0 && options?.supplierField) {
    const supPlaceholders = dataScope.supplierIds.map(() => '?').join(',');
    conditions.push(`${tableAlias}.${options.supplierField} IN (${supPlaceholders})`);
    params.push(...dataScope.supplierIds);
  }

  if (conditions.length === 0) {
    return { sql: '', params: [] };
  }

  return {
    sql: ` AND ${conditions.join(' AND ')}`,
    params,
  };
}

// 验证资源访问权限（防止横向越权）
export async function validateResourceAccess(
  userInfo: UserInfo,
  resourceType: 'order' | 'workorder' | 'inbound' | 'outbound',
  resourceId: string | number
): Promise<boolean> {
  let sql = '';
  let params: unknown[] = [];

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

  const results = await query<ResourceRow>(sql, params);
  if (!results || results.length === 0) {
    return false;
  }

  const resource = results[0];

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
    return (
      resource.department_id === userInfo.departmentId || resource.create_by === userInfo.userId
    );
  }

  return false;
}
