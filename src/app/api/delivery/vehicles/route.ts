import { NextRequest } from 'next/server';
import { query, execute, queryOne, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 车辆数据接口
interface Vehicle {
  id?: number;
  vehicle_no: string;
  vehicle_type: string;
  brand?: string;
  model?: string;
  color?: string;
  engine_no?: string;
  frame_no?: string;
  buy_date?: string;
  mileage?: number;
  fuel_type?: string;
  capacity?: number;
  status: number;
  driver_id?: number;
  driver_name?: string;
  driver_phone?: string;
  insurance_expire?: string;
  annual_inspect_expire?: string;
  remark?: string;
  create_time?: string;
  update_time?: string;
}

// 构建查询条件
function buildQueryConditions(params: {
  status: string | null;
  keyword: string | null;
}): { sql: string; countSql: string; values: any[] } {
  let sql = `SELECT * FROM delivery_vehicle WHERE deleted = 0`;
  let countSql = `SELECT COUNT(*) as total FROM delivery_vehicle WHERE deleted = 0`;
  const values: any[] = [];

  if (params.status && params.status !== 'all') {
    const condition = ' AND status = ?';
    sql += condition;
    countSql += condition;
    values.push(parseInt(params.status));
  }

  if (params.keyword) {
    const condition = ' AND (vehicle_no LIKE ? OR brand LIKE ? OR driver_name LIKE ?)';
    sql += condition;
    countSql += condition;
    const likeKeyword = `%${params.keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword);
  }

  sql += ' ORDER BY create_time DESC';

  return { sql, countSql, values };
}

// GET - 获取车辆列表或单个车辆
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 查询单个车辆
  if (id) {
    const vehicle = await queryOne<Vehicle>(
      'SELECT * FROM delivery_vehicle WHERE id = ? AND deleted = 0',
      [parseInt(id)]
    );

    if (!vehicle) {
      return commonErrors.notFound('车辆不存在');
    }

    return successResponse(vehicle);
  }

  // 构建查询条件
  const { sql, countSql, values } = buildQueryConditions({
    status,
    keyword,
  });

  // 使用分页查询工具
  const result = await queryPaginated<Vehicle>(sql, countSql, values, {
    page,
    pageSize,
  });

  return paginatedResponse(result.data, result.pagination);
}, '获取车辆列表失败');

// POST - 创建车辆
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: Vehicle = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['vehicle_no', 'vehicle_type']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查车牌号是否已存在
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM delivery_vehicle WHERE vehicle_no = ? AND deleted = 0',
    [body.vehicle_no]
  );

  if (existing) {
    return errorResponse('车牌号已存在', 409, 409);
  }

  const result = await execute(
    `INSERT INTO delivery_vehicle (
      vehicle_no, vehicle_type, brand, model, color, engine_no, frame_no,
      buy_date, mileage, fuel_type, capacity, status, driver_id, driver_name,
      driver_phone, insurance_expire, annual_inspect_expire, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.vehicle_no,
      body.vehicle_type,
      body.brand ?? null,
      body.model ?? null,
      body.color ?? null,
      body.engine_no ?? null,
      body.frame_no ?? null,
      body.buy_date ?? null,
      body.mileage ?? 0,
      body.fuel_type ?? null,
      body.capacity ?? null,
      body.status ?? 1,
      body.driver_id ?? null,
      body.driver_name ?? null,
      body.driver_phone ?? null,
      body.insurance_expire ?? null,
      body.annual_inspect_expire ?? null,
      body.remark ?? null,
    ]
  );

  return successResponse({ id: result.insertId }, '车辆创建成功');
}, '创建车辆失败');

// PUT - 更新车辆
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('缺少车辆ID');
  }

  const body: Vehicle = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['vehicle_no', 'vehicle_type']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  const vehicleId = parseInt(id);

  // 检查车辆是否存在
  const existingVehicle = await queryOne<{ id: number }>(
    'SELECT id FROM delivery_vehicle WHERE id = ? AND deleted = 0',
    [vehicleId]
  );

  if (!existingVehicle) {
    return commonErrors.notFound('车辆不存在');
  }

  // 检查车牌号是否已被其他车辆使用
  const codeExists = await queryOne<{ id: number }>(
    'SELECT id FROM delivery_vehicle WHERE vehicle_no = ? AND id != ? AND deleted = 0',
    [body.vehicle_no, vehicleId]
  );

  if (codeExists) {
    return errorResponse('车牌号已存在', 409, 409);
  }

  const result = await execute(
    `UPDATE delivery_vehicle SET
      vehicle_no = ?, vehicle_type = ?, brand = ?, model = ?, color = ?,
      engine_no = ?, frame_no = ?, buy_date = ?, mileage = ?, fuel_type = ?,
      capacity = ?, status = ?, driver_id = ?, driver_name = ?, driver_phone = ?,
      insurance_expire = ?, annual_inspect_expire = ?, remark = ?
    WHERE id = ? AND deleted = 0`,
    [
      body.vehicle_no,
      body.vehicle_type,
      body.brand ?? null,
      body.model ?? null,
      body.color ?? null,
      body.engine_no ?? null,
      body.frame_no ?? null,
      body.buy_date ?? null,
      body.mileage ?? 0,
      body.fuel_type ?? null,
      body.capacity ?? null,
      body.status ?? 1,
      body.driver_id ?? null,
      body.driver_name ?? null,
      body.driver_phone ?? null,
      body.insurance_expire ?? null,
      body.annual_inspect_expire ?? null,
      body.remark ?? null,
      vehicleId,
    ]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('车辆不存在');
  }

  return successResponse(null, '车辆更新成功');
}, '更新车辆失败');

// DELETE - 删除车辆（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('缺少车辆ID');
  }

  const vehicleId = parseInt(id);

  // 检查车辆是否存在
  const existingVehicle = await queryOne<{ id: number }>(
    'SELECT id FROM delivery_vehicle WHERE id = ? AND deleted = 0',
    [vehicleId]
  );

  if (!existingVehicle) {
    return commonErrors.notFound('车辆不存在');
  }

  // 软删除
  await execute(
    'UPDATE delivery_vehicle SET deleted = 1 WHERE id = ?',
    [vehicleId]
  );

  return successResponse(null, '车辆删除成功');
}, '删除车辆失败');
