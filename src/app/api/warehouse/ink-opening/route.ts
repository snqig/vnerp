import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const keyword = searchParams.get('keyword') || '';
  const ink_type = searchParams.get('ink_type') || '';

  let where = 'WHERE io.deleted = 0';
  const params: any[] = [];

  if (status) {
    where += ' AND io.status = ?';
    params.push(Number(status));
  }
  if (keyword) {
    where += ' AND (io.record_no LIKE ? OR io.material_name LIKE ? OR io.material_code LIKE ? OR io.batch_no LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }
  if (ink_type) {
    where += ' AND io.ink_type = ?';
    params.push(ink_type);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM ink_opening_record io ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT io.* FROM ink_opening_record io ${where} ORDER BY io.open_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const {
    material_id,
    material_code,
    material_name,
    batch_no,
    ink_type,
    open_time,
    expire_hours,
    remaining_qty,
    unit,
    operator_id,
    operator_name,
    remark,
  } = body;

  if (!material_id || !open_time || !expire_hours) {
    return errorResponse('缺少必填字段: material_id, open_time, expire_hours', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const recordNo = 'INK' + Date.now();

    const expireTime = new Date(new Date(open_time).getTime() + expire_hours * 3600000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const [insertResult]: any = await conn.execute(
      `INSERT INTO ink_opening_record (record_no, material_id, material_code, material_name, batch_no, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, operator_id, operator_name, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        recordNo,
        material_id,
        material_code || null,
        material_name || null,
        batch_no || null,
        ink_type || null,
        open_time,
        expire_hours,
        expireTime,
        remaining_qty || null,
        unit || 'kg',
        operator_id || null,
        operator_name || null,
        remark || null,
      ]
    );

    if (batch_no) {
      await conn.execute(
        `UPDATE inv_inventory_batch SET expire_date = ?, status = CASE WHEN ? < NOW() THEN 'expired' ELSE status END WHERE batch_no = ? AND deleted = 0`,
        [expireTime, expireTime, batch_no]
      );
    }

    return { id: insertResult.insertId, record_no: recordNo, expire_time: expireTime };
  });

  return successResponse(result, '油墨开罐记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, status, remark } = body;

  if (!id) {
    return errorResponse('开罐记录ID不能为空', 400, 400);
  }

  if (status === 3) {
    await transaction(async (conn) => {
      const [recordRows]: any = await conn.execute(
        'SELECT batch_no, remaining_qty FROM ink_opening_record WHERE id = ? AND deleted = 0',
        [id]
      );

      if (recordRows.length === 0) {
        throw new Error('开罐记录不存在');
      }

      const record = recordRows[0];

      if (record.batch_no) {
        await conn.execute(
          `UPDATE inv_inventory_batch SET available_qty = 0, status = 'expired' WHERE batch_no = ? AND deleted = 0`,
          [record.batch_no]
        );
      }

      await conn.execute('UPDATE ink_opening_record SET status = 3 WHERE id = ?', [id]);
    });
  } else {
    if (status !== undefined)
      await execute('UPDATE ink_opening_record SET status = ? WHERE id = ?', [status, id]);
    if (remark !== undefined)
      await execute('UPDATE ink_opening_record SET remark = ? WHERE id = ?', [remark, id]);
  }

  return successResponse(null, '更新成功');
});
