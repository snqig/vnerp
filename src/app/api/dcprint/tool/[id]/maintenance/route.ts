import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ToolManagementService } from '@/application/services/ToolManagementService';
import { MysqlToolRepository } from '@/infrastructure/repositories/MysqlToolRepository';

const service = new ToolManagementService(new MysqlToolRepository());

export const GET = withPermission(
  async (
    request: NextRequest,
    _userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const records = await service.listMaintenanceRecords(Number(id));
    return successResponse({ list: records });
  },
  { logTitle: '工装维修记录' }
);

export const POST = withPermission(
  async (
    request: NextRequest,
    userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();
    try {
      if (body.action === 'complete') {
        await service.completeMaintenance({
          maintenanceId: body.maintenanceId,
          maintenanceCost: body.maintenanceCost,
          lifeAfter: body.lifeAfter,
          description: body.description,
        });
        return successResponse({ id }, 'Maintenance completed');
      }
      const maintenanceId = await service.startMaintenance({
        toolId: Number(id),
        maintenanceType: body.maintenanceType,
        description: body.description,
        operatorId: userInfo?.id,
        operatorName: userInfo?.username,
        remark: body.remark,
      });
      return successResponse({ maintenanceId }, 'Maintenance started');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '工装维修操作' }
);
