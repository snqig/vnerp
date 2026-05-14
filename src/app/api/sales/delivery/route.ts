import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import { getShPrefix, generateDocNo } from '@/lib/global-config';

export type ShipmentType = 'normal' | 'partial' | 'return' | 're_ship';

export type ShipmentStatus = 'draft' | 'pending' | 'ready' | 'partial' | 'shipped' | 'cancelled';

export interface Shipment {
  id?: number;
  delivery_no: string;
  order_id: number;
  order_no: string;
  customer_id: number;
  customer_name?: string;
  warehouse_id: number;
  delivery_date: string;
  total_qty: number;
  logistics_company?: string;
  tracking_no?: string;
  contact_name?: string;
  contact_phone?: string;
  delivery_address?: string;
  sign_status?: number;
  sign_person?: string;
  sign_time?: string;
  status: number;
  remark?: string;
  create_time?: string;
  update_time?: string;
}

export interface ShipmentItem {
  id?: number;
  delivery_id: number;
  order_detail_id?: number;
  material_id: number;
  material_name?: string;
  material_spec?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  amount?: number;
  batch_no?: string;
  sign_qty?: number;
  remark?: string;
}

const SHIPMENT_STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  2: { label: '待审批', color: 'bg-yellow-100 text-yellow-800' },
  3: { label: '待发货', color: 'bg-blue-100 text-blue-800' },
  4: { label: '部分发货', color: 'bg-orange-100 text-orange-800' },
  5: { label: '已发货', color: 'bg-green-100 text-green-800' },
  6: { label: '已取消', color: 'bg-red-100 text-red-800' },
};

function generateShipmentNo(): string {
  return generateDocNo(getShPrefix());
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const orderId = searchParams.get('order_id');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (id) {
    const shipment = await queryOne<Shipment>(
      `SELECT * FROM sal_delivery_order WHERE id = ? AND deleted = 0`,
      [parseInt(id)]
    );

    if (!shipment) {
      return commonErrors.notFound('发货单不存在');
    }

    const items = await query<ShipmentItem>(
      `SELECT * FROM sal_delivery_order_item WHERE delivery_id = ?`,
      [parseInt(id)]
    );

    return successResponse({ ...shipment, items });
  }

  if (orderId) {
    const shipments = await query<Shipment>(
      `SELECT d.*, c.customer_name, o.order_no
       FROM sal_delivery_order d
       LEFT JOIN crm_customer c ON d.customer_id = c.id
       LEFT JOIN sal_order o ON d.order_id = o.id
       WHERE d.order_id = ? AND d.deleted = 0
       ORDER BY d.create_time DESC`,
      [parseInt(orderId)]
    );

    const result = [];
    for (const shipment of shipments) {
      const items = await query<ShipmentItem>(
        `SELECT * FROM sal_delivery_order_item WHERE delivery_id = ?`,
        [shipment.id!]
      );
      result.push({ ...shipment, items });
    }

    return successResponse(result);
  }

  let sql = `SELECT d.*, c.customer_name, o.order_no
    FROM sal_delivery_order d
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

  const list = await query<Shipment>(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM sal_delivery_order WHERE deleted = 0`;
  const countResult = (await queryOne(countSql)) as any;

  return successResponse({
    list,
    total: countResult?.total || 0,
    page,
    pageSize,
  });
}, '获取发货单列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
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

  const deliveryNo = body.delivery_no || generateShipmentNo();

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
    for (const item of items) {
      totalQty += parseFloat(item.quantity) || 0;
    }

    await conn.execute(
      `INSERT INTO sal_delivery_order (
        delivery_no, order_id, order_no, customer_id, customer_name,
        warehouse_id, delivery_date, total_qty,
        logistics_company, tracking_no,
        contact_name, contact_phone, delivery_address,
        sign_status, status, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`,
      [
        deliveryNo,
        order_id,
        order_no || null,
        customer_id,
        customer_name || null,
        warehouse_id,
        delivery_date || new Date().toISOString().split('T')[0],
        totalQty,
        logistics_company || null,
        tracking_no || null,
        contact_name || null,
        contact_phone || null,
        delivery_address || null,
        remark || null,
      ]
    );

    const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
    const deliveryId = rows[0].id;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO sal_delivery_order_item (
          delivery_id, order_detail_id, material_id, material_name, material_spec,
          quantity, unit, unit_price, amount, batch_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deliveryId,
          item.order_detail_id || null,
          item.material_id,
          item.material_name || null,
          item.material_spec || null,
          item.quantity,
          item.unit || 'pcs',
          item.unit_price || 0,
          item.amount || 0,
          item.batch_no || null,
        ]
      );
    }

    return { id: deliveryId, delivery_no: deliveryNo, status: 1 };
  });

  return successResponse(result, '发货单创建成功');
}, '创建发货单失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('缺少发货单ID');
  }

  const existing = await queryOne<{ id: number; status: number }>(
    'SELECT id, status FROM sal_delivery_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!existing) {
    return commonErrors.notFound('发货单不存在');
  }

  if (body.status !== undefined) {
    const newStatus = parseInt(body.status);

    const allowedTransitions: Record<number, number[]> = {
      1: [2, 6],
      2: [3, 6],
      3: [4, 5],
      4: [5],
      5: [],
      6: [],
    };

    if (!allowedTransitions[existing.status]?.includes(newStatus)) {
      return errorResponse(
        `不允许从状态 "${SHIPMENT_STATUS_MAP[existing.status]?.label || existing.status}" 转换到 "${SHIPMENT_STATUS_MAP[newStatus]?.label || newStatus}"`,
        400,
        400
      );
    }

    await execute('UPDATE sal_delivery_order SET status = ? WHERE id = ?', [newStatus, id]);
  } else {
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
      await execute(`UPDATE sal_delivery_order SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  return successResponse(null, '发货单更新成功');
}, '更新发货单失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('缺少发货单ID');
  }

  const existing = await queryOne<{ id: number; status: number }>(
    'SELECT id, status FROM sal_delivery_order WHERE id = ? AND deleted = 0',
    [parseInt(id)]
  );

  if (!existing) {
    return commonErrors.notFound('发货单不存在');
  }

  if (![1, 6].includes(existing.status)) {
    return errorResponse(
      `当前状态为"${SHIPMENT_STATUS_MAP[existing.status]?.label || existing.status}"，不允许删除`,
      400,
      400
    );
  }

  await execute('UPDATE sal_delivery_order SET deleted = 1 WHERE id = ?', [parseInt(id)]);

  return successResponse(null, '发货单删除成功');
}, '删除发货单失败');
