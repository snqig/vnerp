import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { compareVersions } from '@/application/services/InkFormulaVersionService';

// GET /api/dcprint/formula/version/compare?leftId=xxx&rightId=xxx — 版本对比
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const leftId = searchParams.get('leftId');
  const rightId = searchParams.get('rightId');

  if (!leftId || !rightId) {
    return errorResponse('缺少 leftId 或 rightId 参数', 400, 400);
  }

  try {
    const result = await compareVersions(Number(leftId), Number(rightId));
    return successResponse(result);
  } catch (e: any) {
    return errorResponse(e.message || '对比失败', 400, 400);
  }
});
