import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { logger, generateTraceId } from '@/lib/logger';
import { SampleSignRecordService } from '@/application/services/SampleSignRecordService';

const signService = new SampleSignRecordService();

/** GET /api/sample/color-standards?keyword=&limit= — 色样档案列表（lab-test 关联选择用） */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const traceId = generateTraceId();
  const ctx = { module: 'sample', action: 'GET_color_standards', traceId };
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

  logger.info(ctx, 'list color standards', { keyword, limit });

  const list = await signService.listColorStandards({ keyword, limit });
  return successResponse({ list });
});
