import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ToolManagementService } from '@/application/services/ToolManagementService';

const service = new ToolManagementService();

export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();
    try {
      await service.scrapTool({
        toolId: Number(id),
        scrapReason: body.scrapReason,
        scrapBy: userInfo?.id,
      });
      return successResponse({ id }, 'Tool scrapped');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '工装报废' }
);
