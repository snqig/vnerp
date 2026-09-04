import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';
import type { DbRow } from '@/types/db';

const service = new SampleProcessCardService();

export const POST = withPermission(
  async (
    _request: NextRequest,
    userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    try {
      const result = await service.submitCard(Number(id), userInfo.userId);
      return successResponse(result, ts('k_1qcd0ek'));
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '提交打样工艺卡' }
);
