import { getTranslations } from 'next-intl/server';

import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, paginatedResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { StateMachineValidator, InspectStatus, StateTransitionLogger } from '@/lib/state-machine';
import { generateDocNo, getQiPrefix } from '@/lib/global-config';
import type { DbRow } from '@/types/db';

// 本地分页查询辅助函数
async function queryPaginatedLocal(
  sql: string,
  countSql: string,
  values: DbRow[],
  pagination: { page: number; pageSize: number }
) {
  const { page, pageSize } = pagination;

  const countResult = await query<{ total: number }>(countSql, values);
  const total = countResult?.[0]?.total || 0;

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

// 检验结果：字符串状态 -> qc_inspection.inspection_result tinyint（1=合格 2=不合格 3=让步接收）
const RESULT_TO_CODE: Record<string, number> = {
  pass: 1,
  fail: 2,
  concession: 3,
  rework: 2,
  scrap: 2,
};

const CODE_TO_STATUS: Record<number, InspectStatus> = {
  1: 'pass',
  2: 'fail',
  3: 'concession',
};

// 获取当前检验状态（经 source_type/source_no 关联流程卡，qc_inspection 无 card_id 列）
async function getCurrentInspectStatus(cardNo: string): Promise<InspectStatus> {
  const rows = await query<{ inspection_result: number }>(
    `SELECT inspection_result FROM qc_inspection
     WHERE source_type = 'process_card' AND source_no = ? AND deleted = 0
     ORDER BY inspection_date DESC, id DESC LIMIT 1`,
    [cardNo]
  );
  const result = rows[0];

  if (!result) return 'pending';

  return CODE_TO_STATUS[result.inspection_result] || 'pending';
}

// 获取品质检验列表
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const cardNo = searchParams.get('cardNo');
  const cardId = searchParams.get('cardId');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 按流程卡查询检验记录（检验记录弹窗用）
  if (cardId) {
    const records = await query(
      `SELECT qi.id, qi.inspection_no AS inspectNo, qi.inspection_result AS inspectResult,
              qi.qualified_qty AS qualifiedQty, qi.unqualified_qty AS defectQty,
              qi.inspector, qi.remark, qi.inspection_date AS inspectTime
       FROM qc_inspection qi
       JOIN prd_process_card pc ON qi.source_type = 'process_card' AND qi.source_no = pc.card_no
       WHERE pc.id = ? AND qi.deleted = 0
       ORDER BY qi.inspection_date DESC, qi.id DESC`,
      [parseInt(cardId)]
    );
    return successResponse(records);
  }

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
    LEFT JOIN prd_standard_card sc ON CAST(pc.product_code AS UNSIGNED) = sc.id
    WHERE pc.deleted = 0 AND pc.burdening_status >= 1
  `;

  let countSql = `SELECT COUNT(*) as total FROM prd_process_card pc WHERE pc.deleted = 0 AND pc.burdening_status >= 1`;
  const params: SqlValue[] = [];

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
});

// 创建品质检验记录
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { cardId, cardNo, inspectResult, defectQty, qualifiedQty, inspector, remark } = body;

    // 参数验证
    if (!cardId || !inspectResult) {
      return errorResponse(ts('k_2quwv4'), 400);
    }

    // 验证检验结果值是否合法
    const validResults = ['pass', 'fail', 'concession', 'rework', 'scrap'];
    if (!validResults.includes(inspectResult)) {
      return errorResponse(`无效的检验结果: ${inspectResult}`, 400);
    }

    // 状态机验证
    const currentStatus = await getCurrentInspectStatus(cardNo);
    const targetStatus = inspectResult as InspectStatus;

    if (!StateMachineValidator.canTransitionInspect(currentStatus, targetStatus)) {
      return errorResponse(
        `状态流转不合法: ${StateMachineValidator.getInspectStatusLabel(currentStatus)} -> ${StateMachineValidator.getInspectStatusLabel(targetStatus)}`,
        400
      );
    }

    // 生成检验编号
    const inspectNo = generateDocNo(getQiPrefix());

    // 插入通用检验表 qc_inspection（inspection_type: 1=来料 2=过程；inspection_result tinyint 1=合格 2=不合格 3=让步接收）
    await query(
      `INSERT INTO qc_inspection (
      inspection_no, inspection_type, source_type, source_no,
      inspection_qty, qualified_qty, unqualified_qty, inspection_result,
      inspector, inspection_date, remark
    ) VALUES (?, 2, 'process_card', ?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
      [
        inspectNo,
        cardNo,
        Number(qualifiedQty || 0) + Number(defectQty || 0),
        Number(qualifiedQty || 0),
        Number(defectQty || 0),
        RESULT_TO_CODE[inspectResult],
        inspector,
        remark,
      ]
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

    // 更新流程卡状态（pass/concession 均视为检验通过）
    if (inspectResult === 'pass' || inspectResult === 'concession') {
      await query(
        `UPDATE prd_process_card SET burdening_status = burdening_status + 1, update_time = NOW() WHERE id = ?`,
        [cardId]
      );
    } else if (inspectResult === 'fail') {
      await query(
        `UPDATE prd_process_card SET burdening_status = 5, update_time = NOW() WHERE id = ?`,
        [cardId]
      );
    } else if (inspectResult === 'rework') {
      await query(
        `UPDATE prd_process_card SET burdening_status = 6, update_time = NOW() WHERE id = ?`,
        [cardId]
      );
    }

    return successResponse({ inspectNo }, ts('k_cokej7'));
  },
  { logTitle: '创建品质检验记录', logType: 'business' }
);

// 更新品质检验结果
export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, inspectResult, qualifiedQty, defectQty, inspector, remark } = body;

    // 参数验证
    if (!id || !inspectResult) {
      return errorResponse(ts('k_elsdj6'), 400);
    }

    // 验证检验结果值是否合法
    const validResults = ['pass', 'fail', 'concession', 'rework', 'scrap'];
    if (!validResults.includes(inspectResult)) {
      return errorResponse(`无效的检验结果: ${inspectResult}`, 400);
    }

    // 获取当前检验记录
    const rows = await query<{ source_no: string; inspection_result: number }>(
      `SELECT source_no, inspection_result FROM qc_inspection WHERE id = ? AND deleted = 0`,
      [id]
    );
    const currentRecord = rows[0];

    if (!currentRecord) {
      return errorResponse(ts('k_1emlkd9'), 404);
    }

    // 状态机验证
    const currentStatus = CODE_TO_STATUS[currentRecord.inspection_result] || ('pending' as InspectStatus);
    const targetStatus = inspectResult as InspectStatus;

    if (!StateMachineValidator.canTransitionInspect(currentStatus, targetStatus)) {
      return errorResponse(
        `状态流转不合法: ${StateMachineValidator.getInspectStatusLabel(currentStatus)} -> ${StateMachineValidator.getInspectStatusLabel(targetStatus)}`,
        400
      );
    }

    // 更新检验记录
    await query(
      `UPDATE qc_inspection
     SET inspection_result = ?, qualified_qty = ?, unqualified_qty = ?,
         inspection_qty = ?, inspector = ?, remark = ?, update_time = NOW()
     WHERE id = ?`,
      [
        RESULT_TO_CODE[inspectResult],
        Number(qualifiedQty || 0),
        Number(defectQty || 0),
        Number(qualifiedQty || 0) + Number(defectQty || 0),
        inspector,
        remark,
        id,
      ]
    );

    // 记录状态流转日志
    StateTransitionLogger.logTransition(
      'inspect',
      id,
      currentStatus,
      targetStatus,
      undefined,
      inspector,
      remark
    );

    // 更新流程卡状态（pass/concession 均视为检验通过）
    if (inspectResult === 'pass' || inspectResult === 'concession') {
      await query(
        `UPDATE prd_process_card SET burdening_status = burdening_status + 1, update_time = NOW() WHERE card_no = ?`,
        [currentRecord.source_no]
      );
    } else if (inspectResult === 'fail') {
      await query(
        `UPDATE prd_process_card SET burdening_status = 5, update_time = NOW() WHERE card_no = ?`,
        [currentRecord.source_no]
      );
    } else if (inspectResult === 'rework') {
      await query(
        `UPDATE prd_process_card SET burdening_status = 6, update_time = NOW() WHERE card_no = ?`,
        [currentRecord.source_no]
      );
    }

    return successResponse(null, ts('k_655vru'));
  },
  { logTitle: '更新品质检验记录', logType: 'business' }
);
