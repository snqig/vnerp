import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const orderNo = searchParams.get('orderNo') || '';

  let where = 'WHERE cr.deleted = 0';
  const params: any[] = [];

  if (status) {
    where += ' AND cr.status = ?';
    params.push(Number(status));
  }
  if (orderNo) {
    where += ' AND cr.order_no LIKE ?';
    params.push(`%${orderNo}%`);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM biz_contract_review cr ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT cr.* FROM biz_contract_review cr ${where} ORDER BY cr.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { order_id, order_no, customer_id, customer_name, total_amount, delivery_date } = body;

  if (!order_id || !order_no) {
    return errorResponse('缺少必填字段: order_id, order_no', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const [existingReview]: any = await conn.execute(
      'SELECT id, status FROM biz_contract_review WHERE order_id = ? AND deleted = 0',
      [order_id]
    );

    if (existingReview.length > 0 && existingReview[0].status >= 3) {
      throw new Error('该订单已完成合同评审');
    }

    const now = new Date();
    const reviewNo = 'CR' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const [orderRows]: any = await conn.execute(
      'SELECT id, order_no, customer_id, customer_name, total_amount, delivery_date FROM sal_order WHERE id = ? AND deleted = 0',
      [order_id]
    );

    const orderData = orderRows.length > 0 ? orderRows[0] : {};
    const [insertResult]: any = await conn.execute(
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

  return successResponse(result, '合同评审创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, department, opinion, reviewer, result: deptResult } = body;

  if (!id || !department) {
    return errorResponse('缺少必填字段: id, department', 400, 400);
  }

  const validDepts = ['production', 'purchase', 'finance', 'quality', 'engineering'];
  if (!validDepts.includes(department)) {
    return errorResponse(`无效的部门: ${department}, 有效值: ${validDepts.join(', ')}`, 400, 400);
  }

  const result = await transaction(async (conn) => {
    const [reviewRows]: any = await conn.execute(
      'SELECT * FROM biz_contract_review WHERE id = ? AND deleted = 0 FOR UPDATE',
      [id]
    );

    if (reviewRows.length === 0) {
      throw new Error('合同评审不存在');
    }

    const review = reviewRows[0];
    if (review.status >= 3) {
      throw new Error('合同评审已通过，不能再修改');
    }

    const opinionField = `${department}_opinion`;
    const reviewerField = `${department}_reviewer`;
    const resultField = `${department}_result`;

    await conn.execute(
      `UPDATE biz_contract_review SET ${opinionField} = ?, ${reviewerField} = ?, ${resultField} = ? WHERE id = ?`,
      [opinion || null, reviewer || null, deptResult || null, id]
    );

    const [updatedReview]: any = await conn.execute(
      'SELECT * FROM biz_contract_review WHERE id = ?',
      [id]
    );

    if (updatedReview.length > 0) {
      const r = updatedReview[0];
      const allReviewed = r.production_result && r.purchase_result && r.finance_result && r.quality_result && r.engineering_result;
      const anyRejected = [r.production_result, r.purchase_result, r.finance_result, r.quality_result, r.engineering_result].some(v => v === 3);

      if (allReviewed) {
        if (anyRejected) {
          await conn.execute(
            'UPDATE biz_contract_review SET final_result = 3, status = 4 WHERE id = ?',
            [id]
          );
        } else {
          const allApproved = [r.production_result, r.purchase_result, r.finance_result, r.quality_result, r.engineering_result].every(v => v === 1);
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

  return successResponse(result, '部门评审提交成功');
});
