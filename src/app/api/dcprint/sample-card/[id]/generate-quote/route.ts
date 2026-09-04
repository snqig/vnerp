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
    request: NextRequest,
    userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    try {
      const body = await request.json().catch(() => ({}));
      const result = await service.generateQuote(
        Number(id),
        {
          markupRate: body.markupRate,
          quantity: body.quantity,
          validUntil: body.validUntil,
          remark: body.remark,
        },
        userInfo.userId
      );
      return successResponse(result, ts('k_hn069'));
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '生成报价单' }
);
