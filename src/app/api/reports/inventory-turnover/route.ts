import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 库存周转率报表
 * 按品类/仓库统计库存周转情况
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') || 'category'; // category, warehouse

  let dateFilter = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateFilter = ' AND iil.create_time BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  if (groupBy === 'category') {
    // 按品类统计
    const rows: any = await query(
      `SELECT
        m.material_type,
        m.material_code,
        m.material_name,
        m.unit,
        COALESCE(SUM(CASE WHEN iil.operation_type = 1 THEN iil.operation_qty ELSE 0 END), 0) as inbound_qty,
        COALESCE(SUM(CASE WHEN iil.operation_type = 2 THEN iil.operation_qty ELSE 0 END), 0) as outbound_qty,
        COALESCE(AVG(ii.quantity), 0) as avg_stock,
        COALESCE(MAX(ii.quantity), 0) as current_stock,
        COALESCE(MAX(ii.locked_qty), 0) as locked_qty,
        COALESCE(MAX(ii.available_qty), 0) as available_qty
      FROM material m
      LEFT JOIN inv_inventory ii ON m.id = ii.material_id AND ii.deleted = 0
      LEFT JOIN inv_inventory_log iil ON m.id = iil.material_id ${dateFilter}
      WHERE m.deleted = 0
      GROUP BY m.id, m.material_type, m.material_code, m.material_name, m.unit
      HAVING avg_stock > 0 OR inbound_qty > 0 OR outbound_qty > 0
      ORDER BY outbound_qty DESC
      LIMIT 100`,
      params
    );

    const result = rows.map((row: any) => {
      const avgStock = parseFloat(row.avg_stock) || 1;
      const outboundQty = parseFloat(row.outbound_qty);
      // 周转率 = 出库量 / 平均库存
      const turnoverRate = avgStock > 0 ? Math.round((outboundQty / avgStock) * 100) / 100 : 0;
      // 周转天数 = 统计天数 / 周转率
      const turnoverDays = turnoverRate > 0 ? Math.round(30 / turnoverRate) : 0;

      return {
        materialType: row.material_type,
        materialCode: row.material_code,
        materialName: row.material_name,
        unit: row.unit,
        inboundQty: parseFloat(row.inbound_qty),
        outboundQty,
        avgStock: parseFloat(row.avg_stock),
        currentStock: parseFloat(row.current_stock),
        lockedQty: parseFloat(row.locked_qty),
        availableQty: parseFloat(row.available_qty),
        turnoverRate,
        turnoverDays,
      };
    });

    return successResponse(
      {
        list: result,
        summary: {
          totalMaterials: result.length,
          totalInbound: result.reduce((sum: number, r: any) => sum + r.inboundQty, 0),
          totalOutbound: result.reduce((sum: number, r: any) => sum + r.outboundQty, 0),
          avgTurnoverRate:
            result.length > 0
              ? Math.round(
                  (result.reduce((sum: number, r: any) => sum + r.turnoverRate, 0) /
                    result.length) *
                    100
                ) / 100
              : 0,
        },
      },
      '获取库存周转率报表成功'
    );
  } else {
    // 按仓库统计
    const rows: any = await query(
      `SELECT
        w.id as warehouse_id,
        w.warehouse_name,
        w.warehouse_type,
        COUNT(DISTINCT ii.material_id) as material_count,
        COALESCE(SUM(ii.quantity), 0) as total_stock,
        COALESCE(SUM(ii.locked_qty), 0) as total_locked,
        COALESCE(SUM(ii.available_qty), 0) as total_available,
        COALESCE(SUM(CASE WHEN iil.operation_type = 1 THEN iil.operation_qty ELSE 0 END), 0) as inbound_qty,
        COALESCE(SUM(CASE WHEN iil.operation_type = 2 THEN iil.operation_qty ELSE 0 END), 0) as outbound_qty
      FROM warehouse w
      LEFT JOIN inv_inventory ii ON w.id = ii.warehouse_id AND ii.deleted = 0
      LEFT JOIN inv_inventory_log iil ON w.id = iil.warehouse_id ${dateFilter}
      WHERE w.deleted = 0
      GROUP BY w.id, w.warehouse_name, w.warehouse_type
      ORDER BY total_stock DESC`,
      params
    );

    const result = rows.map((row: any) => {
      const totalStock = parseFloat(row.total_stock) || 1;
      const outboundQty = parseFloat(row.outbound_qty);
      const turnoverRate = totalStock > 0 ? Math.round((outboundQty / totalStock) * 100) / 100 : 0;

      return {
        warehouseId: row.warehouse_id,
        warehouseName: row.warehouse_name,
        warehouseType: row.warehouse_type,
        materialCount: row.material_count,
        totalStock: parseFloat(row.total_stock),
        totalLocked: parseFloat(row.total_locked),
        totalAvailable: parseFloat(row.total_available),
        inboundQty: parseFloat(row.inbound_qty),
        outboundQty,
        turnoverRate,
      };
    });

    return successResponse(
      {
        list: result,
        summary: {
          totalWarehouses: result.length,
          totalStock: result.reduce((sum: number, r: any) => sum + r.totalStock, 0),
          totalOutbound: result.reduce((sum: number, r: any) => sum + r.outboundQty, 0),
        },
      },
      '获取仓库库存报表成功'
    );
  }
});
