import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const sampleOrderNo = searchParams.get('sampleOrderNo') || '';

  let where = 'WHERE stm.deleted = 0';
  const params: any[] = [];

  if (status) {
    where += ' AND stm.status = ?';
    params.push(Number(status));
  }
  if (sampleOrderNo) {
    where += ' AND stm.sample_order_no LIKE ?';
    params.push(`%${sampleOrderNo}%`);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM eng_sample_to_mass stm ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT stm.* FROM eng_sample_to_mass stm ${where} ORDER BY stm.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { sample_order_id, sample_order_no, product_id, product_name, customer_id, customer_name, standard_card_id, standard_card_no, process_card_id, process_card_no } = body;

  if (!sample_order_id || !sample_order_no) {
    return errorResponse('缺少必填字段: sample_order_id, sample_order_no', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const [existing]: any = await conn.execute(
      'SELECT id, status FROM eng_sample_to_mass WHERE sample_order_id = ? AND deleted = 0',
      [sample_order_id]
    );

    if (existing.length > 0 && existing[0].status >= 3) {
      throw new Error('该打样订单已转量产');
    }

    if (existing.length > 0 && existing[0].status < 3) {
      await conn.execute(
        `UPDATE eng_sample_to_mass SET
          product_id = ?, product_name = ?, customer_id = ?, customer_name = ?,
          standard_card_id = ?, standard_card_no = ?,
          process_card_id = ?, process_card_no = ?
        WHERE id = ?`,
        [product_id || null, product_name || null, customer_id || null, customer_name || null,
         standard_card_id || null, standard_card_no || null,
         process_card_id || null, process_card_no || null,
         existing[0].id]
      );
      return { id: existing[0].id, updated: true };
    }

    const [insertResult]: any = await conn.execute(
      `INSERT INTO eng_sample_to_mass (sample_order_id, sample_order_no, product_id, product_name, customer_id, customer_name, standard_card_id, standard_card_no, process_card_id, process_card_no, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [sample_order_id, sample_order_no, product_id || null, product_name || null,
       customer_id || null, customer_name || null,
       standard_card_id || null, standard_card_no || null,
       process_card_id || null, process_card_no || null]
    );

    return { id: insertResult.insertId, created: true };
  });

  return successResponse(result, '样品转量产记录创建成功');
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, bom_id, workorder_id, workorder_no, approved_by, remark } = body;

  if (!id) {
    return errorResponse('转量产记录ID不能为空', 400, 400);
  }

  if (action === 'convert') {
    const result = await transaction(async (conn) => {
      const [recordRows]: any = await conn.execute(
        'SELECT * FROM eng_sample_to_mass WHERE id = ? AND deleted = 0 FOR UPDATE',
        [id]
      );

      if (recordRows.length === 0) {
        throw new Error('转量产记录不存在');
      }

      const record = recordRows[0];
      if (record.status >= 3) {
        throw new Error('该记录已转量产');
      }

      if (!record.standard_card_id && !record.process_card_id) {
        throw new Error('请先关联标准卡和流程卡');
      }

      const conversionDate = new Date().toISOString().slice(0, 10);

      await conn.execute(
        `UPDATE eng_sample_to_mass SET
          bom_id = ?, workorder_id = ?, workorder_no = ?,
          conversion_date = ?, approved_by = ?, status = 3, remark = ?
        WHERE id = ?`,
        [bom_id || null, workorder_id || null, workorder_no || null,
         conversionDate, approved_by || null, remark || null, id]
      );

      if (workorder_id) {
        await conn.execute(
          `UPDATE prod_work_order SET
            sales_order_id = NULL,
            standard_card_id = ?,
            process_card_id = ?
          WHERE id = ? AND deleted = 0`,
          [record.standard_card_id, record.process_card_id, workorder_id]
        );
      }

      return { id, status: 3, conversion_date: conversionDate };
    });

    return successResponse(result, '转量产成功');
  }

  if (action === 'cancel') {
    await execute('UPDATE eng_sample_to_mass SET status = 4 WHERE id = ?', [id]);
    return successResponse(null, '已取消转量产');
  }

  return errorResponse('无效的操作', 400, 400);
});
