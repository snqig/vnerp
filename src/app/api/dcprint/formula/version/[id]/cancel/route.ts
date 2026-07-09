import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { cancelVersion } from '@/application/services/InkFormulaVersionService';

// POST /api/dcprint/formula/version/:id/cancel — 版本作废
export const POST = withPermission(
  async (request: NextRequest, userInfo: any, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || '手动作废';

    try {
      await cancelVersion(Number(id), userInfo.userId, reason);
      return successResponse(null, '版本已作废');
    } catch (e: any) {
      return errorResponse(e.message || '作废失败', 400, 400);
    }
  },
  { logTitle: '油墨配方版本作废', logType: 'business' }
);
