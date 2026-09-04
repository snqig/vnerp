import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { MysqlQRCodeRepository } from '@/infrastructure/repositories/MysqlQRCodeRepository';
import { QRCodeApplicationService } from '@/application/services/QRCodeApplicationService';

const repo = new MysqlQRCodeRepository();
const service = new QRCodeApplicationService(repo);

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const content = request.nextUrl.pathname.match(/\/api\/trace\/qr\/(.+)/)?.[1];
  if (!content) {
    return errorResponse(ts('k_m4aj8u'), 400, 400);
  }
  const timeline = await service.getTraceTimeline(decodeURIComponent(content));
  return successResponse(timeline);
});
