import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (_request: NextRequest) => {
  try {
    const columns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('qc_inspection', 'crm_customer', 'sal_order', 'sal_order_item', 'prod_work_order')
    `);
    return NextResponse.json({
      success: true,
      columns: columns,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
});
