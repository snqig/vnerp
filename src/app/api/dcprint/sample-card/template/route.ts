import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessTemplateService } from '@/application/services/SampleProcessTemplateService';
import type { DbRow } from '@/types/db';

const service = new SampleProcessTemplateService();

// 获取模板列表
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const result = await service.listTemplates({ keyword, category, page, pageSize });
  return successResponse(result);
});

// 创建模板
export const POST = withPermission(
  async (request: NextRequest, userInfo: DbRow) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    if (!body.template_name?.trim()) {
      return errorResponse(ts('k_10gd1pi'), 400, 400);
    }
    const id = await service.createTemplate(body, userInfo.userId);
    return successResponse({ id }, ts('k_1oezvzt'));
  },
  { logTitle: '创建标准工艺模板' }
);
