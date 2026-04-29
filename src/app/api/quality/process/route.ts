import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, paginatedResponse, withErrorHandler, errorResponse } from '@/lib/api-response';
import { StateMachineValidator, InspectStatus, StateTransitionLogger } from '@/lib/state-machine';

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

// 获取当前检验状态
async function getCurrentInspectStatus(cardId: number): Promise<InspectStatus> {
  const [result] = await query<{ inspect_result: string }>(
    `SELECT inspect_result FROM qc_process_inspection WHERE card_id = ? ORDER BY created_at DESC LIMIT 1`,
    [cardId]
  );
  
  if (!result) return 'pending';
  
  const statusMap: Record<string, InspectStatus> = {
    'pending': 'pending',
    'inspecting': 'inspecting',
    'pass': 'pass',
    'fail': 'fail',
    'rework': 'rework',
    'scrap': 'scrap',
  };
  
  return statusMap[result.inspect_result] || 'pending';
}

// 获取品质检验列表
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
      sc.quality_manager as qualityManager
    FROM prd_process_card pc
    LEFT JOIN prd_standard_card sc ON pc.product_code = sc.id
    WHERE pc.deleted = 0 AND pc.burdening_status >= 1
  `;

  let countSql = `SELECT COUNT(*) as total FROM prd_process_card pc WHERE pc.deleted = 0 AND pc.burdening_status >= 1`;
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
}, '获取品质检验列表失败');

// 创建品质检验记录
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const {
    cardId,
    cardNo,
    inspectType,
    inspectResult,
    defectType,
    defectQty,
    qualifiedQty,
    inspector,
    remark,
  } = body;

  // 参数验证
  if (!cardId || !inspectResult) {
    return errorResponse('缺少必填参数: cardId, inspectResult', 400);
  }

  // 验证检验结果值是否合法
  const validResults = ['pending', 'inspecting', 'pass', 'fail', 'rework', 'scrap'];
  if (!validResults.includes(inspectResult)) {
    return errorResponse(`无效的检验结果: ${inspectResult}`, 400);
  }

  // 状态机验证
  const currentStatus = await getCurrentInspectStatus(cardId);
  const targetStatus = inspectResult as InspectStatus;
  
  if (!StateMachineValidator.canTransitionInspect(currentStatus, targetStatus)) {
    return errorResponse(
      `状态流转不合法: ${StateMachineValidator.getInspectStatusLabel(currentStatus)} -> ${StateMachineValidator.getInspectStatusLabel(targetStatus)}`,
      400
    );
  }

  // 生成检验编号
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const inspectNo = `QI${year}${month}${day}${random}`;

  // 插入到品质检验表 qc_process_inspection
  await query(
    `INSERT INTO qc_process_inspection (
      inspect_no, card_id, card_no, inspect_type, inspect_result,
      defect_type, defect_qty, qualified_qty, inspector, remark, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [inspectNo, cardId, cardNo, inspectType, inspectResult, defectType, defectQty, qualifiedQty, inspector, remark]
  );

  // 记录状态流转日志
  StateTransitionLogger.logTransition(
    'inspect',
    cardId,
    currentStatus,
    targetStatus,
    undefined,
    inspector,
    remark
  );

  // 更新流程卡状态
  if (inspectResult === 'pass') {
    await query(
      `UPDATE prd_process_card SET burdening_status = burdening_status + 1, update_time = NOW() WHERE id = ?`,
      [cardId]
    );
  } else if (inspectResult === 'fail') {
    // 检验失败时，可以设置特定状态
    await query(
      `UPDATE prd_process_card SET burdening_status = 5, update_time = NOW() WHERE id = ?`,
      [cardId]
    );
  }

  return successResponse({ inspectNo }, '品质检验记录创建成功');
}, '创建品质检验记录失败');

// 更新品质检验结果
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, inspectResult, qualifiedQty, defectQty, inspector, remark } = body;

  // 参数验证
  if (!id || !inspectResult) {
    return errorResponse('缺少必填参数: id, inspectResult', 400);
  }

  // 验证检验结果值是否合法
  const validResults = ['pending', 'inspecting', 'pass', 'fail', 'rework', 'scrap'];
  if (!validResults.includes(inspectResult)) {
    return errorResponse(`无效的检验结果: ${inspectResult}`, 400);
  }

  // 获取当前检验记录
  const [currentRecord] = await query<{ card_id: number; inspect_result: string }>(
    `SELECT card_id, inspect_result FROM qc_process_inspection WHERE id = ?`,
    [id]
  );

  if (!currentRecord) {
    return errorResponse('检验记录不存在', 404);
  }

  // 状态机验证
  const currentStatus = (currentRecord.inspect_result || 'pending') as InspectStatus;
  const targetStatus = inspectResult as InspectStatus;
  
  if (!StateMachineValidator.canTransitionInspect(currentStatus, targetStatus)) {
    return errorResponse(
      `状态流转不合法: ${StateMachineValidator.getInspectStatusLabel(currentStatus)} -> ${StateMachineValidator.getInspectStatusLabel(targetStatus)}`,
      400
    );
  }

  // 更新检验记录
  await query(
    `UPDATE qc_process_inspection 
     SET inspect_result = ?, qualified_qty = ?, defect_qty = ?, inspector = ?, remark = ?, updated_at = NOW()
     WHERE id = ?`,
    [inspectResult, qualifiedQty, defectQty, inspector, remark, id]
  );

  // 记录状态流转日志
  StateTransitionLogger.logTransition(
    'inspect',
    currentRecord.card_id,
    currentStatus,
    targetStatus,
    undefined,
    inspector,
    remark
  );

  // 更新流程卡状态
  if (inspectResult === 'pass') {
    await query(
      `UPDATE prd_process_card SET burdening_status = burdening_status + 1, update_time = NOW() WHERE id = ?`,
      [currentRecord.card_id]
    );
  } else if (inspectResult === 'fail') {
    await query(
      `UPDATE prd_process_card SET burdening_status = 5, update_time = NOW() WHERE id = ?`,
      [currentRecord.card_id]
    );
  } else if (inspectResult === 'rework') {
    await query(
      `UPDATE prd_process_card SET burdening_status = 6, update_time = NOW() WHERE id = ?`,
      [currentRecord.card_id]
    );
  }

  return successResponse(null, '品质检验结果更新成功');
}, '更新品质检验结果失败');
