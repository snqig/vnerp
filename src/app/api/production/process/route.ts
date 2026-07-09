import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getTrPrefix, generateDocNo } from '@/lib/global-config';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const cardNo = searchParams.get('cardNo');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `
    SELECT 
      pc.id,
      pc.card_no,
      pc.qr_code,
      pc.work_order_no,
      pc.product_code,
      pc.product_name,
      pc.material_spec,
      pc.work_order_date,
      pc.plan_qty,
      pc.main_label_no,
      pc.burdening_status,
      pc.lock_status,
      pc.create_user_name,
      pc.create_time,
      pc.update_time,
      sc.customer_name,
      sc.customer_code,
      sc.process_flow1,
      sc.process_flow2,
      sc.print_type,
      sc.film_manufacturer,
      sc.film_code,
      sc.mold_code
    FROM prd_process_card pc
    LEFT JOIN prd_standard_card sc ON pc.product_code = sc.id
    WHERE pc.deleted = 0 AND pc.burdening_status >= 1
  `;

  let countSql = `SELECT COUNT(*) as total FROM prd_process_card pc WHERE pc.deleted = 0 AND pc.burdening_status >= 1`;
  const params: any[] = [];
  const countParams: any[] = [];

  if (status) {
    sql += ` AND pc.burdening_status = ?`;
    countSql += ` AND pc.burdening_status = ?`;
    params.push(status);
    countParams.push(status);
  }

  if (cardNo) {
    sql += ` AND pc.card_no LIKE ?`;
    countSql += ` AND pc.card_no LIKE ?`;
    params.push(`%${cardNo}%`);
    countParams.push(`%${cardNo}%`);
  }

  sql += ` ORDER BY pc.work_order_date DESC, pc.create_time DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const processes = await query(sql, params);
  const countResult = await query(countSql, countParams);
  const total = (countResult as any[])[0]?.total || 0;

  return successResponse({
    list: processes,
    total,
    page,
    pageSize,
  });
});

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, processStatus, currentProcess, operatorId, operatorName, remark, cardNo } = body;

    await query(
      `UPDATE prd_process_card 
     SET burdening_status = ?, update_time = NOW() 
     WHERE id = ?`,
      [processStatus, id]
    );

    await query(
      `INSERT INTO inv_trace_record (
      trace_no, card_id, card_no, trace_type,
      operator_id, operator_name, trace_time, remark, create_time
    ) VALUES (
      ?,
      ?, ?, ?, ?, ?, NOW(), ?, NOW()
    )`,
      [generateDocNo(getTrPrefix()), id, cardNo, currentProcess, operatorId, operatorName, remark]
    );

    return successResponse(null, '流程更新成功');
  },
  { logTitle: '更新生产流程', logType: 'business' }
);
