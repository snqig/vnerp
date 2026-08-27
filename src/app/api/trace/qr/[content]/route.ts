import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { MysqlQRCodeRepository } from '@/infrastructure/repositories/MysqlQRCodeRepository';
import { QRCodeApplicationService } from '@/application/services/QRCodeApplicationService';

const repo = new MysqlQRCodeRepository();
const service = new QRCodeApplicationService(repo);

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const content = request.nextUrl.pathname.match(/\/api\/trace\/qr\/(.+)/)?.[1];
  if (!content) {
    return errorResponse('缺少二维码编码', 400, 400);
  }
  const timeline = await service.getTraceTimeline(decodeURIComponent(content));
  return successResponse(timeline);
});
