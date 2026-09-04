import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
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
import type { DbRow } from '@/types/db';

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
  const params: SqlValue[] = [];

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

  const countRows = await query(
    `SELECT COUNT(*) as total FROM pur_purchase_return r WHERE ${whereClause}`,
    params
  );
  const total = countRows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 0;

  const rows = await query(
    `SELECT r.id, r.return_no, r.status, r.order_id, r.order_no,
       r.supplier_id, r.supplier_name, r.warehouse_id, r.receipt_id, r.receipt_no,
       r.reason, r.return_date, r.total_amount,
       r.currency, r.exchange_rate, r.base_total_amount, r.base_currency,
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
  const ts = await getTranslations('Common');
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
      return errorResponse(ts('k_13rzlse'), 400, 400);
    }

    const lines: PurchaseReturnLineProps[] = body.items.map((item: DbRow, index: number) => ({
      lineNo: index + 1,
      orderLineId: item.order_line_id ?? undefined,
      materialId: item.material_id,
      materialCode: item.material_code || '',
      materialName: item.material_name || '',
      materialSpec: item.material_spec || '',
      unit: item.unit || ts('k_w0gthl'),
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

      return successResponse({ id: result.id, return_no: result.returnNo }, ts('k_1dt30m7'));
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
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse(ts('k_ghp81y'), 400, 400);
    }

    try {
      if (action === 'approve') {
        const result = await returnService.approveReturn(Number(id), userInfo.userId);
        return successResponse(result, ts('k_em39n'));
      }

      if (action === 'complete') {
        const result = await returnService.completeReturn(Number(id), userInfo.userId);
        return successResponse(result, ts('k_18upe7j'));
      }

      if (action === 'cancel') {
        const result = await returnService.cancelReturn(Number(id), body.reason);
        return successResponse(result, ts('k_1v3zae5'));
      }

      return errorResponse(ts('k_j9tktz'), 400, 400);
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
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return commonErrors.badRequest(ts('k_2a7i9w'));

    try {
      await returnService.deleteReturn(parseInt(id));
      return successResponse(null, ts('k_lqd7ba'));
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '删除采购退货单', logType: 'business' }
);
