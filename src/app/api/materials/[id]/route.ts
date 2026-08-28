import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { AppError } from '@/lib/error-handling';

/**
 * 物料「是否可分切」手动覆盖（#21 分切物料类型限制）
 *
 * 列的默认置位由迁移 20260827132300_add_is_splittable 按分类（FILM/PAPER/PKG/RAW）完成，
 * 此处提供主数据维护的手动覆盖入口：某些非白名单物料需允许分切，
 * 或白名单物料需禁止分切时，由本接口单独改写该列。
 *
 * 仅校验登录（与 /api/materials GET 同权限档），不引入新权限。
 */
export const PATCH = withPermission(
  async (request: NextRequest, _user: unknown, context?: { params?: { id?: string } }) => {
    const idParam = context?.params?.id ?? new URL(request.url).pathname.split('/').pop();
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse('物料ID非法', 400, 400);
    }

    const body = await request.json().catch(() => ({}));
    const raw = body?.isSplittable;
    if (raw !== 0 && raw !== 1 && raw !== '0' && raw !== '1') {
      return errorResponse('isSplittable 只能为 0 或 1', 400, 400);
    }
    const flag = raw === 1 || raw === '1' ? 1 : 0;

    const rows = (await query(
      `UPDATE inv_material SET is_splittable = ?, update_time = NOW() WHERE id = ? AND deleted = 0`,
      [flag, id]
    )) as Array<{ affectedRows?: number }>;
    const affected = rows[0]?.affectedRows ?? 0;
    if (affected === 0) {
      throw AppError.notFound(`物料不存在或已删除（ID=${id}）`);
    }

    return successResponse({ id, isSplittable: flag }, '已更新物料可分切标记');
  }
);
