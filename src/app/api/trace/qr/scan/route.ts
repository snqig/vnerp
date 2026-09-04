import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { MysqlQRCodeRepository } from '@/infrastructure/repositories/MysqlQRCodeRepository';
import { QRCodeApplicationService } from '@/application/services/QRCodeApplicationService';
import { invalidateTraceCache } from '@/application/services/TraceCacheService';

const repo = new MysqlQRCodeRepository();
const service = new QRCodeApplicationService(repo);

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { qrCode, operator, location } = body;
    if (!qrCode || !operator) {
      return errorResponse(ts('k_m4zhg'), 400, 400);
    }
    await service.recordScan(qrCode, operator, location || '');
    await invalidateTraceCache(qrCode);
    return successResponse(null, ts('k_15akwv7'));
  },
  { logTitle: '扫码登记' }
);
