import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// 生成流程卡卡号
function generateCardNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PC${dateStr}${random}`;
}

// GET - 获取流程卡列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const workOrderNo = searchParams.get('workOrderNo') || '';
  const productCode = searchParams.get('productCode') || '';
  const mainLabelNo = searchParams.get('mainLabelNo') || '';
  const burdeningStatus = searchParams.get('burdeningStatus') || '';
  const lockStatus = searchParams.get('lockStatus') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let whereClause = 'WHERE c.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    whereClause += ` AND (c.card_no LIKE ? OR c.work_order_no LIKE ? OR c.product_code LIKE ? OR c.product_name LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (workOrderNo) {
    whereClause += ` AND c.work_order_no = ?`;
    params.push(workOrderNo);
  }

  if (productCode) {
    whereClause += ` AND c.product_code = ?`;
    params.push(productCode);
  }

  if (mainLabelNo) {
    whereClause += ` AND c.main_label_no = ?`;
    params.push(mainLabelNo);
  }

  if (burdeningStatus) {
    whereClause += ` AND c.burdening_status = ?`;
    params.push(burdeningStatus);
  }

  if (lockStatus) {
    whereClause += ` AND c.lock_status = ?`;
    params.push(lockStatus);
  }

  const result = await queryPaginated(
    `SELECT
      c.id,
      c.card_no as cardNo,
      c.qr_code as qrCode,
      c.work_order_id as workOrderId,
      c.work_order_no as workOrderNo,
      c.product_code as productCode,
      c.product_name as productName,
      c.material_spec as materialSpec,
      c.work_order_date as workOrderDate,
      c.plan_qty as planQty,
      c.main_label_id as mainLabelId,
      c.main_label_no as mainLabelNo,
      c.burdening_status as burdeningStatus,
      c.lock_status as lockStatus,
      c.create_user_name as createUserName,
      c.create_time as createTime,
      l.material_code as mainMaterialCode,
      l.material_name as mainMaterialName,
      l.specification as mainSpecification,
      l.batch_no as mainBatchNo,
      l.supplier_name as mainSupplierName,
      l.receive_date as mainReceiveDate
    FROM prd_process_card c
    LEFT JOIN inv_material_label l ON c.main_label_id = l.id
    ${whereClause}
    ORDER BY c.create_time DESC`,
    `SELECT COUNT(*) as total FROM prd_process_card c ${whereClause}`,
    params,
    { page, pageSize }
  );

  return successResponse(result);
}, '获取流程卡列表失败');

// POST - 创建流程卡
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'workOrderId',
    'workOrderNo',
    'mainLabelId',
    'mainLabelNo',
    'createUserId',
    'createUserName',
  ]);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  const {
    workOrderId,
    workOrderNo,
    productCode,
    productName,
    materialSpec,
    workOrderDate,
    planQty,
    mainLabelId,
    mainLabelNo,
    createUserId,
    createUserName,
  } = body;

  // 检查主材标签是否已被使用
  const mainLabel = await queryOne<any>(
    `SELECT is_used, is_main_material FROM inv_material_label WHERE id = ? AND deleted = 0`,
    [mainLabelId]
  );

  if (!mainLabel) {
    return errorResponse('主材标签不存在', 404, 404);
  }

  if (mainLabel.is_main_material !== 1) {
    return errorResponse('该标签不是母材标签，不能作为主材使用', 400, 400);
  }

  // 生成流程卡卡号
  const cardNo = generateCardNo();

  // 生成二维码内容
  const qrCode = JSON.stringify({
    ID: cardNo,
    TYPE: '4', // 4-流程卡
    GDDH: workOrderNo,
    CPLH: productCode,
    WLDH: mainLabel.material_code,
    WLPH: mainLabel.batch_no,
  });

  // 开始事务
  const result = await transaction(async (conn) => {
    // 1. 创建流程卡
    const cardResult = await conn.execute(
      `INSERT INTO prd_process_card (
        card_no, qr_code, work_order_id, work_order_no, product_code, product_name,
        material_spec, work_order_date, plan_qty, main_label_id, main_label_no,
        burdening_status, lock_status, create_user_id, create_user_name, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unlocked', ?, ?, 0)`,
      [
        cardNo, qrCode, workOrderId, workOrderNo, productCode, productName,
        materialSpec, workOrderDate, planQty, mainLabelId, mainLabelNo,
        createUserId, createUserName,
      ]
    );

    const cardId = (cardResult as any).insertId;

    // 2. 更新主材标签为已使用
    await conn.execute(
      `UPDATE inv_material_label SET is_used = 1 WHERE id = ?`,
      [mainLabelId]
    );

    // 3. 添加主材到流程卡物料关联表
    await conn.execute(
      `INSERT INTO prd_process_card_material (
        card_id, card_no, label_id, label_no, material_type,
        material_code, material_name, specification, batch_no, quantity, unit
      )
      SELECT ?, ?, id, label_no, 'main', material_code, material_name, specification, batch_no, quantity, unit
      FROM inv_material_label WHERE id = ?`,
      [cardId, cardNo, mainLabelId]
    );

    return {
      cardId,
      cardNo,
      qrCode,
    };
  });

  return successResponse(result, '流程卡创建成功');
}, '创建流程卡失败');

// PUT - 更新流程卡（添加辅料、配料完成、锁住/解锁）
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.id && !body.cardNo) {
    return errorResponse('缺少流程卡ID或卡号', 400, 400);
  }

  const { id, cardNo, action, ...updateData } = body;

  // 根据action执行不同操作
  switch (action) {
    case 'addMaterial':
      return addMaterialToCard(id || cardNo, updateData);
    case 'burdening':
      return updateBurdeningStatus(id || cardNo, updateData.burdeningStatus);
    case 'lock':
      return updateLockStatus(id || cardNo, updateData.lockStatus);
    default:
      return updateCardInfo(id || cardNo, updateData);
  }
}, '更新流程卡失败');

// 添加辅料到流程卡
async function addMaterialToCard(cardIdentifier: string | number, data: any) {
  const { labelId, labelNo, createUserId, createUserName } = data;

  // 获取流程卡信息
  const card = await queryOne<any>(
    `SELECT id, card_no, lock_status FROM prd_process_card WHERE ${typeof cardIdentifier === 'number' ? 'id' : 'card_no'} = ? AND deleted = 0`,
    [cardIdentifier]
  );

  if (!card) {
    return errorResponse('流程卡不存在', 404, 404);
  }

  if (card.lock_status === 'locked') {
    return errorResponse('流程卡已锁住，不能添加辅料', 400, 400);
  }

  // 获取标签信息
  const label = await queryOne<any>(
    `SELECT material_code, material_name, specification, batch_no, quantity, unit
     FROM inv_material_label WHERE id = ? AND deleted = 0`,
    [labelId]
  );

  if (!label) {
    return errorResponse('物料标签不存在', 404, 404);
  }

  // 添加辅料关联
  await execute(
    `INSERT INTO prd_process_card_material (
      card_id, card_no, label_id, label_no, material_type,
      material_code, material_name, specification, batch_no, quantity, unit
    ) VALUES (?, ?, ?, ?, 'auxiliary', ?, ?, ?, ?, ?, ?)`,
    [
      card.id, card.card_no, labelId, labelNo,
      label.material_code, label.material_name, label.specification,
      label.batch_no, label.quantity, label.unit,
    ]
  );

  // 更新标签为已使用
  await execute(
    `UPDATE inv_material_label SET is_used = 1 WHERE id = ?`,
    [labelId]
  );

  return successResponse(null, '辅料添加成功');
}

// 更新配料状态
async function updateBurdeningStatus(cardIdentifier: string | number, status: string) {
  await execute(
    `UPDATE prd_process_card SET burdening_status = ? WHERE ${typeof cardIdentifier === 'number' ? 'id' : 'card_no'} = ?`,
    [status, cardIdentifier]
  );

  return successResponse(null, '配料状态更新成功');
}

// 更新锁住状态
async function updateLockStatus(cardIdentifier: string | number, status: string) {
  await execute(
    `UPDATE prd_process_card SET lock_status = ? WHERE ${typeof cardIdentifier === 'number' ? 'id' : 'card_no'} = ?`,
    [status, cardIdentifier]
  );

  return successResponse(null, status === 'locked' ? '流程卡已锁住' : '流程卡已解锁');
}

// 更新流程卡基本信息
async function updateCardInfo(cardIdentifier: string | number, data: any) {
  const updateFields: string[] = [];
  const params: any[] = [];

  const fields = [
    'productCode', 'productName', 'materialSpec', 'workOrderDate',
    'planQty', 'remark',
  ];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      updateFields.push(`${snakeCase(field)} = ?`);
      params.push(data[field]);
    }
  });

  if (updateFields.length === 0) {
    return errorResponse('没有要更新的字段', 400, 400);
  }

  params.push(cardIdentifier);

  await execute(
    `UPDATE prd_process_card SET ${updateFields.join(', ')} WHERE ${typeof cardIdentifier === 'number' ? 'id' : 'card_no'} = ?`,
    params
  );

  return successResponse(null, '流程卡更新成功');
}

// DELETE - 删除流程卡
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('缺少流程卡ID', 400, 400);
  }

  await execute(
    'UPDATE prd_process_card SET deleted = 1 WHERE id = ?',
    [id]
  );

  return successResponse(null, '流程卡删除成功');
}, '删除流程卡失败');

// 辅助函数：驼峰转蛇形
function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// 辅助函数：分页查询
async function queryPaginated(
  sql: string,
  countSql: string,
  params: any[],
  pagination: { page: number; pageSize: number }
) {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    const [data, countResult] = await Promise.all([
      query<any[]>(`${sql} LIMIT ${pageSize} OFFSET ${offset}`, params || []),
      queryOne<{ total: number }>(countSql, params || []),
    ]);

    return {
      list: data || [],
      pagination: {
        page,
        pageSize,
        total: countResult?.total || 0,
      },
    };
  } catch (error) {
    console.error('分页查询失败:', error);
    return {
      list: [],
      pagination: {
        page,
        pageSize,
        total: 0,
      },
    };
  }
}
