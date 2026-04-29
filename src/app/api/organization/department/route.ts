import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 部门数据接口
interface Department {
  id?: number;
  dept_code: string;
  dept_name: string;
  parent_id?: number;
  leader_id?: number;
  leader_name?: string;
  sort_order?: number;
  description?: string;
  status?: number;
  create_time?: string;
  update_time?: string;
}

// 构建查询条件
function buildQueryConditions(params: {
  keyword: string;
  status: string | null;
}): { sql: string; values: any[] } {
  let sql = `
    SELECT
      id, dept_code, dept_name, parent_id, leader_id, leader_name,
      sort_order, description, status, create_time, update_time
    FROM sys_department
    WHERE deleted = 0
  `;
  const values: any[] = [];

  if (params.keyword) {
    sql += ' AND (dept_name LIKE ? OR dept_code LIKE ?)';
    const likeKeyword = `%${params.keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  if (params.status !== undefined && params.status !== null && params.status !== '') {
    sql += ' AND status = ?';
    values.push(parseInt(params.status));
  }

  sql += ' ORDER BY sort_order ASC, id ASC';

  return { sql, values };
}

// GET - 获取部门列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');

  const { sql, values } = buildQueryConditions({
    keyword,
    status,
  });

  const departments = await query<Department>(sql, values);

  return successResponse(departments);
}, '获取部门列表失败');

// POST - 创建部门
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: Department = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['dept_code', 'dept_name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查编码是否已存在
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM sys_department WHERE dept_code = ? AND deleted = 0',
    [body.dept_code]
  );

  if (existing) {
    return errorResponse('部门编码已存在', 409, 409);
  }

  const result = await execute(
    `INSERT INTO sys_department (dept_code, dept_name, parent_id, leader_name, sort_order, status, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      body.dept_code,
      body.dept_name,
      body.parent_id ?? 0,
      body.leader_name ?? null,
      body.sort_order ?? 0,
      body.status ?? 1,
      body.description ?? null,
    ]
  );

  return successResponse({ id: result.insertId }, '部门创建成功');
}, '创建部门失败');

// PUT - 更新部门
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body: Department = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('部门ID不能为空');
  }

  // 验证必填字段
  const validation = validateRequestBody(body, ['dept_code', 'dept_name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查部门是否存在
  const existingDept = await queryOne<{ id: number }>(
    'SELECT id FROM sys_department WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!existingDept) {
    return commonErrors.notFound('部门不存在');
  }

  // 检查编码是否已被其他部门使用
  const codeExists = await queryOne<{ id: number }>(
    'SELECT id FROM sys_department WHERE dept_code = ? AND id != ? AND deleted = 0',
    [body.dept_code, id]
  );

  if (codeExists) {
    return errorResponse('部门编码已存在', 409, 409);
  }

  const result = await execute(
    `UPDATE sys_department SET
      dept_code = ?,
      dept_name = ?,
      parent_id = ?,
      leader_name = ?,
      sort_order = ?,
      status = ?,
      description = ?
    WHERE id = ? AND deleted = 0`,
    [
      body.dept_code,
      body.dept_name,
      body.parent_id ?? 0,
      body.leader_name ?? null,
      body.sort_order ?? 0,
      body.status ?? 1,
      body.description ?? null,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('部门不存在');
  }

  return successResponse(null, '部门更新成功');
}, '更新部门失败');

// DELETE - 删除部门（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('部门ID不能为空');
  }

  const deptId = parseInt(id);

  // 检查部门是否存在
  const existingDept = await queryOne<{ id: number }>(
    'SELECT id FROM sys_department WHERE id = ? AND deleted = 0',
    [deptId]
  );

  if (!existingDept) {
    return commonErrors.notFound('部门不存在');
  }

  // 检查是否有子部门
  const hasChildren = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM sys_department WHERE parent_id = ? AND deleted = 0',
    [deptId]
  );

  if (hasChildren && hasChildren.count > 0) {
    return errorResponse('该部门下有子部门，无法删除', 409, 409);
  }

  // 检查是否有员工
  const hasEmployees = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM sys_employee WHERE dept_id = ? AND deleted = 0',
    [deptId]
  );

  if (hasEmployees && hasEmployees.count > 0) {
    return errorResponse('该部门下有员工，无法删除', 409, 409);
  }

  await execute('UPDATE sys_department SET deleted = 1 WHERE id = ?', [deptId]);

  return successResponse(null, '部门删除成功');
}, '删除部门失败');
