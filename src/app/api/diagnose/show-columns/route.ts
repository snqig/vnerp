import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const GET = withPermission(async (request: NextRequest) => {
  const table = request.nextUrl.searchParams.get('table') || 'bom_header';
  const columns = await query(`SHOW COLUMNS FROM ${table}`);
  return successResponse({ table, columns });
});
