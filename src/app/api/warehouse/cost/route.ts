import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { query, execute } from '@/lib/db';

/**
 * 移动加权平均成本核算 API
 *
 * 移动加权平均法：每次入库后重新计算平均成本
 * 公式：新平均成本 = (原库存金额 + 本次入库金额) / (原库存数量 + 本次入库数量)
 */

// 获取物料成本信息
export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const warehouseId = searchParams.get('warehouseId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (materialId) {
      // 查询指定物料的成本信息
      const rows: any = await query(
        `SELECT s.*, m.material_name, m.material_code, m.material_spec, m.unit,
                w.warehouse_name
         FROM stock s
         LEFT JOIN materials m ON s.material_id = m.id
         LEFT JOIN warehouses w ON s.warehouse_id = w.id
         WHERE s.material_id = ? ${warehouseId ? 'AND s.warehouse_id = ?' : ''}
         ORDER BY s.warehouse_id`,
        warehouseId ? [Number(materialId), Number(warehouseId)] : [Number(materialId)]
      );

      // 查询成本变动历史
      const history: any = await query(
        `SELECT sm.*, m.material_name, m.material_code
         FROM stock_movement sm
         LEFT JOIN materials m ON sm.material_id = m.id
         WHERE sm.material_id = ?
         AND sm.movement_type IN ('purchase_inbound', 'sales_return', 'production_inbound', 'transfer_in')
         ORDER BY sm.create_time DESC
         LIMIT 20`,
        [Number(materialId)]
      );

      return successResponse({ stock: rows, costHistory: history });
    }

    // 查询所有物料的成本汇总
    const countRows: any = await query(
      `SELECT COUNT(DISTINCT s.material_id) as total
       FROM stock s
       WHERE s.quantity > 0`
    );
    const total = countRows[0]?.total || 0;

    const rows: any = await query(
      `SELECT s.material_id, m.material_name, m.material_code, m.material_spec, m.unit,
              SUM(s.quantity) as total_quantity,
              SUM(s.quantity * s.cost_price) as total_cost_amount,
              AVG(s.cost_price) as avg_cost_price,
              MIN(s.cost_price) as min_cost_price,
              MAX(s.cost_price) as max_cost_price,
              COUNT(DISTINCT s.warehouse_id) as warehouse_count
       FROM stock s
       LEFT JOIN materials m ON s.material_id = m.id
       WHERE s.quantity > 0
       GROUP BY s.material_id, m.material_name, m.material_code, m.material_spec, m.unit
       ORDER BY total_cost_amount DESC
       LIMIT ? OFFSET ?`,
      [pageSize, (page - 1) * pageSize]
    );

    return successResponse({
      list: rows,
      total,
      page,
      pageSize,
    });
  },
  { errorMessage: '操作失败' }
);

// 手动触发成本重算
export const POST = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();
    const { materialId, warehouseId } = body;

    if (!materialId) {
      return errorResponse('物料ID不能为空', 400, 400);
    }

    // 基于历史入库记录重新计算移动加权平均成本
    const movements: any = await query(
      `SELECT sm.movement_type, sm.quantity, sm.unit_price, sm.create_time
       FROM stock_movement sm
       WHERE sm.material_id = ?
       ${warehouseId ? 'AND sm.warehouse_id = ?' : ''}
       AND sm.movement_type IN ('purchase_inbound', 'sales_return', 'production_inbound', 'transfer_in')
       ORDER BY sm.create_time ASC`,
      warehouseId ? [Number(materialId), Number(warehouseId)] : [Number(materialId)]
    );

    if (movements.length === 0) {
      return errorResponse('没有找到入库记录，无法计算成本', 400, 400);
    }

    // 模拟移动加权平均计算
    let totalQty = 0;
    let totalAmount = 0;
    let currentCostPrice = 0;

    for (const movement of movements) {
      const qty = Number(movement.quantity);
      const price = Number(movement.unit_price || 0);

      if (qty > 0) {
        // 入库：重新计算加权平均
        totalAmount += qty * price;
        totalQty += qty;
        currentCostPrice = totalQty > 0 ? totalAmount / totalQty : 0;
      } else {
        // 出库：按当前成本价减少
        totalQty += qty; // qty is negative
        totalAmount += qty * currentCostPrice;
      }
    }

    // 更新库存成本价
    if (warehouseId) {
      await execute(
        'UPDATE stock SET cost_price = ?, update_time = NOW() WHERE material_id = ? AND warehouse_id = ?',
        [currentCostPrice, Number(materialId), Number(warehouseId)]
      );
    } else {
      await execute('UPDATE stock SET cost_price = ?, update_time = NOW() WHERE material_id = ?', [
        currentCostPrice,
        Number(materialId),
      ]);
    }

    return successResponse(
      {
        materialId,
        warehouseId,
        costPrice: currentCostPrice,
        totalQuantity: totalQty,
        totalCostAmount: totalAmount,
        movementCount: movements.length,
      },
      '成本重算完成'
    );
  },
  { errorMessage: '操作失败' }
);
