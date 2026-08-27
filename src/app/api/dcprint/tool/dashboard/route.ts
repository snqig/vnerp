import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ToolManagementService } from '@/application/services/ToolManagementService';
import { MysqlToolRepository } from '@/infrastructure/repositories/MysqlToolRepository';

const service = new ToolManagementService(new MysqlToolRepository());

export const GET = withPermission(
  async (_request: NextRequest) => {
    const dashboard = await service.getDashboard();
    return successResponse(dashboard);
  },
  { logTitle: '工装看板' }
);
