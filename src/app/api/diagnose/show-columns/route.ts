import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const table = request.nextUrl.searchParams.get('table') || 'bom_header';
  const columns = await query(`SHOW COLUMNS FROM ${table}`);
  return successResponse({ table, columns });
});
