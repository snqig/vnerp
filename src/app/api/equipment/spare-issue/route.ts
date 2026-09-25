import { getTranslations } from 'next-intl/server';

import { NextRequest, NextResponse } from 'next/server';
import { query, execute, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { numericFilter } from '@/lib/query-filter';

function generateSpareIssueNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `SI${dateStr}${rand}`;
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const equipmentId = numericFilter(searchParams.get('equipment_id'));
  const partId = numericFilter(searchParams.get('part_id'));
  const status = numericFilter(searchParams.get('status'));

  let where = 'WHERE si.deleted = 0';
  const params: SqlValue[] = [];
  if (equipmentId) {
    where += ' AND si.equipment_id = ?';
    params.push(Number(equipmentId));
  }
  if (partId) {
    where += ' AND si.part_id = ?';
    params.push(Number(partId));
  }
  if (status) {
    where += ' AND si.status = ?';
    params.push(Number(status));
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM eqp_spare_issue si ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    `SELECT si.*, sp.part_name, sp.part_code, eq.equipment_code, eq.equipment_name
     FROM eqp_spare_issue si
     LEFT JOIN eqp_spare_part sp ON sp.id = si.part_id AND sp.deleted = 0
     LEFT JOIN eqp_equipment eq ON eq.id = si.equipment_id AND eq.deleted = 0
     ${where}
     ORDER BY si.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');
    const body = await request.json();
    const { part_id, equipment_id, quantity, issue_date, requester, purpose, status, remark } = body;

    if (!part_id || !quantity) {
      return errorResponse(ts('k_1nrusyc'), 400, 400);
    }

    const issueNo = generateSpareIssueNo();

    const result = await transaction<number>(async (connection) => {
      const insertResult = (await connection.execute(
        `INSERT INTO eqp_spare_issue
         (issue_no, part_id, equipment_id, quantity, issue_date, requester, purpose, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          issueNo,
          Number(part_id),
          equipment_id ? Number(equipment_id) : null,
          Number(quantity),
          issue_date || null,
          requester || null,
          purpose || null,
          status || 1,
          remark || null,
        ]
      )) as unknown as { insertId: number };

      await connection.execute(
        'UPDATE eqp_spare_part SET stock_quantity = stock_quantity - ? WHERE id = ? AND deleted = 0',
        [Number(quantity), Number(part_id)]
      );

      return insertResult.insertId;
    });

    return successResponse({ id: result, issue_no: issueNo }, ts('k_p97dky'));
  },
  { logTitle: '创建备件领用', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, equipment_id, quantity, issue_date, requester, purpose, status, remark } = body;
    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    const updateFields: string[] = [];
    const updateValues: SqlValue[] = [];

    if (equipment_id !== undefined) {
      updateFields.push('equipment_id = ?');
      updateValues.push(equipment_id ? Number(equipment_id) : null);
    }
    if (quantity !== undefined) {
      updateFields.push('quantity = ?');
      updateValues.push(Number(quantity));
    }
    if (issue_date !== undefined) {
      updateFields.push('issue_date = ?');
      updateValues.push(issue_date || null);
    }
    if (requester !== undefined) {
      updateFields.push('requester = ?');
      updateValues.push(requester || null);
    }
    if (purpose !== undefined) {
      updateFields.push('purpose = ?');
      updateValues.push(purpose || null);
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
        `UPDATE eqp_spare_issue SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
        updateValues
      );
    }
    return successResponse(null, ts('k_1795bzg'));
  },
  { logTitle: '更新备件领用', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: ts('k_js4lo9') }, { status: 400 });

    await transaction(async (connection) => {
      const [row] = await connection.execute(
        'SELECT part_id, quantity FROM eqp_spare_issue WHERE id = ? AND deleted = 0 LIMIT 1',
        [Number(id)]
      ) as unknown as Array<{ part_id: number; quantity: number }>;

      if (row && row.part_id) {
        await connection.execute(
          'UPDATE eqp_spare_part SET stock_quantity = stock_quantity + ? WHERE id = ? AND deleted = 0',
          [row.quantity, row.part_id]
        );
      }

      await connection.execute('UPDATE eqp_spare_issue SET deleted = 1 WHERE id = ?', [Number(id)]);
    });

    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除备件领用', logType: 'business' }
);
