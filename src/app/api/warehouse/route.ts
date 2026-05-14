import { NextRequest } from 'next/server';
import mysql from 'mysql2/promise';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
  logOperation,
} from '@/lib/api-response';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';

// 仓库类型映射
const warehouseTypeMap: { [key: string]: number } = {
  raw: 1,
  finished: 2,
  semi: 3,
  scrap: 4,
  other: 5,
};

const warehouseTypeReverseMap: { [key: number]: string } = {
  1: 'raw',
  2: 'finished',
  3: 'semi',
  4: 'scrap',
  5: 'other',
};

// 仓库数据接口
interface Warehouse {
  id?: number;
  code: string;
  name: string;
  type: string;
  address?: string;
  remark?: string;
  status: string | number;
  createTime?: string;
  updateTime?: string;
}

// 构建查询条件
function buildQueryConditions(params: {
  keyword?: string;
  type?: string;
  status?: string;
  categoryId?: string;
}): { sql: string; values: any[] } {
  let sql = `
    SELECT
      id,
      warehouse_code as code,
      warehouse_name as name,
      warehouse_type,
      address,
      remark,
      status,
      create_time as createTime,
      update_time as updateTime
    FROM inv_warehouse
    WHERE deleted = 0
  `;
  const values: any[] = [];

  if (params.keyword) {
    sql += ` AND (warehouse_code LIKE ? OR warehouse_name LIKE ?)`;
    const likeKeyword = `%${params.keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  if (params.type) {
    sql += ` AND warehouse_type = ?`;
    values.push(warehouseTypeMap[params.type] || 1);
  }

  if (params.categoryId) {
    sql += ` AND category_id = ?`;
    values.push(parseInt(params.categoryId));
  }

  if (params.status !== undefined && params.status !== '') {
    const statusNum = parseInt(params.status);
    if (!isNaN(statusNum)) {
      sql += ` AND status = ?`;
      values.push(statusNum);
    } else if (params.status === 'active') {
      sql += ` AND status = 1`;
    } else if (params.status === 'inactive') {
      sql += ` AND status = 0`;
    }
  }

  sql += ` ORDER BY create_time DESC`;

  return { sql, values };
}

// 格式化仓库数据
function formatWarehouse(warehouse: any): Warehouse {
  return {
    ...warehouse,
    type: warehouseTypeReverseMap[warehouse.warehouse_type] || 'other',
    status: warehouse.status === 1 ? 'active' : 'inactive',
  };
}

export const GET = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const categoryId = searchParams.get('category_id') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const { sql, values } = buildQueryConditions({
      keyword,
      type,
      status,
      categoryId,
    });

    let countSql = `SELECT COUNT(*) as total FROM inv_warehouse WHERE deleted = 0`;
    const countValues: any[] = [];
    if (keyword) {
      countSql += ` AND (warehouse_code LIKE ? OR warehouse_name LIKE ?)`;
      countValues.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (type) {
      countSql += ` AND warehouse_type = ?`;
      countValues.push(warehouseTypeMap[type] || 1);
    }
    if (status !== undefined && status !== '') {
      const statusNum = parseInt(status);
      if (!isNaN(statusNum)) {
        countSql += ` AND status = ?`;
        countValues.push(statusNum);
      } else if (status === 'active') {
        countSql += ` AND status = 1`;
      } else if (status === 'inactive') {
        countSql += ` AND status = 0`;
      }
    }

    const countResult = await query(countSql, countValues);
    const total = (countResult as any[])[0]?.total || 0;

    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const paginatedValues = [...values, pageSize, (page - 1) * pageSize];

    const warehouses = await query(paginatedSql, paginatedValues);
    const formattedWarehouses = (warehouses as any[]).map(formatWarehouse);

    return successResponse({
      list: formattedWarehouses,
      total,
      page,
      pageSize,
    });
  },
  { errorMessage: '获取仓库列表失败' }
);

// POST - 创建仓库
export const POST = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body: Warehouse = await request.json();

    // 验证必填字段
    const validation = validateRequestBody(body, ['code', 'name', 'type']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    // 检查编码是否已存在
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM inv_warehouse WHERE warehouse_code = ? AND deleted = 0',
      [body.code]
    );

    if (existing) {
      return errorResponse('仓库编码已存在', 409, 409);
    }

    // 使用事务创建仓库并记录日志
    const result = await transaction(async (connection) => {
      const [insertResult] = await (connection as any).execute(
        `INSERT INTO inv_warehouse (
          warehouse_code, warehouse_name, warehouse_type,
          address, remark, status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          body.code,
          body.name,
          warehouseTypeMap[body.type] || 5,
          body.address,
          body.remark,
          body.status === 'active' ? 1 : 0,
        ]
      );

      const warehouseId = (insertResult as mysql.ResultSetHeader).insertId;

      // 记录操作日志
      await connection.execute(
        `INSERT INTO inv_warehouse_log (warehouse_id, operation_type, operation_content)
       VALUES (?, 'create', ?)`,
        [warehouseId, `创建仓库: ${body.name}`]
      );

      return { id: warehouseId };
    });

    await logOperation({
      title: '创建仓库',
      oper_type: 'warehouse',
      oper_method: 'POST',
      oper_url: '/api/warehouse',
      oper_param: JSON.stringify({ code: body.code, name: body.name, type: body.type }),
      oper_result: `仓库 ${body.name} 创建成功`,
      status: 1,
    });

    return successResponse(result, '仓库创建成功');
  },
  { errorMessage: '创建仓库失败' }
);

// PUT - 更新仓库
export const PUT = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body: Warehouse = await request.json();
    const { id } = body;

    if (!id) {
      return commonErrors.badRequest('仓库ID不能为空');
    }

    // 验证必填字段
    const validation = validateRequestBody(body, ['code', 'name', 'type']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    // 检查编码是否被其他仓库使用
    const codeExists = await queryOne<{ id: number }>(
      'SELECT id FROM inv_warehouse WHERE warehouse_code = ? AND id != ? AND deleted = 0',
      [body.code, id]
    );

    if (codeExists) {
      return errorResponse('仓库编码已存在', 409, 409);
    }

    // 使用事务更新仓库并记录日志
    await transaction(async (connection) => {
      const [updateResult] = await (connection as any).execute(
        `UPDATE inv_warehouse SET
        warehouse_code = ?,
        warehouse_name = ?,
        warehouse_type = ?,
        address = ?,
        remark = ?,
        status = ?
      WHERE id = ? AND deleted = 0`,
        [
          body.code,
          body.name,
          warehouseTypeMap[body.type] || 5,
          body.address,
          body.remark,
          body.status === 'active' ? 1 : 0,
          id,
        ]
      );

      if ((updateResult as mysql.ResultSetHeader).affectedRows === 0) {
        throw new Error('仓库不存在或已被删除');
      }

      // 记录操作日志
      await connection.execute(
        `INSERT INTO inv_warehouse_log (warehouse_id, operation_type, operation_content)
       VALUES (?, 'update', ?)`,
        [id, `更新仓库: ${body.name}`]
      );
    });

    await logOperation({
      title: '更新仓库',
      oper_type: 'warehouse',
      oper_method: 'PUT',
      oper_url: '/api/warehouse',
      oper_param: JSON.stringify({ id, code: body.code, name: body.name, type: body.type }),
      oper_result: `仓库 ${body.name} 更新成功`,
      status: 1,
    });

    return successResponse(null, '仓库更新成功');
  },
  { errorMessage: '更新仓库失败' }
);

// DELETE - 删除仓库（软删除）
export const DELETE = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest('仓库ID不能为空');
    }

    const warehouseId = parseInt(id);

    // 使用事务软删除并记录日志
    const warehouseName = await transaction(async (connection) => {
      const [rows] = await connection.query(
        'SELECT warehouse_name as name FROM inv_warehouse WHERE id = ? AND deleted = 0',
        [warehouseId]
      );

      if ((rows as any[]).length === 0) {
        throw new Error('仓库不存在或已被删除');
      }

      const name = (rows as any[])[0].name;

      await connection.execute('UPDATE inv_warehouse SET deleted = 1 WHERE id = ?', [warehouseId]);

      await connection.execute(
        `INSERT INTO inv_warehouse_log (warehouse_id, operation_type, operation_content)
       VALUES (?, 'delete', ?)`,
        [warehouseId, `删除仓库: ${name}`]
      );

      return name;
    });

    await logOperation({
      title: '删除仓库',
      oper_type: 'warehouse',
      oper_method: 'DELETE',
      oper_url: '/api/warehouse',
      oper_param: JSON.stringify({ id: warehouseId }),
      oper_result: `仓库 ${warehouseName} 删除成功`,
      status: 1,
    });

    return successResponse(null, '仓库删除成功');
  },
  { errorMessage: '删除仓库失败' }
);
