import { errorResponse } from '@/lib/api-response';

export async function POST() {
  return errorResponse('此接口已废弃，请使用 PUT /api/warehouse/inbound?action=approve', 410, 410);
}
