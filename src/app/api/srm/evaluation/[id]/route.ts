import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, userInfo, context) => {
  const ts = await getTranslations('Common');
  const { id: idStr } = await context.params;
  const id = Number(idStr);
  if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

  const evalRows = await query('SELECT * FROM srm_supplier_eval WHERE id = ? AND deleted = 0', [
    id,
  ]);
  if (evalRows.length === 0) return errorResponse(ts('k_1njcwb1'), 404, 404);

  const items = await query(
    'SELECT * FROM srm_supplier_eval_item WHERE eval_id = ? ORDER BY sort_order, id',
    [id]
  );

  return successResponse({ ...evalRows[0], items });
});
