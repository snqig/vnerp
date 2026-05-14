import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const columns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('qc_inspection', 'crm_customer', 'sal_order', 'sal_order_item', 'prod_work_order')
    `);
    return Response.json({
      success: true,
      columns: columns
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
