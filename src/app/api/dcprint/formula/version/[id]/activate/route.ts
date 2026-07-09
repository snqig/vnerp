import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { activateVersion } from '@/application/services/InkFormulaVersionService';

// POST /api/dcprint/formula/version/:id/activate — 版本生效
export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    try {
      await activateVersion(Number(id), userInfo.userId);
      return successResponse(null, '版本已生效，旧版本已自动归档');
    } catch (e) {
      return errorResponse((e as Error).message || '生效失败', 400, 400);
    }
  },
  { logTitle: '油墨配方版本生效', logType: 'business' }
);
