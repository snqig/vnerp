import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const keyword = searchParams.get('keyword') || '';

  let where = 'WHERE io.deleted = 0';
  const params: any[] = [];

  if (status) {
    where += ' AND io.status = ?';
    params.push(Number(status));
  }
  if (keyword) {
    where += ' AND (io.opening_no LIKE ? OR io.material_name LIKE ? OR io.batch_no LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM ink_opening_record io ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT io.* FROM ink_opening_record io ${where} ORDER BY io.opening_date DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { label_no, material_id, material_name, batch_no, original_expire_date, opening_date, shelf_life_after_opening, remaining_qty, unit, operator_id, operator_name, remark } = body;

  if (!label_no || !material_name || !opening_date) {
    return errorResponse('缺少必填字段: label_no, material_name, opening_date', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const now = new Date();
    const openingNo = 'IO' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const shelfLife = shelf_life_after_opening || 7;
    const openingDate = new Date(opening_date);
    const newExpireFromOpening = new Date(openingDate);
    newExpireFromOpening.setDate(newExpireFromOpening.getDate() + shelfLife);

    let newExpireDate: string | null = null;
    if (original_expire_date) {
      const origExpire = new Date(original_expire_date);
      newExpireDate = newExpireFromOpening < origExpire
        ? newExpireFromOpening.toISOString().slice(0, 10)
        : origExpire.toISOString().slice(0, 10);
    } else {
      newExpireDate = newExpireFromOpening.toISOString().slice(0, 10);
    }

    const [insertResult]: any = await conn.execute(
      `INSERT INTO ink_opening_record (opening_no, label_no, material_id, material_name, batch_no, original_expire_date, opening_date, shelf_life_after_opening, new_expire_date, remaining_qty, unit, operator_id, operator_name, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [openingNo, label_no, material_id || null, material_name, batch_no || null, original_expire_date || null, opening_date, shelfLife, newExpireDate, remaining_qty || null, unit || 'kg', operator_id || null, operator_name || null, remark || null]
    );

    if (batch_no) {
      await conn.execute(
        `UPDATE inv_inventory_batch SET expire_date = ?, status = CASE WHEN ? < CURDATE() THEN 'expired' ELSE status END WHERE batch_no = ? AND deleted = 0`,
        [newExpireDate, newExpireDate, batch_no]
      );
    }

    return { id: insertResult.insertId, opening_no: openingNo, new_expire_date: newExpireDate };
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

      await conn.execute(
        'UPDATE ink_opening_record SET status = 3 WHERE id = ?',
        [id]
      );
    });
  } else {
    if (status !== undefined) await execute('UPDATE ink_opening_record SET status = ? WHERE id = ?', [status, id]);
    if (remark !== undefined) await execute('UPDATE ink_opening_record SET remark = ? WHERE id = ?', [remark, id]);
  }

  return successResponse(null, '更新成功');
});
