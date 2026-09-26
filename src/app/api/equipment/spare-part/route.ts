import { getTranslations } from 'next-intl/server';

import { NextRequest, NextResponse } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { numericFilter } from '@/lib/query-filter';

function generateSparePartCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `SP${dateStr}${rand}`;
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const status = numericFilter(searchParams.get('status'));

  let where = 'WHERE deleted = 0';
  const params: SqlValue[] = [];
  if (keyword) {
    where += ' AND (part_code LIKE ? OR part_name LIKE ? OR specification LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(Number(status));
  }

  const totalRows = await query('SELECT COUNT(*) as total FROM eqp_spare_part ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT * FROM eqp_spare_part ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  // 统计概览
  const lowStockRows = await query(
    'SELECT COUNT(*) as cnt FROM eqp_spare_part WHERE deleted = 0 AND stock_qty < safety_stock AND safety_stock > 0',
    []
  );
  const inactiveRows = await query(
    'SELECT COUNT(*) as cnt FROM eqp_spare_part WHERE deleted = 0 AND status = 0',
    []
  );

  return successResponse({
    list: rows,
    total,
    page,
    pageSize,
    stats: {
      totalParts: total,
      lowStockCount: lowStockRows[0]?.cnt || 0,
      inactiveCount: inactiveRows[0]?.cnt || 0,
    },
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      part_name,
      category,
      spec,
      unit,
      stock_quantity,
      safety_stock,
      supplier_id,
      unit_price,
      location,
      status,
      remark,
    } = body;

    if (!part_name) {
      return errorResponse(ts('k_1nrusyc'), 400, 400);
    }

    const partCode = generateSparePartCode();
    const result = await execute(
      `INSERT INTO eqp_spare_part
       (part_code, part_name, specification, unit, stock_qty, safety_stock,
        supplier_id, unit_price, location, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        partCode,
        part_name,
        spec || null,
        unit || null,
        stock_quantity || 0,
        safety_stock || 0,
        supplier_id || null,
        unit_price || 0,
        location || null,
        status || 1,
        remark || null,
      ]
    );
    return successResponse({ id: result.insertId, part_code: partCode }, ts('k_p97dky'));
  },
  { logTitle: '创建备件', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, part_name, specification, spec, unit, stock_quantity, safety_stock, supplier_id, unit_price, location, status, remark } = body;
    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    const updateFields: string[] = [];
    const updateValues: SqlValue[] = [];

    if (part_name !== undefined) {
      updateFields.push('part_name = ?');
      updateValues.push(part_name);
    }
    if (specification !== undefined) {
      updateFields.push('specification = ?');
      updateValues.push(specification || null);
    }
    if (spec !== undefined) {
      updateFields.push('specification = ?');
      updateValues.push(spec || null);
    }
    if (unit !== undefined) {
      updateFields.push('unit = ?');
      updateValues.push(unit || null);
    }
    if (stock_quantity !== undefined) {
      updateFields.push('stock_qty = ?');
      updateValues.push(stock_quantity || 0);
    }
    if (safety_stock !== undefined) {
      updateFields.push('safety_stock = ?');
      updateValues.push(safety_stock || 0);
    }
    if (supplier_id !== undefined) {
      updateFields.push('supplier_id = ?');
      updateValues.push(supplier_id || null);
    }
    if (unit_price !== undefined) {
      updateFields.push('unit_price = ?');
      updateValues.push(unit_price || 0);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location || null);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (remark !== undefined) {
      updateFields.push('remark = ?');
      updateValues.push(remark || null);
    }

    if (updateFields.length > 0) {
      updateFields.push('update_time = NOW()');
      updateValues.push(id);
      await execute(
        `UPDATE eqp_spare_part SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
        updateValues
      );
    }
    return successResponse(null, ts('k_1795bzg'));
  },
  { logTitle: '更新备件', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: ts('k_js4lo9') }, { status: 400 });
    await execute('UPDATE eqp_spare_part SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除备件', logType: 'business' }
);
