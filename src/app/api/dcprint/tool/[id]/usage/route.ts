import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ToolManagementService } from '@/application/services/ToolManagementService';

const service = new ToolManagementService();

export const GET = withPermission(
  async (
    request: NextRequest,
    _userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const records = await service.listUsageRecords(Number(id));
    return successResponse({ list: records });
  },
  { logTitle: '工装使用记录' }
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
      await service.recordUsage({
        toolId: Number(id),
        workOrderId: body.workOrderId,
        workOrderNo: body.workOrderNo,
        processId: body.processId,
        processName: body.processName,
        useCount: body.useCount,
        operatorId: userInfo?.id,
        operatorName: userInfo?.username,
        remark: body.remark,
      });
      return successResponse({ id }, 'Usage recorded');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '记录工装使用' }
);
