import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

/**
 * 订单交付率报表
 * 按月/客户统计订单准时交付率
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') || 'month'; // month, customer

  let dateFilter = '';
  const params: SqlValue[] = [];

  if (startDate && endDate) {
    dateFilter = ' AND so.order_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  if (groupBy === 'month') {
    // 按月统计
    const rows = await query(
      `SELECT
        DATE_FORMAT(so.order_date, '%Y-%m') as month,
        COUNT(*) as total_orders,
        SUM(CASE WHEN so.status >= 3 THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN so.delivery_date >= so.actual_delivery_date THEN 1 ELSE 0 END) as on_time_orders,
        COALESCE(SUM(so.total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN so.status >= 3 THEN so.total_amount ELSE 0 END), 0) as completed_amount
      FROM sal_order so
      WHERE so.deleted = 0 ${dateFilter}
      GROUP BY DATE_FORMAT(so.order_date, '%Y-%m')
      ORDER BY month DESC`,
      params
    );

    const result = rows.map((row) => ({
      month: String(row.month ?? ''),
      totalOrders: Number(row.total_orders ?? 0),
      completedOrders: Number(row.completed_orders ?? 0),
      onTimeOrders: Number(row.on_time_orders ?? 0),
      totalAmount: parseFloat(String(row.total_amount)),
      completedAmount: parseFloat(String(row.completed_amount)),
      deliveryRate:
        Number(row.total_orders ?? 0) > 0
          ? Math.round((Number(row.completed_orders ?? 0) / Number(row.total_orders ?? 0)) * 100)
          : 0,
      onTimeRate:
        Number(row.total_orders ?? 0) > 0
          ? Math.round((Number(row.on_time_orders ?? 0) / Number(row.total_orders ?? 0)) * 100)
          : 0,
    }));

    return successResponse(
      {
        list: result,
        summary: {
          totalOrders: result.reduce((sum, r) => sum + Number(r.totalOrders ?? 0), 0),
          completedOrders: result.reduce((sum, r) => sum + Number(r.completedOrders ?? 0), 0),
          avgDeliveryRate:
            result.length > 0
              ? Math.round(
                  result.reduce((sum, r) => sum + Number(r.deliveryRate ?? 0), 0) / result.length
                )
              : 0,
          avgOnTimeRate:
            result.length > 0
              ? Math.round(
                  result.reduce((sum, r) => sum + Number(r.onTimeRate ?? 0), 0) / result.length
                )
              : 0,
        },
      },
      ts('k_1qki0ru')
    );
  } else {
    // 按客户统计
    const rows = await query(
      `SELECT
        so.customer_id,
        c.customer_name,
        COUNT(*) as total_orders,
        SUM(CASE WHEN so.status >= 3 THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN so.delivery_date >= so.actual_delivery_date THEN 1 ELSE 0 END) as on_time_orders,
        COALESCE(SUM(so.total_amount), 0) as total_amount
      FROM sal_order so
      LEFT JOIN crm_customer c ON so.customer_id = c.id
      WHERE so.deleted = 0 ${dateFilter}
      GROUP BY so.customer_id, c.customer_name
      ORDER BY total_orders DESC
      LIMIT 50`,
      params
    );

    const result = rows.map((row) => ({
      customerId: Number(row.customer_id ?? 0),
      customerName: String(row.customer_name ?? ''),
      totalOrders: Number(row.total_orders ?? 0),
      completedOrders: Number(row.completed_orders ?? 0),
      onTimeOrders: Number(row.on_time_orders ?? 0),
      totalAmount: parseFloat(String(row.total_amount)),
      deliveryRate:
        Number(row.total_orders ?? 0) > 0
          ? Math.round((Number(row.completed_orders ?? 0) / Number(row.total_orders ?? 0)) * 100)
          : 0,
      onTimeRate:
        Number(row.total_orders ?? 0) > 0
          ? Math.round((Number(row.on_time_orders ?? 0) / Number(row.total_orders ?? 0)) * 100)
          : 0,
    }));

    return successResponse(
      {
        list: result,
        summary: {
          totalCustomers: result.length,
          totalOrders: result.reduce((sum, r) => sum + Number(r.totalOrders ?? 0), 0),
          avgDeliveryRate:
            result.length > 0
              ? Math.round(
                  result.reduce((sum, r) => sum + Number(r.deliveryRate ?? 0), 0) / result.length
                )
              : 0,
        },
      },
      ts('k_1upffs0')
    );
  }
});
