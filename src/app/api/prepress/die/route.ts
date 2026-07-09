import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { randomUUID } from 'crypto';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const dieCode = searchParams.get('dieCode') || '';
  const dieName = searchParams.get('dieName') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE deleted = 0';
  const params: Loose[] = [];
  if (dieCode) {
    where += ' AND die_code LIKE ?';
    params.push('%' + dieCode + '%');
  }
  if (dieName) {
    where += ' AND die_name LIKE ?';
    params.push('%' + dieName + '%');
  }
  if (status) {
    where += ' AND status = ?';
    params.push(Number(status));
  }

  const totalRows: Loose = await query('SELECT COUNT(*) as total FROM prd_die ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows: Loose = await query(
    'SELECT * FROM prd_die ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const {
      die_code,
      die_name,
      die_type,
      size_spec,
      customer_id,
      product_name,
      max_use_count,
      maintenance_days,
      warehouse_id,
      location_id,
      remark,
    } = body;
    const result: Loose = await execute(
      'INSERT INTO prd_die (die_code, die_name, die_type, size_spec, customer_id, product_name, max_use_count, remaining_count, maintenance_days, warehouse_id, location_id, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        die_code,
        die_name,
        die_type || null,
        size_spec || null,
        customer_id || null,
        product_name || null,
        max_use_count || 0,
        max_use_count || 0,
        maintenance_days || 180,
        warehouse_id || null,
        location_id || null,
        remark || null,
      ]
    );

    const qrCode = 'DI-' + randomUUID().replace(/-/g, '').substring(0, 16);
    await execute(
      `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, material_name, specification, quantity, warehouse_id, status, extra_data)
     VALUES (?, 'die', ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        qrCode,
        result.insertId,
        die_code,
        die_name || '',
        size_spec || '',
        max_use_count || 0,
        warehouse_id || null,
        JSON.stringify({ die_type, product_name }),
      ]
    );

    return successResponse({ id: result.insertId, qr_code: qrCode }, '刀具创建成功');
  },
  { logTitle: '刀具入库', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const {
      id,
      status,
      used_count,
      remaining_count,
      last_maintenance_date,
      next_maintenance_date,
      remark,
    } = body;
    if (status !== undefined)
      await execute('UPDATE prd_die SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
    if (used_count !== undefined)
      await execute('UPDATE prd_die SET used_count = ? WHERE id = ? AND deleted = 0', [
        used_count,
        id,
      ]);
    if (remaining_count !== undefined)
      await execute('UPDATE prd_die SET remaining_count = ? WHERE id = ? AND deleted = 0', [
        remaining_count,
        id,
      ]);
    if (last_maintenance_date !== undefined)
      await execute('UPDATE prd_die SET last_maintenance_date = ? WHERE id = ? AND deleted = 0', [
        last_maintenance_date,
        id,
      ]);
    if (next_maintenance_date !== undefined)
      await execute('UPDATE prd_die SET next_maintenance_date = ? WHERE id = ? AND deleted = 0', [
        next_maintenance_date,
        id,
      ]);
    if (remark !== undefined)
      await execute('UPDATE prd_die SET remark = ? WHERE id = ? AND deleted = 0', [remark, id]);
    return successResponse(null, '更新成功');
  },
  { logTitle: '更新刀具', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });
    await execute('UPDATE prd_die SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除刀具', logType: 'business' }
);
