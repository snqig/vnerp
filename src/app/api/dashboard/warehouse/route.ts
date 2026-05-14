import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const overview: any = {
      totalItems: 0,
      totalValue: 0,
      lowStock: 0,
      todayInbound: 0,
      todayOutbound: 0,
      pendingInbound: 0,
      pendingOutbound: 0,
    };
    try {
      const rows: any = await query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN safety_stock > 0 AND quantity <= safety_stock THEN 1 ELSE 0 END) as low_stock,
          COALESCE(SUM(quantity * COALESCE(unit_cost, cost_price, price, 0)), 0) as total_value
        FROM inv_inventory WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        overview.totalItems = Number(rows[0].total || 0);
        overview.lowStock = Number(rows[0].low_stock || 0);
        overview.totalValue = Number(rows[0].total_value || 0);
      }
    } catch (e) {
      console.error('warehouse overview failed:', e);
    }

    try {
      const inRows: any = await query(
        `SELECT COUNT(*) as total FROM inv_inbound_order WHERE deleted = 0 AND DATE(create_time) = CURDATE()`
      );
      const outRows: any = await query(
        `SELECT COUNT(*) as total FROM inv_outbound_order WHERE deleted = 0 AND DATE(create_time) = CURDATE()`
      );
      if (Array.isArray(inRows) && inRows.length > 0)
        overview.todayInbound = Number(inRows[0].total || 0);
      if (Array.isArray(outRows) && outRows.length > 0)
        overview.todayOutbound = Number(outRows[0].total || 0);
    } catch (e) {
      console.error('warehouse today failed:', e);
    }

    let categoryDistribution: any[] = [];
    try {
      const rows: any = await query(`
        SELECT m.material_type, COUNT(DISTINCT m.id) as count,
          COALESCE(SUM(i.quantity * COALESCE(i.unit_cost, m.cost_price, m.price, 0)), 0) as value
        FROM inv_material m
        LEFT JOIN inv_inventory i ON m.id = i.material_id AND i.deleted = 0
        WHERE m.deleted = 0 AND m.status = 1 GROUP BY m.material_type ORDER BY count DESC
      `);
      categoryDistribution = Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error('warehouse category failed:', e);
    }

    let lowStockItems: any[] = [];
    try {
      const rows: any = await query(`
        SELECT m.material_code, m.material_name, COALESCE(i.quantity, 0) as stock_qty,
          m.safety_stock as min_stock, m.unit, m.specification
        FROM inv_material m
        LEFT JOIN inv_inventory i ON m.id = i.material_id AND i.deleted = 0
        WHERE m.deleted = 0 AND m.status = 1 AND COALESCE(i.quantity, 0) <= m.safety_stock
        ORDER BY (COALESCE(i.quantity, 0) / NULLIF(m.safety_stock, 0)) ASC LIMIT 10
      `);
      lowStockItems = Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error('warehouse lowStock failed:', e);
    }

    let recentTransactions: any[] = [];
    try {
      const rows: any = await query(`
        SELECT t.trans_type as transaction_type, t.material_code,
          m.material_name, t.quantity, t.unit, t.create_time, t.remark
        FROM inv_inventory_transaction t
        LEFT JOIN inv_material m ON t.material_id = m.id
        ORDER BY t.create_time DESC LIMIT 10
      `);
      recentTransactions = Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error('warehouse transactions failed:', e);
    }

    let warehouseOccupancy: any[] = [];
    try {
      const rows: any = await query(`
        SELECT w.warehouse_name, COUNT(DISTINCT i.material_id) as item_count,
          COALESCE(SUM(i.quantity), 0) as total_qty
        FROM inv_warehouse w
        LEFT JOIN inv_inventory i ON w.id = i.warehouse_id AND i.deleted = 0
        WHERE w.deleted = 0 GROUP BY w.id, w.warehouse_name
      `);
      warehouseOccupancy = Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error('warehouse occupancy failed:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        overview,
        categoryDistribution,
        lowStockItems,
        recentTransactions,
        warehouseOccupancy,
      },
    });
  } catch (error) {
    console.error('获取仓库看板数据失败:', error);
    return NextResponse.json({ success: false, message: '获取仓库看板数据失败' }, { status: 500 });
  }
}
