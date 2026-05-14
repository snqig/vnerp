import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const inboundOrders = await query(
      `SELECT id, order_no, supplier_name, warehouse_id, status, total_quantity, total_amount, inbound_date, create_time
       FROM inv_inbound_order WHERE deleted = 0 ORDER BY create_time DESC LIMIT 20`
    );

    const items = await query(
      `SELECT COUNT(*) as count FROM inv_inbound_item`
    );

    return Response.json({
      success: true,
      data: {
        orders: inboundOrders,
        itemCount: items[0]?.count || 0,
        statusDistribution: await query(
          `SELECT status, COUNT(*) as count FROM inv_inbound_order WHERE deleted = 0 GROUP BY status`
        ),
        warehouseDistribution: await query(
          `SELECT warehouse_id, COUNT(*) as count FROM inv_inbound_order WHERE deleted = 0 GROUP BY warehouse_id`
        ),
      }
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
