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
    const { materialId, materialName, batchNo, quantity, count, sourceType } = body;
    if (!quantity || !count) {
      return errorResponse('缺少必填字段: quantity, count', 400, 400);
    }
    const result = await service.generateBatchQr(
      materialId ?? null,
      materialName ?? null,
      batchNo ?? null,
      Number(quantity),
      Number(count),
      sourceType ?? undefined
    );
    return successResponse(result, '二维码生成成功');
  },
  { logTitle: '批量生成二维码' }
);
