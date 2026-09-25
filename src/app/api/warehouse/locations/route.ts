import { NextRequest } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { numericFilter } from '@/lib/query-filter';

/**
 * 库位管理 CRUD API
 * GET /api/warehouse/locations - 列表（支持分页 + 仓库筛选）
 * POST /api/warehouse/locations - 新增
 */
export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const warehouseId = numericFilter(searchParams.get('warehouseId'));
    const keyword = searchParams.get('keyword') || '';
    const status = numericFilter(searchParams.get('status'));

    let where = 'WHERE l.deleted = 0';
    const params: SqlValue[] = [];

    if (warehouseId) {
      where += ' AND l.warehouse_id = ?';
      params.push(Number(warehouseId));
    }
    if (keyword) {
      where += ' AND (l.location_code LIKE ? OR l.location_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      where += ' AND l.status = ?';
      params.push(Number(status));
    }

    const countRows = await query(`SELECT COUNT(*) as total FROM inv_location l ${where}`, params);
    const total = countRows[0]?.total || 0;

    const rows = await query(
      `SELECT l.*, w.warehouse_name
       FROM inv_location l
       LEFT JOIN inv_warehouse w ON l.warehouse_id = w.id
       ${where}
       ORDER BY l.warehouse_id, l.location_code
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  },
  { errorMessage: '获取库位列表失败' }
);

export const POST = withPermission(
  async (request: NextRequest, _user: UserInfo) => {
    const body = await request.json();
    const { location_code, location_name, warehouse_id, zone, row_no, column_no, layer_no, location_type, remark } = body;

    if (!location_code || !location_name || !warehouse_id) {
      return errorResponse('库位编码、名称和仓库不能为空', 400, 400);
    }

    // 检查编码唯一性
    const exist = await query('SELECT id FROM inv_location WHERE location_code = ? AND deleted = 0', [location_code]);
    if ((exist as unknown[]).length > 0) {
      return errorResponse('库位编码已存在', 400, 400);
    }

    const result = await execute(
      `INSERT INTO inv_location (location_code, location_name, warehouse_id, zone, row_no, column_no, layer_no, location_type, status, remark, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
      [location_code, location_name, warehouse_id, zone || null, row_no || null, column_no || null, layer_no || null, location_type || 1, remark || null]
    );

    return successResponse({ id: result.insertId }, '库位创建成功');
  },
  { errorMessage: '创建库位失败' }
);
