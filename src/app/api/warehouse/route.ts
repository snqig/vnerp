import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import mysql from 'mysql2/promise';
import { query, queryOne, transaction, SqlValue } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
  logOperation,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import type { DbRow } from '@/types/db';

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
  nature?: string;
  includeInCalculation?: boolean;
  capacity?: number;
  usedCapacity?: number;
  manager?: string;
  managerId?: number;
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
}): { sql: string; values: DbRow[] } {
  let sql = `
    SELECT
      inv_warehouse.id,
      inv_warehouse.warehouse_code as code,
      inv_warehouse.warehouse_name as name,
      inv_warehouse.warehouse_type,
      inv_warehouse.category_id,
      inv_warehouse.address,
      inv_warehouse.remark,
      inv_warehouse.status,
      inv_warehouse.nature,
      inv_warehouse.include_in_calculation,
      inv_warehouse.capacity,
      inv_warehouse.used_capacity,
      inv_warehouse.manager_id,
      mu.real_name as manager,
      inv_warehouse.create_time as createTime,
      inv_warehouse.update_time as updateTime
    FROM inv_warehouse
    LEFT JOIN sys_user mu ON inv_warehouse.manager_id = mu.id
    WHERE inv_warehouse.deleted = 0
  `;
  const values: SqlValue[] = [];

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
      sql += ` AND inv_warehouse.status = ?`;
      values.push(statusNum);
    } else if (params.status === 'active') {
      sql += ` AND inv_warehouse.status = 1`;
    } else if (params.status === 'inactive') {
      sql += ` AND inv_warehouse.status = 0`;
    }
  }

  sql += ` ORDER BY inv_warehouse.create_time DESC`;

  return { sql, values };
}

// 格式化仓库数据
function formatWarehouse(warehouse: DbRow): Warehouse {
  return {
    ...warehouse,
    type: warehouseTypeReverseMap[warehouse.warehouse_type] || 'other',
    status: warehouse.status === 1 ? 'active' : 'inactive',
    nature: warehouse.nature || '',
    includeInCalculation:
      warehouse.include_in_calculation === 1 || warehouse.include_in_calculation === true,
    capacity: Number(warehouse.capacity) || 0,
    usedCapacity: Number(warehouse.used_capacity) || 0,
    manager: warehouse.manager || '',
    managerId: warehouse.manager_id,
  };
}

export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
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
    const countValues: SqlValue[] = [];
    if (keyword) {
      countSql += ` AND (warehouse_code LIKE ? OR warehouse_name LIKE ?)`;
      countValues.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (type) {
      countSql += ` AND warehouse_type = ?`;
      countValues.push(warehouseTypeMap[type] || 1);
    }
    if (categoryId) {
      countSql += ` AND category_id = ?`;
      countValues.push(parseInt(categoryId));
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
    const total = (countResult as DbRow[])[0]?.total || 0;

    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const paginatedValues = [...values, pageSize, (page - 1) * pageSize];

    const warehouses = await query(paginatedSql, paginatedValues);
    const formattedWarehouses = (warehouses as DbRow[]).map(formatWarehouse);

    // 支持 all=true 参数，直接返回数组（用于下拉选择等场景）
    const fetchAll = searchParams.get('all') === 'true';
    if (fetchAll) {
      const allWarehouses = await query(sql, values);
      const formattedAll = (allWarehouses as DbRow[]).map(formatWarehouse);
      return successResponse(formattedAll);
    }

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
export const POST = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
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
      return errorResponse(ts('k_wmnua0'), 409, 409);
    }

    // 使用事务创建仓库并记录日志
    const result = await transaction(async (connection) => {
      const [insertResult] = await (connection as DbRow).execute(
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
      title: ts('k_1aifxou'),
      oper_type: 'warehouse',
      oper_method: 'POST',
      oper_url: '/api/warehouse',
      oper_param: JSON.stringify({ code: body.code, name: body.name, type: body.type }),
      oper_result: `仓库 ${body.name} 创建成功`,
      status: 1,
    });

    return successResponse(result, ts('k_1cgzrtj'));
  },
  { errorMessage: '创建仓库失败' }
);

// PUT - 更新仓库
export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body: Warehouse = await request.json();
    const { id } = body;

    if (!id) {
      return commonErrors.badRequest(ts('k_1t9r8nc'));
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
      return errorResponse(ts('k_wmnua0'), 409, 409);
    }

    // 使用事务更新仓库并记录日志
    await transaction(async (connection) => {
      const [updateResult] = await (connection as DbRow).execute(
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
        throw new Error(ts('k_osrnm7'));
      }

      // 记录操作日志
      await connection.execute(
        `INSERT INTO inv_warehouse_log (warehouse_id, operation_type, operation_content)
       VALUES (?, 'update', ?)`,
        [id, `更新仓库: ${body.name}`]
      );
    });

    await logOperation({
      title: ts('k_1c92jxj'),
      oper_type: 'warehouse',
      oper_method: 'PUT',
      oper_url: '/api/warehouse',
      oper_param: JSON.stringify({ id, code: body.code, name: body.name, type: body.type }),
      oper_result: `仓库 ${body.name} 更新成功`,
      status: 1,
    });

    return successResponse(null, ts('k_1r75rfq'));
  },
  { errorMessage: '更新仓库失败' }
);

// DELETE - 删除仓库（软删除）
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest(ts('k_1t9r8nc'));
    }

    const warehouseId = parseInt(id);

    // 使用事务软删除并记录日志
    const warehouseName = await transaction(async (connection) => {
      const [rows] = await connection.query(
        'SELECT warehouse_name as name FROM inv_warehouse WHERE id = ? AND deleted = 0',
        [warehouseId]
      );

      if ((rows as DbRow[]).length === 0) {
        throw new Error(ts('k_osrnm7'));
      }

      const name = (rows as DbRow[])[0].name;

      await connection.execute('UPDATE inv_warehouse SET deleted = 1 WHERE id = ?', [warehouseId]);

      await connection.execute(
        `INSERT INTO inv_warehouse_log (warehouse_id, operation_type, operation_content)
       VALUES (?, 'delete', ?)`,
        [warehouseId, `删除仓库: ${name}`]
      );

      return name;
    });

    await logOperation({
      title: ts('k_kiwxgf'),
      oper_type: 'warehouse',
      oper_method: 'DELETE',
      oper_url: '/api/warehouse',
      oper_param: JSON.stringify({ id: warehouseId }),
      oper_result: `仓库 ${warehouseName} 删除成功`,
      status: 1,
    });

    return successResponse(null, ts('k_ys9qpq'));
  },
  { errorMessage: '删除仓库失败' }
);
