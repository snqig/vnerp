import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { activateVersion } from '@/application/services/InkFormulaVersionService';
import type { DbRow } from '@/types/db';

// POST /api/dcprint/formula/version/:id/activate — 版本生效
export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;

    try {
      await activateVersion(Number(id), userInfo.userId);
      return successResponse(null, ts('k_1q2k0oi'));
    } catch (e) {
      return errorResponse((e as Error).message || ts('k_tlo06s'), 400, 400);
    }
  },
  { logTitle: '油墨配方版本生效', logType: 'business' }
);
