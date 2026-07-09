import { errorResponse } from '@/lib/api-response';

export async function POST() {
  return errorResponse('此接口已废弃，请使用 POST /api/warehouse/inbound/from-po', 410, 410);
}
