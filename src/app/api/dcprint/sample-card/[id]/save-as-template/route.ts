import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessTemplateService } from '@/application/services/SampleProcessTemplateService';
import type { DbRow } from '@/types/db';

const service = new SampleProcessTemplateService();

// 将已确认的工艺卡保存为标准模板（录入即沉淀）
export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (!body.templateName?.trim()) {
      return errorResponse(ts('k_10gd1pi'), 400, 400);
    }
    try {
      const templateId = await service.saveAsTemplate(
        Number(id),
        body.templateName,
        body.category || null,
        userInfo.userId
      );
      return successResponse({ id: templateId }, ts('k_8t03j4'));
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '工艺卡保存为模板' }
);
