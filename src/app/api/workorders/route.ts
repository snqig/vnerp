import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  logOperation,
} from '@/lib/api-response';
import { randomUUID } from 'crypto';
import { generateDocumentNo } from '@/lib/document-numbering';

const WORK_ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PRODUCING: 'producing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

const SALE_ORDER_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PRODUCING: 'producing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const order_no = searchParams.get('order_no');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  if (id) {
    const workOrders = await query(
      `SELECT wo.*, 
        (SELECT COUNT(*) FROM prod_work_order_item WHERE work_order_id = wo.id) as item_count
       FROM prod_work_order wo 
       WHERE wo.work_order_no = ? AND wo.deleted = 0`,
      [id]
    );
    if (!workOrders || (workOrders as any[]).length === 0) {
      return commonErrors.notFound('工单不存在');
    }

    const workOrder = (workOrders as any[])[0];

    const items = await query(
      `SELECT * FROM prod_work_order_item WHERE work_order_id = ? ORDER BY line_no ASC`,
      [workOrder.id]
    );

    const bomInfo = await query(
      `SELECT bh.id, bh.bom_no, bh.version, bh.status
       FROM bom_header bh
       WHERE bh.product_id = (SELECT product_id FROM prod_work_order WHERE id = ?)
       AND bh.status = 'active'
       ORDER BY bh.version DESC LIMIT 1`,
      [workOrder.id]
    );

    return successResponse({
      ...workOrder,
      items,
      bom_info: (bomInfo as any[])[0] || null,
    });
  }

  if (order_no) {
    const workOrders = await query(
      `SELECT * FROM prod_work_order WHERE order_no = ? AND deleted = 0 ORDER BY create_time DESC`,
      [order_no]
    );
    return successResponse({
      list: workOrders,
      total: (workOrders as any[]).length,
    });
  }

  let sql = `SELECT wo.*, 
    (SELECT COUNT(*) FROM prod_work_order_item WHERE work_order_id = wo.id) as item_count
    FROM prod_work_order wo WHERE wo.deleted = 0`;
  const params: any[] = [];

  if (status && status !== 'all') {
    sql += ' AND wo.status = ?';
    params.push(status);
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM prod_work_order wo WHERE wo.deleted = 0` + (status && status !== 'all' ? ' AND wo.status = ?' : ''),
    status && status !== 'all' ? [status] : []
  );

  sql += ' ORDER BY wo.create_time DESC';
  sql += ' LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const workOrders = await query(sql, params);

  return successResponse({
    list: workOrders,
    total: (countResult as any[])[0]?.total || (workOrders as any[]).length,
    page,
    page_size: pageSize,
  });
}, '获取工单失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { order_no, customer_name, items, bom_id, plan_start_date, plan_end_date } = body;

  if (!order_no || !items || !Array.isArray(items) || items.length === 0) {
    return commonErrors.badRequest('缺少必要参数');
  }

  return await transaction(async (connection) => {
    const [orderRows] = await connection.execute(
      `SELECT id, order_no, status FROM sal_order WHERE order_no = ? AND deleted = 0 FOR UPDATE`,
      [order_no]
    );

    const saleOrder = (orderRows as any[])[0];
    if (!saleOrder) {
      throw new Error('销售订单不存在');
    }

    if (String(saleOrder.status) === '5' || saleOrder.status === SALE_ORDER_STATUS.CANCELLED) {
      throw new Error('销售订单已取消，不能创建工单');
    }

    const [existingWO] = await connection.execute(
      `SELECT COUNT(*) as cnt FROM prod_work_order WHERE order_no = ? AND status != ? AND deleted = 0`,
      [order_no, WORK_ORDER_STATUS.CANCELLED]
    );

    if ((existingWO as any[])[0].cnt > 0) {
      throw new Error('该销售订单已存在未取消的工单');
    }

    const workOrderNo = await generateDocumentNo('work_order');

    const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const product_name = items.length === 1 ? items[0].material_name : `${items.length}种产品`;

    const [orderResult] = await connection.execute(
      `INSERT INTO prod_work_order 
       (work_order_no, order_no, bom_id, customer_name, product_name, quantity, unit, status, priority, plan_start_date, plan_end_date, create_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        workOrderNo,
        order_no,
        bom_id || null,
        customer_name || '',
        product_name,
        totalQuantity,
        items[0]?.unit || 'pcs',
        WORK_ORDER_STATUS.PENDING,
        'normal',
        plan_start_date || null,
        plan_end_date || null,
      ]
    );

    const workOrderId = (orderResult as any).insertId;

    let lineNo = 1;
    for (const item of items) {
      await connection.execute(
        `INSERT INTO prod_work_order_item 
         (work_order_id, line_no, material_id, material_name, quantity, unit, unit_price, total_price, create_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          workOrderId,
          lineNo++,
          item.material_id || null,
          item.material_name || '',
          item.quantity || 0,
          item.unit || 'pcs',
          item.unit_price || 0,
          (item.quantity || 0) * (item.unit_price || 0),
        ]
      );
    }

    if (bom_id) {
      const [bomLines] = await connection.execute(
        `SELECT material_id, material_name, quantity, unit, scrap_rate 
         FROM bom_line WHERE bom_id = ? AND deleted = 0`,
        [bom_id]
      );

      for (const bomLine of bomLines as any[]) {
        const requiredQty = bomLine.quantity * totalQuantity * (1 + (bomLine.scrap_rate || 0) / 100);
        await connection.execute(
          `INSERT INTO prod_work_order_material_req 
           (work_order_id, bom_line_id, material_id, material_name, required_qty, unit, create_time)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [workOrderId, bomLine.id, bomLine.material_id, bomLine.material_name, requiredQty, bomLine.unit]
        );
      }
    }

    await connection.execute(
      `UPDATE sal_order SET status = 3, update_time = NOW() WHERE order_no = ? AND deleted = 0`,
      [order_no]
    );

    const qrCode = 'WO-' + randomUUID().replace(/-/g, '').substring(0, 16);
    await connection.execute(
      `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, work_order_id, work_order_no, customer_name, quantity, status, extra_data)
       VALUES (?, 'workorder', ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        qrCode, workOrderId, workOrderNo,
        workOrderId, workOrderNo,
        customer_name || '',
        totalQuantity,
        JSON.stringify({ order_no, product_name }),
      ]
    );

    return successResponse({
      work_order_id: workOrderId,
      work_order_no: workOrderNo,
      qr_code: qrCode,
    }, `工单 ${workOrderNo} 创建成功，已生成工单二维码`);
  });
}, '创建工单失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, priority, plan_start_date, plan_end_date } = body;

  if (!id) {
    return commonErrors.badRequest('工单ID不能为空');
  }

  return await transaction(async (connection) => {
    const [woRows] = await connection.execute(
      `SELECT id, work_order_no, order_no, status FROM prod_work_order WHERE work_order_no = ? AND deleted = 0 FOR UPDATE`,
      [id]
    );

    const workOrder = (woRows as any[])[0];
    if (!workOrder) {
      throw new Error('工单不存在');
    }

    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (status) {
      if (workOrder.status === WORK_ORDER_STATUS.COMPLETED) {
        throw new Error('工单已完成，不能修改状态');
      }
      if (workOrder.status === WORK_ORDER_STATUS.CANCELLED) {
        throw new Error('工单已取消，不能修改状态');
      }
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    if (priority) {
      updateFields.push('priority = ?');
      updateParams.push(priority);
    }

    if (plan_start_date) {
      updateFields.push('plan_start_date = ?');
      updateParams.push(plan_start_date);
    }

    if (plan_end_date) {
      updateFields.push('plan_end_date = ?');
      updateParams.push(plan_end_date);
    }

    if (updateFields.length > 0) {
      updateParams.push(workOrder.id);
      await connection.execute(
        `UPDATE prod_work_order SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
        updateParams
      );
    }

    if (status === WORK_ORDER_STATUS.COMPLETED && workOrder.order_no) {
      const [otherWO] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM prod_work_order 
         WHERE order_no = ? AND status NOT IN (?, ?) AND deleted = 0 AND id != ?`,
        [workOrder.order_no, WORK_ORDER_STATUS.COMPLETED, WORK_ORDER_STATUS.CANCELLED, workOrder.id]
      );

      if ((otherWO as any[])[0].cnt === 0) {
        await connection.execute(
          `UPDATE sal_order SET status = 4, update_time = NOW() WHERE order_no = ? AND deleted = 0`,
          [workOrder.order_no]
        );
      }
    }

    if (status === WORK_ORDER_STATUS.CANCELLED && workOrder.order_no) {
      const [otherActiveWO] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM prod_work_order 
         WHERE order_no = ? AND status NOT IN (?) AND deleted = 0`,
        [workOrder.order_no, WORK_ORDER_STATUS.CANCELLED]
      );

      if ((otherActiveWO as any[])[0].cnt === 0) {
        await connection.execute(
          `UPDATE sal_order SET status = 2, update_time = NOW() WHERE order_no = ? AND deleted = 0`,
          [workOrder.order_no]
        );
      }
    }

    return successResponse({ id, status, priority, plan_start_date, plan_end_date }, '工单更新成功');
  });
}, '更新工单失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('工单ID不能为空');
  }

  return await transaction(async (connection) => {
    const [woRows] = await connection.execute(
      `SELECT id, work_order_no, order_no, status FROM prod_work_order WHERE work_order_no = ? AND deleted = 0 FOR UPDATE`,
      [id]
    );

    const workOrder = (woRows as any[])[0];
    if (!workOrder) {
      throw new Error('工单不存在');
    }

    if (workOrder.status === WORK_ORDER_STATUS.PRODUCING) {
      throw new Error('生产中的工单不能删除，请先取消');
    }

    await connection.execute(
      'UPDATE prod_work_order SET deleted = 1, update_time = NOW() WHERE id = ?',
      [workOrder.id]
    );

    if (workOrder.order_no) {
      const [otherActiveWO] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM prod_work_order 
         WHERE order_no = ? AND status NOT IN (?) AND deleted = 0`,
        [workOrder.order_no, WORK_ORDER_STATUS.CANCELLED]
      );

      if ((otherActiveWO as any[])[0].cnt === 0) {
        await connection.execute(
          `UPDATE sal_order SET status = 2, update_time = NOW() WHERE order_no = ? AND deleted = 0`,
          [workOrder.order_no]
        );
      }
    }

    return successResponse(null, '工单删除成功');
  });
}, '删除工单失败');
