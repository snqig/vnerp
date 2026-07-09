import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  listVersions,
  createDraftVersion,
  getVersionDetail,
  compareVersions,
  previewCost,
} from '@/application/services/InkFormulaVersionService';

// GET /api/dcprint/formula/version?colorId=xxx — 按色号查版本列表
// GET /api/dcprint/formula/version?id=xxx — 获取版本详情
// GET /api/dcprint/formula/version?compare=1&leftId=xxx&rightId=xxx — 版本对比
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const colorId = searchParams.get('colorId');
  const id = searchParams.get('id');
  const compare = searchParams.get('compare');
  const leftId = searchParams.get('leftId');
  const rightId = searchParams.get('rightId');

  if (compare === '1' && leftId && rightId) {
    try {
      const result = await compareVersions(Number(leftId), Number(rightId));
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message || '对比失败', 400, 400);
    }
  }

  if (id) {
    const version = await getVersionDetail(Number(id));
    if (!version) {
      return errorResponse('版本不存在', 404, 404);
    }
    return successResponse(version);
  }

  if (colorId) {
    const list = await listVersions(Number(colorId));
    return successResponse({ list, total: list.length });
  }

  return errorResponse('请提供 colorId 或 id 参数', 400, 400);
});

// POST /api/dcprint/formula/version — 新建草稿版本
// POST /api/dcprint/formula/version?previewCost=1 — 成本预览
export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const { searchParams } = new URL(request.url);
    const previewCostFlag = searchParams.get('previewCost');

    const body = await request.json();

    if (previewCostFlag === '1') {
      if (!body.items || !Array.isArray(body.items)) {
        return errorResponse('缺少 items 参数', 400, 400);
      }
      const result = await previewCost(body.items);
      return successResponse(result);
    }

    if (!body.color_id || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse('缺少必填字段: color_id, items', 400, 400);
    }

    try {
      const id = await createDraftVersion(body, userInfo.userId);
      return successResponse({ id }, '草稿版本创建成功');
    } catch (e: any) {
      return errorResponse(e.message || '创建失败', 500, 500);
    }
  },
  { logTitle: '创建油墨配方版本', logType: 'business' }
);
