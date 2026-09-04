import { getTranslations } from 'next-intl/server';

;
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
import type { DbRow } from '@/types/db';

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
  const ts = await getTranslations('Common');
    const body = await request.json();

    if (!body.po_id || typeof body.po_id !== 'number') {
      return errorResponse(ts('k_22hbhn'), 422, 422);
    }
    if (!body.warehouse_id || typeof body.warehouse_id !== 'number') {
      return errorResponse(ts('k_1t9r8nc'), 422, 422);
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse(ts('k_1oa14sj'), 422, 422);
    }

    for (const item of body.items) {
      if (!item.line_no || !item.material_id || !item.material_name || !item.batch_no) {
        return errorResponse(
          ts('k_1t3migk'),
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
        items: body.items.map((item: DbRow) => ({
          lineNo: item.line_no,
          materialId: item.material_id,
          materialCode: item.material_code || '',
          materialName: item.material_name,
          materialSpec: item.material_spec,
          unit: item.unit || ts('k_w0gthl'),
          batchNo: item.batch_no,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          warehouseLocation: item.warehouse_location,
          produceDate: item.produce_date,
        })),
      });

      return successResponse(
        {
          order_id: result.id,
          order_no: result.orderNo,
          source_type: 'purchase_order',
          source_order_id: body.po_id,
        },
        ts('k_1eqq25p')
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
