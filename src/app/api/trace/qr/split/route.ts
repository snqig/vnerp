import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { MysqlQRCodeRepository } from '@/infrastructure/repositories/MysqlQRCodeRepository';
import { QRCodeApplicationService } from '@/application/services/QRCodeApplicationService';

const repo = new MysqlQRCodeRepository();
const service = new QRCodeApplicationService(repo);

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { parentQrCode, splits } = body;
    if (!parentQrCode || !splits || !Array.isArray(splits) || splits.length === 0) {
      return errorResponse(ts('k_930u3p'), 400, 400);
    }
    const result = await service.splitParentQr(parentQrCode, splits);
    return successResponse(result, ts('k_dub4ql'));
  },
  { logTitle: '分切拆码' }
);
