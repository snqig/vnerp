import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const columns = await query('SHOW COLUMNS FROM qc_final_inspection');
    return Response.json({
      success: true,
      table: 'qc_final_inspection',
      columns: columns
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
