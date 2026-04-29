import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, transaction } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, logOperation } from '@/lib/api-response';
import { randomUUID } from 'crypto';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const outboundNo = searchParams.get('outboundNo') || '';
  const status = searchParams.get('status') || '';
  const orderNo = searchParams.get('orderNo') || '';

  let where = 'WHERE s.deleted = 0';
  const params: any[] = [];
  if (outboundNo) { where += ' AND s.outbound_no LIKE ?'; params.push('%' + outboundNo + '%'); }
  if (status) { where += ' AND s.status = ?'; params.push(Number(status)); }
  if (orderNo) { where += ' AND s.order_no LIKE ?'; params.push('%' + orderNo + '%'); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM inv_sales_outbound s ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT s.*, w.warehouse_name FROM inv_sales_outbound s LEFT JOIN inv_warehouse w ON s.warehouse_id = w.id ' + where + ' ORDER BY s.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const items: any = await query(
      'SELECT * FROM inv_sales_outbound_item WHERE outbound_id = ?',
      [row.id]
    );
    row.items = items;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { order_id, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, remark, items } = body;

  if (!warehouse_id) {
    return errorResponse('仓库ID不能为空', 400, 400);
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('出库明细不能为空', 400, 400);
  }

  const now = new Date();
  const outboundNo = 'SO' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await transaction(async (conn) => {
    if (order_id) {
      const [orderRows]: any = await conn.execute(
        'SELECT id, order_no, status, total_amount FROM sales_order WHERE id = ? AND deleted = 0 FOR UPDATE',
        [order_id]
      );
      if (orderRows.length === 0) {
        throw new Error('销售订单不存在');
      }
      if (orderRows[0].status < 20) {
        throw new Error('销售订单未审核，不能出库');
      }
      if (orderRows[0].status >= 90) {
        throw new Error('销售订单已关闭，不能出库');
      }
    }

    for (const item of items) {
      if (!item.material_id || !item.quantity || Number(item.quantity) <= 0) {
        throw new Error(`物料 ${item.material_name || item.material_id} 出库数量必须大于0`);
      }

      const [invRows]: any = await conn.execute(
        'SELECT id, quantity, material_code, material_name FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
        [item.material_id, warehouse_id]
      );

      if (invRows.length === 0) {
        throw new Error(`物料 ${item.material_name || item.material_id} 在该仓库无库存`);
      }

      if (Number(invRows[0].quantity) < Number(item.quantity)) {
        throw new Error(`物料 ${item.material_name || item.material_id} 库存不足: 可用 ${invRows[0].quantity}, 需出 ${item.quantity}`);
      }
    }

    const [orderResult]: any = await conn.execute(
      'INSERT INTO inv_sales_outbound (outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
      [outboundNo, order_id || null, order_no || null, customer_id || null, customer_name || null, warehouse_id, outbound_date, delivery_person || null, remark || null]
    );
    const outboundId = orderResult.insertId;

    for (const item of items) {
      await conn.execute(
        'INSERT INTO inv_sales_outbound_item (outbound_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [outboundId, item.material_id, item.material_code || null, item.material_name || null, item.quantity, item.unit || null, item.batch_no || null]
      );
    }

    return { id: outboundId, outbound_no: outboundNo };
  });

  return successResponse(result, '销售出库单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, status, remark } = body;

  if (!id) {
    return errorResponse('出库单ID不能为空', 400, 400);
  }

  if (action === 'post') {
    const result = await transaction(async (conn) => {
      const [outboundRows]: any = await conn.execute(
        'SELECT id, outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, status FROM inv_sales_outbound WHERE id = ? AND deleted = 0 FOR UPDATE',
        [id]
      );

      if (outboundRows.length === 0) {
        throw new Error('出库单不存在');
      }

      const outbound = outboundRows[0];

      if (outbound.status >= 3) {
        throw new Error('出库单已完成或已取消，不能重复过账');
      }

      const [itemRows]: any = await conn.execute(
        'SELECT * FROM inv_sales_outbound_item WHERE outbound_id = ?',
        [id]
      );

      for (const item of itemRows) {
        const [invRows]: any = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.material_id, outbound.warehouse_id]
        );

        if (invRows.length === 0) {
          throw new Error(`物料 ${item.material_name} 库存记录不存在`);
        }

        const inv = invRows[0];
        if (Number(inv.quantity) < Number(item.quantity)) {
          throw new Error(`物料 ${item.material_name} 库存不足: 可用 ${inv.quantity}, 需出 ${item.quantity}`);
        }

        await conn.execute(
          'UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?',
          [item.quantity, inv.id]
        );

        const [batchRows]: any = await conn.execute(
          `SELECT id, batch_no, available_qty, unit_price, inbound_date
           FROM inv_inventory_batch
           WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 'normal'
           ORDER BY inbound_date ASC, id ASC
           FOR UPDATE`,
          [item.material_id, outbound.warehouse_id]
        );

        let remainingQty = Number(item.quantity);
        let totalCost = 0;
        const fifoRecommended = batchRows.length > 0 ? batchRows[0].batch_no : null;
        const usedBatch = item.batch_no || null;

        if (usedBatch && fifoRecommended && usedBatch !== fifoRecommended) {
          try {
            await conn.execute(
              `INSERT INTO inv_fifo_override_log (source_type, source_id, source_no, material_id, material_name, recommended_batch, actual_batch, reason, operator_name, approval_status)
               VALUES ('sales_outbound', ?, ?, ?, ?, ?, ?, '手动指定批次', ?, 0)`,
              [id, outbound.outbound_no, item.material_id, item.material_name || '', fifoRecommended, usedBatch, outbound.delivery_person || '']
            );
          } catch {}
        }

        for (const batch of batchRows) {
          if (remainingQty <= 0) break;
          const batchAvail = Number(batch.available_qty);
          const deductQty = Math.min(remainingQty, batchAvail);
          const batchCost = deductQty * Number(batch.unit_price || 0);

          await conn.execute(
            'UPDATE inv_inventory_batch SET available_qty = available_qty - ? WHERE id = ?',
            [deductQty, batch.id]
          );

          totalCost += batchCost;
          remainingQty -= deductQty;
        }

        const avgCost = Number(item.quantity) > 0 ? totalCost / Number(item.quantity) : 0;
        const transNo = 'TRX' + Date.now() + String(item.id).slice(-4);
        const [matRows]: any = await conn.execute('SELECT material_code FROM mdm_material WHERE id = ?', [item.material_id]);
        const matCode = matRows.length > 0 ? matRows[0].material_code : '';

        await conn.execute(
          'INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, account_dr, account_cr, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [transNo, 'out', 'sales_outbound', id, item.material_id, matCode, item.batch_no || '', outbound.warehouse_id, -item.quantity, avgCost, totalCost, '应收账款', '成品库存']
        );

        try {
          const voucherNo = 'FV' + Date.now() + String(item.id).slice(-4);
          await conn.execute(
            `INSERT INTO fin_voucher (voucher_no, voucher_date, source_type, source_id, source_no, debit_account, credit_account, amount, cost_price, quantity, batch_no, material_id, material_name, warehouse_id)
             VALUES (?, CURDATE(), 'sales_outbound', ?, ?, '应收账款', '成品库存', ?, ?, ?, ?, ?, ?, ?)`,
            [voucherNo, id, outbound.outbound_no, totalCost, avgCost, item.quantity, item.batch_no || '', item.material_id, item.material_name || '', outbound.warehouse_id]
          );
        } catch {}
      }

      await conn.execute(
        'UPDATE inv_sales_outbound SET status = 3, finance_posted = 1, update_time = NOW() WHERE id = ?',
        [id]
      );

      if (outbound.order_id) {
        const totalOutQty = itemRows.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

        const [soItemRows]: any = await conn.execute(
          'SELECT id, material_id, quantity, delivered_qty FROM sales_order_item WHERE order_id = ?',
          [outbound.order_id]
        );

        for (const soItem of soItemRows) {
          const matchedOutItems = itemRows.filter((i: any) => i.material_id === soItem.material_id);
          const outQty = matchedOutItems.reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);
          if (outQty > 0) {
            await conn.execute(
              'UPDATE sales_order_item SET delivered_qty = COALESCE(delivered_qty, 0) + ? WHERE id = ?',
              [outQty, soItem.id]
            );
          }
        }

        const [updatedSoItems]: any = await conn.execute(
          'SELECT quantity, COALESCE(delivered_qty, 0) as delivered_qty FROM sales_order_item WHERE order_id = ?',
          [outbound.order_id]
        );

        const allDelivered = updatedSoItems.every((item: any) => Number(item.delivered_qty) >= Number(item.quantity));
        const anyDelivered = updatedSoItems.some((item: any) => Number(item.delivered_qty) > 0);

        if (allDelivered) {
          await conn.execute(
            'UPDATE sales_order SET status = 50 WHERE id = ? AND deleted = 0',
            [outbound.order_id]
          );
        } else if (anyDelivered) {
          await conn.execute(
            'UPDATE sales_order SET status = 40 WHERE id = ? AND status < 40 AND deleted = 0',
            [outbound.order_id]
          );
        }
      }

      return { id, status: 3 };
    });

    const qrCode = 'SH-' + randomUUID().replace(/-/g, '').substring(0, 16);
    const outboundInfo: any = await queryOne('SELECT * FROM inv_sales_outbound WHERE id = ? AND deleted = 0', [id]);
    if (outboundInfo) {
      await execute(
        `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, customer_id, customer_name, warehouse_id, status, extra_data)
         VALUES (?, 'shipment', ?, ?, ?, ?, ?, 1, ?)`,
        [
          qrCode, id, outboundInfo.outbound_no,
          outboundInfo.customer_id || null, outboundInfo.customer_name || '',
          outboundInfo.warehouse_id || null,
          JSON.stringify({ outbound_no: outboundInfo.outbound_no, order_no: outboundInfo.order_no }),
        ]
      );
    }

    await logOperation({
      title: '销售出库过账',
      oper_type: '出库',
      oper_method: 'PUT',
      oper_url: '/api/warehouse/sales-outbound',
      oper_param: JSON.stringify({ id, action: 'post' }),
      oper_result: `出库单过账成功，已生成出货二维码 ${qrCode}`,
    });

    return successResponse(result, '出库过账成功');
  }

  if (status !== undefined) await execute('UPDATE inv_sales_outbound SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (remark !== undefined) await execute('UPDATE inv_sales_outbound SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  const outbound: any = await query('SELECT status FROM inv_sales_outbound WHERE id = ? AND deleted = 0', [Number(id)]);
  if (outbound.length === 0) {
    return errorResponse('出库单不存在', 404, 404);
  }
  if (outbound[0].status >= 3) {
    return errorResponse('已完成的出库单不能删除', 400, 400);
  }

  await execute('UPDATE inv_sales_outbound SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
