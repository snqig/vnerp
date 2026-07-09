/**
 * 审计报告API路由
 * 功能：生成审计报告、导出审计数据
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { generateAuditReport } from '@/lib/audit-logger';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);

  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  const moduleName = searchParams.get('module') || undefined;

  if (!startTime || !endTime) {
    return errorResponse('请提供开始时间和结束时间', 400, 400);
  }

  const report = await generateAuditReport({
    startTime,
    endTime,
    module: moduleName,
  });

  return successResponse(report, '审计报告生成成功');
});
