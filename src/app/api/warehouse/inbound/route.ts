import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { InboundApplicationService } from '@/application/services/InboundApplicationService';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';
import { RepositoryRegistry } from '@/infrastructure/RepositoryRegistry';
import { registerEventHandlers } from '@/application/EventRegistry';
import { createInboundOrderSchema, updateInboundOrderSchema } from '@/lib/validations/inbound';
import { ZodError } from 'zod/v4';

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

export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
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

    const serializedData = result.data.map((order) => ({
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
      items: order.items.map((item) => ({
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
  },
  { errorMessage: '操作失败' }
);

export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();

    let validated: Loose;
    try {
      validated = createInboundOrderSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        const messages = e.issues
          .map((iss: Loose) => `${iss.path.join('.')}: ${iss.message}`)
          .join('; ');
        return errorResponse(`输入校验失败: ${messages}`, 422, 422);
      }
      throw e;
    }

    const service = getInboundService();
    const result = await service.createOrder({
      warehouseId: validated.warehouse_id,
      supplierName: validated.supplier_name || '',
      inboundDate: validated.inbound_date,
      remark: validated.remark,
      operatorId: userInfo.userId,
      items: validated.items.map((item: Loose) => ({
        materialId: item.material_id,
        materialCode: item.material_code,
        materialName: item.material_name,
        materialSpec: item.material_spec,
        batchNo: item.batch_no,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        warehouseLocation: item.warehouse_location,
        produceDate: item.produce_date,
      })),
    });

    return successResponse({ order_id: result.id, order_no: result.orderNo }, '入库单创建成功');
  },
  { errorMessage: '操作失败' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();

    let validated: Loose;
    try {
      validated = updateInboundOrderSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        const messages = e.issues
          .map((iss: Loose) => `${iss.path.join('.')}: ${iss.message}`)
          .join('; ');
        return errorResponse(`输入校验失败: ${messages}`, 422, 422);
      }
      throw e;
    }

    const { id, action, status, remark } = validated;

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
  },
  { errorMessage: '操作失败' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
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
  },
  { errorMessage: '操作失败' }
);

export const PATCH = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('入库单ID不能为空', 400, 400);
    }

    const { execute, query } = await import('@/lib/db');

    try {
      const [rows]: Loose = await query(
        'SELECT id FROM inv_inbound_order WHERE id = ? AND deleted = 1',
        [parseInt(id)]
      );

      if (!rows || rows.length === 0) {
        return errorResponse('入库单不存在或未被删除', 404, 404);
      }

      await execute('UPDATE inv_inbound_order SET deleted = 0, update_time = NOW() WHERE id = ?', [
        parseInt(id),
      ]);

      return successResponse(null, '入库单已恢复');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '恢复失败', 500, 500);
    }
  },
  { errorMessage: '恢复失败' }
);
