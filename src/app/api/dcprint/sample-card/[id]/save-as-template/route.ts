import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessTemplateService } from '@/application/services/SampleProcessTemplateService';

const service = new SampleProcessTemplateService();

// 将已确认的工艺卡保存为标准模板（录入即沉淀）
export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (!body.templateName?.trim()) {
      return errorResponse('模板名称不能为空', 400, 400);
    }
    try {
      const templateId = await service.saveAsTemplate(
        Number(id),
        body.templateName,
        body.category || null,
        userInfo.userId
      );
      return successResponse({ id: templateId }, '已保存为标准工艺模板');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '工艺卡保存为模板' }
);
