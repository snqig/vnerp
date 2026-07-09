import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

interface Department {
  id?: number;
  dept_code: string;
  dept_name: string;
  parent_id?: number;
  leader_id?: number;
  sort_order?: number;
  status?: number;
  create_time?: string;
  update_time?: string;
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let where = 'WHERE deleted = 0';
  const values: any[] = [];

  if (keyword) {
    where += ' AND (dept_name LIKE ? OR dept_code LIKE ?)';
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status !== undefined && status !== null && status !== '') {
    where += ' AND status = ?';
    values.push(parseInt(status));
  }

  const countResult = await query(`SELECT COUNT(*) as total FROM sys_department ${where}`, values);
  const total = (countResult as any[])[0]?.total || 0;

  const departments = await query<Department>(
    `SELECT id, dept_code, dept_name, parent_id, leader_id, sort_order, status, phone, email, create_time, update_time FROM sys_department ${where} ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?`,
    [...values, pageSize, (page - 1) * pageSize]
  );

  return successResponse({
    list: departments,
    total,
    page,
    pageSize,
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body: Department = await request.json();

    const validation = validateRequestBody(body, ['dept_code', 'dept_name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM sys_department WHERE dept_code = ? AND deleted = 0',
      [body.dept_code]
    );

    if (existing) {
      return errorResponse('部门编码已存在', 409, 409);
    }

    const result = await execute(
      `INSERT INTO sys_department (dept_code, dept_name, parent_id, leader_id, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.dept_code,
        body.dept_name,
        body.parent_id ?? 0,
        body.leader_id ?? null,
        body.sort_order ?? 0,
        body.status ?? 1,
      ]
    );

    return successResponse({ id: result.insertId }, '部门创建成功');
  },
  { logTitle: '创建部门' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body: Department = await request.json();
    const { id } = body;

    if (!id) {
      return commonErrors.badRequest('部门ID不能为空');
    }

    const validation = validateRequestBody(body, ['dept_code', 'dept_name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const existingDept = await queryOne<{ id: number }>(
      'SELECT id FROM sys_department WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!existingDept) {
      return commonErrors.notFound('部门不存在');
    }

    const codeExists = await queryOne<{ id: number }>(
      'SELECT id FROM sys_department WHERE dept_code = ? AND id != ? AND deleted = 0',
      [body.dept_code, id]
    );

    if (codeExists) {
      return errorResponse('部门编码已存在', 409, 409);
    }

    const result = await execute(
      `UPDATE sys_department SET dept_code = ?, dept_name = ?, parent_id = ?, leader_id = ?, sort_order = ?, status = ? WHERE id = ? AND deleted = 0`,
      [
        body.dept_code,
        body.dept_name,
        body.parent_id ?? 0,
        body.leader_id ?? null,
        body.sort_order ?? 0,
        body.status ?? 1,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return commonErrors.notFound('部门不存在');
    }

    return successResponse(null, '部门更新成功');
  },
  { logTitle: '更新部门' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest('部门ID不能为空');
    }

    const deptId = parseInt(id);

    const existingDept = await queryOne<{ id: number }>(
      'SELECT id FROM sys_department WHERE id = ? AND deleted = 0',
      [deptId]
    );

    if (!existingDept) {
      return commonErrors.notFound('部门不存在');
    }

    const hasChildren = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM sys_department WHERE parent_id = ? AND deleted = 0',
      [deptId]
    );

    if (hasChildren && hasChildren.count > 0) {
      return errorResponse('该部门下有子部门，无法删除', 409, 409);
    }

    const hasEmployees = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM sys_employee WHERE dept_id = ?',
      [deptId]
    );

    if (hasEmployees && hasEmployees.count > 0) {
      return errorResponse('该部门下有员工，无法删除', 409, 409);
    }

    await execute('UPDATE sys_department SET deleted = 1 WHERE id = ?', [deptId]);

    return successResponse(null, '部门删除成功');
  },
  { logTitle: '删除部门' }
);
