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
    const { qrType, batchNo, quantity, count, materialId, materialCode, materialName, unit, warehouseId, warehouseName, refId, refNo } = body;
    if (!quantity || !count) {
      return errorResponse('缺少必填字段: quantity, count', 400, 400);
    }
    const result = await service.generateBatchQr({
      qrType,
      batchNo: batchNo ?? null,
      quantity: Number(quantity),
      count: Number(count),
      materialId: materialId ?? null,
      materialCode: materialCode ?? null,
      materialName: materialName ?? null,
      unit: unit ?? null,
      warehouseId: warehouseId ?? null,
      warehouseName: warehouseName ?? null,
      refId: refId ?? null,
      refNo: refNo ?? null,
    });
    return successResponse(result, '二维码生成成功');
  },
  { logTitle: '批量生成二维码' }
);
