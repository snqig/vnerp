import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  listColors,
  createColor,
  updateColor,
  deleteColor,
} from '@/application/services/InkFormulaVersionService';

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';

  const result = await listColors({ page, pageSize, keyword, status });
  return successResponse(result);
});

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();

    if (!body.color_code || !body.color_name) {
      return errorResponse('色号编码和名称不能为空', 400, 400);
    }

    try {
      const id = await createColor(body, userInfo.userId);
      return successResponse({ id }, '色号创建成功');
    } catch (e) {
      if ((e as Error & { code?: string }).code === 'ER_DUP_ENTRY') {
        return errorResponse('色号编码已存在', 409, 409);
      }
      return errorResponse((e as Error).message || '创建失败', 500, 500);
    }
  },
  { logTitle: '创建油墨色号', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return errorResponse('缺少色号ID', 400, 400);
    }

    try {
      await updateColor(Number(id), data, userInfo.userId);
      return successResponse(null, '色号更新成功');
    } catch (e) {
      return errorResponse((e as Error).message || '更新失败', 500, 500);
    }
  },
  { logTitle: '更新油墨色号', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('缺少id', 400, 400);

    try {
      await deleteColor(Number(id));
      return successResponse(null, '色号删除成功');
    } catch (e) {
      return errorResponse((e as Error).message || '删除失败', 500, 500);
    }
  },
  { logTitle: '删除油墨色号', logType: 'business' }
);
