import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    let overview: any = { totalItems: 0, totalValue: 0, lowStock: 0, todayInbound: 0, todayOutbound: 0, pendingInbound: 0, pendingOutbound: 0 };
    try {
      const rows: any = await query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN stock_qty <= min_stock THEN 1 ELSE 0 END) as low_stock,
          COALESCE(SUM(stock_qty * unit_price), 0) as total_value
        FROM inv_material WHERE deleted = 0 AND status = 1
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        overview.totalItems = Number(rows[0].total || 0);
        overview.lowStock = Number(rows[0].low_stock || 0);
        overview.totalValue = Number(rows[0].total_value || 0);
      }
    } catch (e) { console.error('warehouse overview failed:', e); }

    try {
      const inRows: any = await query(`SELECT COUNT(*) as total FROM inv_inbound_order WHERE deleted = 0 AND DATE(create_time) = CURDATE()`);
      const outRows: any = await query(`SELECT COUNT(*) as total FROM inv_outbound_order WHERE deleted = 0 AND DATE(create_time) = CURDATE()`);
      if (Array.isArray(inRows) && inRows.length > 0) overview.todayInbound = Number(inRows[0].total || 0);
      if (Array.isArray(outRows) && outRows.length > 0) overview.todayOutbound = Number(outRows[0].total || 0);
    } catch (e) { console.error('warehouse today failed:', e); }

    let categoryDistribution: any[] = [];
    try {
      const rows: any = await query(`
        SELECT material_type, COUNT(*) as count, COALESCE(SUM(stock_qty * unit_price), 0) as value
        FROM inv_material WHERE deleted = 0 AND status = 1 GROUP BY material_type ORDER BY count DESC
      `);
      categoryDistribution = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('warehouse category failed:', e); }

    let lowStockItems: any[] = [];
    try {
      const rows: any = await query(`
        SELECT material_code, material_name, stock_qty, min_stock, unit, specification
        FROM inv_material WHERE deleted = 0 AND status = 1 AND stock_qty <= min_stock
        ORDER BY (stock_qty / NULLIF(min_stock, 0)) ASC LIMIT 10
      `);
      lowStockItems = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('warehouse lowStock failed:', e); }

    let recentTransactions: any[] = [];
    try {
      const rows: any = await query(`
        SELECT transaction_type, material_code, material_name, quantity, unit, create_time, remark
        FROM inv_inventory_transaction WHERE deleted = 0 ORDER BY create_time DESC LIMIT 10
      `);
      recentTransactions = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('warehouse transactions failed:', e); }

    let warehouseOccupancy: any[] = [];
    try {
      const rows: any = await query(`
        SELECT w.warehouse_name, COUNT(DISTINCT i.material_code) as item_count,
          COALESCE(SUM(i.stock_qty), 0) as total_qty
        FROM inv_warehouse w
        LEFT JOIN inv_inventory i ON w.id = i.warehouse_id AND i.deleted = 0
        WHERE w.deleted = 0 GROUP BY w.id, w.warehouse_name
      `);
      warehouseOccupancy = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('warehouse occupancy failed:', e); }

    return NextResponse.json({
      success: true,
      data: { overview, categoryDistribution, lowStockItems, recentTransactions, warehouseOccupancy },
    });
  } catch (error) {
    console.error('获取仓库看板数据失败:', error);
    return NextResponse.json({ success: false, message: '获取仓库看板数据失败' }, { status: 500 });
  }
}
