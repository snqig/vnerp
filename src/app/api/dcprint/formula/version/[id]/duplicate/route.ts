import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { duplicateVersion } from '@/application/services/InkFormulaVersionService';

// POST /api/dcprint/formula/version/:id/duplicate — 一键复用
export const POST = withPermission(
  async (request: NextRequest, userInfo: any, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    try {
      const newId = await duplicateVersion(Number(id), body || {}, userInfo.userId);
      return successResponse({ id: newId }, '一键复用成功，已生成新草稿版本');
    } catch (e: any) {
      return errorResponse(e.message || '复用失败', 400, 400);
    }
  },
  { logTitle: '一键复用油墨配方', logType: 'business' }
);
