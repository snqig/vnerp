import { NextRequest } from 'next/server';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { InboundApplicationService } from '@/application/services/InboundApplicationService';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';
import { RepositoryRegistry } from '@/infrastructure/RepositoryRegistry';
import { registerEventHandlers } from '@/application/EventRegistry';

function getInboundService(): InboundApplicationService {
  registerEventHandlers();
  const orderRepo = RepositoryRegistry.getInboundOrderRepository();
  const purchaseRepo = RepositoryRegistry.getPurchaseOrderRepository();
  return new InboundApplicationService(
    orderRepo,
    new CurrencyApplicationService(new MysqlCurrencyRepository()),
    purchaseRepo
  );
}

export const POST = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();

    if (!body.po_id || typeof body.po_id !== 'number') {
      return errorResponse('采购单ID不能为空', 422, 422);
    }
    if (!body.warehouse_id || typeof body.warehouse_id !== 'number') {
      return errorResponse('仓库ID不能为空', 422, 422);
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse('入库明细不能为空', 422, 422);
    }

    for (const item of body.items) {
      if (!item.line_no || !item.material_id || !item.material_name || !item.batch_no) {
        return errorResponse(
          '入库明细缺少必填字段(line_no/material_id/material_name/batch_no)',
          422,
          422
        );
      }
      if (!item.quantity || item.quantity <= 0) {
        return errorResponse(`行号${item.line_no}入库数量必须大于0`, 422, 422);
      }
      if (item.unit_price < 0) {
        return errorResponse(`行号${item.line_no}单价不能为负数`, 422, 422);
      }
    }

    const service = getInboundService();

    try {
      const result = await service.createInboundFromPO({
        poId: body.po_id,
        warehouseId: body.warehouse_id,
        items: body.items.map((item: Loose) => ({
          lineNo: item.line_no,
          materialId: item.material_id,
          materialCode: item.material_code || '',
          materialName: item.material_name,
          materialSpec: item.material_spec,
          unit: item.unit || '件',
          batchNo: item.batch_no,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          warehouseLocation: item.warehouse_location,
          produceDate: item.produce_date,
        })),
      });

      return successResponse(
        { order_id: result.id, order_no: result.orderNo },
        '从采购单创建入库单成功'
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        return commonErrors.notFound(error.message);
      }
      if (error instanceof VersionConflictError) {
        return errorResponse(error.message, 409, 409);
      }
      if (error instanceof DomainError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);
