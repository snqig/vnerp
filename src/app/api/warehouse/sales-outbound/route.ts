import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse, logOperation } from '@/lib/api-response';
import { randomUUID } from 'crypto';

import { withPermission } from '@/lib/api-permissions';
import { checkMaterialsCategorized } from '@/lib/category-validation';
import { secureLog } from '@/lib/logger';
import { appendInventoryTransaction } from '@/lib/inventory-ledger';
import type { DbRow } from '@/types/db';
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const outboundNo = searchParams.get('outboundNo') || '';
  const status = searchParams.get('status') || '';
  const orderNo = searchParams.get('orderNo') || '';

  let where = 'WHERE s.deleted = 0';
  const params: SqlValue[] = [];
  if (outboundNo) {
    where += ' AND s.outbound_no LIKE ?';
    params.push('%' + outboundNo + '%');
  }
  if (status) {
    where += ' AND s.status = ?';
    params.push(Number(status));
  }
  if (orderNo) {
    where += ' AND s.order_no LIKE ?';
    params.push('%' + orderNo + '%');
  }

  const totalRows = await query(
    'SELECT COUNT(*) as total FROM inv_sales_outbound s ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT s.*, w.warehouse_name FROM inv_sales_outbound s LEFT JOIN inv_warehouse w ON s.warehouse_id = w.id ' +
      where +
      ' ORDER BY s.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const items = await query('SELECT * FROM inv_sales_outbound_item WHERE outbound_id = ?', [
      row.id,
    ]);
    row.items = items;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const {
    order_id,
    order_no,
    customer_id,
    customer_name,
    warehouse_id,
    outbound_date,
    delivery_person,
    remark,
    items,
  } = body;

  if (!warehouse_id) {
    return errorResponse(ts('k_1t9r8nc'), 400, 400);
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return errorResponse(ts('k_15xvt0o'), 400, 400);
  }

  // 系统设置 category.require_on_business：销售出库单要求物料已归类
  const materialIds = (items as DbRow[]).map((item: DbRow) => item.material_id).filter(Boolean);
  secureLog('info', ts('k_gt16v1'), {
    itemCount: items.length,
    materialIds,
  });
  const categoryCheck = await checkMaterialsCategorized(materialIds);
  secureLog('info', ts('k_vyvuy4'), {
    blocked: categoryCheck.blocked,
    uncategorizedCount: categoryCheck.uncategorized.length,
  });
  if (categoryCheck.blocked) {
    secureLog('warn', ts('k_1006c0o'), {
      message: categoryCheck.message,
    });
    return errorResponse(categoryCheck.message!, 400, 400);
  }
  if (categoryCheck.message) {
    secureLog('warn', ts('k_vtkku0'), {
      message: categoryCheck.message,
    });
  }

  const now = new Date();
  const outboundNo =
    'SO' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result = await transaction(async (conn) => {
    if (order_id) {
      const [orderRows] = await conn.execute(
        'SELECT id, order_no, status, total_amount FROM sal_order WHERE id = ? AND deleted = 0 FOR UPDATE',
        [order_id]
      );
      if (orderRows.length === 0) {
        throw new Error(ts('k_1gccwsl'));
      }
      if (orderRows[0].status < 20) {
        throw new Error(ts('k_1gn0r8m'));
      }
      if (orderRows[0].status >= 90) {
        throw new Error(ts('k_1ybsap9'));
      }
    }

    for (const item of items) {
      if (!item.material_id || !item.quantity || Number(item.quantity) <= 0) {
        throw new Error(`物料 ${item.material_name || item.material_id} 出库数量必须大于0`);
      }

      const [invRows] = await conn.execute(
        'SELECT id, quantity, material_code, material_name FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
        [item.material_id, warehouse_id]
      );

      if (invRows.length === 0) {
        throw new Error(`物料 ${item.material_name || item.material_id} 在该仓库无库存`);
      }

      if (Number(invRows[0].quantity) < Number(item.quantity)) {
        throw new Error(
          `物料 ${item.material_name || item.material_id} 库存不足: 可用 ${invRows[0].quantity}, 需出 ${item.quantity}`
        );
      }
    }

    const [orderResult] = await conn.execute(
      'INSERT INTO inv_sales_outbound (outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
      [
        outboundNo,
        order_id || null,
        order_no || null,
        customer_id || null,
        customer_name || null,
        warehouse_id,
        outbound_date,
        delivery_person || null,
        remark || null,
      ]
    );
    const outboundId = orderResult.insertId;

    for (const item of items) {
      await conn.execute(
        'INSERT INTO inv_sales_outbound_item (outbound_id, material_id, material_code, material_name, quantity, unit, batch_no, batch_id, original_inbound_date, location_id, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          outboundId,
          item.material_id,
          item.material_code || null,
          item.material_name || null,
          item.quantity,
          item.unit || null,
          item.batch_no || null,
          item.batch_id || null,
          item.original_inbound_date || null,
          item.location_id || null,
          item.qr_code || null,
        ]
      );
    }

    return { id: outboundId, outbound_no: outboundNo };
  });

  return successResponse(
    { ...result, uncategorizedMaterials: categoryCheck.uncategorized },
    categoryCheck.message ? `销售出库单创建成功。${categoryCheck.message}` : ts('k_1j7yesz')
  );
});

export const PUT = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { id, action, status, remark } = body;

  if (!id) {
    return errorResponse(ts('k_1ddnsve'), 400, 400);
  }

  if (action === 'post') {
    const result = await transaction(async (conn) => {
      const [outboundRows] = await conn.execute(
        'SELECT id, outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, status FROM inv_sales_outbound WHERE id = ? AND deleted = 0 FOR UPDATE',
        [id]
      );

      if (outboundRows.length === 0) {
        throw new Error(ts('k_14l2xo0'));
      }

      const outbound = outboundRows[0];

      if (outbound.status >= 3) {
        throw new Error(ts('k_ir4gpo'));
      }

      const [itemRows] = await conn.execute(
        'SELECT * FROM inv_sales_outbound_item WHERE outbound_id = ?',
        [id]
      );

      for (const item of itemRows) {
        const [invRows] = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.material_id, outbound.warehouse_id]
        );

        if (invRows.length === 0) {
          throw new Error(`物料 ${item.material_name} 库存记录不存在`);
        }

        const inv = invRows[0];
        if (Number(inv.quantity) < Number(item.quantity)) {
          throw new Error(
            `物料 ${item.material_name} 库存不足: 可用 ${inv.quantity}, 需出 ${item.quantity}`
          );
        }

        await conn.execute(
          'UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?',
          [item.quantity, inv.id]
        );

        const [batchRows] = await conn.execute(
          `SELECT id, batch_no, available_qty, unit_price, inbound_date
           FROM inv_inventory_batch
           WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 1
           ORDER BY inbound_date ASC, id ASC
           FOR UPDATE`,
          [item.material_id, outbound.warehouse_id]
        );

        // 保存本次扣减的批次 ID（FIFO 顺序，取第一条）
        const firstBatchId = batchRows.length > 0 ? Number(batchRows[0].id) : null;
        const firstBatchInboundDate = batchRows.length > 0 ? batchRows[0].inbound_date : null;
        const firstBatchQrCode = batchRows.length > 0 ? batchRows[0].qr_code : null;
        await conn.execute(
          'UPDATE inv_sales_outbound_item SET batch_id = ?, location_id = ?, original_inbound_date = ?, qr_code = ? WHERE id = ?',
          [firstBatchId, null, firstBatchInboundDate, firstBatchQrCode, item.id]
        );

        let remainingQty = Number(item.quantity);
        let totalCost = 0;
        const fifoRecommended = batchRows.length > 0 ? batchRows[0].batch_no : null;
        const usedBatch = item.batch_no || null;

        if (usedBatch && fifoRecommended && usedBatch !== fifoRecommended) {
          try {
            await conn.execute(
              ts('k_1xstgvz'),
              [
                id,
                outbound.outbound_no,
                item.material_id,
                item.material_name || '',
                fifoRecommended,
                usedBatch,
                outbound.delivery_person || '',
              ]
            );
          } catch {}
        }

        for (const batch of batchRows) {
          if (remainingQty <= 0) break;
          const batchAvail = Number(batch.available_qty);
          const deductQty = Math.min(remainingQty, batchAvail);
          const batchCost = deductQty * Number(batch.unit_price || 0);

          await conn.execute(
            'UPDATE inv_inventory_batch SET available_qty = available_qty - ?, quantity = quantity - ? WHERE id = ?',
            [deductQty, deductQty, batch.id]
          );

          totalCost += batchCost;
          remainingQty -= deductQty;

          // 每条批次扣减生成独立库存流水（便于批次级追溯）
          await appendInventoryTransaction(conn, {
            transType: 'out',
            sourceType: 'sales_outbound',
            sourceId: id,
            sourceLineId: item.id,
            materialId: item.material_id,
            batchNo: batch.batch_no || null,
            warehouseId: outbound.warehouse_id,
            quantity: deductQty,
            unitPrice: Number(batch.unit_price || 0),
            totalAmount: batchCost,
            referenceNo: outbound.outbound_no,
            remark: `销售出库扣减: ${item.material_name} (批次 ${batch.batch_no})`,
            createBy: null,
          });
        }

        try {
          const voucherNo = 'FV' + Date.now() + String(item.id).slice(-4);
          await conn.execute(
            ts('k_50povp'),
            [
              voucherNo,
              id,
              outbound.outbound_no,
              totalCost,
              avgCost,
              item.quantity,
              item.batch_no || '',
              item.material_id,
              item.material_name || '',
              outbound.warehouse_id,
            ]
          );
        } catch {}
      }

      await conn.execute(
        'UPDATE inv_sales_outbound SET status = 3, finance_posted = 1, update_time = NOW() WHERE id = ?',
        [id]
      );

      // 注：sales_order/sales_order_item 为幽灵表（live 库不存在，sal_order_item 亦无 delivered_qty 列），
      // 原「累计发货/状态回写」死代码块已删除；销售出库进度应基于真实表 sal_order 另行实现。

      return { id, status: 3 };
    });

    const qrCode = 'SH-' + randomUUID().replace(/-/g, '').substring(0, 16);
    const outboundInfo = await queryOne(
      'SELECT * FROM inv_sales_outbound WHERE id = ? AND deleted = 0',
      [id]
    );
    if (outboundInfo) {
      await execute(
        `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, customer_id, customer_name, warehouse_id, status, extra_data)
         VALUES (?, 'shipment', ?, ?, ?, ?, ?, 1, ?)`,
        [
          qrCode,
          id,
          outboundInfo.outbound_no,
          outboundInfo.customer_id || null,
          outboundInfo.customer_name || '',
          outboundInfo.warehouse_id || null,
          JSON.stringify({
            outbound_no: outboundInfo.outbound_no,
            order_no: outboundInfo.order_no,
          }),
        ]
      );
    }

    await logOperation({
      title: ts('k_hcca9'),
      oper_type: ts('k_dwwra2'),
      oper_method: 'PUT',
      oper_url: '/api/warehouse/sales-outbound',
      oper_param: JSON.stringify({ id, action: 'post' }),
      oper_result: `出库单过账成功，已生成出货二维码 ${qrCode}`,
    });

    return successResponse(result, ts('k_12nvv6a'));
  }

  if (status !== undefined)
    await execute('UPDATE inv_sales_outbound SET status = ? WHERE id = ? AND deleted = 0', [
      status,
      id,
    ]);
  if (remark !== undefined)
    await execute('UPDATE inv_sales_outbound SET remark = ? WHERE id = ? AND deleted = 0', [
      remark,
      id,
    ]);
  return successResponse(null, ts('k_1795bzg'));
});

export const DELETE = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: ts('k_js4lo9') }, { status: 400 });

  const outbound = await query(
    'SELECT status FROM inv_sales_outbound WHERE id = ? AND deleted = 0',
    [Number(id)]
  );
  if (outbound.length === 0) {
    return errorResponse(ts('k_14l2xo0'), 404, 404);
  }
  if (outbound[0].status >= 3) {
    return errorResponse(ts('k_1x6as9t'), 400, 400);
  }

  await execute('UPDATE inv_sales_outbound SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, ts('k_1hlqs'));
});
