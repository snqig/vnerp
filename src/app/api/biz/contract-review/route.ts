import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const orderNo = searchParams.get('orderNo') || '';

  let where = 'WHERE cr.deleted = 0';
  const params: SqlValue[] = [];

  if (status) {
    where += ' AND cr.status = ?';
    params.push(Number(status));
  }
  if (orderNo) {
    where += ' AND cr.order_no LIKE ?';
    params.push(`%${orderNo}%`);
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM biz_contract_review cr ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT cr.* FROM biz_contract_review cr ${where} ORDER BY cr.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { order_id, order_no, customer_id, customer_name, total_amount, delivery_date } = body;

  if (!order_id || !order_no) {
    return errorResponse(ts('k_g6kscw'), 400, 400);
  }

  const result = await transaction(async (conn) => {
    const [existingReview] = await conn.execute(
      'SELECT id, status FROM biz_contract_review WHERE order_id = ? AND deleted = 0',
      [order_id]
    );

    if (existingReview.length > 0 && existingReview[0].status >= 3) {
      throw new Error(ts('k_1ne9rzu'));
    }

    const now = new Date();
    const reviewNo =
      'CR' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const [orderRows] = await conn.execute(
      'SELECT id, order_no, customer_id, customer_name, total_amount, delivery_date FROM sal_order WHERE id = ? AND deleted = 0',
      [order_id]
    );

    const orderData = orderRows.length > 0 ? orderRows[0] : {};
    const [insertResult] = await conn.execute(
      `INSERT INTO biz_contract_review (review_no, order_id, order_no, customer_id, customer_name, total_amount, delivery_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        reviewNo,
        order_id,
        order_no,
        customer_id || orderData.customer_id || null,
        customer_name || orderData.customer_name || null,
        total_amount || orderData.total_amount || null,
        delivery_date || orderData.delivery_date || null,
      ]
    );

    return { id: insertResult.insertId, review_no: reviewNo };
  });

  return successResponse(result, ts('k_6qmzbu'));
});

export const PUT = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { id, department, opinion, reviewer, result: deptResult } = body;

  if (!id || !department) {
    return errorResponse(ts('k_17whpet'), 400, 400);
  }

  const validDepts = ['production', 'purchase', 'finance', 'quality', 'engineering'];
  if (!validDepts.includes(department)) {
    return errorResponse(`无效的部门: ${department}, 有效值: ${validDepts.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const [reviewRows] = await conn.execute(
      'SELECT * FROM biz_contract_review WHERE id = ? AND deleted = 0 FOR UPDATE',
      [id]
    );

    if (reviewRows.length === 0) {
      throw new Error(ts('k_141jfbh'));
    }

    const review = reviewRows[0];
    if (review.status >= 3) {
      throw new Error(ts('k_koz1cb'));
    }

    const opinionField = `${department}_opinion`;
    const reviewerField = `${department}_reviewer`;
    const resultField = `${department}_result`;

    await conn.execute(
      `UPDATE biz_contract_review SET ${opinionField} = ?, ${reviewerField} = ?, ${resultField} = ? WHERE id = ?`,
      [opinion || null, reviewer || null, deptResult || null, id]
    );

    const [updatedReview] = await conn.execute('SELECT * FROM biz_contract_review WHERE id = ?', [
      id,
    ]);

    if (updatedReview.length > 0) {
      const r = updatedReview[0];
      const allReviewed =
        r.production_result &&
        r.purchase_result &&
        r.finance_result &&
        r.quality_result &&
        r.engineering_result;
      const anyRejected = [
        r.production_result,
        r.purchase_result,
        r.finance_result,
        r.quality_result,
        r.engineering_result,
      ].some((v) => v === 3);

      if (allReviewed) {
        if (anyRejected) {
          await conn.execute(
            'UPDATE biz_contract_review SET final_result = 3, status = 4 WHERE id = ?',
            [id]
          );
        } else {
          const allApproved = [
            r.production_result,
            r.purchase_result,
            r.finance_result,
            r.quality_result,
            r.engineering_result,
          ].every((v) => v === 1);
          await conn.execute(
            `UPDATE biz_contract_review SET final_result = ?, final_reviewer = ?, status = 3 WHERE id = ?`,
            [allApproved ? 1 : 2, reviewer || 'system', id]
          );

          if (allApproved || !anyRejected) {
            await conn.execute(
              'UPDATE sal_order SET status = 20 WHERE id = ? AND status < 20 AND deleted = 0',
              [r.order_id]
            );
          }
        }
      } else {
        await conn.execute(
          'UPDATE biz_contract_review SET status = 2 WHERE id = ? AND status = 1',
          [id]
        );
      }
    }

    return { id, department, updated: true };
  });

  return successResponse(result, ts('k_jpujsz'));
});
