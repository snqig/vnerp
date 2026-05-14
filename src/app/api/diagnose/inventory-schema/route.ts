import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const columns = await query('SHOW COLUMNS FROM inv_inventory');
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
