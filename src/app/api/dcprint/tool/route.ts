import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ToolManagementService } from '@/application/services/ToolManagementService';

const service = new ToolManagementService();

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const toolType = searchParams.get('toolType')
      ? Number(searchParams.get('toolType'))
      : undefined;
    const status = searchParams.get('status') ? Number(searchParams.get('status')) : undefined;
    const keyword = searchParams.get('keyword') || undefined;
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 20);

    const result = await service.listTools({ toolType, status, keyword, page, pageSize });
    return successResponse(result);
  },
  { logTitle: '工装列表查询' }
);

export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    try {
      const id = await service.createTool({
        toolType: body.toolType,
        toolCode: body.toolCode,
        toolName: body.toolName,
        spec: body.spec,
        materialId: body.materialId,
        totalLife: body.totalLife,
        warningThreshold: body.warningThreshold,
        originalCost: body.originalCost,
        manufactureDate: body.manufactureDate,
        warehouseLocation: body.warehouseLocation,
        remark: body.remark,
      });
      return successResponse({ id }, 'Tool created');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '创建工装' }
);
