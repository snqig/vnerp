import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ToolManagementService } from '@/application/services/ToolManagementService';

const service = new ToolManagementService();

export const GET = withPermission(
  async (_request: NextRequest) => {
    const dashboard = await service.getDashboard();
    return successResponse(dashboard);
  },
  { logTitle: '工装看板' }
);
