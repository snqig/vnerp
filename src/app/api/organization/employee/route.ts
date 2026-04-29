import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 员工数据接口
interface Employee {
  id?: number;
  employee_no: string;
  name: string;
  gender?: number;
  age?: number;
  id_card?: string;
  phone?: string;
  email?: string;
  dept_id?: number;
  dept_name?: string;
  section?: string;
  role_id?: number;
  role_name?: string;
  position?: string;
  entry_date?: string;
  birth_date?: string;
  native_place?: string;
  home_address?: string;
  current_address?: string;
  birth_month?: string;
  id_card_expiry?: string;
  education?: string;
  remark?: string;
  status?: number;
  photo?: string;
  create_time?: string;
  update_time?: string;
}

// 构建查询条件
function buildQueryConditions(params: {
  keyword?: string;
  dept_id?: string;
  role_id?: string;
  status?: string;
}): { sql: string; countSql: string; values: any[] } {
  let sql = 'SELECT * FROM sys_employee WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM sys_employee WHERE 1=1';
  const values: any[] = [];

  if (params.keyword) {
    const condition = ' AND (name LIKE ? OR employee_no LIKE ? OR phone LIKE ?)';
    sql += condition;
    countSql += condition;
    const likeKeyword = `%${params.keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword);
  }

  if (params.dept_id) {
    const condition = ' AND dept_id = ?';
    sql += condition;
    countSql += condition;
    values.push(parseInt(params.dept_id));
  }

  if (params.role_id) {
    const condition = ' AND role_id = ?';
    sql += condition;
    countSql += condition;
    values.push(parseInt(params.role_id));
  }

  if (params.status !== undefined && params.status !== null && params.status !== '') {
    const condition = ' AND status = ?';
    sql += condition;
    countSql += condition;
    values.push(parseInt(params.status));
  }

  sql += ' ORDER BY id DESC';

  return { sql, countSql, values };
}

// GET - 获取员工列表或单个员工
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const keyword = searchParams.get('keyword') || '';
  const dept_id = searchParams.get('dept_id');
  const role_id = searchParams.get('role_id');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 查询单个员工
  if (id) {
    const employee = await queryOne<Employee>(
      'SELECT * FROM sys_employee WHERE id = ?',
      [parseInt(id)]
    );

    if (!employee) {
      return commonErrors.notFound('员工不存在');
    }

    return successResponse(employee);
  }

  // 构建查询条件
  const { sql, countSql, values } = buildQueryConditions({
    keyword: keyword || undefined,
    dept_id: dept_id ?? undefined,
    role_id: role_id ?? undefined,
    status: status ?? undefined,
  });

  // 使用分页查询工具
  const result = await queryPaginated<Employee>(sql, countSql, values, {
    page,
    pageSize,
  });

  return paginatedResponse(result.data, result.pagination);
}, '获取员工列表失败');

// POST - 创建员工
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: Employee = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['employee_no', 'name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查员工编号是否已存在
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM sys_employee WHERE employee_no = ?',
    [body.employee_no]
  );

  if (existing) {
    return errorResponse('员工编号已存在', 409, 409);
  }

  const result = await execute(
    `INSERT INTO sys_employee (
      employee_no, name, gender, age, id_card, phone, email,
      dept_id, dept_name, section, role_id, role_name, position, entry_date,
      birth_date, native_place, home_address, current_address, birth_month, id_card_expiry, education, remark, status, photo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.employee_no,
      body.name,
      body.gender ?? 1,
      body.age ?? null,
      body.id_card ?? null,
      body.phone ?? null,
      body.email ?? null,
      body.dept_id ?? null,
      body.dept_name ?? null,
      body.section ?? null,
      body.role_id ?? null,
      body.role_name ?? null,
      body.position ?? null,
      body.entry_date ?? null,
      body.birth_date ?? null,
      body.native_place ?? null,
      body.home_address ?? null,
      body.current_address ?? null,
      body.birth_month ?? null,
      body.id_card_expiry ?? null,
      body.education ?? null,
      body.remark ?? null,
      body.status ?? 1,
      body.photo ?? null,
    ]
  );

  return successResponse({ id: result.insertId }, '员工创建成功');
}, '创建员工失败');

// PUT - 更新员工
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body: Employee = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('员工ID不能为空');
  }

  // 验证必填字段
  const validation = validateRequestBody(body, ['employee_no', 'name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查员工是否存在
  const existingEmployee = await queryOne<{ id: number }>(
    'SELECT id FROM sys_employee WHERE id = ?',
    [id]
  );

  if (!existingEmployee) {
    return commonErrors.notFound('员工不存在');
  }

  // 检查员工编号是否已被其他员工使用
  const codeExists = await queryOne<{ id: number }>(
    'SELECT id FROM sys_employee WHERE employee_no = ? AND id != ?',
    [body.employee_no, id]
  );

  if (codeExists) {
    return errorResponse('员工编号已存在', 409, 409);
  }

  const result = await execute(
    `UPDATE sys_employee SET
      employee_no = ?,
      name = ?,
      gender = ?,
      age = ?,
      id_card = ?,
      phone = ?,
      email = ?,
      dept_id = ?,
      dept_name = ?,
      section = ?,
      role_id = ?,
      role_name = ?,
      position = ?,
      entry_date = ?,
      birth_date = ?,
      native_place = ?,
      home_address = ?,
      current_address = ?,
      birth_month = ?,
      id_card_expiry = ?,
      education = ?,
      remark = ?,
      status = ?,
      photo = ?
    WHERE id = ?`,
    [
      body.employee_no,
      body.name,
      body.gender ?? 1,
      body.age ?? null,
      body.id_card ?? null,
      body.phone ?? null,
      body.email ?? null,
      body.dept_id ?? null,
      body.dept_name ?? null,
      body.section ?? null,
      body.role_id ?? null,
      body.role_name ?? null,
      body.position ?? null,
      body.entry_date ?? null,
      body.birth_date ?? null,
      body.native_place ?? null,
      body.home_address ?? null,
      body.current_address ?? null,
      body.birth_month ?? null,
      body.id_card_expiry ?? null,
      body.education ?? null,
      body.remark ?? null,
      body.status,
      body.photo ?? null,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('员工不存在');
  }

  return successResponse(null, '员工更新成功');
}, '更新员工失败');

// DELETE - 删除员工（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('员工ID不能为空');
  }

  const employeeId = parseInt(id);

  // 检查员工是否存在
  const existingEmployee = await queryOne<{ id: number }>(
    'SELECT id FROM sys_employee WHERE id = ?',
    [employeeId]
  );

  if (!existingEmployee) {
    return commonErrors.notFound('员工不存在');
  }

  // 使用事务软删除
  await transaction(async (connection) => {
    await connection.execute(
      'UPDATE sys_employee SET status = 0 WHERE id = ?',
      [employeeId]
    );
  });

  return successResponse(null, '员工删除成功');
}, '删除员工失败');
