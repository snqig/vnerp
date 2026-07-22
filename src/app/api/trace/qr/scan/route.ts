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
    const { qrContent, operator, location } = body;
    if (!qrContent || !operator) {
      return errorResponse('缺少必填字段: qrContent, operator', 400, 400);
    }
    await service.recordScan(qrContent, operator, location || '');
    return successResponse(null, '扫码登记成功');
  },
  { logTitle: '扫码登记' }
);
