import { NextRequest } from 'next/server';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
  logOperation,
} from '@/lib/api-response';
import { generateDocumentNo } from '@/lib/document-numbering';
import { randomUUID } from 'crypto';

// 获取入库单列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 基础查询SQL - 匹配实际的数据库表结构
  let sql = `
    SELECT
      o.id,
      o.order_no,
      o.inbound_date,
      o.supplier_name,
      o.warehouse_id,
      o.order_type,
      o.total_quantity,
      o.total_amount,
      o.status,
      o.remark,
      o.create_time,
      o.update_time
    FROM inv_inbound_order o
    WHERE o.deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM inv_inbound_order o WHERE o.deleted = 0`;
  const params: any[] = [];

  if (keyword) {
    const keywordCondition = ` AND (o.order_no LIKE ? OR o.supplier_name LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    sql += ` AND o.status = ?`;
    countSql += ` AND o.status = ?`;
    params.push(status);
  }

  if (startDate) {
    sql += ` AND o.inbound_date >= ?`;
    countSql += ` AND o.inbound_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND o.inbound_date <= ?`;
    countSql += ` AND o.inbound_date <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY o.create_time DESC`;

  // 使用分页查询工具
  const result = await queryPaginated(sql, countSql, params, { page, pageSize });

  // 获取每个订单的明细
  if (result.data.length > 0) {
    const orderIds = result.data.map((o: any) => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    const items = await query(
      `SELECT
        id,
        order_id,
        material_id,
        material_name,
        material_spec,
        batch_no,
        quantity,
        unit,
        unit_price,
        total_price,
        warehouse_location,
        produce_date
      FROM inv_inbound_item
      WHERE order_id IN (${placeholders})`,
      orderIds
    );

    const itemsMap = new Map();
    for (const item of items as any[]) {
      if (!itemsMap.has(item.order_id)) {
        itemsMap.set(item.order_id, []);
      }
      itemsMap.get(item.order_id).push(item);
    }

    for (const order of result.data as any[]) {
      order.items = itemsMap.get(order.id) || [];
    }
  }

  return paginatedResponse(result.data, result.pagination);
});

// 创建入库单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'items',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    warehouse_id,
    supplier_name,
    inbound_date,
    remark,
    items,
  } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return errorResponse('入库项不能为空', 400, 400);
  }

  let totalAmount = 0;
  let totalQuantity = 0;
  for (const item of items) {
    totalAmount += (item.quantity || 0) * (item.unit_price || 0);
    totalQuantity += item.quantity || 0;
  }

  const orderNo = await generateDocumentNo('inbound');

  return await transaction(async (connection) => {
    const [orderResult] = await connection.execute(
      `INSERT INTO inv_inbound_order 
       (order_no, order_type, warehouse_id, supplier_name, total_amount, total_quantity, status, inbound_date, remark, create_time) 
       VALUES (?, 'purchase', ?, ?, ?, ?, 'draft', ?, ?, NOW())`,
      [orderNo, warehouse_id, supplier_name || '', totalAmount, totalQuantity, inbound_date || null, remark || '']
    );

    const orderId = (orderResult as any).insertId;

    for (const item of items) {
      await connection.execute(
        `INSERT INTO inv_inbound_item 
         (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price, warehouse_location, produce_date, create_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderId,
          item.material_id || 0,
          item.material_name || '',
          item.material_spec || '',
          item.batch_no || '',
          item.quantity || 0,
          item.unit || '件',
          item.unit_price || 0,
          (item.quantity || 0) * (item.unit_price || 0),
          item.warehouse_location || '',
          item.produce_date || null,
        ]
      );
    }

    return successResponse({ order_id: orderId, order_no: orderNo }, '入库单创建成功');
  });
}, '创建入库单失败');
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark, ...updateData } = body;

  if (!id) {
    return errorResponse('入库单ID不能为空', 400, 400);
  }

  // 查询入库单
  const orders = await query(
    'SELECT * FROM inv_inbound_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('入库单不存在');
  }

  const order = (orders as any[])[0];

  // 已完成的入库单不能修改
  if (order.status === 'completed') {
    return errorResponse('已完成的入库单不能修改', 400, 400);
  }

  const updateFields: string[] = [];
  const updateParams: any[] = [];

  if (status) {
    updateFields.push('status = ?');
    updateParams.push(status);
  }

  if (remark !== undefined) {
    updateFields.push('remark = ?');
    updateParams.push(remark);
  }

  if (updateFields.length > 0) {
    updateParams.push(id);
    await query(
      `UPDATE inv_inbound_order SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
      updateParams
    );
  }

  if (status === 'approved') {
    await transaction(async (conn) => {
      const [items]: any = await conn.execute(
        'SELECT * FROM inv_inbound_item WHERE order_id = ?',
        [id]
      );

      const [warehouseRows]: any = await conn.execute(
        'SELECT id, name FROM inv_warehouse WHERE id = ?',
        [order.warehouse_id]
      );
      const warehouseName = warehouseRows[0]?.name || '';

      for (const item of items) {
        const [existingInv]: any = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.material_id, order.warehouse_id]
        );

        if (existingInv.length > 0) {
          await conn.execute(
            'UPDATE inv_inventory SET quantity = quantity + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, existingInv[0].id]
          );
        } else {
          await conn.execute(
            `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, unit, create_time)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [item.material_id, item.material_code || null, item.material_name || '', order.warehouse_id, item.quantity, item.unit || '件']
          );
        }

        const [existingBatch]: any = await conn.execute(
          'SELECT id, available_qty FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.batch_no || `B${Date.now()}`, item.material_id, order.warehouse_id]
        );

        if (existingBatch.length > 0) {
          await conn.execute(
            'UPDATE inv_inventory_batch SET available_qty = available_qty + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, existingBatch[0].id]
          );
        } else {
          await conn.execute(
            `INSERT INTO inv_inventory_batch (batch_no, material_id, material_code, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date, status, produce_date, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, NOW())`,
            [
              item.batch_no || `B${Date.now()}`,
              item.material_id,
              item.material_code || null,
              item.material_name || '',
              order.warehouse_id,
              item.quantity,
              item.quantity,
              item.unit_price || 0,
              order.inbound_date || new Date().toISOString().slice(0, 10),
              item.produce_date || null,
            ]
          );
        }

        const qrCode = 'MA-' + randomUUID().replace(/-/g, '').substring(0, 16);
        await conn.execute(
          `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, batch_no, material_id, material_code, material_name, specification, quantity, unit, warehouse_id, warehouse_name, supplier_name, production_date, status, extra_data)
           VALUES (?, 'material', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            qrCode, id, order.order_no, item.batch_no || null,
            item.material_id || null, null, item.material_name || '',
            item.material_spec || '', item.quantity || 0, item.unit || '',
            order.warehouse_id || null, warehouseName,
            order.supplier_name || '', item.produce_date || null,
            JSON.stringify({ inbound_order_no: order.order_no, inbound_date: order.inbound_date }),
          ]
        );

        const transNo = 'TRX' + Date.now() + String(item.id || 0).slice(-4);
        const totalItemAmount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
        await conn.execute(
          `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, account_dr, account_cr, create_time)
           VALUES (?, 'in', 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, '原材料库存', '应付账款', NOW())`,
          [transNo, id, item.material_id, item.material_code || '', item.batch_no || '', order.warehouse_id, item.quantity, item.unit_price || 0, totalItemAmount]
        );

        try {
          const voucherNo = 'FV' + Date.now() + String(item.id || 0).slice(-4);
          await conn.execute(
            `INSERT INTO fin_voucher (voucher_no, voucher_date, source_type, source_id, source_no, debit_account, credit_account, amount, cost_price, quantity, batch_no, material_id, material_name, warehouse_id)
             VALUES (?, CURDATE(), 'inbound', ?, ?, '原材料库存', '应付账款', ?, ?, ?, ?, ?, ?, ?)`,
            [voucherNo, id, order.order_no, totalItemAmount, item.unit_price || 0, item.quantity, item.batch_no || '', item.material_id, item.material_name || '', order.warehouse_id]
          );
        } catch {}
      }

      const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
      if (totalAmount > 0 && order.supplier_name) {
        try {
          const [supplierRows]: any = await conn.execute(
            'SELECT id FROM pur_supplier WHERE supplier_name = ? AND deleted = 0 LIMIT 1',
            [order.supplier_name]
          );
          const supplierId = supplierRows.length > 0 ? supplierRows[0].id : null;

          const payableNo = 'AP' + Date.now();
          await conn.execute(
            `INSERT INTO fin_payable (payable_no, supplier_id, supplier_name, source_type, source_id, source_no, amount, paid_amount, status, due_date, remark, create_time)
             VALUES (?, ?, ?, 'inbound', ?, ?, ?, 0, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
            [payableNo, supplierId, order.supplier_name, id, order.order_no, totalAmount, `采购入库单 ${order.order_no} 自动生成`]
          );
        } catch {}
      }

      await conn.execute(
        'UPDATE inv_inbound_order SET inspection_status = 3, finance_posted = 1 WHERE id = ?',
        [id]
      );
    });

    await logOperation({
      title: '入库单审核',
      oper_type: '审核',
      oper_method: 'PUT',
      oper_url: '/api/warehouse/inbound',
      oper_param: JSON.stringify({ id, status: 'approved' }),
      oper_result: `入库单 ${order.order_no} 审核通过，已生成物料二维码、批次库存、财务凭证`,
    });
  }

  return successResponse({ id, status, remark }, '入库单更新成功');
}, '更新入库单失败');

// 删除入库单
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('入库单ID不能为空', 400, 400);
  }

  // 查询入库单
  const orders = await query(
    'SELECT * FROM inv_inbound_order WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('入库单不存在');
  }

  const order = (orders as any[])[0];

  // 已完成的入库单不能删除
  if (order.status === 'completed') {
    return errorResponse('已完成的入库单不能删除', 400, 400);
  }

  await query(
    'UPDATE inv_inbound_order SET deleted = 1, update_time = NOW() WHERE id = ?',
    [id]
  );

  return successResponse(null, '入库单删除成功');
}, '删除入库单失败');
