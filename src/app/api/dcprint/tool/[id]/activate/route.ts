import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ToolManagementService } from '@/application/services/ToolManagementService';

const service = new ToolManagementService();

export const POST = withPermission(
  async (request: NextRequest, _userInfo: any, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      await service.activateTool(Number(id));
      return successResponse({ id }, 'Tool activated');
    } catch (e: any) {
      return errorResponse(e.message, 400, 400);
    }
  },
  { logTitle: '激活工装' }
);
