import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const keyword = searchParams.get('keyword') || '';
  const usageType = searchParams.get('usageType') || '';
  const workorderNo = searchParams.get('workorderNo') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  let where = 'WHERE u.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    where += ' AND (u.usage_no LIKE ? OR u.batch_no LIKE ? OR u.color_name LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  if (usageType) {
    where += ' AND u.usage_type = ?';
    params.push(usageType);
  }
  if (workorderNo) {
    where += ' AND u.workorder_no = ?';
    params.push(workorderNo);
  }
  if (startDate) {
    where += ' AND u.usage_time >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND u.usage_time <= ?';
    params.push(endDate);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM ink_usage u ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT u.* FROM ink_usage u ${where} ORDER BY u.usage_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { usage_type, batch_no, qr_code, workorder_id, workorder_no, formula_id, formula_no, color_name, weight, unit, operator_id, operator_name, machine_id, machine_name, location_id, location_name, remark } = body;

  if (!usage_type || !weight || Number(weight) <= 0) {
    return errorResponse('缺少必填字段: usage_type, weight', 400, 400);
  }

  const validTypes = ['requisition', 'machine_load', 'consumption', 'return', 'scrap'];
  if (!validTypes.includes(usage_type)) {
    return errorResponse(`无效的使用类型: ${usage_type}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const now = new Date();
    const usageNo = 'IU' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    let actualBatchNo = batch_no;
    if (qr_code && !batch_no) {
      const [qrRows]: any = await conn.execute(
        "SELECT batch_no, extra_data FROM qrcode_record WHERE qr_code = ? AND qr_type IN ('ink_dispatch', 'ink_mixed', 'ink_open') AND deleted = 0",
        [qr_code]
      );
      if (qrRows.length > 0) {
        actualBatchNo = qrRows[0].batch_no;
      }
    }

    if (!actualBatchNo) {
      throw new Error('无法确定油墨批次号，请提供batch_no或qr_code');
    }

    const [batchRows]: any = await conn.execute(
      'SELECT id, available_qty, material_name, warehouse_id, status, expire_date FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0 FOR UPDATE',
      [actualBatchNo]
    );

    if (batchRows.length === 0) {
      throw new Error(`油墨批次 ${actualBatchNo} 不存在`);
    }

    const batch = batchRows[0];

    if (batch.status === 'frozen') {
      throw new Error(`油墨批次 ${actualBatchNo} 已冻结，不能使用`);
    }

    if (batch.expire_date && new Date(batch.expire_date) < now) {
      throw new Error(`油墨批次 ${actualBatchNo} 已过期，不能使用`);
    }

    if (usage_type === 'requisition' || usage_type === 'machine_load' || usage_type === 'consumption') {
      if (Number(batch.available_qty) < Number(weight)) {
        throw new Error(`油墨 ${batch.material_name} 批次 ${actualBatchNo} 库存不足: 可用 ${batch.available_qty}, 需用 ${weight}`);
      }

      await conn.execute(
        'UPDATE inv_inventory_batch SET available_qty = available_qty - ? WHERE id = ?',
        [weight, batch.id]
      );
    }

    if (usage_type === 'return') {
      await conn.execute(
        'UPDATE inv_inventory_batch SET available_qty = available_qty + ? WHERE id = ?',
        [weight, batch.id]
      );
    }

    if (usage_type === 'machine_load' && workorder_no) {
      const [dispatchRows]: any = await conn.execute(
        'SELECT id, formula_no, color_name, pantone_code FROM ink_dispatch WHERE workorder_no = ? AND batch_no = ? AND deleted = 0',
        [workorder_no, actualBatchNo]
      );

      if (dispatchRows.length > 0) {
        const dispatch = dispatchRows[0];
        const [formulaRows]: any = await conn.execute(
          'SELECT id, formula_name, pantone_code FROM ink_formula WHERE formula_no = ? AND deleted = 0',
          [dispatch.formula_no || formula_no]
        );

        if (formulaRows.length > 0 && workorder_no) {
          const [woFormulaRows]: any = await conn.execute(
            'SELECT formula_id FROM ink_formula_workorder WHERE workorder_no = ? AND deleted = 0',
            [workorder_no]
          );

          if (woFormulaRows.length > 0 && woFormulaRows[0].formula_id !== formulaRows[0].id) {
            throw new Error(`配方不匹配: 工单 ${workorder_no} 要求配方ID ${woFormulaRows[0].formula_id}, 当前油墨配方ID ${formulaRows[0].id}`);
          }
        }
      }
    }

    const [insertResult]: any = await conn.execute(
      `INSERT INTO ink_usage (usage_no, usage_type, batch_no, qr_code, workorder_id, workorder_no, formula_id, formula_no, color_name, weight, unit, operator_id, operator_name, machine_id, machine_name, location_id, location_name, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [usageNo, usage_type, actualBatchNo, qr_code || null, workorder_id || null, workorder_no || null,
       formula_id || null, formula_no || null, color_name || batch.material_name || null,
       weight, unit || 'kg', operator_id || null, operator_name || null,
       machine_id || null, machine_name || null, location_id || null, location_name || null, remark || null]
    );

    try {
      await conn.execute(
        `INSERT INTO inv_scan_log (scan_type, qr_content, qr_type, sn, batch_no, material_name, workorder_no, operator_id, operator_name, scan_time, scan_result, result_message)
         VALUES (?, ?, 'ink', ?, ?, ?, ?, ?, ?, NOW(), 'success', ?)`,
        [
          `ink_${usage_type}`,
          qr_code || actualBatchNo,
          actualBatchNo,
          actualBatchNo,
          batch.material_name || '',
          workorder_no || '',
          operator_id || null,
          operator_name || '',
          `${usage_type} ${weight}${unit || 'kg'} 批次${actualBatchNo}`,
        ]
      );
    } catch {}

    return { id: insertResult.insertId, usage_no: usageNo, batch_no: actualBatchNo };
  });

  return successResponse(result, '油墨使用记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;

  if (!id) {
    return errorResponse('记录ID不能为空', 400, 400);
  }

  if (status !== undefined) await execute('UPDATE ink_usage SET status = ? WHERE id = ?', [status, id]);
  if (remark !== undefined) await execute('UPDATE ink_usage SET remark = ? WHERE id = ?', [remark, id]);

  return successResponse(null, '更新成功');
});
