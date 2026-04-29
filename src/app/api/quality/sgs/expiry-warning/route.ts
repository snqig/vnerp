import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get('days') || 90);

  const rows: any = await query(
    `SELECT c.*, DATEDIFF(c.expire_date, CURDATE()) as days_remaining
     FROM qms_sgs_cert c
     WHERE c.deleted = 0 
       AND c.status = 1 
       AND c.expire_date IS NOT NULL 
       AND DATEDIFF(c.expire_date, CURDATE()) <= ?
     ORDER BY c.expire_date ASC`,
    [days]
  );

  const expired: any[] = [];
  const expiring: any[] = [];

  for (const row of rows) {
    const daysLeft = Number(row.days_remaining);
    if (daysLeft <= 0) {
      expired.push(row);
    } else {
      expiring.push(row);
    }
  }

  if (expired.length > 0) {
    const ids = expired.map((r: any) => r.id);
    await execute(
      `UPDATE qms_sgs_cert SET status = 3 WHERE id IN (${ids.map(() => '?').join(',')}) AND status = 1`,
      ids
    );
  }

  return successResponse({ expired, expiring, total: rows.length });
});
