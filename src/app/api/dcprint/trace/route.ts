// @ts-nocheck
import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// 物料项接口
interface MaterialItem {
  labelNo: string;
  materialType: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  batchNo?: string;
  quantity?: number;
  unit?: string;
  remark?: string;
  supplierName?: string;
  receiveDate?: string;
  colorCode?: string;
  mixRemark?: string;
}

// 追溯明细接口
interface TraceDetail {
  id: number;
  labelNo: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  batchNo?: string;
  supplierName?: string;
  receiveDate?: string;
  materialType: string;
  remark?: string;
}

// 生成追溯单号
function generateTraceNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TR${dateStr}${random}`;
}

// GET - 获取追溯记录列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const workOrderNo = searchParams.get('workOrderNo') || '';
  const productCode = searchParams.get('productCode') || '';
  const traceType = searchParams.get('traceType') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let whereClause = 'WHERE t.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    whereClause += ` AND (t.trace_no LIKE ? OR t.work_order_no LIKE ? OR t.product_code LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (workOrderNo) {
    whereClause += ` AND t.work_order_no = ?`;
    params.push(workOrderNo);
  }

  if (productCode) {
    whereClause += ` AND t.product_code = ?`;
    params.push(productCode);
  }

  if (traceType) {
    whereClause += ` AND t.trace_type = ?`;
    params.push(traceType);
  }

  const result = await queryPaginated(
    `SELECT
      t.id,
      t.trace_no,
      t.card_id,
      t.card_no,
      t.work_order_no,
      t.product_code,
      t.main_label_id,
      t.trace_type,
      t.operator_id,
      t.operator_name,
      t.trace_time,
      t.remark,
      t.create_time,
      c.product_name,
      l.material_code as main_material_code,
      l.material_name as main_material_name,
      l.batch_no as main_batch_no
    FROM inv_trace_record t
    LEFT JOIN prd_process_card c ON t.card_id = c.id
    LEFT JOIN inv_material_label l ON t.main_label_id = l.id
    ${whereClause}
    ORDER BY t.trace_time DESC`,
    `SELECT COUNT(*) as total FROM inv_trace_record t ${whereClause}`,
    params,
    { page, pageSize }
  );

  return successResponse(result);
}, '获取追溯记录列表失败');

// POST - 执行追溯查询
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { cardNo, traceType = 'forward', operatorId, operatorName } = body;

  if (!cardNo) {
    return errorResponse('流程卡号不能为空', 400, 400);
  }

  // 查询流程卡信息
  const card = await queryOne<any>(
    `SELECT
      c.id, c.card_no, c.work_order_no, c.product_code, c.product_name,
      c.main_label_id, c.main_label_no,
      l.material_code as main_material_code,
      l.material_name as main_material_name,
      l.specification as main_specification,
      l.batch_no as main_batch_no,
      l.supplier_name as main_supplier_name,
      l.receive_date as main_receive_date
    FROM prd_process_card c
    LEFT JOIN inv_material_label l ON c.main_label_id = l.id
    WHERE c.card_no = ? AND c.deleted = 0`,
    [cardNo]
  );

  if (!card) {
    return errorResponse('流程卡不存在', 404, 404);
  }

  // 查询流程卡关联的所有物料
  const materials = await query<MaterialItem[]>(
    `SELECT
      m.label_no as labelNo,
      m.material_type as materialType,
      m.material_code as materialCode,
      m.material_name as materialName,
      m.specification,
      m.batch_no as batchNo,
      m.quantity,
      m.unit,
      m.remark,
      l.supplier_name as supplierName,
      l.receive_date as receiveDate,
      l.color_code as colorCode,
      l.mix_remark as mixRemark
    FROM prd_process_card_material m
    LEFT JOIN inv_material_label l ON m.label_id = l.id
    WHERE m.card_id = ?
    ORDER BY m.material_type, m.create_time`,
    [card.id]
  );

  // 生成追溯单号并记录
  const traceNo = generateTraceNo();

  await execute(
    `INSERT INTO inv_trace_record (
      trace_no, card_id, card_no, work_order_no, product_code, main_label_id,
      trace_type, operator_id, operator_name, remark, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      traceNo, card.id, card.card_no, card.work_order_no,
      card.product_code, card.main_label_id,
      traceType, operatorId, operatorName,
      `追溯查询: ${traceType === 'forward' ? '正向追溯' : '反向追溯'}`,
    ]
  );

  // 添加追溯明细
  // @ts-ignore
  for (const material of materials || []) {
    await execute(
      `INSERT INTO inv_trace_detail (
        trace_id, label_id, label_no, material_code, material_name,
        specification, batch_no, supplier_name, receive_date, material_type, remark
      ) VALUES (
        (SELECT id FROM inv_trace_record WHERE trace_no = ?),
        (SELECT id FROM inv_material_label WHERE label_no = ?),
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        traceNo, material.labelNo, material.labelNo,
        material.materialCode || '',
        material.materialName || '',
        material.specification || '',
        material.batchNo || '',
        material.supplierName || '',
        material.receiveDate || '',
        material.materialType,
        material.remark || '',
      ]
    );
  }

  return successResponse({
    traceNo,
    card: {
      cardNo: card.card_no,
      workOrderNo: card.work_order_no,
      productCode: card.product_code,
      productName: card.product_name,
    },
    mainMaterial: {
      labelNo: card.main_label_no,
      materialCode: card.main_material_code,
      materialName: card.main_material_name,
      specification: card.main_specification,
      batchNo: card.main_batch_no,
      supplierName: card.main_supplier_name,
      receiveDate: card.main_receive_date,
    },
    materials: materials || [],
    mainMaterials: materials?.filter((m) => m.materialType === 'main') || [],
    auxiliaryMaterials: materials?.filter((m) => m.materialType === 'auxiliary') || [],
  }, '追溯查询成功');
}, '追溯查询失败');

// GET /detail - 获取追溯详情
export const detail = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const traceNo = searchParams.get('traceNo');

  if (!traceNo) {
    return errorResponse('追溯单号不能为空', 400, 400);
  }

  const trace = await queryOne<any>(
    `SELECT
      t.id,
      t.trace_no as traceNo,
      t.card_id as cardId,
      t.card_no as cardNo,
      t.work_order_no as workOrderNo,
      t.product_code as productCode,
      t.main_label_id as mainLabelId,
      t.trace_type as traceType,
      t.operator_id as operatorId,
      t.operator_name as operatorName,
      t.trace_time as traceTime,
      t.remark,
      t.create_time as createTime
    FROM inv_trace_record t
    WHERE t.trace_no = ? AND t.deleted = 0`,
    [traceNo]
  );

  if (!trace) {
    return errorResponse('追溯记录不存在', 404, 404);
  }

  // 查询追溯明细
  const details = await query<TraceDetail[]>(
    `SELECT
      d.id,
      d.label_no as labelNo,
      d.material_code as materialCode,
      d.material_name as materialName,
      d.specification,
      d.batch_no as batchNo,
      d.supplier_name as supplierName,
      d.receive_date as receiveDate,
      d.material_type as materialType,
      d.remark
    FROM inv_trace_detail d
    WHERE d.trace_id = ?
    ORDER BY d.material_type, d.create_time`,
    [trace.id]
  );

  return successResponse({
    ...trace,
    details: details || [],
    mainMaterials: details?.filter((d) => d.materialType === 'main') || [],
    auxiliaryMaterials: details?.filter((d) => d.materialType === 'auxiliary') || [],
  });
}, '获取追溯详情失败');

// 辅助函数：分页查询
async function queryPaginated(
  sql: string,
  countSql: string,
  params: any[],
  pagination: { page: number; pageSize: number }
) {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  const [data, countResult] = await Promise.all([
    query<any[]>(`${sql} LIMIT ? OFFSET ?`, [...params, pageSize, offset]),
    queryOne<{ total: number }>(countSql, params),
  ]);

  return {
    list: data || [],
    pagination: {
      page,
      pageSize,
      total: countResult?.total || 0,
    },
  };
}
