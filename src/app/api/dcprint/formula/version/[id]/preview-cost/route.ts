import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { previewCost } from '@/application/services/InkFormulaVersionService';

// POST /api/dcprint/formula/version/:id/preview-cost — 草稿成本预览（传入明细列表，不持久化）
export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.items || !Array.isArray(body.items)) {
    return errorResponse('缺少 items 参数', 400, 400);
  }

  try {
    const result = await previewCost(body.items);
    return successResponse(result);
  } catch (e) {
    return errorResponse((e as Error).message || '成本预览失败', 500, 500);
  }
});
