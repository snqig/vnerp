import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  getVersionDetail,
  updateVersion,
  deleteVersion,
  recalculateCost,
} from '@/application/services/InkFormulaVersionService';

// GET /api/dcprint/formula/version/:id — 获取版本详情
export const GET = withPermission(
  async (request: NextRequest, _userInfo, { params }: { params: Promise<{ id: string }> }) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    const version = await getVersionDetail(Number(id));
    if (!version) {
      return errorResponse(ts('k_1t1q87o'), 404, 404);
    }
    return successResponse(version);
  }
);

// PUT /api/dcprint/formula/version/:id — 编辑草稿版本（基础信息 + 明细）
// PUT /api/dcprint/formula/version/:id?recalculate=1 — 手动重算成本
export const PUT = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const recalc = searchParams.get('recalculate');

    if (recalc === '1') {
      try {
        await recalculateCost(Number(id));
        const version = await getVersionDetail(Number(id));
        return successResponse(version, ts('k_vggiut'));
      } catch (e) {
        return errorResponse((e as Error).message || ts('k_bysnxv'), 400, 400);
      }
    }

    const body = await request.json();

    try {
      await updateVersion(Number(id), body, userInfo.userId);
      return successResponse(null, ts('k_r17ga0'));
    } catch (e) {
      return errorResponse((e as Error).message || ts('k_10lkv9z'), 400, 400);
    }
  },
  { logTitle: '更新油墨配方版本', logType: 'business' }
);

// DELETE /api/dcprint/formula/version/:id — 删除草稿版本
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo, { params }: { params: Promise<{ id: string }> }) => {
  const ts = await getTranslations('Common');
    const { id } = await params;

    try {
      await deleteVersion(Number(id));
      return successResponse(null, ts('k_15ueaao'));
    } catch (e) {
      return errorResponse((e as Error).message || ts('k_1ijrr73'), 400, 400);
    }
  },
  { logTitle: '删除油墨配方版本', logType: 'business' }
);
