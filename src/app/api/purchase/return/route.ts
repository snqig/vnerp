import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { PurchaseReturnApplicationService } from '@/application/services/PurchaseReturnApplicationService';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import type { PurchaseReturnLineProps } from '@/domain/purchase/entities/PurchaseReturnLine';

const returnService = PurchaseReturnApplicationService.create();

// 采购退货单列表查询
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const supplierId = searchParams.get('supplierId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const where: string[] = ['r.deleted = 0'];
  const params: Loose[] = [];

  if (keyword) {
    where.push(
      '(r.return_no LIKE ? OR r.order_no LIKE ? OR r.supplier_name LIKE ? OR r.reason LIKE ?)'
    );
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }
  if (status) {
    where.push('r.status = ?');
    params.push(Number(status));
  }
  if (supplierId) {
    where.push('r.supplier_id = ?');
    params.push(Number(supplierId));
  }
  if (startDate) {
    where.push('r.return_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    where.push('r.return_date <= ?');
    params.push(endDate);
  }

  const whereClause = where.join(' AND ');

  const countRows: Loose = await query(
    `SELECT COUNT(*) as total FROM pur_purchase_return r WHERE ${whereClause}`,
    params
  );
  const total = countRows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 0;

  const rows: Loose = await query(
    `SELECT r.id, r.return_no, r.status, r.order_id, r.order_no,
       r.supplier_id, r.supplier_name, r.warehouse_id, r.receipt_id, r.receipt_no,
       r.reason, r.return_date, r.total_amount,
       r.currency, r.exchange_rate, r.base_total_amount,
       r.approve_by, r.approve_time, r.complete_by, r.complete_time,
       r.outbound_order_id, r.outbound_order_no, r.payable_id, r.payable_no,
       r.remark, r.create_by, r.create_time, r.update_time,
       (SELECT COUNT(*) FROM pur_purchase_return_line WHERE return_id = r.id) AS line_count
     FROM pur_purchase_return r
     WHERE ${whereClause}
     ORDER BY r.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return paginatedResponse(rows, { page, pageSize, total, totalPages });
});

// 创建采购退货单
export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, [
      'order_id',
      'supplier_id',
      'warehouse_id',
      'reason',
      'items',
    ]);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse('退货明细不能为空', 400, 400);
    }

    const lines: PurchaseReturnLineProps[] = body.items.map((item: Loose, index: number) => ({
      lineNo: index + 1,
      orderLineId: item.order_line_id ?? undefined,
      materialId: item.material_id,
      materialCode: item.material_code || '',
      materialName: item.material_name || '',
      materialSpec: item.material_spec || '',
      unit: item.unit || '件',
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price) || 0,
      batchNo: item.batch_no || '',
      reason: item.reason || '',
      remark: item.remark || '',
    }));

    try {
      const result = await returnService.createReturn({
        returnNo: body.return_no || '',
        orderId: Number(body.order_id),
        orderNo: body.order_no || '',
        supplierId: Number(body.supplier_id),
        supplierName: body.supplier_name || '',
        warehouseId: Number(body.warehouse_id),
        receiptId: body.receipt_id ?? undefined,
        receiptNo: body.receipt_no || '',
        reason: body.reason,
        returnDate: body.return_date || new Date().toISOString().slice(0, 10),
        lines,
        remark: body.remark || '',
        createBy: userInfo.userId,
      });

      return successResponse({ id: result.id, return_no: result.returnNo }, '采购退货单创建成功');
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '创建采购退货单', logType: 'business' }
);

// 退货单操作：审核 / 完成 / 取消
export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse('参数不完整：需要 id 和 action', 400, 400);
    }

    try {
      if (action === 'approve') {
        const result = await returnService.approveReturn(Number(id), userInfo.userId);
        return successResponse(result, '采购退货单审核成功');
      }

      if (action === 'complete') {
        const result = await returnService.completeReturn(Number(id), userInfo.userId);
        return successResponse(result, '采购退货单已完成');
      }

      if (action === 'cancel') {
        const result = await returnService.cancelReturn(Number(id), body.reason);
        return successResponse(result, '采购退货单已取消');
      }

      return errorResponse('不支持的操作类型', 400, 400);
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '更新采购退货单', logType: 'business' }
);

// 软删除退货单（仅待审核状态）
export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return commonErrors.badRequest('退货单ID不能为空');

    try {
      await returnService.deleteReturn(parseInt(id));
      return successResponse(null, '采购退货单删除成功');
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '删除采购退货单', logType: 'business' }
);
