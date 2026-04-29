import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// 仓库初始化数据
const warehouseData = [
  { warehouse_code: 'WH001', warehouse_name: '原料主仓库', warehouse_type: 1, province: '广东', city: '深圳', address: 'A栋1层', manager_id: null, contact_phone: '13800138001', status: 1, remark: '存放主要原材料', category_id: 1 },
  { warehouse_code: 'WH002', warehouse_name: '成品仓库', warehouse_type: 3, province: '广东', city: '深圳', address: 'B栋2层', manager_id: null, contact_phone: '13800138002', status: 1, remark: '存放成品标签', category_id: 3 },
  { warehouse_code: 'WH003', warehouse_name: '半成品仓库', warehouse_type: 2, province: '广东', city: '深圳', address: 'A栋2层', manager_id: null, contact_phone: '13800138003', status: 1, remark: '存放印刷后半成品', category_id: 2 },
  { warehouse_code: 'WH004', warehouse_name: '废品暂存区', warehouse_type: 4, province: '广东', city: '深圳', address: 'C栋1层', manager_id: null, contact_phone: '13800138004', status: 1, remark: '不良品暂存', category_id: 7 },
  { warehouse_code: 'WH005', warehouse_name: '外租仓库', warehouse_type: 3, province: '广东', city: '深圳', address: '工业区3号', manager_id: null, contact_phone: '13800138005', status: 1, remark: '租赁仓库，存放季节性产品', category_id: 3 },
];

// 仓库接口
interface Warehouse {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  category_id?: number;
  category_name?: string;
  warehouse_type: number;
  province?: string;
  city?: string;
  address?: string;
  manager_id?: number;
  contact_phone?: string;
  status: number;
  remark?: string;
}

// POST - 初始化仓库数据
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 检查是否需要添加category_id字段
  const checkColumn = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'inv_warehouse' AND column_name = 'category_id'
  `);

  if (checkColumn && checkColumn.count === 0) {
    await execute(
      'ALTER TABLE inv_warehouse ADD COLUMN category_id BIGINT UNSIGNED DEFAULT NULL COMMENT "仓库分类ID" AFTER warehouse_name'
    );
    await execute(
      'ALTER TABLE inv_warehouse ADD KEY idx_category_id (category_id)'
    );
  }

  // 使用事务初始化数据
  await transaction(async (connection) => {
    // 清空现有数据
    await connection.execute('DELETE FROM inv_warehouse');

    // 重置自增ID
    await connection.execute('ALTER TABLE inv_warehouse AUTO_INCREMENT = 1');

    // 插入数据
    for (const wh of warehouseData) {
      await connection.execute(
        `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, category_id, warehouse_type, province, city, address, manager_id, contact_phone, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wh.warehouse_code,
          wh.warehouse_name,
          wh.category_id,
          wh.warehouse_type,
          wh.province,
          wh.city,
          wh.address,
          wh.manager_id,
          wh.contact_phone,
          wh.status,
          wh.remark,
        ]
      );
    }
  });

  // 获取最终数据
  const finalData = await query<Warehouse>(`
    SELECT w.*, c.name as category_name
    FROM inv_warehouse w
    LEFT JOIN sys_warehouse_category c ON w.category_id = c.id
    WHERE w.deleted = 0
    ORDER BY w.id
  `);

  return successResponse(
    {
      data: finalData,
      count: finalData.length,
    },
    '仓库数据初始化成功'
  );
}, '初始化仓库数据失败');

// GET - 获取当前仓库数据
export const GET = withErrorHandler(async (request: NextRequest) => {
  const warehouses = await query<Warehouse>(`
    SELECT w.*, c.name as category_name
    FROM inv_warehouse w
    LEFT JOIN sys_warehouse_category c ON w.category_id = c.id
    WHERE w.deleted = 0
    ORDER BY w.id
  `);

  return successResponse({
    data: warehouses,
    count: warehouses.length,
  });
}, '获取仓库数据失败');
