import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { PurchaseApplicationService } from '@/application/services/PurchaseApplicationService';
import { RepositoryRegistry } from '@/infrastructure/RepositoryRegistry';
import { registerEventHandlers } from '@/application/EventRegistry';
import { PurchaseOrderStatus } from '@/domain/purchase/value-objects/PurchaseOrderStatus';

function getPurchaseService(): PurchaseApplicationService {
  registerEventHandlers();
  const orderRepo = RepositoryRegistry.getPurchaseOrderRepository();
  return new PurchaseApplicationService(orderRepo);
}

export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const supplierId = searchParams.get('supplierId');
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const service = getPurchaseService();
  const result = await service.listOrders(status, page, pageSize, {
    keyword: keyword || undefined,
    supplierId: supplierId ? parseInt(supplierId) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const serializedData = result.data.map((order) => ({
    id: order.id,
    po_no: order.orderNo,
    supplier_id: order.supplierId,
    supplier_name: order.supplierName,
    supplier_code: order.supplierCode,
    order_date: order.orderDate,
    delivery_date: order.deliveryDate,
    currency: order.currency,
    exchange_rate: order.exchangeRate,
    total_amount: order.totalAmount,
    total_quantity: order.totalQuantity,
    tax_rate: order.taxRate,
    tax_amount: order.taxAmount,
    grand_total: order.grandTotal,
    status: order.status.toDbCode(),
    status_label: order.status.label(),
    over_receipt_tolerance: order.overReceiptTolerance,
    payment_terms: order.paymentTerms,
    remark: order.remark,
    create_by: order.createBy,
    audit_by: order.auditBy,
    audit_time: order.auditTime,
    total_received_qty: order.totalReceivedQty,
    is_fully_received: order.isFullyReceived,
    create_time: order.createTime,
    update_time: order.updateTime,
    lines: order.lines.map((line) => ({
      id: line.id,
      line_no: line.lineNo,
      material_id: line.materialId,
      material_code: line.materialCode,
      material_name: line.materialName,
      material_spec: line.materialSpec,
      unit: line.unit,
      order_qty: line.orderQty,
      received_qty: line.receivedQty,
      remaining_qty: line.remainingQty,
      unit_price: line.unitPrice,
      amount: line.amount,
      tax_rate: line.taxRate,
      tax_amount: line.taxAmount,
      line_total: line.lineTotal,
      require_date: line.requireDate,
      is_fully_received: line.isFullyReceived,
    })),
  }));

  return paginatedResponse(serializedData, result.pagination);
});

export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();

    const validation = validateRequestBody(body, ['supplier_id', 'lines']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return errorResponse('采购明细不能为空', 400, 400);
    }

    const service = getPurchaseService();

    try {
      const result = await service.createOrder({
        supplierId: body.supplier_id,
        supplierName: body.supplier_name || '',
        supplierCode: body.supplier_code || '',
        orderDate: body.order_date || new Date().toISOString().slice(0, 10),
        deliveryDate: body.delivery_date || '',
        currency: body.currency || 'CNY',
        exchangeRate: body.exchange_rate || 1.0,
        taxRate: body.tax_rate || 13,
        overReceiptTolerance: body.over_receipt_tolerance || 0,
        paymentTerms: body.payment_terms || '',
        deliveryAddress: body.delivery_address || '',
        remark: body.remark || '',
        createBy: userInfo.userId,
        lines: body.lines.map((line: any, index: number) => ({
          lineNo: index + 1,
          materialId: line.material_id,
          materialCode: line.material_code || '',
          materialName: line.material_name || '',
          materialSpec: line.material_spec || '',
          unit: line.unit || '件',
          orderQty: line.order_qty,
          receivedQty: 0,
          returnedQty: 0,
          unitPrice: line.unit_price || 0,
          amount: 0,
          taxRate: body.tax_rate || 13,
          taxAmount: 0,
          lineTotal: 0,
          requireDate: line.require_date,
          remark: line.remark || '',
        })),
      });

      return successResponse(result, '采购单创建成功');
    } catch (error) {
      if (error instanceof DomainError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return errorResponse('采购单ID不能为空', 400, 400);
    }

    const service = getPurchaseService();

    try {
      if (action === 'submit') {
        const result = await service.submitOrder(id);
        return successResponse(result, '采购单提交成功');
      }

      if (action === 'approve') {
        const result = await service.approveOrder(id, userInfo.userId);
        return successResponse(result, '采购单审核成功');
      }

      if (action === 'close') {
        const result = await service.closeOrder(id);
        return successResponse(result, '采购单关闭成功');
      }

      if (action === 'receive') {
        return errorResponse(
          '收货功能已迁移至入库模块，请使用 POST /api/warehouse/inbound/from-po',
          410,
          410
        );
      }

      return errorResponse('未知操作', 400, 400);
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

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('采购单ID不能为空', 400, 400);
    }

    const service = getPurchaseService();

    try {
      await service.deleteOrder(parseInt(id));
      return successResponse(null, '采购单删除成功');
    } catch (error) {
      if (error instanceof NotFoundError) {
        return commonErrors.notFound(error.message);
      }
      if (error instanceof DomainError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);
