import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { duplicateVersion } from '@/application/services/InkFormulaVersionService';
import type { DbRow } from '@/types/db';

// POST /api/dcprint/formula/version/:id/duplicate — 一键复用
export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: DbRow,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const ts = await getTranslations('Common');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    try {
      const newId = await duplicateVersion(Number(id), body || {}, userInfo.userId);
      return successResponse({ id: newId }, ts('k_17padtq'));
    } catch (e) {
      return errorResponse((e as Error).message || ts('k_1jg1eoy'), 400, 400);
    }
  },
  { logTitle: '一键复用油墨配方', logType: 'business' }
);
