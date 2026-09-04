import { getTranslations } from 'next-intl/server';

;
/**
 * 审计报告API路由
 * 功能：生成审计报告、导出审计数据
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { generateAuditReport } from '@/lib/audit-logger';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);

  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  const moduleName = searchParams.get('module') || undefined;

  if (!startTime || !endTime) {
    return errorResponse(ts('k_fjdnzk'), 400, 400);
  }

  const report = await generateAuditReport({
    startTime,
    endTime,
    module: moduleName,
  });

  return successResponse(report, ts('k_1b7a70y'));
});
