import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('ID不能为空', 400, 400);
  }

  const certRows: any = await query(
    'SELECT * FROM qms_sgs_cert WHERE id = ? AND deleted = 0',
    [id]
  );

  if (certRows.length === 0) {
    return errorResponse('SGS认证记录不存在', 404, 404);
  }

  const items: any = await query(
    'SELECT * FROM qms_sgs_cert_item WHERE cert_id = ? ORDER BY sort_order',
    [id]
  );

  return successResponse({ ...certRows[0], items });
});
