import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (_request: NextRequest) => {
  try {
    const statusColumn = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inv_material_label'
      AND COLUMN_NAME = 'status'
    `);
    return NextResponse.json({
      success: true,
      statusColumn: statusColumn[0],
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
