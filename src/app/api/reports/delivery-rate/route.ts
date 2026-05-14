import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

/**
 * 订单交付率报表
 * 按月/客户统计订单准时交付率
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') || 'month'; // month, customer

  let dateFilter = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateFilter = ' AND so.order_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  if (groupBy === 'month') {
    // 按月统计
    const rows: any = await query(
      `SELECT
        DATE_FORMAT(so.order_date, '%Y-%m') as month,
        COUNT(*) as total_orders,
        SUM(CASE WHEN so.status >= 3 THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN so.delivery_date >= so.actual_delivery_date THEN 1 ELSE 0 END) as on_time_orders,
        COALESCE(SUM(so.total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN so.status >= 3 THEN so.total_amount ELSE 0 END), 0) as completed_amount
      FROM sales_order so
      WHERE so.deleted = 0 ${dateFilter}
      GROUP BY DATE_FORMAT(so.order_date, '%Y-%m')
      ORDER BY month DESC`,
      params
    );

    const result = rows.map((row: any) => ({
      month: row.month,
      totalOrders: row.total_orders,
      completedOrders: row.completed_orders,
      onTimeOrders: row.on_time_orders || 0,
      totalAmount: parseFloat(row.total_amount),
      completedAmount: parseFloat(row.completed_amount),
      deliveryRate:
        row.total_orders > 0 ? Math.round((row.completed_orders / row.total_orders) * 100) : 0,
      onTimeRate:
        row.total_orders > 0 ? Math.round(((row.on_time_orders || 0) / row.total_orders) * 100) : 0,
    }));

    return successResponse(
      {
        list: result,
        summary: {
          totalOrders: result.reduce((sum: number, r: any) => sum + r.totalOrders, 0),
          completedOrders: result.reduce((sum: number, r: any) => sum + r.completedOrders, 0),
          avgDeliveryRate:
            result.length > 0
              ? Math.round(
                  result.reduce((sum: number, r: any) => sum + r.deliveryRate, 0) / result.length
                )
              : 0,
          avgOnTimeRate:
            result.length > 0
              ? Math.round(
                  result.reduce((sum: number, r: any) => sum + r.onTimeRate, 0) / result.length
                )
              : 0,
        },
      },
      '获取订单交付率报表成功'
    );
  } else {
    // 按客户统计
    const rows: any = await query(
      `SELECT
        so.customer_id,
        c.customer_name,
        COUNT(*) as total_orders,
        SUM(CASE WHEN so.status >= 3 THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN so.delivery_date >= so.actual_delivery_date THEN 1 ELSE 0 END) as on_time_orders,
        COALESCE(SUM(so.total_amount), 0) as total_amount
      FROM sales_order so
      LEFT JOIN customer c ON so.customer_id = c.id
      WHERE so.deleted = 0 ${dateFilter}
      GROUP BY so.customer_id, c.customer_name
      ORDER BY total_orders DESC
      LIMIT 50`,
      params
    );

    const result = rows.map((row: any) => ({
      customerId: row.customer_id,
      customerName: row.customer_name || '未知客户',
      totalOrders: row.total_orders,
      completedOrders: row.completed_orders,
      onTimeOrders: row.on_time_orders || 0,
      totalAmount: parseFloat(row.total_amount),
      deliveryRate:
        row.total_orders > 0 ? Math.round((row.completed_orders / row.total_orders) * 100) : 0,
      onTimeRate:
        row.total_orders > 0 ? Math.round(((row.on_time_orders || 0) / row.total_orders) * 100) : 0,
    }));

    return successResponse(
      {
        list: result,
        summary: {
          totalCustomers: result.length,
          totalOrders: result.reduce((sum: number, r: any) => sum + r.totalOrders, 0),
          avgDeliveryRate:
            result.length > 0
              ? Math.round(
                  result.reduce((sum: number, r: any) => sum + r.deliveryRate, 0) / result.length
                )
              : 0,
        },
      },
      '获取客户交付率报表成功'
    );
  }
});
