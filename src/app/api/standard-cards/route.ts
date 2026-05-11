import { NextRequest } from 'next/server';
import { query, execute, queryOne, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';
import { getSamplePrefix, generateDocNo } from '@/lib/global-config';

// 标准卡类型定义（符合设计文档 06-标准卡管理设计.md 第3节）
export type StandardCardType = 'color' | 'process' | 'quality' | 'comprehensive';

// 标准卡状态定义（符合设计文档 5.1 节）
export type StandardCardStatus = 'draft' | 'pending' | 'effective' | 'expired';

// 标准卡数据接口（符合设计文档 5.1 节 standard_cards 表结构）
interface StandardCard {
  id?: number;
  card_no: string;                    // 格式：SC+类型代码+YYYYMMDD+3位序号
  name: string;                       // 标准卡名称
  type: StandardCardType;             // 类型：color/process/quality/comprehensive
  version: string;                    // 版本号，格式：V1.0
  material_id?: number;               // 适用产品 ID
  status: number;                     // 状态：1=草稿 2=待审核 3=已生效 4=已失效
  effective_date?: string;            // 生效日期
  expiry_date?: string;               // 失效日期
  create_user?: number;               // 创建人
  audit_user?: number;                // 审核人
  remark?: string;                    // 备注

  // 扩展字段（兼容现有丝网印刷行业特性）
  customer_name?: string;
  customer_code?: string;
  product_name?: string;
  date?: string;

  // 工艺参数（process 类型专用）
  finished_size?: string;
  tolerance?: string;
  material_name?: string;
  material_type?: string;
  layout_type?: string;
  print_type?: string;
  process_method?: string;
  glue_type?: string;
  packing_type?: string;

  create_time?: string;
  update_time?: string;
}

// 颜色标准卡明细接口（符合设计文档 5.2 节 color_standard_items）
interface ColorStandardItem {
  id?: number;
  standard_card_id: number;
  color_name: string;                 // 颜色名称
  pantone_code?: string;              // 潘通色号
  cmyk_value?: string;                // CMYK 值，格式：C,M,Y,K
  rgb_value?: string;                 // RGB 值，格式：R,G,B
  color_sample_image?: string;        // 色样图片 URL
  tolerance?: string;                 // 颜色公差范围
}

// 工艺标准卡明细接口（符合设计文档 5.3 节 process_standard_items）
interface ProcessStandardItem {
  id?: number;
  standard_card_id: number;
  process_id?: number;                // 关联工序 ID
  parameter_name: string;             // 参数名称
  standard_value: string;             // 标准值
  tolerance?: string;                 // 公差范围
  unit?: string;                      // 单位
  description?: string;               // 参数说明
}

// 质量标准卡明细接口（符合设计文档 5.4 节 quality_standard_items）
interface QualityStandardItem {
  id?: number;
  standard_card_id: number;
  inspection_item: string;            // 检验项目
  standard_value: string;             // 标准值
  tolerance?: string;                 // 公差范围
  inspection_method?: string;         // 检验方法
  is_key?: boolean;                   // 是否关键项目
  defect_level?: string;              // 缺陷等级：致命、严重、一般、轻微
}

// 标准卡类型代码映射（符合设计文档 5.1 节）
const TYPE_CODE_MAP: Record<StandardCardType, string> = {
  color: 'C',           // 颜色标准卡
  process: 'P',         // 工艺标准卡
  quality: 'Q',         // 质量标准卡
  comprehensive: 'X',   // 综合标准卡
};

// 生成标准卡编号（符合设计文档格式：SC+类型代码+YYYYMMDD+3位序号）
function generateCardNo(type: StandardCardType): string {
  return generateDocNo(getSamplePrefix());
}

// 列表查询字段（精简，包含新增的核心字段）
const LIST_FIELDS = `
  id, card_no, name, type, version, material_id, status,
  effective_date, expiry_date, create_user, audit_user,
  customer_name, product_name, print_type, process_method,
  remark, create_time, update_time
`;

// GET - 获取标准卡列表或单个标准卡
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 查询单个标准卡
  if (id) {
    const card = await queryOne<StandardCard>(
      `SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0`,
      [parseInt(id)]
    );

    if (!card) {
      return commonErrors.notFound('标准卡不存在');
    }

    // 解析sequences字段
    if (card.sequences && typeof card.sequences === 'string') {
      try {
        card.sequences = JSON.parse(card.sequences);
      } catch {
        // 保持原样
      }
    }

    return successResponse(card);
  }

  // 构建查询条件
  let sql = `SELECT ${LIST_FIELDS} FROM prd_standard_card WHERE deleted = 0`;
  let countSql = 'SELECT COUNT(*) as total FROM prd_standard_card WHERE deleted = 0';
  const values: any[] = [];

  if (status && status !== 'all') {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    values.push(parseInt(status));
  }

  if (keyword) {
    sql += ' AND (card_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)';
    countSql += ' AND (card_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)';
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
  }

  sql += ' ORDER BY create_time DESC';

  // 使用分页查询工具
  const result = await queryPaginated<StandardCard>(sql, countSql, values, {
    page,
    pageSize,
  });

  return paginatedResponse(result.data, result.pagination);
}, '获取标准卡列表失败');

// POST - 创建标准卡（符合设计文档 4.1 节创建流程）
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: StandardCard = await request.json();

  // 验证必填字段（符合设计文档要求）
  const validation = validateRequestBody(body, ['name', 'type']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 验证 type 字段值
  const validTypes: StandardCardType[] = ['color', 'process', 'quality', 'comprehensive'];
  if (!validTypes.includes(body.type)) {
    return errorResponse(
      `无效的标准卡类型，必须是: ${validTypes.join(', ')}`,
      400,
      400
    );
  }

  // 生成标准卡编号（根据类型自动生成）
  const cardNo = body.card_no || generateCardNo(body.type);

  // 检查标准卡编号是否已存在
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM prd_standard_card WHERE card_no = ? AND deleted = 0',
    [cardNo]
  );

  if (existing) {
    return errorResponse('标准卡编号已存在', 409, 409);
  }

  // 插入标准卡主表（符合设计文档 5.1 节字段结构）
  const result = await execute(
    `INSERT INTO prd_standard_card (
      card_no, name, type, version, material_id, status,
      effective_date, expiry_date, create_user, audit_user,
      customer_name, customer_code, product_name,
      finished_size, tolerance, material_name, material_type,
      layout_type, print_type, process_method, glue_type, packing_type,
      remark, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      cardNo,
      body.name,
      body.type,
      body.version || 'V1.0',
      body.material_id || null,
      body.status || 1,                    // 默认草稿状态
      body.effective_date || null,
      body.expiry_date || null,
      body.create_user || null,
      body.audit_user || null,
      body.customer_name || '',
      body.customer_code || '',
      body.product_name || '',
      body.finished_size || '',
      body.tolerance || '',
      body.material_name || '',
      body.material_type || '',
      body.layout_type || '',
      body.print_type || '',
      body.process_method || '',
      body.glue_type || '',
      body.packing_type || '',
      body.remark || '',
    ]
  );

  const standardCardId = result.insertId;

  // 如果有明细数据，插入对应的明细表
  if (body.items && Array.isArray(body.items) && body.items.length > 0) {
    await insertStandardCardItems(standardCardId, body.type, body.items);
  }

  return successResponse(
    { id: standardCardId, card_no: cardNo },
    '标准卡创建成功'
  );
}, '创建标准卡失败');

// 插入标准卡明细数据（根据类型插入不同表）
async function insertStandardCardItems(
  standardCardId: number,
  type: StandardCardType,
  items: any[]
): Promise<void> {
  switch (type) {
    case 'color':
      // 插入颜色标准卡明细（color_standard_items 表）
      for (const item of items) {
        await execute(
          `INSERT INTO color_standard_items (
            standard_card_id, color_name, pantone_code, cmyk_value,
            rgb_value, color_sample_image, tolerance
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            standardCardId,
            item.color_name,
            item.pantone_code || null,
            item.cmyk_value || null,
            item.rgb_value || null,
            item.color_sample_image || null,
            item.tolerance || null,
          ]
        );
      }
      break;

    case 'process':
      // 插入工艺标准卡明细（process_standard_items 表）
      for (const item of items) {
        await execute(
          `INSERT INTO process_standard_items (
            standard_card_id, process_id, parameter_name, standard_value,
            tolerance, unit, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            standardCardId,
            item.process_id || null,
            item.parameter_name,
            item.standard_value,
            item.tolerance || null,
            item.unit || null,
            item.description || null,
          ]
        );
      }
      break;

    case 'quality':
      // 插入质量标准卡明细（quality_standard_items 表）
      for (const item of items) {
        await execute(
          `INSERT INTO quality_standard_items (
            standard_card_id, inspection_item, standard_value, tolerance,
            inspection_method, is_key, defect_level
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            standardCardId,
            item.inspection_item,
            item.standard_value,
            item.tolerance || null,
            item.inspection_method || null,
            item.is_key ? 1 : 0,
            item.defect_level || null,
          ]
        );
      }
      break;

    case 'comprehensive':
      // 综合标准卡：同时插入颜色、工艺、质量三个明细表
      for (const item of items) {
        if (item.item_type === 'color') {
          await execute(
            `INSERT INTO color_standard_items (
              standard_card_id, color_name, pantone_code, cmyk_value,
              rgb_value, color_sample_image, tolerance
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              standardCardId,
              item.color_name,
              item.pantone_code || null,
              item.cmyk_value || null,
              item.rgb_value || null,
              item.color_sample_image || null,
              item.tolerance || null,
            ]
          );
        } else if (item.item_type === 'process') {
          await execute(
            `INSERT INTO process_standard_items (
              standard_card_id, process_id, parameter_name, standard_value,
              tolerance, unit, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              standardCardId,
              item.process_id || null,
              item.parameter_name,
              item.standard_value,
              item.tolerance || null,
              item.unit || null,
              item.description || null,
            ]
          );
        } else if (item.item_type === 'quality') {
          await execute(
            `INSERT INTO quality_standard_items (
              standard_card_id, inspection_item, standard_value, tolerance,
              inspection_method, is_key, defect_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              standardCardId,
              item.inspection_item,
              item.standard_value,
              item.tolerance || null,
              item.inspection_method || null,
              item.is_key ? 1 : 0,
              item.defect_level || null,
            ]
          );
        }
      }
      break;
  }
}

// PUT - 更新标准卡（符合设计文档 4.2 节版本更新流程）
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body: StandardCard = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('缺少标准卡ID');
  }

  // 验证必填字段
  const validation = validateRequestBody(body, ['name', 'type']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查标准卡是否存在
  const existingCard = await queryOne<{ id: number; status: number; version: string }>(
    'SELECT id, status, version FROM prd_standard_card WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!existingCard) {
    return commonErrors.notFound('标准卡不存在');
  }

  // 更新标准卡主表（符合设计文档 5.1 节字段结构）
  const result = await execute(
    `UPDATE prd_standard_card SET
      name = ?, type = ?, version = ?, material_id = ?,
      status = ?, effective_date = ?, expiry_date = ?,
      create_user = ?, audit_user = ?,
      customer_name = ?, customer_code = ?, product_name = ?,
      finished_size = ?, tolerance = ?, material_name = ?, material_type = ?,
      layout_type = ?, print_type = ?, process_method = ?,
      glue_type = ?, packing_type = ?, remark = ?
    WHERE id = ? AND deleted = 0`,
    [
      body.name,
      body.type,
      body.version || existingCard.version,
      body.material_id || null,
      body.status || existingCard.status,
      body.effective_date || null,
      body.expiry_date || null,
      body.create_user || null,
      body.audit_user || null,
      body.customer_name || '',
      body.customer_code || '',
      body.product_name || '',
      body.finished_size || '',
      body.tolerance || '',
      body.material_name || '',
      body.material_type || '',
      body.layout_type || '',
      body.print_type || '',
      body.process_method || '',
      body.glue_type || '',
      body.packing_type || '',
      body.remark || '',
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('标准卡不存在或已被删除');
  }

  // 如果有明细数据更新，先删除旧明细再插入新明细
  if (body.items && Array.isArray(body.items) && body.items.length > 0) {
    // 删除旧的明细数据
    await execute('DELETE FROM color_standard_items WHERE standard_card_id = ?', [id]);
    await execute('DELETE FROM process_standard_items WHERE standard_card_id = ?', [id]);
    await execute('DELETE FROM quality_standard_items WHERE standard_card_id = ?', [id]);

    // 插入新的明细数据
    await insertStandardCardItems(id, body.type, body.items);
  }

  return successResponse(null, '标准卡更新成功');
}, '更新标准卡失败');

// DELETE - 删除标准卡（软删除）
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('缺少标准卡ID');
  }

  const cardId = parseInt(id);

  // 检查标准卡是否存在
  const existingCard = await queryOne<{ id: number }>(
    'SELECT id FROM prd_standard_card WHERE id = ? AND deleted = 0',
    [cardId]
  );

  if (!existingCard) {
    return commonErrors.notFound('标准卡不存在');
  }

  const result = await execute(
    'UPDATE prd_standard_card SET deleted = 1 WHERE id = ?',
    [cardId]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('标准卡不存在或已被删除');
  }

  return successResponse(null, '标准卡删除成功');
}, '删除标准卡失败');

// ============================================================
// 以下为设计文档要求的核心 API 接口（第6节）
// ============================================================

// GET /api/standard-cards/by-material/{material_id} - 获取产品标准卡（6.1节）
export async function GET_byMaterial(request: NextRequest, { params }: { params: { material_id: string } }) {
  return withErrorHandler(async () => {
    const materialId = parseInt(params.material_id);

    if (isNaN(materialId)) {
      return errorResponse('无效的产品ID', 400, 400);
    }

    // 查询该产品的最新生效版本标准卡
    const card = await queryOne<StandardCard>(
      `SELECT * FROM prd_standard_card
       WHERE material_id = ? AND status = 3 AND deleted = 0
       ORDER BY version DESC LIMIT 1`,
      [materialId]
    );

    if (!card) {
      return errorResponse('未找到该产品的标准卡', 404, 404);
    }

    // 根据类型查询对应的明细数据
    let items: any[] = [];

    switch (card.type) {
      case 'color':
        items = await query<ColorStandardItem>(
          'SELECT * FROM color_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        break;
      case 'process':
        items = await query<ProcessStandardItem>(
          'SELECT * FROM process_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        break;
      case 'quality':
        items = await query<QualityStandardItem>(
          'SELECT * FROM quality_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        break;
      case 'comprehensive':
        // 综合类型：返回所有明细
        const colorItems = await query<ColorStandardItem>(
          'SELECT *, "color" as item_type FROM color_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        const processItems = await query<ProcessStandardItem>(
          'SELECT *, "process" as item_type FROM process_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        const qualityItems = await query<QualityStandardItem>(
          'SELECT *, "quality" as item_type FROM quality_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        items = [...colorItems, ...processItems, ...qualityItems];
        break;
    }

    return successResponse({
      ...card,
      items,
    });
  }, '获取产品标准卡失败')(request);
}

// GET /api/standard-cards/by-work-order/{work_order_id} - 获取工单标准卡（6.2节）
export async function GET_byWorkOrder(request: NextRequest, { params }: { params: { work_order_id: string } }) {
  return withErrorHandler(async () => {
    const workOrderId = parseInt(params.work_order_id);

    if (isNaN(workOrderId)) {
      return errorResponse('无效的工单ID', 400, 400);
    }

    // 查询工单关联的所有标准卡
    const cards = await query<StandardCard>(
      `SELECT sc.* FROM prd_standard_card sc
       LEFT JOIN prd_work_order wo ON wo.material_id = sc.material_id
       WHERE wo.id = ? AND sc.status = 3 AND sc.deleted = 0
       ORDER BY sc.type, sc.version DESC`,
      [workOrderId]
    );

    if (!cards || cards.length === 0) {
      return errorResponse('未找到该工单关联的标准卡', 404, 404);
    }

    return successResponse(cards);
  }, '获取工单标准卡失败')(request);
}

// POST /api/standard-cards/scan - 扫码查看标准卡（6.3节）
export async function POST_scan(request: NextRequest) {
  return withErrorHandler(async () => {
    const body = await request.json();
    const { qr_code } = body;

    if (!qr_code) {
      return errorResponse('缺少二维码编码', 400, 400);
    }

    // 通过二维码查找关联的工单
    const qrRecord = await queryOne<any>(
      'SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0',
      [qr_code]
    );

    if (!qrRecord) {
      return errorResponse('未找到对应的二维码记录', 404, 404);
    }

    let workOrderNo = qrRecord.work_order_no;
    let workOrderId = qrRecord.work_order_id;

    // 如果没有直接关联工单，尝试通过 ref_no 查找
    if (!workOrderNo && qrRecord.ref_no) {
      const workOrder = await queryOne<{ work_order_no: string; id: number }>(
        'SELECT work_order_no, id FROM prd_work_order WHERE order_no = ? AND deleted = 0',
        [qrRecord.ref_no]
      );
      if (workOrder) {
        workOrderNo = workOrder.work_order_no;
        workOrderId = workOrder.id;
      }
    }

    if (!workOrderId) {
      return errorResponse('该二维码未关联生产工单', 404, 404);
    }

    // 查询工单关联的标准卡
    const cards = await query<StandardCard>(
      `SELECT sc.* FROM prd_standard_card sc
       LEFT JOIN prd_work_order wo ON wo.material_id = sc.material_id
       WHERE wo.id = ? AND sc.status = 3 AND sc.deleted = 0`,
      [workOrderId]
    );

    // 为每个标准卡加载明细数据
    const cardsWithItems = [];
    for (const card of cards) {
      let items: any[] = [];

      switch (card.type) {
        case 'color':
          items = await query<ColorStandardItem>(
            'SELECT * FROM color_standard_items WHERE standard_card_id = ?',
            [card.id!]
          );
          break;
        case 'process':
          items = await query<ProcessStandardItem>(
            'SELECT * FROM process_standard_items WHERE standard_card_id = ?',
            [card.id!]
          );
          break;
        case 'quality':
          items = await query<QualityStandardItem>(
            'SELECT * FROM quality_standard_items WHERE standard_card_id = ?',
            [card.id!]
          );
          break;
      }

      cardsWithItems.push({
        ...card,
        items,
      });
    }

    return successResponse({
      work_order_no: workOrderNo,
      standard_cards: cardsWithItems,
    });
  }, '扫码查看标准卡失败')(request);
}

// POST /api/standard-cards/check-deviation - 参数偏差检测（6.5节）
export async function POST_checkDeviation(request: NextRequest) {
  return withErrorHandler(async () => {
    const body = await request.json();
    const { standard_card_id, actual_params } = body;

    if (!standard_card_id) {
      return errorResponse('缺少标准卡ID', 400, 400);
    }

    if (!actual_params || !Array.isArray(actual_params) || actual_params.length === 0) {
      return errorResponse('缺少实际参数数据', 400, 400);
    }

    // 查询标准卡信息
    const card = await queryOne<StandardCard>(
      'SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0',
      [standard_card_id]
    );

    if (!card) {
      return commonErrors.notFound('标准卡不存在');
    }

    // 查询标准卡的工艺参数明细
    const standardItems = await query<ProcessStandardItem>(
      'SELECT * FROM process_standard_items WHERE standard_card_id = ?',
      [standard_card_id]
    );

    // 构建参数映射表
    const paramMap = new Map<string, ProcessStandardItem>();
    for (const item of standardItems) {
      paramMap.set(item.parameter_name, item);
    }

    // 计算偏差
    const deviations: any[] = [];
    let hasDeviation = false;
    let warningLevel = 'success';

    for (const actual of actual_params) {
      const standard = paramMap.get(actual.parameter_name);

      if (!standard) {
        deviations.push({
          parameter_name: actual.parameter_name,
          standard_value: 'N/A',
          actual_value: actual.actual_value,
          tolerance: 'N/A',
          deviation: 'N/A',
          is_within_tolerance: false,
          message: '未找到对应的标准值',
        });
        hasDeviation = true;
        warningLevel = 'warning';
        continue;
      }

      const stdValue = parseFloat(standard.standard_value);
      const actValue = parseFloat(actual.actual_value);
      const tolerance = parseFloat(standard.tolerance?.replace(/[±%]/g, '') || '0');

      const deviation = actValue - stdValue;
      const isWithinTolerance = Math.abs(deviation) <= tolerance;

      if (!isWithinTolerance) {
        hasDeviation = true;
        if (Math.abs(deviation) > tolerance * 2) {
          warningLevel = 'error';
        } else if (warningLevel !== 'error') {
          warningLevel = 'warning';
        }
      }

      deviations.push({
        parameter_name: actual.parameter_name,
        standard_value: standard.standard_value,
        actual_value: actual.actual_value,
        tolerance: standard.tolerance,
        deviation: deviation >= 0 ? `+${deviation}` : `${deviation}`,
        is_within_tolerance: isWithinTolerance,
        unit: standard.unit,
      });
    }

    return successResponse({
      has_deviation: hasDeviation,
      deviations: deviations,
      warning_level: warningLevel,
      standard_card: {
        card_no: card.card_no,
        name: card.name,
        type: card.type,
        version: card.version,
      },
    });
  }, '参数偏差检测失败')(request);
}
