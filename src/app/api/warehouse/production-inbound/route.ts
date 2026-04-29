import { NextRequest, NextResponse } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, logOperation } from '@/lib/api-response';
import { randomUUID } from 'crypto';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const inboundNo = searchParams.get('inboundNo') || '';
  const status = searchParams.get('status') || '';
  const workOrderNo = searchParams.get('workOrderNo') || '';

  let where = 'WHERE p.deleted = 0';
  const params: any[] = [];
  if (inboundNo) { where += ' AND p.inbound_no LIKE ?'; params.push('%' + inboundNo + '%'); }
  if (status) { where += ' AND p.status = ?'; params.push(Number(status)); }
  if (workOrderNo) { where += ' AND p.work_order_no LIKE ?'; params.push('%' + workOrderNo + '%'); }

  const totalRows: any = await query('SELECT COUNT(*) as total FROM inv_production_inbound p ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: any = await query(
    'SELECT p.*, w.warehouse_name FROM inv_production_inbound p LEFT JOIN inv_warehouse w ON p.warehouse_id = w.id ' + where + ' ORDER BY p.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const items: any = await query(
      'SELECT * FROM inv_production_inbound_item WHERE inbound_id = ?',
      [row.id]
    );
    row.items = items;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { work_order_id, work_order_no, warehouse_id, inbound_date, operator_name, qc_status, remark, items } = body;

  if (!warehouse_id) {
    return errorResponse('仓库ID不能为空', 400, 400);
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('入库明细不能为空', 400, 400);
  }

  const now = new Date();
  const inboundNo = 'PI' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const result: any = await transaction(async (conn) => {
    if (work_order_id) {
      const [woRows]: any = await conn.execute(
        'SELECT id, order_no, status, plan_qty, completed_qty FROM prod_work_order WHERE id = ? AND deleted = 0 FOR UPDATE',
        [work_order_id]
      );
      if (woRows.length === 0) {
        throw new Error('工单不存在');
      }
      const wo = woRows[0];
      if (wo.status < 20) {
        throw new Error('工单未审核，不能入库');
      }
      if (wo.status >= 90) {
        throw new Error('工单已关闭，不能入库');
      }
    }

    const [orderResult]: any = await conn.execute(
      'INSERT INTO inv_production_inbound (inbound_no, work_order_id, work_order_no, warehouse_id, inbound_date, operator_name, qc_status, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
      [inboundNo, work_order_id || null, work_order_no || null, warehouse_id, inbound_date, operator_name || null, qc_status || 'pending', remark || null]
    );
    const inboundId = orderResult.insertId;

    for (const item of items) {
      await conn.execute(
        'INSERT INTO inv_production_inbound_item (inbound_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [inboundId, item.material_id, item.material_code || null, item.material_name || null, item.quantity, item.unit || null, item.batch_no || null]
      );
    }

    return { id: inboundId, inbound_no: inboundNo };
  });

  return successResponse(result, '生产入库单创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, status, qc_status, remark } = body;

  if (!id) {
    return errorResponse('入库单ID不能为空', 400, 400);
  }

  if (action === 'post') {
    const result = await transaction(async (conn) => {
      const [inboundRows]: any = await conn.execute(
        'SELECT id, inbound_no, work_order_id, work_order_no, warehouse_id, status, qc_status FROM inv_production_inbound WHERE id = ? AND deleted = 0 FOR UPDATE',
        [id]
      );

      if (inboundRows.length === 0) {
        throw new Error('入库单不存在');
      }

      const inbound = inboundRows[0];

      if (inbound.status >= 3) {
        throw new Error('入库单已完成或已取消，不能重复过账');
      }

      if (inbound.qc_status === 'fail') {
        throw new Error('质检不合格，不能入库');
      }

      const [itemRows]: any = await conn.execute(
        'SELECT * FROM inv_production_inbound_item WHERE inbound_id = ?',
        [id]
      );

      for (const item of itemRows) {
        const [existing]: any = await conn.execute(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [item.material_id, inbound.warehouse_id]
        );

        if (existing.length > 0) {
          await conn.execute(
            'UPDATE inv_inventory SET quantity = quantity + ?, update_time = NOW() WHERE id = ?',
            [item.quantity, existing[0].id]
          );
        } else {
          await conn.execute(
            'INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [item.material_id, item.material_code, item.material_name, inbound.warehouse_id, item.quantity, item.unit, item.batch_no || null]
          );
        }

        const transNo = 'TRX' + Date.now() + String(item.id).slice(-4);
        const [matRows]: any = await conn.execute('SELECT material_code FROM mdm_material WHERE id = ?', [item.material_id]);
        const matCode = matRows.length > 0 ? matRows[0].material_code : '';

        await conn.execute(
          'INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, account_dr, account_cr, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [transNo, 'in', 'production_inbound', id, item.material_id, matCode, item.batch_no || '', inbound.warehouse_id, item.quantity, 0, 0, '成品库存', '生产成本']
        );
      }

      await conn.execute(
        'UPDATE inv_production_inbound SET status = 3, qc_status = COALESCE(qc_status, \'pass\'), update_time = NOW() WHERE id = ?',
        [id]
      );

      if (inbound.work_order_id) {
        const totalQty = itemRows.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

        await conn.execute(
          'UPDATE prod_work_order SET completed_qty = completed_qty + ? WHERE id = ? AND deleted = 0',
          [totalQty, inbound.work_order_id]
        );

        const [woRows]: any = await conn.execute(
          'SELECT plan_qty, completed_qty, status FROM prod_work_order WHERE id = ?',
          [inbound.work_order_id]
        );

        if (woRows.length > 0) {
          const wo = woRows[0];
          if (Number(wo.completed_qty) >= Number(wo.plan_qty) && wo.status < 50) {
            await conn.execute(
              'UPDATE prod_work_order SET status = 50 WHERE id = ?',
              [inbound.work_order_id]
            );
          } else if (Number(wo.completed_qty) > 0 && wo.status < 40) {
            await conn.execute(
              'UPDATE prod_work_order SET status = 40 WHERE id = ?',
              [inbound.work_order_id]
            );
          }
        }
      }

      return { id, status: 3 };
    });

    const [outboundRows]: any = await query(
      'SELECT id, inbound_no, work_order_id, work_order_no, warehouse_id, qc_status FROM inv_production_inbound WHERE id = ? AND deleted = 0',
      [id]
    );
    const inboundInfo = outboundRows[0];

    if (inboundInfo) {
      const prodItems: any = await query(
        'SELECT * FROM inv_production_inbound_item WHERE inbound_id = ?',
        [id]
      );

      for (const item of (prodItems as any[])) {
        const qrCode = 'PR-' + randomUUID().replace(/-/g, '').substring(0, 16);
        await execute(
          `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, material_id, material_code, material_name, quantity, unit, warehouse_id, work_order_id, work_order_no, production_date, status, extra_data)
           VALUES (?, 'product', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            qrCode, id, inboundInfo.inbound_no,
            item.material_id || null, item.material_code || null, item.material_name || '',
            item.quantity || 0, item.unit || '',
            inboundInfo.warehouse_id || null,
            inboundInfo.work_order_id || null, inboundInfo.work_order_no || null,
            new Date().toISOString().slice(0, 10),
            JSON.stringify({ inbound_no: inboundInfo.inbound_no, qc_status: inboundInfo.qc_status }),
          ]
        );
      }

      await logOperation({
        title: '生产入库过账',
        oper_type: '入库',
        oper_method: 'PUT',
        oper_url: '/api/warehouse/production-inbound',
        oper_param: JSON.stringify({ id, action: 'post' }),
        oper_result: `生产入库 ${inboundInfo.inbound_no} 过账成功，已生成 ${(prodItems as any[]).length} 个成品二维码`,
      });
    }

    return successResponse(result, '入库过账成功');
  }

  if (action === 'qc') {
    const { qc_results } = body;
    if (!qc_results) {
      return errorResponse('质检结果不能为空', 400, 400);
    }

    const hasFail = qc_results.some((q: any) => q.result === 'fail');
    const newQcStatus = hasFail ? 'fail' : 'pass';

    await execute(
      'UPDATE inv_production_inbound SET qc_status = ? WHERE id = ? AND deleted = 0',
      [newQcStatus, id]
    );

    if (hasFail) {
      const [itemRows]: any = await query(
        'SELECT * FROM inv_production_inbound_item WHERE inbound_id = ?',
        [id]
      );

      for (const item of itemRows) {
        const qcResult = qc_results.find((q: any) => q.item_id === item.id);
        if (qcResult && qcResult.result === 'fail') {
          const now = new Date();
          const handleNo = 'QH' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
          await execute(
            'INSERT INTO qc_unqualified_handle (handle_no, inspection_id, material_id, material_code, material_name, unqualified_qty, handle_type, handle_status, remark) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)',
            [handleNo, id, item.material_id, item.material_code, item.material_name, item.quantity, '生产入库质检不合格，自动生成']
          );
        }
      }
    }

    return successResponse({ id, qc_status: newQcStatus }, '质检完成');
  }

  if (status !== undefined) await execute('UPDATE inv_production_inbound SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  if (qc_status !== undefined) await execute('UPDATE inv_production_inbound SET qc_status = ? WHERE id = ? AND deleted = 0', [qc_status, id]);
  if (remark !== undefined) await execute('UPDATE inv_production_inbound SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  return successResponse(null, '更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

  const inbound: any = await query('SELECT status FROM inv_production_inbound WHERE id = ? AND deleted = 0', [Number(id)]);
  if (inbound.length === 0) {
    return errorResponse('入库单不存在', 404, 404);
  }
  if (inbound[0].status >= 3) {
    return errorResponse('已完成的入库单不能删除', 400, 400);
  }

  await execute('UPDATE inv_production_inbound SET deleted = 1 WHERE id = ?', [Number(id)]);
  return successResponse(null, '删除成功');
});
