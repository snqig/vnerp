import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { query, transaction, SqlValue } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import { ReturnOrderApplicationService } from '@/application/services/ReturnOrderApplicationService';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { MysqlReturnOrderRepository } from '@/infrastructure/repositories/MysqlReturnOrderRepository';
import { MysqlReceivableRepository } from '@/infrastructure/repositories/MysqlReceivableRepository';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';
import { RepositoryRegistry } from '@/infrastructure/RepositoryRegistry';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';

const returnService = new ReturnOrderApplicationService(
  new MysqlReturnOrderRepository(),
  RepositoryRegistry.getInboundOrderRepository(),
  new MysqlReceivableRepository(),
  RepositoryRegistry.getSalesOrderRepository(),
  new CurrencyApplicationService(new MysqlCurrencyRepository())
);

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const customerId = searchParams.get('customerId') || '';
  const orderId = searchParams.get('orderId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  let where = 'WHERE r.deleted = 0';
  const params: SqlValue[] = [];

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
  if (orderId) {
    // T402: 按销售订单 ID 过滤关联退货单
    where += ' AND r.order_id = ?';
    params.push(Number(orderId));
  }
  if (startDate) {
    where += ' AND r.return_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND r.return_date <= ?';
    params.push(endDate);
  }

  const countRows = await query(`SELECT COUNT(*) as total FROM sal_return r ${where}`, params);
  const total = countRows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const rows = await query(
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
  const ts = await getTranslations('Common');
    const body = await request.json();
    const validation = validateRequestBody(body, ['customer_id', 'order_id', 'warehouse_id', 'items']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse(ts('k_13rzlse'), 400, 400);
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
        return_type,
        return_date,
        reason,
        remark,
        items,
      } = body;

      let totalAmount = 0;
      let totalQty = 0;
      for (const item of items) {
        const qty = parseFloat(item.return_qty || item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        totalAmount += qty * price;
        totalQty += qty;
      }

      await conn.execute(
        `INSERT INTO sal_return
        (return_no, status, order_id, order_no, customer_id, customer_name, warehouse_id,
         delivery_id, delivery_no, return_type, reason, return_date, total_qty, total_amount, remark,
         create_by, create_time)
        VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          returnNo,
          order_id,
          order_no || null,
          customer_id,
          customer_name || null,
          warehouse_id,
          delivery_id || null,
          delivery_no || null,
          return_type || 1,
          reason || body.remark || '',
          return_date || new Date().toISOString().slice(0, 10),
          Math.round(totalQty * 100) / 100,
          Math.round(totalAmount * 100) / 100,
          remark || null,
          userInfo.userId,
        ]
      );

      const [rows] = await conn.execute('SELECT LAST_INSERT_ID() as id');
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
            item.unit || ts('k_w0gthl'),
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

    return successResponse(result, ts('k_1w7at6t'));
  },
  { logTitle: '创建销售退货单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse(ts('k_8dtv5q'), 400, 400);
    }

    try {
      if (action === 'approve') {
        await returnService.approveReturn(id, userInfo.userId);
        return successResponse(null, ts('k_1iw2eq7'));
      }

      if (action === 'complete') {
        const result = await returnService.completeReturn(id, userInfo.userId);
        return successResponse(result, ts('k_1bneceq'));
      }

      if (action === 'cancel') {
        await returnService.cancelReturn(id, body.reason);
        return successResponse(null, ts('k_18n6itl'));
      }

      return errorResponse(ts('k_j9tktz'), 400, 400);
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
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest(ts('k_2a7i9w'));
    }

    try {
      await returnService.deleteReturn(parseInt(id));
      return successResponse(null, ts('k_16ei45u'));
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '删除退货单', logType: 'business' }
);
