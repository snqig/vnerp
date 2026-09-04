import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const settlementNo = searchParams.get('settlementNo') || '';
  const outsourceOrderNo = searchParams.get('outsourceOrderNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE s.deleted = 0';
  const params: SqlValue[] = [];
  if (settlementNo) {
    where += ' AND s.settlement_no LIKE ?';
    params.push('%' + settlementNo + '%');
  }
  if (outsourceOrderNo) {
    where += ' AND s.outsource_order_no LIKE ?';
    params.push('%' + outsourceOrderNo + '%');
  }
  if (status) {
    where += ' AND s.status = ?';
    params.push(Number(status));
  }

  const totalRows = await query(
    'SELECT COUNT(*) as total FROM outsource_settlement s ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT s.* FROM outsource_settlement s ' +
      where +
      ' ORDER BY s.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      outsource_order_id,
      outsource_order_no,
      supplier_id,
      supplier_name,
      settlement_date,
      settlement_qty,
      unit_price,
      deduct_amount,
      remark,
    } = body;

    if (!outsource_order_id) return errorResponse(ts('k_1n84mps'), 400, 400);
    if (!supplier_id) return errorResponse(ts('k_4o0inq'), 400, 400);

    const now = new Date();
    const settlementNo =
      'ST' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const settlementAmount = (Number(settlement_qty) || 0) * (Number(unit_price) || 0);
    const deductAmt = Number(deduct_amount) || 0;
    const actualAmount = settlementAmount - deductAmt;

    const result = await execute(
      `INSERT INTO outsource_settlement (settlement_no, outsource_order_id, outsource_order_no, supplier_id, supplier_name, settlement_date, settlement_qty, unit_price, settlement_amount, deduct_amount, actual_amount, payment_status, status, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [
        settlementNo,
        outsource_order_id,
        outsource_order_no || null,
        supplier_id,
        supplier_name || null,
        settlement_date || null,
        settlement_qty || 0,
        unit_price || 0,
        settlementAmount,
        deductAmt,
        actualAmount,
        remark || null,
      ]
    );

    return successResponse(
      { id: result.insertId, settlement_no: settlementNo },
      ts('k_154wwcg')
    );
  },
  { logTitle: '创建委外结算单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action, status, payment_status, payment_date, deduct_amount, remark } = body;

    if (!id) return errorResponse(ts('k_1yx8xrp'), 400, 400);

    if (action === 'confirm') {
      const result = await transaction(async (conn) => {
        const [settlementRows] = await conn.execute(
          'SELECT id, outsource_order_id, actual_amount FROM outsource_settlement WHERE id = ? AND deleted = 0 FOR UPDATE',
          [id]
        );
        if (settlementRows.length === 0) throw new Error(ts('k_o9kt6p'));

        const settlement = settlementRows[0];

        await conn.execute(
          'UPDATE outsource_settlement SET status = 3, update_time = NOW() WHERE id = ?',
          [id]
        );

        await conn.execute(
          `UPDATE outsource_order SET settled_amount = COALESCE(settled_amount, 0) + ?, status = 5 WHERE id = ? AND deleted = 0`,
          [Number(settlement.actual_amount) || 0, settlement.outsource_order_id]
        );

        return { id, status: 3 };
      });
      return successResponse(result, ts('k_1ylzfi8'));
    }

    if (action === 'payment') {
      await execute(
        'UPDATE outsource_settlement SET payment_status = 3, payment_date = COALESCE(?, CURDATE()), update_time = NOW() WHERE id = ? AND deleted = 0',
        [payment_date || null, id]
      );
      return successResponse(null, ts('k_9d6axw'));
    }

    const fields: string[] = [];
    const values: SqlValue[] = [];
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (payment_status !== undefined) {
      fields.push('payment_status = ?');
      values.push(payment_status);
    }
    if (payment_date !== undefined) {
      fields.push('payment_date = ?');
      values.push(payment_date);
    }
    if (deduct_amount !== undefined) {
      fields.push('ded_amount = ?');
      values.push(deduct_amount);
      const settlement = await query(
        'SELECT settlement_amount FROM outsource_settlement WHERE id = ? AND deleted = 0',
        [id]
      );
      if (settlement && settlement.length > 0) {
        fields.push('actual_amount = ?');
        values.push(Number(settlement[0].settlement_amount) - Number(deduct_amount));
      }
    }
    if (remark !== undefined) {
      fields.push('remark = ?');
      values.push(remark);
    }
    if (fields.length > 0) {
      values.push(id);
      await execute(
        `UPDATE outsource_settlement SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`,
        values
      );
    }

    return successResponse(null, ts('k_1eosoc3'));
  },
  { logTitle: '更新委外结算单', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_js4lo9'), 400, 400);
    await execute('UPDATE outsource_settlement SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除委外结算单', logType: 'business' }
);
