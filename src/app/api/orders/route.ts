import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import { generateDocumentNo } from '@/lib/document-numbering';

// 订单项接口
interface OrderItem {
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

// 订单接口
interface Order {
  id: string;
  customer: string;
  customerId?: string;
  orderDate: string;
  deliveryDate: string;
  status: 'draft' | 'confirmed' | 'producing' | 'shipped' | 'completed' | 'cancelled';
  totalAmount: number;
  items: OrderItem[];
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

// GET - 获取订单列表/详情
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const keyword = searchParams.get('keyword');

  if (id) {
    // 获取单个订单详情
    const orders = await query(
      `SELECT so.*, c.customer_name FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id WHERE so.order_no = ? AND so.deleted = 0`,
      [id]
    );
    
    if (!orders || (orders as any[]).length === 0) {
      return commonErrors.notFound('订单不存在');
    }

    const order = (orders as any[])[0];
    
    // 获取订单明细
    const items = await query(
      'SELECT * FROM sal_order_item WHERE order_id = ?',
      [order.id]
    );

    const orderData = {
      id: order.id,
      order_no: order.order_no,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      order_date: order.order_date,
      delivery_date: order.delivery_date,
      status: order.status,
      total_amount: parseFloat(order.total_amount),
      total_with_tax: order.total_with_tax ? parseFloat(order.total_with_tax) : undefined,
      items: (items as any[]).map((item: any) => ({
        material_name: item.material_name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
      })),
      remark: order.remark,
      create_time: order.create_time,
      update_time: order.update_time,
    };

    return successResponse(orderData);
  }

  // 获取订单列表
  let sql = `SELECT so.*, c.customer_name FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id WHERE so.deleted = 0`;
  const params: any[] = [];

  if (status && status !== 'all') {
    sql += ' AND so.status = ?';
    params.push(status);
  }

  if (keyword) {
    sql += ' AND (so.order_no LIKE ? OR c.customer_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY so.create_time DESC';

  const orders = await query(sql, params);

  const orderList = await Promise.all(
    (orders as any[]).map(async (order: any) => {
      const items = await query(
        'SELECT * FROM sal_order_item WHERE order_id = ?',
        [order.id]
      );

      return {
        id: order.id,
        order_no: order.order_no,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        order_date: order.order_date,
        delivery_date: order.delivery_date,
        status: order.status,
        total_amount: parseFloat(order.total_amount),
        total_with_tax: order.total_with_tax ? parseFloat(order.total_with_tax) : undefined,
        items: (items as any[]).map((item: any) => ({
          material_name: item.material_name,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
        })),
        remark: order.remark,
        create_time: order.create_time,
        update_time: order.update_time,
      };
    })
  );

  return successResponse({
    list: orderList,
    total: orderList.length,
  });
}, '获取订单失败');

// POST - 创建订单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  const { customer_id, customer_name, delivery_date, items, remark } = body;

  let finalCustomerId = customer_id || null;
  let finalCustomerName = customer_name || '';

  if (!finalCustomerName && finalCustomerId) {
    const customer = await queryOne('SELECT customer_name FROM crm_customer WHERE id = ? AND deleted = 0', [finalCustomerId]);
    if (customer) {
      finalCustomerName = (customer as any).customer_name;
    }
  }

  if (!finalCustomerName) {
    return errorResponse('客户信息不能为空', 400, 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    return errorResponse('订单项不能为空', 400, 400);
  }

  for (const item of items) {
    if (!item.material_name || !item.quantity || !item.unit_price) {
      return errorResponse('订单项缺少必填字段(物料名称、数量、单价)', 400, 400);
    }
    if (item.quantity <= 0) {
      return errorResponse('订单数量必须大于0', 400, 400);
    }
    if (item.unit_price < 0) {
      return errorResponse('单价不能为负数', 400, 400);
    }
  }

  const total_amount = items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.unit_price,
    0
  );

  const orderNo = await generateDocumentNo('sales_order');

  const orderResult = await query(
    `INSERT INTO sal_order (order_no, customer_id, order_date, delivery_date, total_amount, status, remark, create_time) 
     VALUES (?, ?, CURDATE(), ?, ?, 1, ?, NOW())`,
    [orderNo, finalCustomerId, delivery_date, total_amount, remark || '']
  );

  const orderId = (orderResult as any).insertId;

  for (const item of items) {
    await query(
      `INSERT INTO sal_order_item (order_id, material_name, quantity, unit, unit_price, total_price, create_time) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [orderId, item.material_name, item.quantity, item.unit, item.unit_price, item.quantity * item.unit_price]
    );
  }

  return successResponse(
    { id: orderId, order_no: orderNo },
    '订单创建成功'
  );
}, '创建订单失败');

// PUT - 更新订单
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, ...updateData } = body;

  if (!id) {
    return errorResponse('订单ID不能为空', 400, 400);
  }

  const orders = await query(
    'SELECT * FROM sal_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('订单不存在');
  }

  const order = (orders as any[])[0];

  if (order.status === 'completed' || order.status === 'cancelled') {
    return errorResponse('已完成的订单不能修改', 400, 400);
  }

  const updateFields: string[] = [];
  const updateParams: any[] = [];

  if (status) {
    updateFields.push('status = ?');
    updateParams.push(status);
  }

  if (updateData.delivery_date) {
    updateFields.push('delivery_date = ?');
    updateParams.push(updateData.delivery_date);
  }

  if (updateData.remark !== undefined) {
    updateFields.push('remark = ?');
    updateParams.push(updateData.remark);
  }

  if (updateFields.length > 0) {
    updateParams.push(order.id);
    await query(
      `UPDATE sal_order SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
      updateParams
    );
  }

  return successResponse({ id, status, ...updateData }, '订单更新成功');
}, '更新订单失败');

// DELETE - 删除订单
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('订单ID不能为空', 400, 400);
  }

  // 查询订单
  const orders = await query(
    'SELECT * FROM sal_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('订单不存在');
  }

  const order = (orders as any[])[0];

  if (order.status === 'completed') {
    return errorResponse('已完成的订单不能删除', 400, 400);
  }

  await query(
    'UPDATE sal_order SET deleted = 1, update_time = NOW() WHERE id = ?',
    [order.id]
  );

  return successResponse(null, '订单删除成功');
}, '删除订单失败');
