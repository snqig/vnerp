import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { generateDocumentNo } from '@/lib/document-numbering';
import { DeliveryApplicationService } from '@/application/services/DeliveryApplicationService';
import { MysqlDeliveryRepository } from '@/infrastructure/repositories/MysqlDeliveryRepository';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';

const deliveryService = new DeliveryApplicationService(new MysqlDeliveryRepository());

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const orderId = searchParams.get('order_id');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (id) {
    const delivery = await queryOne<any>(
      `SELECT d.*, c.customer_name, o.order_no
       FROM sal_delivery d
       LEFT JOIN crm_customer c ON d.customer_id = c.id
       LEFT JOIN sal_order o ON d.order_id = o.id
       WHERE d.id = ? AND d.deleted = 0`,
      [parseInt(id)]
    );
    if (!delivery) return commonErrors.notFound('发货单不存在');

    const items = await query<any>(
      `SELECT * FROM sal_delivery_detail WHERE delivery_id = ? AND deleted = 0 ORDER BY line_no`,
      [parseInt(id)]
    );
    return successResponse({ ...delivery, items });
  }

  if (orderId) {
    const list = await query<any>(
      `SELECT d.*, c.customer_name, o.order_no
       FROM sal_delivery d
       LEFT JOIN crm_customer c ON d.customer_id = c.id
       LEFT JOIN sal_order o ON d.order_id = o.id
       WHERE d.order_id = ? AND d.deleted = 0
       ORDER BY d.create_time DESC`,
      [parseInt(orderId)]
    );
    return successResponse(list);
  }

  let sql = `SELECT d.*, c.customer_name, o.order_no
    FROM sal_delivery d
    LEFT JOIN crm_customer c ON d.customer_id = c.id
    LEFT JOIN sal_order o ON d.order_id = o.id
    WHERE d.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (d.delivery_no LIKE ? OR c.customer_name LIKE ? OR o.order_no LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like, like);
  }

  if (status && status !== 'all') {
    sql += ' AND d.status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY d.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query<any>(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM sal_delivery WHERE deleted = 0`;
  const countResult = (await queryOne(countSql)) as any;

  return successResponse({
    list,
    total: countResult?.total || 0,
    page,
    pageSize,
  });
});

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, [
      'order_id',
      'customer_id',
      'warehouse_id',
      'items',
    ]);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const deliveryNo = body.delivery_no || (await generateDocumentNo('delivery'));

    const result = await transaction(async (conn) => {
      const {
        order_id,
        order_no,
        customer_id,
        customer_name,
        warehouse_id,
        delivery_date,
        logistics_company,
        tracking_no,
        contact_name,
        contact_phone,
        delivery_address,
        remark,
        items,
      } = body;

      let totalQty = 0;
      let totalAmount = 0;
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const amount = parseFloat(item.amount) || qty * price;
        totalQty += qty;
        totalAmount += amount;
      }

      await conn.execute(
        `INSERT INTO sal_delivery (
        delivery_no, status, order_id, order_no, customer_id, customer_name,
        warehouse_id, delivery_date, logistics_company, tracking_no,
        total_qty, total_amount,
        contact_name, contact_phone, delivery_address,
        sign_status, remark, create_by, create_time
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
        [
          deliveryNo,
          order_id,
          order_no || null,
          customer_id,
          customer_name || null,
          warehouse_id,
          delivery_date || new Date().toISOString().split('T')[0],
          logistics_company || null,
          tracking_no || null,
          Math.round(totalQty * 10000) / 10000,
          Math.round(totalAmount * 100) / 100,
          contact_name || null,
          contact_phone || null,
          delivery_address || null,
          remark || null,
          userInfo.userId,
        ]
      );

      const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const deliveryId = rows[0].id;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const amount = parseFloat(item.amount) || qty * price;

        await conn.execute(
          `INSERT INTO sal_delivery_detail (
          delivery_id, line_no, order_detail_id, material_id, material_code,
          material_name, material_spec, unit, quantity, unit_price, amount, batch_no, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            deliveryId,
            i + 1,
            item.order_detail_id || null,
            item.material_id,
            item.material_code || null,
            item.material_name || null,
            item.material_spec || null,
            item.unit || 'pcs',
            qty,
            price,
            Math.round(amount * 100) / 100,
            item.batch_no || null,
            item.remark || null,
          ]
        );
      }

      return { id: deliveryId, delivery_no: deliveryNo, status: 1 };
    });

    return successResponse(result, '发货单创建成功');
  },
  { logTitle: '创建发货单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return commonErrors.badRequest('缺少发货单ID');
    }

    if (body.status !== undefined) {
      const newStatus = parseInt(body.status);
      try {
        if (newStatus === 2) {
          await deliveryService.shipDelivery({
            deliveryId: id,
            shipBy: userInfo.userId,
            logisticsCompany: body.logistics_company,
            trackingNo: body.tracking_no,
          });
          return successResponse(null, '发货成功');
        }
        if (newStatus === 3) {
          await deliveryService.signDelivery(id, userInfo.userId);
          await execute('UPDATE sal_delivery SET sign_status = 1 WHERE id = ?', [id]);
          return successResponse(null, '签收成功');
        }
        if (newStatus === 9) {
          await deliveryService.cancelDelivery(id, body.reason);
          return successResponse(null, '取消成功');
        }
        return errorResponse(`不支持的目标状态: ${newStatus}`, 400, 400);
      } catch (error) {
        if (error instanceof DomainError || error instanceof NotFoundError) {
          return errorResponse(error.message, 400, 400);
        }
        throw error;
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    const allowedFields = [
      'logistics_company',
      'tracking_no',
      'remark',
      'contact_name',
      'contact_phone',
      'delivery_address',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await execute(`UPDATE sal_delivery SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return successResponse(null, '发货单更新成功');
  },
  { logTitle: '更新发货单', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest('缺少发货单ID');
    }

    try {
      await deliveryService.deleteDelivery(parseInt(id));
      return successResponse(null, '发货单删除成功');
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '删除发货单', logType: 'business' }
);
