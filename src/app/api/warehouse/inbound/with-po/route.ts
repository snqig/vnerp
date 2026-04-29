import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
} from '@/lib/api-response';

// 采购单状态常量
const PO_STATUS = {
  DRAFT: 10,
  PENDING_APPROVAL: 20,
  APPROVED: 30,
  PARTIALLY_RECEIVED: 40,
  COMPLETED: 50,
  CLOSED: 90,
} as const;

// 入库单状态常量
const GRN_STATUS = {
  DRAFT: 'draft',
  QC_PENDING: 'qc_pending',
  QC_PASS: 'qc_pass',
  QC_FAIL: 'qc_fail',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// 获取可入库的采购单行
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const poId = searchParams.get('poId');
  const materialCode = searchParams.get('materialCode') || '';

  if (!poId) {
    return errorResponse('采购单ID不能为空', 400, 400);
  }

  // 查询采购单信息
  const po = await query(
    `SELECT id, po_no, supplier_id, supplier_name, status, over_receipt_tolerance, total_quantity
     FROM pur_purchase_order WHERE id = ? AND deleted = 0`,
    [poId]
  );

  if (!po || (po as any[]).length === 0) {
    return commonErrors.notFound('采购单不存在');
  }

  const poData = (po as any[])[0];

  // 检查采购单状态
  if (poData.status < PO_STATUS.APPROVED) {
    return errorResponse('采购单未审批，不能入库', 400, 400);
  }

  if (poData.status >= PO_STATUS.CLOSED) {
    return errorResponse('采购单已关闭，不能入库', 400, 400);
  }

  // 查询采购单行及入库情况
  let sql = `
    SELECT
      pol.id,
      pol.po_id,
      pol.line_no,
      pol.material_id,
      pol.material_code,
      pol.material_name,
      pol.material_spec,
      pol.unit,
      pol.order_qty,
      pol.received_qty,
      pol.returned_qty,
      pol.unit_price,
      pol.require_date,
      pol.closed_flag,
      (pol.order_qty - pol.received_qty + pol.returned_qty) as available_qty,
      (pol.order_qty * (1 + ? / 100)) as max_receipt_qty
    FROM pur_purchase_order_line pol
    WHERE pol.po_id = ? AND pol.closed_flag = 0
  `;

  const params: any[] = [poData.over_receipt_tolerance, poId];

  if (materialCode) {
    sql += ` AND (pol.material_code LIKE ? OR pol.material_name LIKE ?)`;
    params.push(`%${materialCode}%`, `%${materialCode}%`);
  }

  sql += ` ORDER BY pol.line_no ASC`;

  const lines = await query(sql, params);

  // 查询已关联此PO的入库单汇总
  const grnSummary = await query(
    `SELECT
       COUNT(*) as grn_count,
       SUM(total_quantity) as total_received_qty
     FROM inv_inbound_order
     WHERE po_id = ? AND status IN ('approved', 'completed') AND deleted = 0`,
    [poId]
  );

  return successResponse({
    po: poData,
    lines: lines,
    summary: (grnSummary as any[])[0] || { grn_count: 0, total_received_qty: 0 },
  });
});

// 创建关联采购单的入库单（带数量勾稽控制）
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { poId, items, warehouse_id, inbound_date, delivery_no, remark } = body;

  if (!poId) {
    return errorResponse('采购单ID不能为空', 400, 400);
  }

  if (!warehouse_id) {
    return errorResponse('仓库ID不能为空', 400, 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    return errorResponse('入库项不能为空', 400, 400);
  }

  return await transaction(async (connection) => {
    // 1. 查询采购单信息（加锁防止并发）
    const [poRows] = await connection.execute(
      `SELECT id, po_no, supplier_id, supplier_name, status, over_receipt_tolerance
       FROM pur_purchase_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
      [poId]
    );

    const poData = (poRows as any[])[0];
    if (!poData) {
      throw new Error('采购单不存在');
    }

    if (poData.status < PO_STATUS.APPROVED) {
      throw new Error('采购单未审批，不能入库');
    }

    if (poData.status >= PO_STATUS.CLOSED) {
      throw new Error('采购单已关闭，不能入库');
    }

    // 2. 查询采购单行信息（加锁）
    const poLineIds = items.map(item => item.po_line_id).filter(Boolean);
    if (poLineIds.length === 0) {
      throw new Error('入库项必须关联采购单行');
    }

    const placeholders = poLineIds.map(() => '?').join(',');
    const [lineRows] = await connection.execute(
      `SELECT id, po_id, material_code, material_name, material_spec, unit,
              order_qty, received_qty, returned_qty, unit_price, closed_flag
       FROM pur_purchase_order_line
       WHERE id IN (${placeholders}) AND po_id = ? FOR UPDATE`,
      [...poLineIds, poId]
    );

    const poLinesMap = new Map();
    for (const line of lineRows as any[]) {
      poLinesMap.set(line.id, line);
    }

    // 3. 数量勾稽校验
    const tolerance = poData.over_receipt_tolerance;
    const validationErrors: string[] = [];

    for (const item of items) {
      const poLine = poLinesMap.get(item.po_line_id);
      if (!poLine) {
        validationErrors.push(`采购单行ID ${item.po_line_id} 不存在`);
        continue;
      }

      if (poLine.closed_flag) {
        validationErrors.push(`物料 ${poLine.material_code} 的采购行已关闭`);
        continue;
      }

      // 计算本次入库后的累计数量
      const currentReceived = poLine.received_qty || 0;
      const currentReturn = poLine.returned_qty || 0;
      const newReceived = currentReceived + (item.quantity || 0);
      const availableQty = poLine.order_qty - currentReceived + currentReturn;

      // 检查是否超收
      const maxAllowed = poLine.order_qty * (1 + tolerance / 100);

      if (newReceived > maxAllowed) {
        validationErrors.push(
          `物料 ${poLine.material_code} 超收: 累计入库 ${newReceived} > 允许上限 ${maxAllowed.toFixed(2)} (订购 ${poLine.order_qty} + 容差 ${tolerance}%)`
        );
      }

      // 保存校验结果供后续使用
      item._poLine = poLine;
      item._newReceived = newReceived;
      item._isComplete = newReceived >= poLine.order_qty;
    }

    if (validationErrors.length > 0) {
      throw new Error(`入库数量校验失败:\n${validationErrors.join('\n')}`);
    }

    // 4. 生成入库单号
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    const grnNo = `GRN${dateStr}${randomStr}`;

    // 5. 计算入库总金额
    let totalAmount = 0;
    let totalQuantity = 0;
    for (const item of items) {
      totalAmount += (item.quantity || 0) * (item._poLine.unit_price || 0);
      totalQuantity += item.quantity || 0;
    }

    // 6. 插入入库单主表
    const [orderResult] = await connection.execute(
      `INSERT INTO inv_inbound_order 
       (order_no, po_id, po_no, order_type, grn_type, warehouse_id, supplier_name, 
        total_amount, total_quantity, status, qc_status, inbound_date, delivery_no, remark, create_time) 
       VALUES (?, ?, ?, 'purchase', 'po', ?, ?, ?, ?, 'draft', 'pending', ?, ?, ?, NOW())`,
      [
        grnNo,
        poId,
     grnNo,
      poData.po_no,
      warehouse_id,
      poData.supplier_name,
      totalAmount,
      totalQuantity,
      inbound_date || new Date().toISOString().slice(0, 10),
      delivery_no || '',
        remark || '',
      ]
    );

    const grnId = (orderResult as any).insertId;

    // 7. 插入入库明细
    let lineNo = 1;
    for (const item of items) {
      const poLine = item._poLine;

      await connection.execute(
        `INSERT INTO inv_inbound_item 
         (order_id, po_line_id, line_no, material_id, material_name, material_spec, 
          batch_no, supplier_batch_no, quantity, unit, unit_price, total_price, 
          warehouse_id, warehouse_location, produce_date, create_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          grnId,
          item.po_line_id,
          lineNo++,
          poLine.material_id || 0,
          poLine.material_name,
          poLine.material_spec,
          item.batch_no || '',
          item.supplier_batch_no || '',
          item.quantity || 0,
          poLine.unit,
          poLine.unit_price || 0,
          (item.quantity || 0) * (poLine.unit_price || 0),
          warehouse_id,
          item.warehouse_location || '',
          item.produce_date || null,
        ]
      );
    }

    return successResponse({
      grn_id: grnId,
      grn_no: grnNo,
      po_no: poData.po_no,
      total_quantity: totalQuantity,
      total_amount: totalAmount,
    }, '入库单创建成功（关联采购单）');
  });
}, '创建入库单失败');

// 入库单过账（更新库存并联动更新PO状态）
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { grn_id, action, qc_results } = body;

  if (!grn_id) {
    return errorResponse('入库单ID不能为空', 400, 400);
  }

  return await transaction(async (connection) => {
    // 1. 查询入库单
    const [grnRows] = await connection.execute(
      `SELECT id, order_no, po_id, po_no, status, total_quantity, warehouse_id
       FROM inv_inbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
      [grn_id]
    );

    const grn = (grnRows as any[])[0];
    if (!grn) {
      throw new Error('入库单不存在');
    }

    if (grn.status === GRN_STATUS.COMPLETED) {
      throw new Error('入库单已完成，不能重复过账');
    }

    if (grn.status === GRN_STATUS.CANCELLED) {
      throw new Error('入库单已取消');
    }

    const [itemRows] = await connection.execute(
      `SELECT id, po_line_id, material_id, material_name, material_spec, batch_no,
              quantity, unit, unit_price, total_price, warehouse_location
       FROM inv_inbound_item WHERE order_id = ?`,
      [grn_id]
    );

    const items = itemRows as any[];

    if (action === 'qc') {
      for (const item of items) {
        const qcResult = qc_results?.find((q: any) => q.item_id === item.id);
        if (qcResult) {
          await connection.execute(
            `UPDATE inv_inbound_item 
             SET accepted_qty = ?, rejected_qty = ?, qc_result = ?, qc_time = NOW()
             WHERE id = ?`,
            [qcResult.accepted_qty || 0, qcResult.rejected_qty || 0, qcResult.result, item.id]
          );
        }
      }

      const hasFail = qc_results?.some((q: any) => q.result === 'fail');
      const hasPending = qc_results?.some((q: any) => q.result === 'pending');
      const qcStatus = hasFail ? 'fail' : hasPending ? 'partial' : 'pass';

      await connection.execute(
        `UPDATE inv_inbound_order SET qc_status = ?, status = ? WHERE id = ?`,
        [qcStatus, qcStatus === 'pass' ? GRN_STATUS.QC_PASS : GRN_STATUS.QC_PENDING, grn_id]
      );

      return successResponse({ grn_id }, '质检完成');
    }

    if (action === 'post') {
      await connection.execute(
        `UPDATE inv_inbound_order 
         SET status = ?, post_time = NOW(), update_time = NOW() 
         WHERE id = ?`,
        [GRN_STATUS.COMPLETED, grn_id]
      );

      if (grn.po_id) {
        for (const item of items) {
          if (item.po_line_id) {
            await connection.execute(
              `UPDATE pur_purchase_order_line 
               SET received_qty = received_qty + ? 
               WHERE id = ?`,
              [item.quantity, item.po_line_id]
            );
          }
        }

        const [poLines] = await connection.execute(
          `SELECT order_qty, received_qty FROM pur_purchase_order_line WHERE po_id = ?`,
          [grn.po_id]
        );

        let allComplete = true;
        let anyReceived = false;

        for (const line of poLines as any[]) {
          if (line.received_qty > 0) {
            anyReceived = true;
          }
          if (line.received_qty < line.order_qty) {
            allComplete = false;
          }
        }

        let newPoStatus: number = PO_STATUS.APPROVED;
        if (allComplete && anyReceived) {
          newPoStatus = PO_STATUS.COMPLETED;
        } else if (anyReceived) {
          newPoStatus = PO_STATUS.PARTIALLY_RECEIVED;
        }

        await connection.execute(
          `UPDATE pur_purchase_order SET status = ? WHERE id = ?`,
          [newPoStatus, grn.po_id]
        );
      }

      const transNo = `TRX${Date.now()}`;
      for (const item of items) {
        await connection.execute(
          `INSERT INTO inv_inventory_transaction 
           (trans_no, trans_type, source_type, source_id, source_line_id,
            material_id, material_code, batch_no, warehouse_id, quantity,
            unit_price, total_amount, account_dr, account_cr, create_time)
           SELECT ?, 'in', 'grn', ?, ?, 
                  ?, m.material_code, ?, ?, ?,
                  ?, ?, '原材料库存', '应付暂估', NOW()
           FROM mdm_material m WHERE m.id = ?`,
          [
            transNo,
            grn_id,
            item.id,
            item.material_id,
            item.batch_no,
            grn.warehouse_id,
            item.quantity,
            item.unit_price,
            item.total_price,
            item.material_id,
          ]
        );
      }

      return successResponse({ grn_id, trans_no: transNo }, '入库单过账成功');
    }

    return errorResponse('无效的操作', 400, 400);
  });
}, '入库单处理失败');
