import { NextRequest } from 'next/server';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';
import { syncPieceWorkFromMes } from '@/lib/hr/piece-work-sync';
import { query } from '@/lib/db';

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { records } = body;

  if (!Array.isArray(records) || records.length === 0) {
    return errorResponse('缺少计件记录数据', 400, 400);
  }

  if (records.length > 1000) {
    return errorResponse('单次同步记录数不能超过1000', 400, 400);
  }

  const result = await syncPieceWorkFromMes(records);
  return successResponse(result, `同步完成: ${result.synced}条成功, ${result.skipped}条跳过, ${result.errors.length}条失败`);
}, { errorMessage: 'MES计件同步失败' });

export const GET = withPermission(async (_request: NextRequest) => {
  const rows = await query(
    `SELECT * FROM hr_piece_work_detail WHERE sync_status > 0 ORDER BY create_time DESC LIMIT 50`
  );
  return successResponse(rows);
}, { errorMessage: '获取同步历史失败' });
