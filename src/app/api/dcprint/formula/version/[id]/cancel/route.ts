import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { cancelVersion } from '@/application/services/InkFormulaVersionService';
import type { DbRow } from '@/types/db';

// POST /api/dcprint/formula/version/:id/cancel — 版本作废
export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || ts('k_fponfn');

    try {
      await cancelVersion(Number(id), userInfo.userId, reason);
      return successResponse(null, ts('k_187gfcg'));
    } catch (e) {
      return errorResponse((e as Error).message || ts('k_agd11i'), 400, 400);
    }
  },
  { logTitle: '油墨配方版本作废', logType: 'business' }
);
