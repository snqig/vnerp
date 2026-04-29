import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
} from '@/lib/api-response';

const SAMPLE_DELIVERY_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  SIGNED: 'signed',
} as const;

const WORK_ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PRODUCING: 'producing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { sample_order_id, plan_start_date, plan_end_date } = body;

  if (!sample_order_id) {
    return errorResponse('打样订单ID不能为空', 400, 400);
  }

  return await transaction(async (connection) => {
    const [sampleRows] = await connection.execute(
      `SELECT id, order_no, customer_name, product_name, material_no, 
              version, size_spec, material_spec, quantity, delivery_status
       FROM sal_sample_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
      [sample_order_id]
    );

    const sampleOrder = (sampleRows as any[])[0];
    if (!sampleOrder) {
      throw new Error('打样订单不存在');
    }

    if (sampleOrder.delivery_status === SAMPLE_DELIVERY_STATUS.DELIVERED ||
        sampleOrder.delivery_status === SAMPLE_DELIVERY_STATUS.SIGNED) {
      throw new Error('打样订单已交付，不能创建工单');
    }

    const [existingWO] = await connection.execute(
      `SELECT COUNT(*) as cnt FROM prod_work_order 
       WHERE source_type = 'sample' AND source_id = ? 
       AND status NOT IN (?) AND deleted = 0`,
      [sample_order_id, WORK_ORDER_STATUS.CANCELLED]
    );

    if ((existingWO as any[])[0].cnt > 0) {
      throw new Error('该打样订单已存在未取消的工单');
    }

    const workOrderNo = `WO${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    const productDesc = `${sampleOrder.product_name} ${sampleOrder.size_spec || ''} ${sampleOrder.version || ''}`.trim();

    const [orderResult] = await connection.execute(
      `INSERT INTO prod_work_order 
       (work_order_no, order_no, source_type, source_id, customer_name, product_name, 
        quantity, unit, status, priority, plan_start_date, plan_end_date, create_time) 
       VALUES (?, ?, 'sample', ?, ?, ?, ?, 'pcs', ?, 'high', ?, ?, NOW())`,
      [
        workOrderNo,
        sampleOrder.order_no,
        sample_order_id,
        sampleOrder.customer_name,
        productDesc,
        sampleOrder.quantity || 1,
        WORK_ORDER_STATUS.PENDING,
        plan_start_date || null,
        plan_end_date || null,
      ]
    );

    const workOrderId = (orderResult as any).insertId;

    await connection.execute(
      `INSERT INTO prod_work_order_item 
       (work_order_id, line_no, material_id, material_name, quantity, unit, unit_price, total_price, create_time) 
       VALUES (?, 1, NULL, ?, ?, 'pcs', 0, 0, NOW())`,
      [workOrderId, productDesc, sampleOrder.quantity || 1]
    );

    const [bomRows] = await connection.execute(
      `SELECT bh.id, bh.bom_no, bh.version
       FROM bom_header bh
       JOIN mdm_product mp ON bh.product_id = mp.id
       WHERE mp.product_code = ? AND bh.status = 'active' AND bh.deleted = 0
       ORDER BY bh.version DESC LIMIT 1`,
      [sampleOrder.material_no]
    );

    const bomInfo = (bomRows as any[])[0] || null;

    if (bomInfo) {
      await connection.execute(
        `UPDATE prod_work_order SET bom_id = ? WHERE id = ?`,
        [bomInfo.id, workOrderId]
      );

      const [bomLines] = await connection.execute(
        `SELECT bl.id, bl.material_id, bl.material_name, bl.quantity, bl.unit, bl.scrap_rate
         FROM bom_line bl WHERE bl.bom_id = ? AND bl.deleted = 0`,
        [bomInfo.id]
      );

      for (const bomLine of bomLines as any[]) {
        const requiredQty = bomLine.quantity * (sampleOrder.quantity || 1) * (1 + (bomLine.scrap_rate || 0) / 100);
        await connection.execute(
          `INSERT INTO prod_work_order_material_req 
           (work_order_id, bom_line_id, material_id, material_name, required_qty, unit, create_time)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [workOrderId, bomLine.id, bomLine.material_id, bomLine.material_name, requiredQty, bomLine.unit]
        );
      }
    }

    return successResponse({
      work_order_id: workOrderId,
      work_order_no: workOrderNo,
      sample_order_no: sampleOrder.order_no,
      bom_info: bomInfo ? { bom_id: bomInfo.id, bom_no: bomInfo.bom_no, version: bomInfo.version } : null,
    }, `打样工单 ${workOrderNo} 创建成功`);
  });
}, '打样订单转工单失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { sample_order_id, action, actual_delivery_date } = body;

  if (!sample_order_id) {
    return errorResponse('打样订单ID不能为空', 400, 400);
  }

  return await transaction(async (connection) => {
    const [sampleRows] = await connection.execute(
      `SELECT id, order_no, delivery_status, quantity FROM sal_sample_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
      [sample_order_id]
    );

    const sampleOrder = (sampleRows as any[])[0];
    if (!sampleOrder) {
      throw new Error('打样订单不存在');
    }

    if (action === 'deliver') {
      if (sampleOrder.delivery_status !== SAMPLE_DELIVERY_STATUS.PENDING) {
        throw new Error('打样订单不在待交付状态');
      }

      const [woRows] = await connection.execute(
        `SELECT id, work_order_no, status FROM prod_work_order 
         WHERE source_type = 'sample' AND source_id = ? AND deleted = 0
         ORDER BY create_time DESC LIMIT 1`,
        [sample_order_id]
      );

      const workOrder = (woRows as any[])[0];
      if (workOrder && workOrder.status !== WORK_ORDER_STATUS.COMPLETED) {
        throw new Error('关联工单尚未完成，不能交付');
      }

      await connection.execute(
        `UPDATE sal_sample_order 
         SET delivery_status = ?, actual_delivery_date = ?, update_time = NOW() 
         WHERE id = ?`,
        [SAMPLE_DELIVERY_STATUS.DELIVERED, actual_delivery_date || new Date().toISOString().slice(0, 10), sample_order_id]
      );

      return successResponse({
        sample_order_id,
        delivery_status: SAMPLE_DELIVERY_STATUS.DELIVERED,
      }, '打样订单已标记为已交付');
    }

    if (action === 'sign') {
      if (sampleOrder.delivery_status !== SAMPLE_DELIVERY_STATUS.DELIVERED) {
        throw new Error('打样订单不在已交付状态，不能签收');
      }

      await connection.execute(
        `UPDATE sal_sample_order 
         SET delivery_status = ?, update_time = NOW() 
         WHERE id = ?`,
        [SAMPLE_DELIVERY_STATUS.SIGNED, sample_order_id]
      );

      return successResponse({
        sample_order_id,
        delivery_status: SAMPLE_DELIVERY_STATUS.SIGNED,
      }, '打样订单已签收');
    }

    return errorResponse('无效的操作类型', 400, 400);
  });
}, '打样订单状态更新失败');

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const sample_order_id = searchParams.get('sample_order_id');

  if (!sample_order_id) {
    return errorResponse('打样订单ID不能为空', 400, 400);
  }

  const sampleOrder = await query(
    `SELECT * FROM sal_sample_order WHERE id = ? AND deleted = 0`,
    [sample_order_id]
  );

  if ((sampleOrder as any[]).length === 0) {
    return commonErrors.notFound('打样订单不存在');
  }

  const workOrders = await query(
    `SELECT id, work_order_no, status, quantity, plan_start_date, plan_end_date, create_time
     FROM prod_work_order 
     WHERE source_type = 'sample' AND source_id = ? AND deleted = 0
     ORDER BY create_time DESC`,
    [sample_order_id]
  );

  const materialReqs = await query(
    `SELECT mr.material_id, mr.material_name, mr.required_qty, mr.unit,
       COALESCE(i.available_qty, 0) as available_qty
     FROM prod_work_order_material_req mr
     JOIN prod_work_order wo ON mr.work_order_id = wo.id
     LEFT JOIN (
       SELECT material_id, SUM(available_qty) as available_qty 
       FROM inv_inventory 
       WHERE deleted = 0 
       GROUP BY material_id
     ) i ON mr.material_id = i.material_id
     WHERE wo.source_type = 'sample' AND wo.source_id = ? AND wo.deleted = 0`,
    [sample_order_id]
  );

  return successResponse({
    sample_order: (sampleOrder as any[])[0],
    work_orders: workOrders,
    material_requirements: materialReqs,
  });
}, '获取打样订单关联信息失败');
