import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, paginatedResponse, withErrorHandler } from '@/lib/api-response';

// 本地分页查询辅助函数
async function queryPaginatedLocal(
  sql: string,
  countSql: string,
  values: any[],
  pagination: { page: number; pageSize: number }
) {
  const { page, pageSize } = pagination;
  
  const [countResult] = await query<{ total: number }>(countSql, values);
  const total = countResult?.total || 0;
  
  const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
  const paginatedValues = [...values, pageSize, (page - 1) * pageSize];
  const data = await query(paginatedSql, paginatedValues);
  
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// 获取终检列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const cardNo = searchParams.get('cardNo');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  let sql = `
    SELECT 
      pc.id,
      pc.card_no as cardNo,
      pc.qr_code as qrCode,
      pc.work_order_no as workOrderNo,
      pc.product_code as productCode,
      pc.product_name as productName,
      pc.material_spec as materialSpec,
      pc.work_order_date as workOrderDate,
      pc.plan_qty as planQty,
      pc.main_label_no as mainLabelNo,
      pc.burdening_status as burdeningStatus,
      pc.lock_status as lockStatus,
      pc.create_user_name as createUserName,
      pc.create_time as createTime,
      pc.update_time as updateTime,
      sc.customer_name as customerName,
      sc.customer_code as customerCode,
      sc.process_flow1 as processFlow1,
      sc.process_flow2 as processFlow2,
      sc.print_type as printType,
      sc.finished_size as finishedSize,
      sc.tolerance,
      sc.quality_manager as qualityManager,
      sc.packing_type as packingType,
      sc.slice_per_box as slicePerBox,
      sc.slice_per_bundle as slicePerBundle
    FROM prd_process_card pc
    LEFT JOIN prd_standard_card sc ON pc.product_code = sc.id
    WHERE pc.deleted = 0 AND pc.burdening_status >= 2
  `;

  let countSql = `SELECT COUNT(*) as total FROM prd_process_card pc WHERE pc.deleted = 0 AND pc.burdening_status >= 2`;
  const params: any[] = [];

  if (status) {
    sql += ` AND pc.burdening_status = ?`;
    countSql += ` AND pc.burdening_status = ?`;
    params.push(status);
  }

  if (cardNo) {
    sql += ` AND pc.card_no LIKE ?`;
    countSql += ` AND pc.card_no LIKE ?`;
    params.push(`%${cardNo}%`);
  }

  sql += ` ORDER BY pc.work_order_date DESC, pc.create_time DESC`;

  const result = await queryPaginatedLocal(sql, countSql, params, { page, pageSize });
  return paginatedResponse(result.data, result.pagination);
}, '获取终检列表失败');

// 创建终检记录
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const {
    cardId,
    cardNo,
    finalResult,
    qualifiedQty,
    defectQty,
    defectReason,
    inspector,
    packMethod,
    remark,
  } = body;

  // 生成终检编号
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const finalNo = `FI${year}${month}${day}${random}`;

  // 插入终检记录到 qc_final_inspection 表
  await query(
    `INSERT INTO qc_final_inspection (
      final_no, card_id, card_no, final_result, qualified_qty, 
      defect_qty, defect_reason, inspector, pack_method, remark, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [finalNo, cardId, cardNo, finalResult, qualifiedQty, defectQty, defectReason, inspector, packMethod, remark]
  );

  // 更新流程卡状态
  if (finalResult === 'pass') {
    await query(
      `UPDATE prd_process_card SET burdening_status = 3, update_time = NOW() WHERE id = ?`,
      [cardId]
    );
  }

  return successResponse({ finalNo }, '终检记录创建成功');
}, '创建终检记录失败');

// 更新终检结果
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, finalResult, qualifiedQty, defectQty, inspector, remark } = body;

  // 更新终检记录
  await query(
    `UPDATE qc_final_inspection 
     SET final_result = ?, qualified_qty = ?, defect_qty = ?, inspector = ?, remark = ?, updated_at = NOW()
     WHERE id = ?`,
    [finalResult, qualifiedQty, defectQty, inspector, remark, id]
  );

  // 更新流程卡状态
  if (finalResult === 'pass') {
    await query(
      `UPDATE prd_process_card SET burdening_status = 3, update_time = NOW() WHERE id = ?`,
      [id]
    );
  }

  return successResponse(null, '终检结果更新成功');
}, '更新终检结果失败');
