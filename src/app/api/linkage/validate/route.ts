import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// 状态常量定义
const BIZ_ORDER_STATUS = {
  DRAFT: 10,
  CONFIRMED: 20,
  PART_PO: 30,
  PO_COMPLETE: 40,
  PART_RECEIVE: 50,
  COMPLETED: 60,
  CLOSED: 90,
} as const;

const PR_STATUS = {
  DRAFT: 10,
  PENDING_APPROVAL: 20,
  APPROVED: 30,
  PART_PO: 40,
  PO_COMPLETE: 50,
  CANCELLED: 90,
} as const;

const PO_STATUS = {
  DRAFT: 10,
  PENDING_APPROVAL: 20,
  APPROVED: 30,
  PART_RECEIVE: 40,
  COMPLETED: 50,
  CLOSED: 90,
} as const;

/**
 * 获取容差配置
 */
async function getToleranceConfig(materialId?: number, orderType: string = 'PURCHASE') {
  let config = await query(
    `SELECT over_delivery_tolerance, under_delivery_tolerance, action_on_exceed
     FROM order_tolerance_config
     WHERE (material_id = ? OR (material_id IS NULL AND is_default = 1))
     AND order_type = ?
     ORDER BY material_id IS NULL ASC
     LIMIT 1`,
    [materialId || null, orderType]
  );

  if ((config as any[]).length === 0) {
    return {
      over_delivery_tolerance: 5.00,
      under_delivery_tolerance: 5.00,
      action_on_exceed: 'WARNING',
    };
  }

  const c = (config as any[])[0];
  return {
    over_delivery_tolerance: c.over_delivery_tolerance,
    under_delivery_tolerance: c.under_delivery_tolerance,
    action_on_exceed: c.action_on_exceed,
  };
}

/**
 * 记录状态变更历史
 */
async function recordStatusHistory(
  orderType: string,
  orderId: number,
  orderNo: string,
  oldStatus: number,
  newStatus: number,
  triggerBy: string,
  operatorId?: number
) {
  await query(
    `INSERT INTO order_status_history 
     (order_type, order_id, order_no, old_status, new_status, trigger_by, operator_id, operate_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [orderType, orderId, orderNo, oldStatus, newStatus, triggerBy, operatorId]
  );
}

/**
 * 更新业务订单状态（根据勾稽数量）
 */
async function updateBizOrderStatus(orderId: number, triggerBy: string) {
  const order = await query(
    `SELECT id, order_no, status, req_qty, tolerance_percent
     FROM biz_order_header WHERE id = ? AND deleted = 0`,
    [orderId]
  );

  if ((order as any[]).length === 0) return;

  const orderData = (order as any[])[0];
  const oldStatus = orderData.status;

  // 计算汇总指标
  const lines = await query(
    `SELECT 
       SUM(req_qty) as total_req,
       SUM(ordered_qty) as total_ordered,
       SUM(received_qty) as total_received,
       SUM(consumed_qty) as total_consumed
     FROM biz_order_line WHERE order_id = ? AND deleted = 0`,
    [orderId]
  );

  const summary = (lines as any[])[0];
  const totalReq = summary.total_req || 0;
  const totalOrdered = summary.total_ordered || 0;
  const totalReceived = summary.total_received || 0;
  const totalConsumed = summary.total_consumed || 0;

  // 容差计算
  const tolerance = orderData.tolerance_percent || 5;
  const maxReq = totalReq * (1 + tolerance / 100);

  let newStatus = oldStatus;

  // 状态推导逻辑
  if (totalConsumed >= totalReq) {
    newStatus = BIZ_ORDER_STATUS.COMPLETED;
  } else if (totalReceived > 0) {
    newStatus = BIZ_ORDER_STATUS.PART_RECEIVE;
  } else if (totalOrdered >= totalReq) {
    newStatus = BIZ_ORDER_STATUS.PO_COMPLETE;
  } else if (totalOrdered > 0) {
    newStatus = BIZ_ORDER_STATUS.PART_PO;
  }

  // 只允许向前推进（状态值增大）
  if (newStatus > oldStatus) {
    await query(
      `UPDATE biz_order_header SET status = ?, update_time = NOW() WHERE id = ?`,
      [newStatus, orderId]
    );

    await recordStatusHistory(
      'BIZ',
      orderId,
      orderData.order_no,
      oldStatus,
      newStatus,
      triggerBy
    );

    return { orderId, oldStatus, newStatus, changed: true };
  }

  return { orderId, oldStatus, newStatus, changed: false };
}

/**
 * 创建PO时的数量勾稽校验
 * POST /api/linkage/validate/po-create
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { sourceOrderLineId, poQty, materialId } = body;

  if (!sourceOrderLineId || !poQty) {
    return errorResponse('缺少必要参数', 400, 400);
  }

  return await transaction(async (connection) => {
    // 1. 查询业务订单行信息（加锁）
    const [orderLineRows] = await connection.execute(
      `SELECT 
        bol.id, bol.order_id, bol.req_qty, bol.ordered_qty, 
        bol.is_strict_by_order, bol.closed_flag,
        boh.order_no, boh.status, boh.tolerance_percent
       FROM biz_order_line bol
       JOIN biz_order_header boh ON bol.order_id = boh.id
       WHERE bol.id = ? AND bol.deleted = 0 AND boh.deleted = 0
       FOR UPDATE`,
      [sourceOrderLineId]
    );

    const orderLine = (orderLineRows as any[])[0];
    if (!orderLine) {
      throw new Error('来源业务订单行不存在');
    }

    // 2. 检查业务订单状态
    if (orderLine.status < BIZ_ORDER_STATUS.CONFIRMED) {
      throw new Error('业务订单未确认，不允许创建采购订单');
    }

    if (orderLine.status >= BIZ_ORDER_STATUS.CLOSED) {
      throw new Error('业务订单已关闭');
    }

    if (orderLine.closed_flag) {
      throw new Error('业务订单行已关闭');
    }

    // 3. 计算剩余可采购数量
    const tolerance = orderLine.tolerance_percent || 5;
    const maxQty = orderLine.req_qty * (1 + tolerance / 100);
    const remainingQty = maxQty - orderLine.ordered_qty;

    // 4. 容差校验
    if (poQty > remainingQty) {
      const config = await getToleranceConfig(materialId);

      if (config.action_on_exceed === 'BLOCK') {
        throw new Error(
          `超量采购：申请数量${poQty}，剩余可采购${remainingQty.toFixed(2)}（含容差${tolerance}%）`
        );
      } else if (config.action_on_exceed === 'WARNING') {
        return successResponse(
          {
            valid: true,
            warning: true,
            message: `警告：申请数量${poQty}超过剩余可采购${remainingQty.toFixed(2)}`,
            max_allowed: remainingQty,
            req_qty: orderLine.req_qty,
            ordered_qty: orderLine.ordered_qty,
            tolerance,
          },
          '校验通过（有警告）'
        );
      }
    }

    return successResponse(
      {
        valid: true,
        warning: false,
        max_allowed: remainingQty,
        req_qty: orderLine.req_qty,
        ordered_qty: orderLine.ordered_qty,
        tolerance,
      },
      '校验通过'
    );
  });
}, 'PO创建校验失败');

/**
 * PO审批通过后反写业务订单
 * PUT /api/linkage/validate/po-approved
 */
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { poId, action } = body;

  if (!poId || !action) {
    return errorResponse('缺少必要参数', 400, 400);
  }

  return await transaction(async (connection) => {
    if (action === 'po_approved') {
      // PO审批通过，反写业务订单已订购数量
      const [poLines] = await connection.execute(
        `SELECT 
           id, source_order_id, source_order_line_id, order_qty
         FROM pur_purchase_order_line
         WHERE po_id = ? AND source_order_line_id IS NOT NULL`,
        [poId]
      );

      const updatedOrders = new Set<number>();

      for (const poLine of poLines as any[]) {
        // 更新业务订单行已订购数量
        await connection.execute(
          `UPDATE biz_order_line 
           SET ordered_qty = ordered_qty + ?,
               update_time = NOW()
           WHERE id = ?`,
          [poLine.order_qty, poLine.source_order_line_id]
        );

        updatedOrders.add(poLine.source_order_id);
      }

      // 更新业务订单状态
      const statusResults = [];
      for (const orderId of updatedOrders) {
        const result = await updateBizOrderStatus(orderId, 'PO_APPROVED');
        statusResults.push(result);
      }

      return successResponse(
        { updated_orders: Array.from(updatedOrders), status_results: statusResults },
        'PO审批通过，业务订单已更新'
      );
    }

    if (action === 'grn_posted') {
      const { grnId } = body;

      // 入库过账，更新业务订单收货数量
      const [grnItems] = await connection.execute(
        `SELECT 
           id, source_order_id, source_order_line_id, quantity
         FROM inv_inbound_item
         WHERE order_id = ? AND source_order_line_id IS NOT NULL`,
        [grnId]
      );

      const updatedOrders = new Set<number>();

      for (const item of grnItems as any[]) {
        // 更新业务订单行已收货数量
        await connection.execute(
          `UPDATE biz_order_line 
           SET received_qty = received_qty + ?,
               available_to_receive = available_to_receive + ?,
               update_time = NOW()
           WHERE id = ?`,
          [item.quantity, item.quantity, item.source_order_line_id]
        );

        // 更新采购单行已收货数量
        await connection.execute(
          `UPDATE pur_purchase_order_line 
           SET received_qty = received_qty + ?,
               update_time = NOW()
           WHERE id = (SELECT po_line_id FROM inv_inbound_item WHERE id = ?)`,
          [item.quantity, item.id]
        );

        updatedOrders.add(item.source_order_id);
      }

      // 更新业务订单状态
      const statusResults = [];
      for (const orderId of updatedOrders) {
        const result = await updateBizOrderStatus(orderId, 'GRN_POSTED');
        statusResults.push(result);
      }

      return successResponse(
        { updated_orders: Array.from(updatedOrders), status_results: statusResults },
        '入库过账成功，业务订单已更新'
      );
    }

    if (action === 'consumption') {
      const { orderLineId, qty, consumptionType, grnLineId } = body;

      // 消耗/扣减勾稽
      const [orderLineRows] = await connection.execute(
        `SELECT 
           bol.id, bol.order_id, bol.material_id, bol.material_code,
           bol.available_to_receive, bol.is_strict_by_order,
           boh.order_no
         FROM biz_order_line bol
         JOIN biz_order_header boh ON bol.order_id = boh.id
         WHERE bol.id = ? FOR UPDATE`,
        [orderLineId]
      );

      const orderLine = (orderLineRows as any[])[0];
      if (!orderLine) {
        throw new Error('业务订单行不存在');
      }

      // 严格按单采购的物料，检查专用库存
      if (orderLine.is_strict_by_order) {
        if (qty > orderLine.available_to_receive) {
          throw new Error(
            `物料${orderLine.material_code}为按单采购，专用库存${orderLine.available_to_receive}不足，需求${qty}`
          );
        }
      }

      // 扣减可用库存并记录消耗
      await connection.execute(
        `UPDATE biz_order_line 
         SET consumed_qty = consumed_qty + ?,
             available_to_receive = available_to_receive - ?,
             update_time = NOW()
         WHERE id = ?`,
        [qty, qty, orderLineId]
      );

      // 记录消耗关系
      await connection.execute(
        `INSERT INTO biz_consumption 
         (order_id, order_line_id, material_id, material_code, consumption_type, 
          consumption_qty, source_grn_line_id, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderLine.order_id,
          orderLineId,
          orderLine.material_id,
          orderLine.material_code,
          consumptionType,
          qty,
          grnLineId,
        ]
      );

      // 更新入库行消耗标记
      if (grnLineId) {
        await connection.execute(
          `UPDATE inv_inbound_item SET is_consumed = 1 WHERE id = ?`,
          [grnLineId]
        );
      }

      // 更新业务订单状态
      const result = await updateBizOrderStatus(orderLine.order_id, 'CONSUMPTION');

      return successResponse(
        { order_line_id: orderLineId, consumed_qty: qty, status_result: result },
        '消耗记录成功'
      );
    }

    return errorResponse('无效的操作类型', 400, 400);
  });
}, '勾稽处理失败');

/**
 * 获取业务订单履行跟踪
 * GET /api/linkage/validate?orderId={id}
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return errorResponse('业务订单ID不能为空', 400, 400);
  }

  // 查询业务订单信息
  const order = await query(
    `SELECT 
       id, order_no, order_type, customer_name, product_name,
       status, req_qty, delivery_date, tolerance_percent
     FROM biz_order_header
     WHERE id = ? AND deleted = 0`,
    [orderId]
  );

  if ((order as any[]).length === 0) {
    return errorResponse('业务订单不存在', 404, 404);
  }

  const orderData = (order as any[])[0];

  // 计算行级别汇总
  const lines = await query(
    `SELECT 
       SUM(req_qty) as total_req,
       SUM(ordered_qty) as total_ordered,
       SUM(received_qty) as total_received,
       SUM(consumed_qty) as total_consumed
     FROM biz_order_line WHERE order_id = ? AND deleted = 0`,
    [orderId]
  );

  const lineSummary = (lines as any[])[0];
  const totalReq = lineSummary.total_req || 0;
  const totalOrdered = lineSummary.total_ordered || 0;
  const totalReceived = lineSummary.total_received || 0;
  const totalConsumed = lineSummary.total_consumed || 0;

  // 计算差异
  const diffOrdered = totalOrdered - totalReq;
  const diffReceived = totalReceived - totalReq;
  const fulfillmentRate = totalReq > 0
    ? (totalConsumed / totalReq * 100).toFixed(2)
    : 0;

  // 查询关联的PO信息
  const linkedPOs = await query(
    `SELECT 
       po.id, po.po_no, po.supplier_name, po.status,
       po.total_quantity, po.total_amount,
       pol.line_no, pol.material_code, pol.material_name,
       pol.order_qty, pol.received_qty, pol.unit_price
     FROM pur_purchase_order po
     JOIN pur_purchase_order_line pol ON po.id = pol.po_id
     WHERE pol.source_order_id = ? AND po.deleted = 0
     ORDER BY po.create_time DESC`,
    [orderId]
  );

  // 查询关联的入库信息
  const linkedGRNs = await query(
    `SELECT 
       io.id, io.order_no as grnNo, io.status, io.inbound_date,
       iio.material_name, iio.quantity, iio.batch_no,
       iio.is_consumed
     FROM inv_inbound_order io
     JOIN inv_inbound_item iio ON io.id = iio.order_id
     WHERE iio.source_order_id = ? AND io.deleted = 0
     ORDER BY io.inbound_date DESC`,
    [orderId]
  );

  // 查询状态变更历史
  const statusHistory = await query(
    `SELECT 
       old_status, new_status, trigger_by, operate_time
     FROM order_status_history
     WHERE order_type = 'BIZ' AND order_id = ?
     ORDER BY operate_time DESC`,
    [orderId]
  );

  return successResponse({
    order: orderData,
    summary: {
      req_qty: totalReq,
      ordered_qty: totalOrdered,
      received_qty: totalReceived,
      consumed_qty: totalConsumed,
      diff_ordered: diffOrdered,
      diff_received: diffReceived,
      fulfillment_rate: `${fulfillmentRate}%`,
    },
    linked_pos: linkedPOs,
    linked_grns: linkedGRNs,
    status_history: statusHistory,
  });
}, '获取履行跟踪失败');
