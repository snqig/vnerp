import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, type SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const id = request.nextUrl.pathname.match(/\/api\/trace\/label\/(\d+)/)?.[1];
    if (!id) {
      return errorResponse(ts('k_1hdm9cd'), 400, 400);
    }
    const body = await request.json();
    const { name, scenario, htmlTemplate, widthMm, heightMm, qrSizeMm, status } = body;
    const sets: string[] = [];
    const params: SqlValue[] = [];
    if (name !== undefined) {
      sets.push('name = ?');
      params.push(name);
    }
    if (scenario !== undefined) {
      sets.push('scenario = ?');
      params.push(scenario);
    }
    if (htmlTemplate !== undefined) {
      sets.push('html_template = ?');
      params.push(htmlTemplate);
    }
    if (widthMm !== undefined) {
      sets.push('width_mm = ?');
      params.push(widthMm);
    }
    if (heightMm !== undefined) {
      sets.push('height_mm = ?');
      params.push(heightMm);
    }
    if (qrSizeMm !== undefined) {
      sets.push('qr_size_mm = ?');
      params.push(qrSizeMm);
    }
    if (status !== undefined) {
      sets.push('status = ?');
      params.push(status);
    }
    if (sets.length === 0) {
      return errorResponse(ts('k_1kyikfw'), 400, 400);
    }
    sets.push('update_time = NOW()');
    params.push(Number(id));
    await execute(`UPDATE label_template SET ${sets.join(', ')} WHERE id = ?`, params);
    return successResponse(null, ts('k_boerid'));
  },
  { logTitle: '更新标签模板' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const id = request.nextUrl.pathname.match(/\/api\/trace\/label\/(\d+)/)?.[1];
    if (!id) {
      return errorResponse(ts('k_1hdm9cd'), 400, 400);
    }
    await execute('UPDATE label_template SET status = 0, update_time = NOW() WHERE id = ?', [
      Number(id),
    ]);
    return successResponse(null, ts('k_1vt2jz2'));
  },
  { logTitle: '停用标签模板' }
);
