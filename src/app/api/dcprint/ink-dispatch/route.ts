import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import { randomUUID } from 'crypto';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const workorderNo = searchParams.get('workorderNo') || '';

  let where = 'WHERE d.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    where += ' AND (d.dispatch_no LIKE ? OR d.color_name LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like);
  }
  if (status) {
    where += ' AND d.status = ?';
    params.push(Number(status));
  }
  if (workorderNo) {
    where += ' AND d.workorder_no = ?';
    params.push(workorderNo);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM ink_dispatch d ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT d.* FROM ink_dispatch d ${where} ORDER BY d.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const items: any = await query(
      'SELECT * FROM ink_dispatch_item WHERE dispatch_id = ? AND deleted = 0 ORDER BY sort_order',
      [row.id]
    );
    row.items = items;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { workorder_id, workorder_no, formula_id, formula_no, color_name, color_code, pantone_code, total_weight, unit, operator_id, operator_name, machine_id, machine_name, items, tare_weight, net_weight, gross_weight, remark } = body;

  if (!workorder_no || !items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('缺少必填字段: workorder_no, items', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const now = new Date();
    const dispatchNo = 'DS' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const batchNo = `INK${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const [insertResult]: any = await conn.execute(
      `INSERT INTO ink_dispatch (dispatch_no, batch_no, workorder_id, workorder_no, formula_id, formula_no, color_name, color_code, pantone_code, total_weight, unit, tare_weight, net_weight, gross_weight, operator_id, operator_name, machine_id, machine_name, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [dispatchNo, batchNo, workorder_id || null, workorder_no, formula_id || null, formula_no || null,
       color_name || null, color_code || null, pantone_code || null,
       total_weight || null, unit || 'kg', tare_weight || 0, net_weight || null, gross_weight || null,
       operator_id || null, operator_name || null, machine_id || null, machine_name || null, remark || null]
    );
    const dispatchId = insertResult.insertId;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isSurplus = item.source_type === 'surplus';
      const sourceBatchNo = item.source_batch_no || null;

      if (sourceBatchNo && Number(item.actual_weight || 0) > 0) {
        const [batchRows]: any = await conn.execute(
          'SELECT id, available_qty, material_name FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0 FOR UPDATE',
          [sourceBatchNo]
        );

        if (batchRows.length > 0) {
          const batch = batchRows[0];
          if (Number(batch.available_qty) < Number(item.actual_weight || 0)) {
            throw new Error(`原墨 ${batch.material_name} 批次 ${sourceBatchNo} 库存不足: 可用 ${batch.available_qty}, 需用 ${item.actual_weight}`);
          }

          await conn.execute(
            'UPDATE inv_inventory_batch SET available_qty = available_qty - ? WHERE id = ?',
            [item.actual_weight, batch.id]
          );
        }
      }

      await conn.execute(
        `INSERT INTO ink_dispatch_item (dispatch_id, sort_order, source_type, source_batch_no, source_label_no, ink_id, ink_code, ink_name, ink_type, brand, formula_weight, actual_weight, unit, is_surplus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dispatchId, i + 1, item.source_type || 'fresh', sourceBatchNo, item.source_label_no || null,
         item.ink_id || null, item.ink_code || null, item.ink_name || '', item.ink_type || null,
         item.brand || null, item.formula_weight || 0, item.actual_weight || 0,
         item.unit || 'kg', isSurplus ? 1 : 0]
      );
    }

    const qrCode = 'IK-' + randomUUID().replace(/-/g, '').substring(0, 16);
    await conn.execute(
      `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, batch_no, material_id, material_code, material_name, quantity, unit, warehouse_id, expiry_date, status, extra_data)
       VALUES (?, 'ink_dispatch', ?, ?, ?, NULL, NULL, ?, ?, ?, NULL, ?, 1, ?)`,
      [
        qrCode, dispatchId, dispatchNo, batchNo,
        color_name || `专色墨-${batchNo}`,
        net_weight || total_weight || 0, unit || 'kg',
        null,
        JSON.stringify({
          dispatch_no: dispatchNo,
          batch_no: batchNo,
          workorder_no,
          formula_no: formula_no || '',
          color_name: color_name || '',
          pantone_code: pantone_code || '',
          tare_weight: tare_weight || 0,
          net_weight: net_weight || total_weight || 0,
          gross_weight: gross_weight || 0,
          operator_name: operator_name || '',
          item_count: items.length,
        }),
      ]
    );

    const [whRows]: any = await conn.execute(
      "SELECT id FROM inv_warehouse WHERE warehouse_name LIKE '%调色%' AND deleted = 0 LIMIT 1"
    );
    const warehouseId = whRows.length > 0 ? whRows[0].id : null;

    if (warehouseId && (net_weight || total_weight)) {
      await conn.execute(
        `INSERT INTO inv_inventory_batch (batch_no, material_id, material_code, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date, status, produce_date, create_time)
         VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, 'normal', ?, NOW())`,
        [
          batchNo,
          `INK-${batchNo}`,
          color_name || `专色墨-${batchNo}`,
          warehouseId,
          net_weight || total_weight,
          net_weight || total_weight,
          now.toISOString().slice(0, 10),
          now.toISOString().slice(0, 10),
        ]
      );
    }

    return { id: dispatchId, dispatch_no: dispatchNo, batch_no: batchNo, qr_code: qrCode };
  });

  return successResponse(result, '调色配料记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, status, tare_weight, net_weight, gross_weight, remark } = body;

  if (!id) {
    return errorResponse('配料记录ID不能为空', 400, 400);
  }

  if (action === 'weigh') {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE ink_dispatch SET tare_weight = ?, net_weight = ?, gross_weight = ?, status = 2 WHERE id = ?`,
        [tare_weight || 0, net_weight || 0, gross_weight || 0, id]
      );

      const [dispatchRows]: any = await conn.execute(
        'SELECT batch_no, net_weight, total_weight FROM ink_dispatch WHERE id = ?',
        [id]
      );

      if (dispatchRows.length > 0 && dispatchRows[0].batch_no) {
        const actualWeight = net_weight || dispatchRows[0].total_weight || 0;
        await conn.execute(
          'UPDATE inv_inventory_batch SET available_qty = ?, quantity = ? WHERE batch_no = ? AND deleted = 0',
          [actualWeight, actualWeight, dispatchRows[0].batch_no]
        );
      }
    });
    return successResponse(null, '称重赋码完成');
  }

  if (action === 'confirm') {
    await execute('UPDATE ink_dispatch SET status = 3 WHERE id = ?', [id]);
    return successResponse(null, '配料确认完成');
  }

  if (status !== undefined) {
    await execute('UPDATE ink_dispatch SET status = ? WHERE id = ?', [status, id]);
  }
  if (remark !== undefined) {
    await execute('UPDATE ink_dispatch SET remark = ? WHERE id = ?', [remark, id]);
  }

  return successResponse(null, '更新成功');
});
