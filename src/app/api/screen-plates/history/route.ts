import { query, execute } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import type { NextRequest } from 'next/server';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const plateId = searchParams.get('plateId');

  if (!plateId) {
    return errorResponse('缺少网版ID', 400);
  }

  const rows = await query(`
    SELECT * FROM screen_plate_history
    WHERE screen_plate_id = ?
    ORDER BY created_at DESC
  `, [plateId]);

  return successResponse(rows, '网版生命周期记录');
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { plateId, action, tensionValue, lifeIncrement, remark, operatorId, operatorName } = body;

  if (!plateId || !action) {
    return errorResponse('缺少必要参数', 400);
  }

  const result = await execute(`
    INSERT INTO screen_plate_history (screen_plate_id, action, tension_value, life_increment, remark, operator_id, operator_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [plateId, action, tensionValue ?? null, lifeIncrement || 0, remark ?? null, operatorId ?? null, operatorName ?? null]);

  const updateFields: string[] = ['update_time = NOW()'];
  const params: any[] = [];

  if (tensionValue !== undefined) {
    updateFields.push('tension_value = ?', 'tension_date = NOW()');
    params.push(tensionValue, tensionValue);
  }

  if (lifeIncrement && lifeIncrement > 0) {
    updateFields.push('life_count = life_count + ?', 'remaining_count = remaining_count - ?');
    params.push(lifeIncrement, lifeIncrement);
  }

  if (action === 'Cleaned') {
    updateFields.push('last_clean_date = NOW()');
  } else if (action === 'Reclaimed') {
    updateFields.push('last_reclaim_date = NOW()', 'reclaim_count = reclaim_count + 1');
  } else if (action === 'Exposed') {
    updateFields.push('exposure_date = NOW()');
  } else if (action === 'Printed') {
    updateFields.push('last_used_date = NOW()');
  } else if (action === 'Scrapped') {
    updateFields.push('status = 9');
  }

  if (body.status !== undefined) {
    updateFields.push('status = ?');
    params.push(body.status);
  }

  if (updateFields.length > 1) {
    params.push(plateId);
    await execute(`UPDATE prd_screen_plate SET ${updateFields.join(', ')} WHERE id = ?`, params);
  }

  return successResponse({ historyId: (result as any).insertId }, '生命周期记录添加成功');
});
