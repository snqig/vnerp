import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { updateVersionItems } from '@/application/services/InkFormulaVersionService';

// POST /api/dcprint/formula/version/:id/items — 独立更新草稿版本明细
export const POST = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    const body = await request.json();

    if (!body.items || !Array.isArray(body.items)) {
      return errorResponse(ts('k_1dank76'), 400, 400);
    }

    try {
      await updateVersionItems(Number(id), body.items, userInfo.userId);
      return successResponse(null, ts('k_944foc'));
    } catch (e) {
      return errorResponse((e as Error).message || ts('k_10lkv9z'), 400, 400);
    }
  },
  { logTitle: '更新油墨配方明细', logType: 'business' }
);
