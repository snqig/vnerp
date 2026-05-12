/**
 * 审计报告API路由
 * 功能：生成审计报告、导出审计数据
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';
import { generateAuditReport } from '@/lib/audit-logger';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  const module = searchParams.get('module') || undefined;

  if (!startTime || !endTime) {
    return errorResponse('请提供开始时间和结束时间', 400, 400);
  }

  const report = await generateAuditReport({
    startTime,
    endTime,
    module,
  });

  return successResponse(report, '审计报告生成成功');
});
