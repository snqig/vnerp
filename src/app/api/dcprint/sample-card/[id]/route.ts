import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';
import { sampleProcessCardSchema } from '@/lib/validators/sample-card.schema';
import type { DbRow } from '@/types/db';

const service = new SampleProcessCardService();

export const GET = withPermission(
  async (
    _request: NextRequest,
    _userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    const card = await service.getCardDetail(Number(id));
    if (!card) return errorResponse(ts('k_1ctslgw'), 404, 404);
    return successResponse(card);
  },
  { logTitle: '打样工艺卡详情' }
);

export const PUT = withPermission(
  async (
    request: NextRequest,
    userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    const body = await request.json();
    const parsed = sampleProcessCardSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        400,
        400
      );
    }
    try {
      await service.updateCard(Number(id), parsed.data, userInfo.userId);
      return successResponse({ id }, ts('k_euybuc'));
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '更新打样工艺卡' }
);

export const DELETE = withPermission(
  async (
    _request: NextRequest,
    _userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    try {
      await service.deleteCard(Number(id));
      return successResponse({ id }, ts('k_1gc9uk9'));
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '删除打样工艺卡' }
);
