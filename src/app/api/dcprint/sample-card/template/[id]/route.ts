import { NextRequest } from 'next/server';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessTemplateService } from '@/application/services/SampleProcessTemplateService';

const service = new SampleProcessTemplateService();

// 获取模板详情
export const GET = withPermission(
  async (_request: NextRequest, _userInfo, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const template = await service.getTemplateDetail(Number(id));
    if (!template) return commonErrors.notFound('模板不存在');
    return successResponse(template);
  }
);

// 更新模板
export const PUT = withPermission(
  async (
    request: NextRequest,
    userInfo: Loose,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();
    await service.updateTemplate(Number(id), body, userInfo.userId);
    return successResponse(null, '模板更新成功');
  },
  { logTitle: '更新标准工艺模板' }
);

// 删除模板（软删除）
export const DELETE = withPermission(
  async (_request: NextRequest, _userInfo, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await service.deleteTemplate(Number(id));
    return successResponse(null, '模板已删除');
  },
  { logTitle: '删除标准工艺模板' }
);
