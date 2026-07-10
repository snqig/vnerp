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
    const tool = await service.getToolDetail(Number(id));
    if (!tool) return errorResponse('Tool not found', 404, 404);
    return successResponse(tool);
  },
  { logTitle: '工装详情' }
);

export const PUT = withPermission(
  async (
    request: NextRequest,
    _userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();
    await service.updateTool(Number(id), body);
    return successResponse({ id }, 'Tool updated');
  },
  { logTitle: '更新工装' }
);

export const DELETE = withPermission(
  async (
    request: NextRequest,
    _userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    try {
      await service.deleteTool(Number(id));
      return successResponse({ id }, 'Tool deleted');
    } catch (e) {
      return errorResponse((e as Error).message, 400, 400);
    }
  },
  { logTitle: '删除工装' }
);
