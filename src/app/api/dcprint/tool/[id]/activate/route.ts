import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ToolManagementService } from '@/application/services/ToolManagementService';
import { MysqlToolRepository } from '@/infrastructure/repositories/MysqlToolRepository';

const service = new ToolManagementService(new MysqlToolRepository());

export const POST = withPermission(
  async (
    request: NextRequest,
    _userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    try {
      await service.activateTool(Number(id));
      return successResponse({ id }, 'Tool activated');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '激活工装' }
);
