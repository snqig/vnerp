import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');

  if (table) {
    const rows = await query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [table]
    );
    return successResponse(rows, `表 ${table} 的列信息`);
  }

  const tables = await query(
    `SELECT TABLE_NAME, TABLE_COMMENT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`
  );
  return successResponse(tables, '所有表');
});
