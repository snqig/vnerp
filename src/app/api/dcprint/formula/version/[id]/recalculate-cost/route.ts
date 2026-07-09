import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { recalculateCost, getVersionDetail } from '@/application/services/InkFormulaVersionService';

// POST /api/dcprint/formula/version/:id/recalculate-cost — 手动重算草稿成本
export const POST = withPermission(
  async (request: NextRequest, _userInfo, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    try {
      await recalculateCost(Number(id));
      const version = await getVersionDetail(Number(id));
      return successResponse(version, '成本重算完成');
    } catch (e) {
      return errorResponse((e as Error).message || '重算失败', 400, 400);
    }
  },
  { logTitle: '重算油墨配方成本', logType: 'business' }
);
