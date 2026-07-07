import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 批次/序列号管理 API
 * 
 * 支持按批次管理物料，实现保质期预警、序列号追溯
 */

// 获取批次列表
export const GET = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const warehouseId = searchParams.get('warehouseId');
    const batchNo = searchParams.get('batchNo') || '';
    const serialNo = searchParams.get('serialNo') || '';
    const expiryWarning = searchParams.get('expiryWarning') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (materialId) {
      where += ' AND b.material_id = ?';
      params.push(Number(materialId));
    }
    if (warehouseId) {
      where += ' AND b.warehouse_id = ?';
      params.push(Number(warehouseId));
    }
    if (batchNo) {
      where += ' AND b.batch_no LIKE ?';
      params.push(`%${batchNo}%`);
    }
    if (serialNo) {
      where += ' AND b.serial_no LIKE ?';
      params.push(`%${serialNo}%`);
    }
    if (expiryWarning) {
      // 查询即将过期的批次（30天内）
      where += ' AND b.expiry_date IS NOT NULL AND b.expiry_date <= DATE_ADD(NOW(), INTERVAL 30 DAY) AND b.expiry_date > NOW() AND b.quantity > 0';
    }

    const countRows: any = await query(
      `SELECT COUNT(*) as total FROM inv_inventory_batch b ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const rows: any = await query(
      `SELECT b.*, m.material_name, m.material_code, m.material_spec, m.unit,
              w.warehouse_name
       FROM inv_inventory_batch b
       LEFT JOIN materials m ON b.material_id = m.id
       LEFT JOIN warehouses w ON b.warehouse_id = w.id
       ${where}
       ORDER BY b.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return paginatedResponse(rows, { page, pageSize, total, totalPages });
  },
  { errorMessage: '操作失败' }
);

// 创建批次/序列号记录
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['material_id', 'warehouse_id', 'batch_no', 'quantity']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const {
      material_id, warehouse_id, batch_no, serial_no,
      quantity, unit_price, cost_price,
      production_date, expiry_date, supplier_id, supplier_name,
      remark,
    } = body;

    // 检查批次是否已存在
    const existing: any = await query(
      'SELECT id, quantity FROM inv_inventory_batch WHERE material_id = ? AND warehouse_id = ? AND batch_no = ?',
      [material_id, warehouse_id, batch_no]
    );

    if (existing.length > 0) {
      // 批次已存在，增加数量
      const newQty = Number(existing[0].quantity) + Number(quantity);
      const newCostPrice = cost_price
        ? (Number(existing[0].quantity) * Number(existing[0].cost_price || 0) + Number(quantity) * Number(cost_price)) / newQty
        : existing[0].cost_price;

      await execute(
        `UPDATE inv_inventory_batch SET quantity = ?, cost_price = ?, update_time = NOW()
         WHERE id = ?`,
        [newQty, newCostPrice, existing[0].id]
      );

      return successResponse({ id: existing[0].id }, '批次数量已更新');
    }

    // 创建新批次
    const result: any = await execute(
      `INSERT INTO inv_inventory_batch
       (material_id, warehouse_id, batch_no, serial_no, quantity, available_qty,
        unit_price, cost_price, production_date, expiry_date,
        supplier_id, supplier_name, remark, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        material_id, warehouse_id, batch_no, serial_no || null,
        quantity, quantity,
        unit_price || 0, cost_price || 0,
        production_date || null, expiry_date || null,
        supplier_id || null, supplier_name || null,
        remark || null,
      ]
    );

    return successResponse({ id: result.insertId }, '批次创建成功');
  },
  { errorMessage: '操作失败' }
);

// 更新批次信息
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return errorResponse('批次ID不能为空', 400, 400);
    }

    if (action === 'freeze') {
      // 冻结批次
      await execute(
        'UPDATE inv_inventory_batch SET available_qty = 0, status = ? WHERE id = ?',
        ['frozen', id]
      );
      return successResponse(null, '批次已冻结');
    }

    if (action === 'unfreeze') {
      // 解冻批次
      const batch: any = await query('SELECT quantity FROM inv_inventory_batch WHERE id = ?', [id]);
      if (batch.length === 0) {
        return errorResponse('批次不存在', 404, 404);
      }
      await execute(
        'UPDATE inv_inventory_batch SET available_qty = ?, status = ? WHERE id = ?',
        [batch[0].quantity, 'active', id]
      );
      return successResponse(null, '批次已解冻');
    }

    // 通用更新
    const { production_date, expiry_date, remark } = body;
    const updates: string[] = [];
    const params: any[] = [];

    if (production_date !== undefined) {
      updates.push('production_date = ?');
      params.push(production_date);
    }
    if (expiry_date !== undefined) {
      updates.push('expiry_date = ?');
      params.push(expiry_date);
    }
    if (remark !== undefined) {
      updates.push('remark = ?');
      params.push(remark);
    }

    if (updates.length === 0) {
      return errorResponse('没有需要更新的字段', 400, 400);
    }

    updates.push('update_time = NOW()');
    params.push(id);

    await execute(
      `UPDATE inv_inventory_batch SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return successResponse(null, '批次信息更新成功');
  },
  { errorMessage: '操作失败' }
);
