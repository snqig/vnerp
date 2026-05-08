import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { InboundApplicationService } from '@/application/services/InboundApplicationService';
import { MysqlInboundOrderRepository } from '@/infrastructure/repositories/MysqlInboundOrderRepository';
import { registerEventHandlers } from '@/infrastructure/config/EventRegistry';

function getInboundService(): InboundApplicationService {
  const eventBus = registerEventHandlers();
  const orderRepo = new MysqlInboundOrderRepository();
  return new InboundApplicationService(orderRepo, eventBus);
}

export const GET = withAuthAndErrorHandler(async (request: NextRequest, userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const service = getInboundService();
  const result = await service.listOrders(status, page, pageSize, {
    keyword: keyword || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const serializedData = result.data.map(order => ({
    id: order.id,
    order_no: order.orderNo,
    inbound_date: order.inboundDate,
    supplier_name: order.supplierName,
    warehouse_id: order.warehouseId,
    order_type: order.orderType,
    total_quantity: order.totalQuantity,
    total_amount: order.totalAmount.amount,
    status: order.status.value,
    remark: order.remark,
    create_time: order.createTime,
    update_time: order.updateTime,
    items: order.items.map(item => ({
      id: item.id,
      order_id: item.orderId,
      material_id: item.materialId,
      material_code: item.materialCode,
      material_name: item.materialName,
      material_spec: item.materialSpec,
      batch_no: item.batchNo,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      warehouse_location: item.warehouseLocation,
      produce_date: item.produceDate,
    })),
  }));

  return paginatedResponse(serializedData, result.pagination);
}, { permission: 'warehouse:inbound:list' });

export const POST = withAuthAndErrorHandler(async (request: NextRequest, userInfo: UserInfo) => {
  const body = await request.json();

  const validation = validateRequestBody(body, ['items']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return errorResponse('入库项不能为空', 400, 400);
  }

  const service = getInboundService();
  const result = await service.createOrder({
    warehouseId: body.warehouse_id,
    supplierName: body.supplier_name || '',
    inboundDate: body.inbound_date,
    remark: body.remark,
    operatorId: userInfo.userId,
    items: body.items.map((item: any) => ({
      materialId: item.material_id || 0,
      materialCode: item.material_code,
      materialName: item.material_name || '',
      materialSpec: item.material_spec,
      batchNo: item.batch_no || '',
      quantity: item.quantity || 0,
      unit: item.unit || '件',
      unitPrice: item.unit_price || 0,
      warehouseLocation: item.warehouse_location,
      produceDate: item.produce_date,
    })),
  });

  return successResponse({ order_id: result.id, order_no: result.orderNo }, '入库单创建成功');
}, { permission: 'warehouse:inbound:create' });

export const PUT = withAuthAndErrorHandler(async (request: NextRequest, userInfo: UserInfo) => {
  const body = await request.json();
  const { id, action, status, remark } = body;

  if (!id) {
    return errorResponse('入库单ID不能为空', 400, 400);
  }

  const service = getInboundService();

  try {
    if (action === 'approve' || status === 'approved') {
      const result = await service.approveOrder(id);
      return successResponse(result, '入库单审核成功');
    }

    if (action === 'submit' || status === 'pending') {
      const result = await service.submitOrder(id);
      return successResponse(result, '入库单提交成功');
    }

    if (action === 'cancel' || status === 'cancelled') {
      const result = await service.cancelOrder(id);
      return successResponse(result, '入库单取消成功');
    }

    if (action === 'unapprove') {
      const result = await service.unapproveOrder(id);
      return successResponse(result, '入库单反审核成功');
    }

    if (remark !== undefined) {
      const { execute } = await import('@/lib/db');
      await execute(
        'UPDATE inv_inbound_order SET remark = ?, update_time = NOW() WHERE id = ? AND status != ?',
        [remark, id, 'completed']
      );
      return successResponse({ id, remark }, '入库单更新成功');
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
}, { permission: 'warehouse:inbound:edit' });

export const DELETE = withAuthAndErrorHandler(async (request: NextRequest, userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('入库单ID不能为空', 400, 400);
  }

  const service = getInboundService();

  try {
    await service.deleteOrder(parseInt(id));
    return successResponse(null, '入库单删除成功');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return commonErrors.notFound(error.message);
    }
    if (error instanceof DomainError) {
      return errorResponse(error.message, 400, 400);
    }
    throw error;
  }
}, { permission: 'warehouse:inbound:delete' });
