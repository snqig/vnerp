export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { query, execute } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(
  async (_request: NextRequest, _userInfo) => {
    const ARCHIVE_TABLE = 'qrcode_record_archive';
    const SOURCE_TABLE = 'qrcode_record';
    const MONTHS = parseInt(process.env.QR_ARCHIVE_MONTHS || '6', 10);
    const BATCH_SIZE = parseInt(process.env.QR_ARCHIVE_BATCH_SIZE || '5000', 10);

    try {
      const countResult = (await query<{ total: string }[]>(
        `SELECT COUNT(*) as total FROM ${SOURCE_TABLE}
         WHERE create_time < NOW() - INTERVAL ? MONTH
           AND deleted = 0
           AND status <> 1`,
        [MONTHS]
      )) as unknown as { total: string }[];

      const total = parseInt(countResult[0]?.total || '0', 10);
      if (total === 0) {
        return successResponse({ archived: 0, message: '无需归档' });
      }

      let archived = 0;
      let loop = 0;

      while (loop < 1000) {
        const result = (await query<{ id: number }[]>(
          `SELECT id FROM ${SOURCE_TABLE}
           WHERE create_time < NOW() - INTERVAL ? MONTH
             AND deleted = 0
             AND status <> 1
           ORDER BY id ASC LIMIT ?`,
          [MONTHS, BATCH_SIZE]
        )) as unknown as { id: number }[];

        if (result.length === 0) break;

        const ids = result.map((r) => r.id);
        const placeholders = ids.map(() => '?').join(',');

        await execute(
          `INSERT INTO ${ARCHIVE_TABLE}
           SELECT * FROM ${SOURCE_TABLE}
           WHERE id IN (${placeholders})`,
          ids
        );

        await execute(
          `UPDATE ${SOURCE_TABLE} SET deleted = 1
           WHERE id IN (${placeholders})`,
          ids
        );

        archived += ids.length;
        loop++;
      }

      return successResponse({ archived, total, message: `已归档 ${archived} 条, 共 ${total} 条` });
    } catch (error) {
      return errorResponse(`归档失败: ${(error as Error).message}`, 500, 500);
    }
  },
  { errorMessage: '二维码归档任务失败' }
);
