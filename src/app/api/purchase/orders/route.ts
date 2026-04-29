import { NextRequest } from 'next/server';
import { query, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import { generateDocumentNo } from '@/lib/document-numbering';

// 采购单状态常量
const PO_STATUS = {
  DRAFT: 10,
  PENDING_APPROVAL: 20,
  APPROVED: 30,
  PARTIALLY_RECEIVED: 40,
  COMPLETED: 50,
  CLOSED: 90,
} as const;

// 获取采购单列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const supplierId = searchParams.get('supplierId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  let sql = `
    SELECT
      po.id,
      po.po_no,
      po.supplier_id,
      po.supplier_name,
      po.supplier_code,
      po.order_date,
      po.delivery_date,
      po.currency,
      po.total_amount,
      po.total_quantity,
      po.tax_rate,
      po.tax_amount,
      po.grand_total,
      po.status,
      po.over_receipt_tolerance,
      po.payment_terms,
      po.remark,
      po.create_time,
      po.update_time,
      po.audit_time
    FROM pur_purchase_order po
    WHERE po.deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM pur_purchase_order po WHERE po.deleted = 0`;
  const params: any[] = [];

  if (keyword) {
    const keywordCondition = ` AND (po.po_no LIKE ? OR po.supplier_name LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    sql += ` AND po.status = ?`;
    countSql += ` AND po.status = ?`;
    params.push(parseInt(status));
  }

  if (supplierId) {
    sql += ` AND po.supplier_id = ?`;
    countSql += ` AND po.supplier_id = ?`;
    params.push(supplierId);
  }

  if (startDate) {
    sql += ` AND po.order_date >= ?`;
    countSql += ` AND po.order_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND po.order_date <= ?`;
    countSql += ` AND po.order_date <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY po.create_time DESC`;

  const result = await queryPaginated(sql, countSql, params, { page, pageSize });

  // 获取每个采购单的明细和入库情况
  if (result.data.length > 0) {
    const poIds = result.data.map((p: any) => p.id);
    const placeholders = poIds.map(() => '?').join(',');

    const lines = await query(
      `SELECT
        id,
        po_id,
        line_no,
        material_id,
        material_code,
        material_name,
        material_spec,
        unit,
        order_qty,
        received_qty,
        returned_qty,
        unit_price,
        amount,
        require_date,
        closed_flag
      FROM pur_purchase_order_line
      WHERE po_id IN (${placeholders})
      ORDER BY line_no ASC`,
      poIds
    );

    // 获取入库汇总信息
    const grnSummary = await query(
      `SELECT
        io.po_id,
        SUM(iio.quantity) as total_received_qty,
        COUNT(DISTINCT io.id) as grn_count
      FROM inv_inbound_order io
      JOIN inv_inbound_item iio ON io.id = iio.order_id
      WHERE io.po_id IN (${placeholders}) AND io.status IN ('approved', 'completed')
      GROUP BY io.po_id`,
      poIds
    );

    // 分组数据
    const linesMap = new Map();
    for (const line of lines as any[]) {
      if (!linesMap.has(line.po_id)) {
        linesMap.set(line.po_id, []);
      }
      linesMap.get(line.po_id).push(line);
    }

    const grnMap = new Map();
    for (const grn of grnSummary as any[]) {
      grnMap.set(grn.po_id, grn);
    }

    for (const po of result.data as any[]) {
      po.lines = linesMap.get(po.id) || [];
      const grn = grnMap.get(po.id) || { total_received_qty: 0, grn_count: 0 };
      po.grn_summary = grn;
      po.remaining_qty = po.total_quantity - (grn.total_received_qty || 0);
    }
  }

  return paginatedResponse(result.data, result.pagination);
});

// 创建采购单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  const validation = validateRequestBody(body, [
    'supplier_id',
    'lines',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    supplier_id,
    supplier_name,
    supplier_code,
    order_date,
    delivery_date,
    currency,
    exchange_rate,
    tax_rate,
    payment_terms,
    delivery_address,
    remark,
    lines,
  } = body;

  if (!Array.isArray(lines) || lines.length === 0) {
    return errorResponse('采购明细不能为空', 400, 400);
  }

  const poNo = await generateDocumentNo('purchase_order');

  return await transaction(async (connection) => {
    let totalAmount = 0;
    let totalQuantity = 0;
    for (const line of lines) {
      totalAmount += (line.order_qty || 0) * (line.unit_price || 0);
      totalQuantity += line.order_qty || 0;
    }

    const taxRateValue = tax_rate || 13;
    const taxAmount = totalAmount * taxRateValue / 100;
    const grandTotal = totalAmount + taxAmount;

    const [orderResult] = await connection.execute(
      `INSERT INTO pur_purchase_order 
       (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, 
        currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
        status, payment_terms, delivery_address, remark, create_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        poNo,
        supplier_id,
        supplier_name,
        supplier_code || '',
        order_date || new Date().toISOString().slice(0, 10),
        delivery_date || null,
        currency || 'CNY',
        exchange_rate || 1.0,
        totalAmount,
        totalQuantity,
        taxRateValue,
        taxAmount,
        grandTotal,
        PO_STATUS.DRAFT,
        payment_terms || '',
        delivery_address || '',
        remark || '',
      ]
    );

    const poId = (orderResult as any).insertId;

    let lineNo = 1;
    for (const line of lines) {
      const lineAmount = (line.order_qty || 0) * (line.unit_price || 0);
      const lineTax = lineAmount * taxRateValue / 100;
      const lineTotal = lineAmount + lineTax;

      await connection.execute(
        `INSERT INTO pur_purchase_order_line 
         (po_id, line_no, material_id, material_code, material_name, material_spec, 
          unit, order_qty, unit_price, amount, tax_rate, tax_amount, line_total, 
          require_date, remark, create_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          poId,
          lineNo++,
          line.material_id || 0,
          line.material_code || '',
          line.material_name || '',
          line.material_spec || '',
          line.unit || '件',
          line.order_qty || 0,
          line.unit_price || 0,
          lineAmount,
          taxRateValue,
          lineTax,
          lineTotal,
          line.require_date || null,
          line.remark || '',
        ]
      );
    }

    return successResponse({ po_id: poId, po_no: poNo }, '采购单创建成功');
  });
}, '创建采购单失败');

// 更新采购单
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, ...updateData } = body;

  if (!id) {
    return errorResponse('采购单ID不能为空', 400, 400);
  }

  const orders = await query(
    'SELECT * FROM pur_purchase_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('采购单不存在');
  }

  const order = (orders as any[])[0];

  // 已完成的采购单不能修改
  if (order.status === PO_STATUS.COMPLETED || order.status === PO_STATUS.CLOSED) {
    return errorResponse('已完成或已关闭的采购单不能修改', 400, 400);
  }

  const updateFields: string[] = [];
  const updateParams: any[] = [];

  const fieldMapping: { [key: string]: string } = {
    supplier_id: 'supplier_id',
    supplier_name: 'supplier_name',
    supplier_code: 'supplier_code',
    order_date: 'order_date',
    delivery_date: 'delivery_date',
    currency: 'currency',
    exchange_rate: 'exchange_rate',
    tax_rate: 'tax_rate',
    payment_terms: 'payment_terms',
    delivery_address: 'delivery_address',
    over_receipt_tolerance: 'over_receipt_tolerance',
    remark: 'remark',
  };

  for (const [key, value] of Object.entries(updateData)) {
    if (fieldMapping[key] && value !== undefined) {
      updateFields.push(`${fieldMapping[key]} = ?`);
      updateParams.push(value);
    }
  }

  // 状态更新
  if (status !== undefined) {
    updateFields.push('status = ?');
    updateParams.push(status);

    // 审批时间
    if (status === PO_STATUS.APPROVED && order.status < PO_STATUS.APPROVED) {
      updateFields.push('audit_time = NOW()');
    }
  }

  if (updateFields.length === 0) {
    return errorResponse('没有要更新的字段', 400, 400);
  }

  updateParams.push(id);
  await query(
    `UPDATE pur_purchase_order SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
    updateParams
  );

  return successResponse({ id, status }, '采购单更新成功');
}, '更新采购单失败');

// 删除采购单
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('采购单ID不能为空', 400, 400);
  }

  const orders = await query(
    'SELECT * FROM pur_purchase_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('采购单不存在');
  }

  const order = (orders as any[])[0];

  // 已有入库记录的采购单不能删除
  if (order.status >= PO_STATUS.PARTIALLY_RECEIVED) {
    return errorResponse('已有入库记录的采购单不能删除', 400, 400);
  }

  await query(
    'UPDATE pur_purchase_order SET deleted = 1, update_time = NOW() WHERE id = ?',
    [id]
  );

  return successResponse(null, '采购单删除成功');
}, '删除采购单失败');
