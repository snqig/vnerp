import { getTranslations } from 'next-intl/server';

import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, paginatedResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { generateDocNo, getFprPrefix } from '@/lib/global-config';
import {
  buildQualityFormMessages,
  buildFinalInspectionSchema,
  buildFinalInspectionUpdateSchema,
  firstZodMessage,
} from '@/lib/validators/quality-form';
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

// 获取终检列表
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
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
      COALESCE(sc.customer_name, '') as customerName,
      COALESCE(sc.customer_code, '') as customerCode,
      COALESCE(sc.process_flow1, '') as processFlow1,
      COALESCE(sc.process_flow2, '') as processFlow2,
      COALESCE(sc.print_type, pc.material_spec) as printType,
      COALESCE(sc.finished_size, '') as finishedSize,
      COALESCE(sc.tolerance, '') as tolerance,
      COALESCE(sc.quality_manager, '') as qualityManager,
      COALESCE(sc.packing_type, '') as packingType,
      COALESCE(sc.slice_per_box, '') as slicePerBox,
      COALESCE(sc.slice_per_bundle, '') as slicePerBundle
    FROM prd_process_card pc
    LEFT JOIN prd_standard_card sc ON CAST(pc.product_code AS UNSIGNED) = sc.id
    WHERE pc.deleted = 0 AND pc.burdening_status >= 2
  `;

  let countSql = `SELECT COUNT(*) as total FROM prd_process_card pc WHERE pc.deleted = 0 AND pc.burdening_status >= 2`;
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

// 创建终检记录
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const parsed = buildFinalInspectionSchema(buildQualityFormMessages((k) => ts(k))).safeParse(
      body
    );
    if (!parsed.success) {
      return errorResponse(firstZodMessage(parsed.error), 400, 400);
    }

    const { cardId, cardNo, finalResult, qualifiedQty, defectQty, defectReason, inspector, packMethod, remark } =
      parsed.data;

    // 域规则：合格数 + 不良数 不能超过流程卡计划数
    const cardRows = await query<{ plan_qty: SqlValue }>(
      'SELECT plan_qty FROM prd_process_card WHERE id = ? AND deleted = 0',
      [cardId]
    );
    const card = cardRows[0];
    if (
      card &&
      Number(qualifiedQty) + Number(defectQty) > Number(card.plan_qty || 0)
    ) {
      return errorResponse(buildQualityFormMessages((k) => ts(k)).qtySumExceedsPlan, 400, 400);
    }

    // 生成终检编号
    const finalNo = generateDocNo(getFprPrefix());

    // 插入终检记录到 qc_final_inspection 表（inspection_result: 1=合格 2=不合格 3=让步接收）
    const resultCode = finalResult === 'pass' ? 1 : finalResult === 'fail' ? 2 : 3;
    await query(
      `INSERT INTO qc_final_inspection (
      inspection_no, inspection_date, work_order_no, card_id, card_no,
      product_code, product_name, inspection_qty, qualified_qty, unqualified_qty,
      inspection_result, inspector_name, defect_reason, pack_method, remark
    ) SELECT ?, CURDATE(), pc.work_order_no, pc.id, pc.card_no, pc.product_code, pc.product_name,
             ?, ?, ?, ?, ?, ?, ?, ?
       FROM prd_process_card pc WHERE pc.id = ?`,
      [
        finalNo,
        Number(qualifiedQty) + Number(defectQty),
        Number(qualifiedQty),
        Number(defectQty),
        resultCode,
        inspector,
        defectReason ?? null,
        packMethod ?? null,
        remark ?? null,
        cardId,
      ]
    );

    // 更新流程卡状态（pass/concession 均视为终检通过）
    if (finalResult === 'pass' || finalResult === 'concession') {
      await query(
        `UPDATE prd_process_card SET burdening_status = 3, update_time = NOW() WHERE id = ?`,
        [cardId]
      );
    } else if (finalResult === 'fail') {
      await query(
        `UPDATE prd_process_card SET burdening_status = 5, update_time = NOW() WHERE id = ?`,
        [cardId]
      );
    }

    return successResponse({ finalNo }, ts('k_p2v11i'));
  },
  { logTitle: '创建终检记录', logType: 'business' }
);

// 更新终检结果
export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const parsed = buildFinalInspectionUpdateSchema(buildQualityFormMessages((k) => ts(k))).safeParse(
      body
    );
    if (!parsed.success) {
      return errorResponse(firstZodMessage(parsed.error), 400, 400);
    }

    const { id, finalResult, qualifiedQty, defectQty, inspector, remark } = parsed.data;

    // 更新终检记录（inspection_result: 1=合格 2=不合格 3=让步接收）
    const resultCode = finalResult === 'pass' ? 1 : finalResult === 'fail' ? 2 : 3;
    await query(
      `UPDATE qc_final_inspection
     SET inspection_result = ?, qualified_qty = ?, unqualified_qty = ?, inspection_qty = ?,
         inspector_name = ?, remark = ?, update_time = NOW()
     WHERE id = ?`,
      [
        resultCode,
        Number(qualifiedQty),
        Number(defectQty),
        Number(qualifiedQty) + Number(defectQty),
        inspector,
        remark ?? null,
        id,
      ]
    );

    // 更新流程卡状态（按终检记录上的 card_id 关联，勿误用检验记录 id）
    const recRows = await query<{ card_id: SqlValue }>(
      'SELECT card_id FROM qc_final_inspection WHERE id = ?',
      [id]
    );
    const rec = recRows[0];
    if (rec && rec.card_id) {
      if (finalResult === 'pass' || finalResult === 'concession') {
        await query(
          `UPDATE prd_process_card SET burdening_status = 3, update_time = NOW() WHERE id = ?`,
          [rec.card_id]
        );
      } else if (finalResult === 'fail') {
        await query(
          `UPDATE prd_process_card SET burdening_status = 5, update_time = NOW() WHERE id = ?`,
          [rec.card_id]
        );
      }
    }

    return successResponse(null, ts('k_1555nov'));
  },
  { logTitle: '更新终检记录', logType: 'business' }
);
