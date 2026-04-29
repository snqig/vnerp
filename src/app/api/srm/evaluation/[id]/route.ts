import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return errorResponse('ID不能为空', 400, 400);

  const evalRows: any = await query('SELECT * FROM srm_supplier_eval WHERE id = ? AND deleted = 0', [id]);
  if (evalRows.length === 0) return errorResponse('评估记录不存在', 404, 404);

  const items: any = await query('SELECT * FROM srm_supplier_eval_item WHERE eval_id = ? ORDER BY sort_order, id', [id]);

  return successResponse({ ...evalRows[0], items });
});
