import { NextRequest } from 'next/server';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/) !== null;
}

function isValidTime(timeStr: string): boolean {
  if (!timeStr) return false;
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
}

function isValidStatus(status: string): boolean {
  return ['normal', 'late', 'absent', 'leave'].includes(status);
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  try {
    await query('SELECT 1 FROM hr_attendance LIMIT 1');
  } catch {
    return paginatedResponse([], { page, pageSize, total: 0, totalPages: 0 });
  }

  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const department = searchParams.get('department') || '';

  let sql = `
    SELECT
      a.id,
      a.attendance_date as attendanceDate,
      a.employee_id as employeeId,
      a.employee_name as employeeName,
      a.department_name as departmentName,
      a.check_in_time as checkInTime,
      a.check_out_time as checkOutTime,
      a.status,
      a.working_hours as workingHours,
      a.overtime_hours as overtimeHours,
      a.remark,
      a.create_time as createTime
    FROM hr_attendance a
    WHERE a.deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM hr_attendance a WHERE a.deleted = 0`;
  const params: any[] = [];

  if (keyword) {
    const keywordCondition = ` AND (a.employee_name LIKE ? OR a.employee_id LIKE ? OR a.department_name LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    sql += ` AND a.status = ?`;
    countSql += ` AND a.status = ?`;
    params.push(status);
  }

  if (department) {
    sql += ` AND a.department_name = ?`;
    countSql += ` AND a.department_name = ?`;
    params.push(department);
  }

  if (startDate) {
    sql += ` AND a.attendance_date >= ?`;
    countSql += ` AND a.attendance_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND a.attendance_date <= ?`;
    countSql += ` AND a.attendance_date <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY a.attendance_date DESC, a.employee_name ASC`;

  const result = await queryPaginated(sql, countSql, params, { page, pageSize });

  return paginatedResponse(result.data, result.pagination);
});

// 创建考勤记录
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'attendanceDate',
    'employeeId',
    'employeeName',
    'departmentName',
    'checkInTime',
    'checkOutTime',
    'status',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    attendanceDate,
    employeeId,
    employeeName,
    departmentName,
    checkInTime,
    checkOutTime,
    status,
    workingHours,
    overtimeHours,
    remark,
  } = body;

  if (!isValidDate(attendanceDate)) {
    return errorResponse('考勤日期格式不正确，应为 YYYY-MM-DD', 400, 400);
  }

  if (!isValidTime(checkInTime)) {
    return errorResponse('上班时间格式不正确，应为 HH:mm', 400, 400);
  }

  if (!isValidTime(checkOutTime)) {
    return errorResponse('下班时间格式不正确，应为 HH:mm', 400, 400);
  }

  if (!isValidStatus(status)) {
    return errorResponse('考勤状态值不正确，应为 normal/late/absent/leave', 400, 400);
  }

  // 计算工作时长（如果未提供）
  let calculatedWorkingHours = workingHours;
  if (!calculatedWorkingHours && checkInTime && checkOutTime) {
    const checkIn = new Date(`${attendanceDate} ${checkInTime}`);
    const checkOut = new Date(`${attendanceDate} ${checkOutTime}`);
    if (checkOut < checkIn) {
      // 跨天情况
      checkOut.setDate(checkOut.getDate() + 1);
    }
    calculatedWorkingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  }

  // 插入考勤记录
  const result = await execute(
    `INSERT INTO hr_attendance (
      attendance_date, employee_id, employee_name,
      department_name, check_in_time, check_out_time,
      status, working_hours, overtime_hours, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attendanceDate,
      employeeId,
      employeeName,
      departmentName,
      checkInTime,
      checkOutTime,
      status,
      calculatedWorkingHours,
      overtimeHours || 0,
      remark,
    ]
  );

  return successResponse({ id: result.insertId }, '考勤记录创建成功');
}, '创建考勤记录失败');

// 更新考勤记录
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return commonErrors.badRequest('考勤记录ID不能为空');
  }

  // 检查考勤记录是否存在
  const [attendance] = await query<{ id: number }>(
    'SELECT id FROM hr_attendance WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!attendance) {
    return commonErrors.notFound('考勤记录不存在');
  }

  // 计算工作时长（如果未提供）
  let calculatedWorkingHours = updateData.workingHours;
  if (!calculatedWorkingHours && updateData.checkInTime && updateData.checkOutTime) {
    const checkIn = new Date(`${updateData.attendanceDate} ${updateData.checkInTime}`);
    const checkOut = new Date(`${updateData.attendanceDate} ${updateData.checkOutTime}`);
    if (checkOut < checkIn) {
      // 跨天情况
      checkOut.setDate(checkOut.getDate() + 1);
    }
    calculatedWorkingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  }

  await execute(
    `UPDATE hr_attendance SET
      attendance_date = ?,
      employee_id = ?,
      employee_name = ?,
      department_name = ?,
      check_in_time = ?,
      check_out_time = ?,
      status = ?,
      working_hours = ?,
      overtime_hours = ?,
      remark = ?
    WHERE id = ?`,
    [
      updateData.attendanceDate,
      updateData.employeeId,
      updateData.employeeName,
      updateData.departmentName,
      updateData.checkInTime,
      updateData.checkOutTime,
      updateData.status,
      calculatedWorkingHours,
      updateData.overtimeHours || 0,
      updateData.remark,
      id,
    ]
  );

  return successResponse(null, '考勤记录更新成功');
}, '更新考勤记录失败');

// 删除考勤记录（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('考勤记录ID不能为空');
  }

  // 检查考勤记录是否存在
  const [attendance] = await query<{ id: number }>(
    'SELECT id FROM hr_attendance WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!attendance) {
    return commonErrors.notFound('考勤记录不存在');
  }

  await execute(
    'UPDATE hr_attendance SET deleted = 1 WHERE id = ?',
    [id]
  );

  return successResponse(null, '考勤记录删除成功');
}, '删除考勤记录失败');
