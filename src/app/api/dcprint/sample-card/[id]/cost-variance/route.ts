import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';
import type { DbRow } from '@/types/db';

const service = new SampleProcessCardService();

export const GET = withPermission(
  async (
    _request: NextRequest,
    _userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    try {
      const result = await service.getCostVariance(Number(id));
      return successResponse(result);
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '成本差异分析' }
);
