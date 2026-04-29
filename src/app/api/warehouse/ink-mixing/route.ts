import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const keyword = searchParams.get('keyword') || '';

  let where = 'WHERE mb.deleted = 0';
  const params: any[] = [];

  if (status) {
    where += ' AND mb.status = ?';
    params.push(Number(status));
  }
  if (keyword) {
    where += ' AND (mb.batch_no LIKE ? OR mb.formula_name LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM ink_mixed_batch mb ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT mb.* FROM ink_mixed_batch mb ${where} ORDER BY mb.mixed_date DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const details: any = await query(
      'SELECT * FROM ink_mixed_batch_detail WHERE mixed_batch_id = ?',
      [row.id]
    );
    row.details = details;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { formula_no, formula_name, total_qty, unit, mixed_date, expire_date, operator_id, operator_name, remark, details } = body;

  if (!total_qty || !mixed_date || !details || !Array.isArray(details) || details.length === 0) {
    return errorResponse('缺少必填字段: total_qty, mixed_date, details', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const now = new Date();
    const batchNo = `MIX${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const [insertResult]: any = await conn.execute(
      `INSERT INTO ink_mixed_batch (batch_no, formula_no, formula_name, total_qty, unit, mixed_date, expire_date, operator_id, operator_name, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [batchNo, formula_no || null, formula_name || null, total_qty, unit || 'kg', mixed_date, expire_date || null, operator_id || null, operator_name || null, remark || null]
    );
    const mixedBatchId = insertResult.insertId;

    for (const detail of details) {
      if (!detail.source_batch_no || !detail.used_qty || Number(detail.used_qty) <= 0) {
        throw new Error(`原墨批次 ${detail.source_batch_no || ''} 用量必须大于0`);
      }

      const [sourceBatchRows]: any = await conn.execute(
        'SELECT id, available_qty, material_name FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0 FOR UPDATE',
        [detail.source_batch_no]
      );

      if (sourceBatchRows.length === 0) {
        throw new Error(`原墨批次 ${detail.source_batch_no} 不存在`);
      }

      const sourceBatch = sourceBatchRows[0];
      if (Number(sourceBatch.available_qty) < Number(detail.used_qty)) {
        throw new Error(`原墨 ${sourceBatch.material_name} 批次 ${detail.source_batch_no} 库存不足: 可用 ${sourceBatch.available_qty}, 需用 ${detail.used_qty}`);
      }

      await conn.execute(
        'UPDATE inv_inventory_batch SET available_qty = available_qty - ? WHERE id = ?',
        [detail.used_qty, sourceBatch.id]
      );

      await conn.execute(
        `INSERT INTO ink_mixed_batch_detail (mixed_batch_id, source_batch_no, source_label_no, material_id, material_name, used_qty, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [mixedBatchId, detail.source_batch_no, detail.source_label_no || null, detail.material_id || null, detail.material_name || '', detail.used_qty, detail.unit || 'kg']
      );

      const transNo = 'TRX' + Date.now() + String(detail.source_batch_no).slice(-4);
      await conn.execute(
        `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, material_code, batch_no, warehouse_id, quantity, unit_price, total_amount, account_dr, account_cr, create_time)
         SELECT ?, 'out', 'ink_mixing', ?, ib.material_id, ib.material_code, ib.batch_no, ib.warehouse_id, ?, ib.unit_price, ? * ib.unit_price, '生产成本', '原材料库存', NOW()
         FROM inv_inventory_batch ib WHERE ib.id = ?`,
        [transNo, mixedBatchId, -detail.used_qty, detail.used_qty, sourceBatch.id]
      );
    }

    const [warehouseRows]: any = await conn.execute(
      'SELECT id FROM inv_warehouse WHERE warehouse_name LIKE ? AND deleted = 0 LIMIT 1',
      ['%调色%']
    );
    const warehouseId = warehouseRows.length > 0 ? warehouseRows[0].id : 1;

    await conn.execute(
      `INSERT INTO inv_inventory_batch (batch_no, material_id, material_code, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date, status, produce_date, create_time)
       VALUES (?, NULL, NULL, ?, ?, ?, ?, 0, ?, 'normal', ?, NOW())`,
      [batchNo, formula_name || `调色油墨-${batchNo}`, warehouseId, total_qty, total_qty, mixed_date, mixed_date]
    );

    return { id: mixedBatchId, batch_no: batchNo };
  });

  return successResponse(result, '调色油墨混合批次创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;

  if (!id) {
    return errorResponse('混合批次ID不能为空', 400, 400);
  }

  if (status === 2) {
    await transaction(async (conn) => {
      const [batchRows]: any = await conn.execute(
        'SELECT batch_no FROM ink_mixed_batch WHERE id = ? AND deleted = 0',
        [id]
      );
      if (batchRows.length === 0) throw new Error('混合批次不存在');

      await conn.execute(
        'UPDATE inv_inventory_batch SET available_qty = 0 WHERE batch_no = ? AND deleted = 0',
        [batchRows[0].batch_no]
      );
      await conn.execute('UPDATE ink_mixed_batch SET status = 2 WHERE id = ?', [id]);
    });
  } else if (status === 3) {
    await transaction(async (conn) => {
      const [batchRows]: any = await conn.execute(
        'SELECT batch_no FROM ink_mixed_batch WHERE id = ? AND deleted = 0',
        [id]
      );
      if (batchRows.length === 0) throw new Error('混合批次不存在');

      await conn.execute(
        "UPDATE inv_inventory_batch SET available_qty = 0, status = 'expired' WHERE batch_no = ? AND deleted = 0",
        [batchRows[0].batch_no]
      );
      await conn.execute('UPDATE ink_mixed_batch SET status = 3 WHERE id = ?', [id]);
    });
  } else {
    if (status !== undefined) await execute('UPDATE ink_mixed_batch SET status = ? WHERE id = ?', [status, id]);
    if (remark !== undefined) await execute('UPDATE ink_mixed_batch SET remark = ? WHERE id = ?', [remark, id]);
  }

  return successResponse(null, '更新成功');
});
