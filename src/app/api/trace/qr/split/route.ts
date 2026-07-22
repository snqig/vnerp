import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { MysqlQRCodeRepository } from '@/infrastructure/repositories/MysqlQRCodeRepository';
import { QRCodeApplicationService } from '@/application/services/QRCodeApplicationService';

const repo = new MysqlQRCodeRepository();
const service = new QRCodeApplicationService(repo);

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { parentQrCode, splits } = body;
    if (!parentQrCode || !splits || !Array.isArray(splits) || splits.length === 0) {
      return errorResponse('缺少必填字段: parentQrCode, splits', 400, 400);
    }
    const result = await service.splitParentQr(parentQrCode, splits);
    return successResponse(result, '二维码拆分成功');
  },
  { logTitle: '分切拆码' }
);
