import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(
  async (request: NextRequest, userInfo, context) => {
    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!id) return errorResponse('ID不能为空', 400, 400);

    const evalRows: any = await query(
      'SELECT * FROM srm_supplier_eval WHERE id = ? AND deleted = 0',
      [id]
    );
    if (evalRows.length === 0) return errorResponse('评估记录不存在', 404, 404);

    const items: any = await query(
      'SELECT * FROM srm_supplier_eval_item WHERE eval_id = ? ORDER BY sort_order, id',
      [id]
    );

    return successResponse({ ...evalRows[0], items });
  }
);
