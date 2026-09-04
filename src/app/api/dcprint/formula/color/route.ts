import { getTranslations } from 'next-intl/server';

;
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
  const ts = await getTranslations('Common');
    const body = await request.json();

    if (!body.color_code || !body.color_name) {
      return errorResponse(ts('k_x3hboi'), 400, 400);
    }

    try {
      const id = await createColor(body, userInfo.userId);
      return successResponse({ id }, ts('k_d7c0fy'));
    } catch (e) {
      if ((e as Error & { code?: string }).code === 'ER_DUP_ENTRY') {
        return errorResponse(ts('k_1pqrr0r'), 409, 409);
      }
      return errorResponse((e as Error).message || ts('k_1jxltyq'), 500, 500);
    }
  },
  { logTitle: '创建油墨色号', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return errorResponse(ts('k_uu44wi'), 400, 400);
    }

    try {
      await updateColor(Number(id), data, userInfo.userId);
      return successResponse(null, ts('k_1pj1r4r'));
    } catch (e) {
      return errorResponse((e as Error).message || ts('k_10lkv9z'), 500, 500);
    }
  },
  { logTitle: '更新油墨色号', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_js4lo9'), 400, 400);

    try {
      await deleteColor(Number(id));
      return successResponse(null, ts('k_zji6gb'));
    } catch (e) {
      return errorResponse((e as Error).message || ts('k_1ijrr73'), 500, 500);
    }
  },
  { logTitle: '删除油墨色号', logType: 'business' }
);
