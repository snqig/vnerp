import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { query, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import { ReturnOrderApplicationService } from '@/application/services/ReturnOrderApplicationService';
import { MysqlReturnOrderRepository } from '@/infrastructure/repositories/MysqlReturnOrderRepository';
import { MysqlReceivableRepository } from '@/infrastructure/repositories/MysqlReceivableRepository';
import { RepositoryRegistry } from '@/infrastructure/RepositoryRegistry';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';

const returnService = new ReturnOrderApplicationService(
  new MysqlReturnOrderRepository(),
  RepositoryRegistry.getInboundOrderRepository(),
  new MysqlReceivableRepository()
);

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const customerId = searchParams.get('customerId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  let where = 'WHERE r.deleted = 0';
  const params: Loose[] = [];

  if (keyword) {
    where += ' AND (r.return_no LIKE ? OR r.remark LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status && status !== 'all') {
    where += ' AND r.status = ?';
    params.push(parseInt(status));
  }
  if (customerId) {
    where += ' AND r.customer_id = ?';
    params.push(Number(customerId));
  }
  if (startDate) {
    where += ' AND r.return_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND r.return_date <= ?';
    params.push(endDate);
  }

  const countRows: Loose = await query(
    `SELECT COUNT(*) as total FROM sal_return r ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const rows: Loose = await query(
    `SELECT r.*, c.customer_name, c.customer_code,
      (SELECT COUNT(*) FROM sal_return_detail WHERE return_id = r.id AND deleted = 0) as item_count
    FROM sal_return r
    LEFT JOIN crm_customer c ON r.customer_id = c.id
    ${where}
    ORDER BY r.id DESC
    LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return paginatedResponse(rows, { page, pageSize, total, totalPages });
});

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['customer_id', 'items']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse('退货明细不能为空', 400, 400);
    }

    const returnNo = body.return_no || (await generateDocumentNo('return_order'));

    const result = await transaction(async (conn) => {
      const {
        order_id,
        order_no,
        customer_id,
        customer_name,
        warehouse_id,
        delivery_id,
        delivery_no,
        return_date,
        reason,
        remark,
        items,
      } = body;

      let totalAmount = 0;
      for (const item of items) {
        const qty = parseFloat(item.return_qty || item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        totalAmount += qty * price;
      }

      await conn.execute(
        `INSERT INTO sal_return
        (return_no, status, order_id, order_no, customer_id, customer_name, warehouse_id,
         delivery_id, delivery_no, reason, return_date, total_amount, remark,
         create_by, create_time)
        VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          returnNo,
          order_id || null,
          order_no || null,
          customer_id,
          customer_name || null,
          warehouse_id || 1,
          delivery_id || null,
          delivery_no || null,
          reason || body.remark || '',
          return_date || new Date().toISOString().slice(0, 10),
          Math.round(totalAmount * 100) / 100,
          remark || null,
          userInfo.userId,
        ]
      );

      const [rows]: Loose = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const returnId = rows[0].id;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const qty = parseFloat(item.return_qty || item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const amount = Math.round(qty * price * 100) / 100;

        await conn.execute(
          `INSERT INTO sal_return_detail
          (return_id, line_no, delivery_detail_id, order_detail_id, material_id, material_code,
           material_name, material_spec, unit, quantity, unit_price, amount, batch_no, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            returnId,
            i + 1,
            item.delivery_detail_id || null,
            item.order_item_id || item.order_detail_id || null,
            item.material_id,
            item.material_code || '',
            item.material_name || '',
            item.material_spec || '',
            item.unit || '件',
            qty,
            price,
            amount,
            item.batch_no || null,
            item.remark || null,
          ]
        );
      }

      return { id: returnId, return_no: returnNo, status: 1 };
    });

    return successResponse(result, '销售退货单创建成功');
  },
  { logTitle: '创建销售退货单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse('参数不完整', 400, 400);
    }

    try {
      if (action === 'approve') {
        await returnService.approveReturn(id, userInfo.userId);
        return successResponse(null, '退货单审核成功');
      }

      if (action === 'complete') {
        const result = await returnService.completeReturn(id, userInfo.userId);
        return successResponse(result, '退货完成，已创建入库单和红字应收单');
      }

      if (action === 'cancel') {
        await returnService.cancelReturn(id, body.reason);
        return successResponse(null, '退货单已取消');
      }

      return errorResponse('不支持的操作类型', 400, 400);
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '更新退货单状态', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest('退货单ID不能为空');
    }

    try {
      await returnService.deleteReturn(parseInt(id));
      return successResponse(null, '退货单删除成功');
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '删除退货单', logType: 'business' }
);
