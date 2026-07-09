import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (_request: NextRequest) => {
  try {
    const columns = await query('SHOW COLUMNS FROM inv_inventory');
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
