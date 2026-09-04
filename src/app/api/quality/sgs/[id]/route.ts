import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse(ts('k_32pxya'), 400, 400);
  }

  const certRows = await query('SELECT * FROM qms_sgs_cert WHERE id = ? AND deleted = 0', [id]);

  if (certRows.length === 0) {
    return errorResponse(ts('k_1yz94j'), 404, 404);
  }

  const items = await query(
    'SELECT * FROM qms_sgs_cert_item WHERE cert_id = ? ORDER BY sort_order',
    [id]
  );

  return successResponse({ ...certRows[0], items });
});
