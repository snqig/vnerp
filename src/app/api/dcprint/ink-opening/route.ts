import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody, logOperation } from '@/lib/api-response';
import { randomUUID } from 'crypto';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const ink_type = searchParams.get('ink_type');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (id) {
    const record = await queryOne('SELECT * FROM ink_opening_record WHERE id = ? AND deleted = 0', [parseInt(id)]);
    if (!record) return commonErrors.notFound('油墨开罐记录不存在');
    return successResponse(record);
  }

  let sql = `SELECT * FROM ink_opening_record WHERE deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ` AND (record_no LIKE ? OR material_code LIKE ? OR material_name LIKE ? OR batch_no LIKE ?)`;
    const like = `%${keyword}%`;
    values.push(like, like, like, like);
  }
  if (status) {
    sql += ' AND status = ?';
    values.push(parseInt(status));
  }
  if (ink_type) {
    sql += ' AND ink_type = ?';
    values.push(ink_type);
  }

  sql += ' ORDER BY open_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM ink_opening_record WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  const summarySql = `SELECT
    COUNT(*) as total_count,
    COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) as using_count,
    COALESCE(SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END), 0) as expired_count,
    COALESCE(SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END), 0) as scrapped_count,
    COALESCE(SUM(CASE WHEN status = 1 AND expire_time < NOW() THEN 1 ELSE 0 END), 0) as overdue_using_count
  FROM ink_opening_record WHERE deleted = 0`;
  const summary = await queryOne(summarySql) as any;

  const overdueSql = `SELECT * FROM ink_opening_record
    WHERE deleted = 0 AND status = 1 AND expire_time < NOW()
    ORDER BY expire_time ASC LIMIT 10`;
  const overdueList = await query(overdueSql);

  return successResponse({
    list,
    total: countResult?.total || 0,
    page,
    pageSize,
    summary: {
      total_count: parseInt(summary?.total_count || 0),
      using_count: parseInt(summary?.using_count || 0),
      expired_count: parseInt(summary?.expired_count || 0),
      scrapped_count: parseInt(summary?.scrapped_count || 0),
      overdue_using_count: parseInt(summary?.overdue_using_count || 0),
    },
    overdue_list: overdueList,
  });
}, '获取油墨开罐记录失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['material_id', 'open_time', 'expire_hours']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const { material_id, material_code, material_name, batch_no, label_id, ink_type, open_time, expire_hours, remaining_qty, unit, operator_id, operator_name, remark, workorder_id, workorder_no } = body;

  const INK_SHELF_LIFE: Record<string, number> = {
    solvent: 168,
    uv: 720,
    water: 96,
  };

  const result = await transaction(async (conn) => {
    const recordNo = `INK${Date.now()}`;

    let actualExpireHours = expire_hours;
    if (!actualExpireHours && ink_type) {
      actualExpireHours = INK_SHELF_LIFE[ink_type] || 168;
    } else if (!actualExpireHours) {
      actualExpireHours = 168;
    }

    const expireTime = new Date(new Date(open_time).getTime() + actualExpireHours * 3600000).toISOString().slice(0, 19).replace('T', ' ');

    let finalExpireTime = expireTime;
    if (batch_no) {
      const [batchRows]: any = await conn.execute(
        'SELECT expire_date FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
        [batch_no]
      );
      if (batchRows.length > 0 && batchRows[0].expire_date) {
        const batchExpire = new Date(batchRows[0].expire_date);
        const calculatedExpire = new Date(expireTime);
        if (batchExpire < calculatedExpire) {
          finalExpireTime = batchExpire.toISOString().slice(0, 19).replace('T', ' ');
        }
      }
    }

    const [insertResult]: any = await conn.execute(
      `INSERT INTO ink_opening_record (record_no, material_id, material_code, material_name, batch_no, label_id, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, status, operator_id, operator_name, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [recordNo, material_id, material_code || null, material_name || null, batch_no || null, label_id || null, ink_type || null, open_time, actualExpireHours, finalExpireTime, remaining_qty || null, unit || null, operator_id || null, operator_name || null, remark || null]
    );
    const insertId = insertResult.insertId;

    if (workorder_id || workorder_no) {
      try {
        await conn.execute(
          `INSERT INTO ink_usage (usage_no, usage_type, batch_no, workorder_id, workorder_no, color_name, weight, unit, operator_id, operator_name, status, remark)
           VALUES (?, 'requisition', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            'IU' + Date.now(),
            batch_no || recordNo,
            workorder_id || null,
            workorder_no || null,
            material_name || '',
            remaining_qty || 0,
            unit || 'kg',
            operator_id || null,
            operator_name || null,
            `开罐领用 - ${recordNo}`,
          ]
        );
      } catch {}
    }

    if (batch_no) {
      await conn.execute(
        `UPDATE inv_inventory_batch SET expire_date = ?, status = CASE WHEN ? < NOW() THEN 'expired' ELSE status END WHERE batch_no = ? AND deleted = 0`,
        [finalExpireTime, finalExpireTime, batch_no]
      );
    }

    const qrCode = 'IK-' + randomUUID().replace(/-/g, '').substring(0, 16);
    await conn.execute(
      `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, material_id, material_code, material_name, batch_no, quantity, unit, expiry_date, status, extra_data)
       VALUES (?, 'ink_open', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        qrCode, insertId, recordNo,
        material_id, material_code || null, material_name || null,
        batch_no || null, remaining_qty || 0, unit || null,
        finalExpireTime,
        JSON.stringify({ ink_type, open_time, expire_hours: actualExpireHours, workorder_no: workorder_no || null }),
      ]
    );

    return { id: insertId, record_no: recordNo, expire_time: finalExpireTime, qr_code: qrCode };
  });

  await logOperation({
    title: '油墨开罐',
    oper_type: '开罐',
    oper_method: 'POST',
    oper_url: '/api/dcprint/ink-opening',
    oper_param: JSON.stringify({ material_id, material_name, workorder_no }),
    oper_result: `油墨开罐 ${result.record_no}，已生成二维码 ${result.qr_code}`,
  });

  return successResponse(result, '油墨开罐记录创建成功');
}, '创建油墨开罐记录失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('记录ID不能为空');

  const existing = await queryOne('SELECT id, status FROM ink_opening_record WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('油墨开罐记录不存在');

  if (body.status !== undefined) {
    const allowedStatus = [1, 2, 3];
    if (!allowedStatus.includes(body.status)) {
      return errorResponse('无效的状态值', 400, 400);
    }
    await execute('UPDATE ink_opening_record SET status = ? WHERE id = ?', [body.status, body.id]);
    return successResponse(null, '状态更新成功');
  }

  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['remaining_qty', 'remark'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (fields.length > 0) {
    values.push(body.id);
    await execute(`UPDATE ink_opening_record SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return successResponse(null, '油墨开罐记录更新成功');
}, '更新油墨开罐记录失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('记录ID不能为空');

  const existing = await queryOne('SELECT id, status FROM ink_opening_record WHERE id = ? AND deleted = 0', [parseInt(id)]);
  if (!existing) return commonErrors.notFound('油墨开罐记录不存在');

  await execute('UPDATE ink_opening_record SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  return successResponse(null, '油墨开罐记录删除成功');
}, '删除油墨开罐记录失败');
