import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import { generateDocumentNo } from '@/lib/document-numbering';

// 采购申请接口
interface PurchaseRequest {
  id?: number;
  request_no: string;
  request_date: string;
  request_type: string;
  request_dept_id?: number;
  request_dept: string;
  requester_id?: number;
  requester_name: string;
  reviewer_id?: number;
  reviewer_name?: string;
  approver_id?: number;
  approver_name?: string;
  total_amount: number;
  currency: string;
  status: number;
  priority: number;
  expected_date: string;
  supplier_id?: number;
  supplier_name: string;
  remark: string;
  approve_date: string;
  approve_remark: string;
  create_time?: string;
  update_time?: string;
  items?: RequestItem[];
}

// 申请明细接口
interface RequestItem {
  id?: number;
  request_id: number;
  line_no: number;
  material_id?: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  material_unit: string;
  quantity: number;
  price: number;
  amount: number;
  supplier_id?: number;
  supplier_name: string;
  expected_date: string;
  remark: string;
}

// 生成采购申请单号
function generateRequestNoSync(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `PR${dateStr}${randomStr}`;
}

// 计算明细总金额
function calculateTotalAmount(items: RequestItem[] | undefined): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

// GET - 获取采购申请列表或单个申请
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 查询单个申请及明细
  if (id) {
    const request = await queryOne<PurchaseRequest>(
      'SELECT * FROM pur_request WHERE id = ? AND deleted = 0',
      [parseInt(id)]
    );

    if (!request) {
      return commonErrors.notFound('采购申请不存在');
    }

    // 获取明细
    const items = await query<RequestItem>(
      'SELECT * FROM pur_request_item WHERE request_id = ? AND deleted = 0 ORDER BY line_no',
      [parseInt(id)]
    );

    return successResponse({ ...request, items });
  }

  // 构建列表查询
  let sql = 'SELECT * FROM pur_request WHERE deleted = 0';
  let countSql = 'SELECT COUNT(*) as total FROM pur_request WHERE deleted = 0';
  const params: any[] = [];

  if (status && status !== 'all') {
    const condition = ' AND status = ?';
    sql += condition;
    countSql += condition;
    params.push(parseInt(status));
  }

  if (keyword) {
    const condition =
      ' AND (request_no LIKE ? OR requester_name LIKE ? OR request_dept LIKE ?)';
    sql += condition;
    countSql += condition;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY create_time DESC';

  const result = await queryPaginated<PurchaseRequest>(
    sql,
    countSql,
    params,
    { page, pageSize }
  );

  if (result.data && result.data.length > 0) {
    const requestIds = (result.data as any[]).map((r: any) => r.id);
    const placeholders = requestIds.map(() => '?').join(',');
    const items = await query<RequestItem>(
      `SELECT * FROM pur_request_item WHERE request_id IN (${placeholders}) AND deleted = 0 ORDER BY request_id, line_no`,
      requestIds
    );
    const itemsMap = new Map();
    for (const item of items as any[]) {
      if (!itemsMap.has(item.request_id)) {
        itemsMap.set(item.request_id, []);
      }
      itemsMap.get(item.request_id).push(item);
    }
    for (const req of result.data as any[]) {
      req.items = itemsMap.get(req.id) || [];
    }
  }

  return paginatedResponse(result.data, result.pagination);
}, '获取采购申请列表失败');

// POST - 创建采购申请
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'request_type',
    'request_dept',
    'requester_name',
    'expected_date',
  ]);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 验证明细
  if (!body.items || body.items.length === 0) {
    return errorResponse('采购申请必须包含至少一条明细', 400, 400);
  }

  const requestNo = await generateDocumentNo('purchase_request');
  const totalAmount = calculateTotalAmount(body.items);

  // 使用事务确保数据一致性
  const result = await transaction(async (connection) => {
    // 插入主表
    const [requestResult] = await connection.execute(
      `INSERT INTO pur_request (
        request_no, request_date, request_type, request_dept_id, request_dept, requester_id, requester_name,
        reviewer_id, reviewer_name, approver_id, approver_name,
        total_amount, currency, status, priority, expected_date, supplier_name, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestNo,
        body.request_date || new Date().toISOString().split('T')[0],
        body.request_type,
        body.request_dept_id || null,
        body.request_dept,
        body.requester_id || null,
        body.requester_name,
        body.reviewer_id || null,
        body.reviewer_name || null,
        body.approver_id || null,
        body.approver_name || null,
        totalAmount,
        body.currency || 'CNY',
        body.status || 0,
        body.priority || 1,
        body.expected_date,
        body.supplier_name,
        body.remark,
      ]
    );

    const requestId = (requestResult as any).insertId;

    // 批量插入明细
    const itemValues = body.items.map((item: RequestItem, index: number) => [
      requestId,
      index + 1,
      item.material_id || null,
      item.material_code,
      item.material_name,
      item.material_spec,
      item.material_unit,
      item.quantity,
      item.price || 0,
      item.amount || item.quantity * (item.price || 0),
      item.supplier_name,
      item.expected_date,
      item.remark,
    ]);

    await connection.query(
      `INSERT INTO pur_request_item (
        request_id, line_no, material_id, material_code, material_name, material_spec,
        material_unit, quantity, price, amount, supplier_name, expected_date, remark
      ) VALUES ?`,
      [itemValues]
    );

    return { id: requestId, request_no: requestNo };
  });

  return successResponse(result, '采购申请创建成功');
}, '创建采购申请失败');

// PUT - 更新采购申请
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('缺少申请ID');
  }

  const requestId = parseInt(id);
  const body = await request.json();

  // 检查申请是否存在
  const existingRequest = await queryOne<{ id: number; status: number }>(
    'SELECT id, status FROM pur_request WHERE id = ? AND deleted = 0',
    [requestId]
  );

  if (!existingRequest) {
    return commonErrors.notFound('采购申请不存在或已被删除');
  }

  // 已审批的申请不能修改
  if (existingRequest.status >= 4 && existingRequest.status !== 6) {
    return errorResponse('已批准的采购申请不能修改', 400, 400);
  }

  const totalAmount = calculateTotalAmount(body.items);

  // 使用事务更新主表和明细
  await transaction(async (connection) => {
    // 更新主表
    await connection.execute(
      `UPDATE pur_request SET
        request_date = ?, request_type = ?, request_dept_id = ?, request_dept = ?, requester_id = ?, requester_name = ?,
        reviewer_id = ?, reviewer_name = ?, approver_id = ?, approver_name = ?,
        total_amount = ?, priority = ?, expected_date = ?, supplier_name = ?, remark = ?, status = ?
      WHERE id = ? AND deleted = 0`,
      [
        body.request_date,
        body.request_type,
        body.request_dept_id || null,
        body.request_dept,
        body.requester_id || null,
        body.requester_name,
        body.reviewer_id || null,
        body.reviewer_name || null,
        body.approver_id || null,
        body.approver_name || null,
        totalAmount,
        body.priority,
        body.expected_date,
        body.supplier_name,
        body.remark,
        body.status !== undefined ? body.status : existingRequest.status,
        requestId,
      ]
    );

    // 软删除旧明细
    await connection.execute(
      'UPDATE pur_request_item SET deleted = 1 WHERE request_id = ?',
      [requestId]
    );

    // 批量插入新明细
    if (body.items && body.items.length > 0) {
      const itemValues = body.items.map((item: RequestItem, index: number) => [
        requestId,
        index + 1,
        item.material_id || null,
        item.material_code,
        item.material_name,
        item.material_spec,
        item.material_unit,
        item.quantity,
        item.price || 0,
        item.amount || item.quantity * (item.price || 0),
        item.supplier_name,
        item.expected_date,
        item.remark,
      ]);

      await connection.query(
        `INSERT INTO pur_request_item (
          request_id, line_no, material_id, material_code, material_name, material_spec,
          material_unit, quantity, price, amount, supplier_name, expected_date, remark
        ) VALUES ?`,
        [itemValues]
      );
    }
  });

  return successResponse(null, '采购申请更新成功');
}, '更新采购申请失败');

// DELETE - 删除采购申请
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('缺少申请ID');
  }

  const requestId = parseInt(id);

  // 检查申请是否存在
  const existingRequest = await queryOne<{ id: number; status: number }>(
    'SELECT id, status FROM pur_request WHERE id = ? AND deleted = 0',
    [requestId]
  );

  if (!existingRequest) {
    return commonErrors.notFound('采购申请不存在或已被删除');
  }

  // 已审批的申请不能删除
  if (existingRequest.status >= 4) {
    return errorResponse('已批准的采购申请不能删除', 400, 400);
  }

  const refCheck = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM pur_order WHERE remark LIKE ? AND deleted = 0`,
    [`%PR-${existingRequest.id}%`]
  );
  if (refCheck && refCheck.cnt > 0) {
    return errorResponse('该请购单已被采购订单引用，无法删除', 400, 400);
  }

  // 使用事务软删除主表和明细
  await transaction(async (connection) => {
    await connection.execute(
      'UPDATE pur_request SET deleted = 1 WHERE id = ?',
      [requestId]
    );
    await connection.execute(
      'UPDATE pur_request_item SET deleted = 1 WHERE request_id = ?',
      [requestId]
    );
  });

  return successResponse(null, '采购申请删除成功');
}, '删除采购申请失败');
