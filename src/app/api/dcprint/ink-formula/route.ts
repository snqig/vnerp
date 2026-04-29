import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const keyword = searchParams.get('keyword') || '';
  const colorName = searchParams.get('colorName') || '';
  const status = searchParams.get('status') || '';
  const workorderNo = searchParams.get('workorderNo') || '';

  let where = 'WHERE f.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    where += ' AND (f.formula_no LIKE ? OR f.formula_name LIKE ? OR f.pantone_code LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  if (colorName) {
    where += ' AND f.color_name LIKE ?';
    params.push(`%${colorName}%`);
  }
  if (status) {
    where += ' AND f.status = ?';
    params.push(Number(status));
  }
  if (workorderNo) {
    where += ' AND EXISTS (SELECT 1 FROM ink_formula_workorder fw WHERE fw.formula_id = f.id AND fw.workorder_no = ? AND fw.deleted = 0)';
    params.push(workorderNo);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM ink_formula f ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT f.* FROM ink_formula f ${where} ORDER BY f.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const items: any = await query(
      'SELECT * FROM ink_formula_item WHERE formula_id = ? AND deleted = 0 ORDER BY sort_order',
      [row.id]
    );
    row.items = items;

    const workorders: any = await query(
      `SELECT fw.*, wo.order_no, wo.product_name, wo.plan_qty, wo.status as workorder_status
       FROM ink_formula_workorder fw
       LEFT JOIN prod_work_order wo ON fw.workorder_id = wo.id
       WHERE fw.formula_id = ? AND fw.deleted = 0`,
      [row.id]
    );
    row.workorders = workorders;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { formula_name, pantone_code, color_name, color_code, ink_type, base_ink_type, total_weight, unit, shelf_life_hours, remark, items, workorder_id, workorder_no } = body;

  if (!formula_name || !items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('缺少必填字段: formula_name, items', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const now = new Date();
    const formulaNo = 'FM' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const [insertResult]: any = await conn.execute(
      `INSERT INTO ink_formula (formula_no, formula_name, pantone_code, color_name, color_code, ink_type, base_ink_type, total_weight, unit, shelf_life_hours, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [formulaNo, formula_name, pantone_code || null, color_name || null, color_code || null,
       ink_type || 'solvent', base_ink_type || null, total_weight || null, unit || 'kg',
       shelf_life_hours || 168, remark || null]
    );
    const formulaId = insertResult.insertId;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await conn.execute(
        `INSERT INTO ink_formula_item (formula_id, sort_order, ink_id, ink_code, ink_name, ink_type, brand, ratio_percent, weight, unit, is_base)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [formulaId, i + 1, item.ink_id || null, item.ink_code || null, item.ink_name || '',
         item.ink_type || null, item.brand || null, item.ratio_percent || 0,
         item.weight || 0, item.unit || 'kg', item.is_base ? 1 : 0]
      );
    }

    if (workorder_id && workorder_no) {
      await conn.execute(
        `INSERT INTO ink_formula_workorder (formula_id, workorder_id, workorder_no, status)
         VALUES (?, ?, ?, 1)`,
        [formulaId, workorder_id, workorder_no]
      );
    }

    return { id: formulaId, formula_no: formulaNo };
  });

  return successResponse(result, '油墨配方创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, status, remark, items, workorder_id, workorder_no } = body;

  if (!id) {
    return errorResponse('配方ID不能为空', 400, 400);
  }

  if (action === 'bind_workorder') {
    if (!workorder_id || !workorder_no) {
      return errorResponse('缺少工单信息', 400, 400);
    }
    await execute(
      `INSERT INTO ink_formula_workorder (formula_id, workorder_id, workorder_no, status)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE deleted = 0, status = 1`,
      [id, workorder_id, workorder_no]
    );
    return successResponse(null, '工单关联成功');
  }

  if (action === 'unbind_workorder') {
    if (!workorder_id) {
      return errorResponse('缺少工单ID', 400, 400);
    }
    await execute(
      'UPDATE ink_formula_workorder SET deleted = 1 WHERE formula_id = ? AND workorder_id = ?',
      [id, workorder_id]
    );
    return successResponse(null, '工单取消关联成功');
  }

  if (action === 'approve') {
    await execute('UPDATE ink_formula SET status = 2 WHERE id = ? AND deleted = 0', [id]);
    return successResponse(null, '配方审核通过');
  }

  if (status !== undefined) {
    await execute('UPDATE ink_formula SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  }
  if (remark !== undefined) {
    await execute('UPDATE ink_formula SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
  }

  if (items && Array.isArray(items)) {
    await transaction(async (conn) => {
      await conn.execute('UPDATE ink_formula_item SET deleted = 1 WHERE formula_id = ?', [id]);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await conn.execute(
          `INSERT INTO ink_formula_item (formula_id, sort_order, ink_id, ink_code, ink_name, ink_type, brand, ratio_percent, weight, unit, is_base)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, i + 1, item.ink_id || null, item.ink_code || null, item.ink_name || '',
           item.ink_type || null, item.brand || null, item.ratio_percent || 0,
           item.weight || 0, item.unit || 'kg', item.is_base ? 1 : 0]
        );
      }
    });
  }

  return successResponse(null, '配方更新成功');
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('缺少id', 400, 400);

  await transaction(async (conn) => {
    await conn.execute('UPDATE ink_formula SET deleted = 1 WHERE id = ?', [Number(id)]);
    await conn.execute('UPDATE ink_formula_item SET deleted = 1 WHERE formula_id = ?', [Number(id)]);
    await conn.execute('UPDATE ink_formula_workorder SET deleted = 1 WHERE formula_id = ?', [Number(id)]);
  });

  return successResponse(null, '删除成功');
});
