import { errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async () => {
  return errorResponse('此接口已废弃，请使用 PUT /api/warehouse/inbound?action=approve', 410, 410);
});
