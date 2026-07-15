import { NextRequest } from 'next/server';
import { execute, query, queryOne, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getSamplePrefix, generateDocNo } from '@/lib/global-config';

// 标准卡类型定义
export type StandardCardType = 'color' | 'process' | 'quality' | 'comprehensive';

// 标准卡数据接口（基于实际表结构）
export interface StandardCard {
  id?: number;
  card_no: string;
  version?: string;
  status?: number;
  type?: StandardCardType;
  customer_id?: number;
  customer_name?: string;
  customer_code?: string;
  product_name?: string;
  date?: string;
  document_code?: string;
  finished_size?: string;
  tolerance?: string;
  material_name?: string;
  material_type?: string;
  layout_type?: string;
  spacing?: string;
  spacing_value?: string;
  sheet_width?: string;
  sheet_length?: string;
  core_type?: string;
  paper_direction?: string;
  roll_width?: string;
  paper_edge?: string;
  standard_usage?: string;
  jump_distance?: string;
  process_flow1?: string;
  process_flow2?: string;
  print_type?: string;
  first_jump_distance?: string;
  sequences?: string | Loose[];
  film_manufacturer?: string;
  film_code?: string;
  film_size?: string;
  process_method?: string;
  stamping_method?: string;
  mold_code?: string;
  back_mold_code?: string;
  layout_method?: string;
  layout_way?: string;
  jump_distance2?: string;
  mylar_material?: string;
  mylar_specs?: string;
  mylar_layout?: string;
  mylar_jump?: string;
  adhesive_type?: string;
  adhesive_manufacturer?: string;
  adhesive_code?: string;
  adhesive_size?: string;
  adhesive_specs?: string;
  dashed_knife?: number;
  slice_per_row?: string;
  slice_per_roll?: string;
  slice_per_bundle?: string;
  slice_per_bag?: string;
  slice_per_box?: string;
  packing_qty?: string;
  back_knife_mold?: string;
  back_mylar_mold?: string;
  release_paper_code?: string;
  release_paper_type?: string;
  release_paper_category?: string;
  release_paper_specs?: string;
  padding_material?: string;
  packing_material?: string;
  special_color?: string;
  color_formula?: string;
  file_path?: string;
  sample_info?: string;
  notes?: string;
  glue_type?: string;
  packing_type?: string;
  mold_type?: string;
  etch_mold?: string;
  storage_location?: string;
  extra_field?: string;
  creator?: string;
  reviewer?: string;
  factory_manager?: string;
  quality_manager?: string;
  sales?: string;
  approver?: string;
  creator_id?: number;
  reviewer_id?: number;
  create_time?: string;
  update_time?: string;
}

// 工艺参数标准项接口
export interface ProcessStandardItem {
  id?: number;
  standard_card_id?: number;
  parameter_name: string;
  standard_value: string;
  tolerance?: string;
  unit?: string;
  category?: string;
  sort_order?: number;
}

// 颜色标准项接口
export interface ColorStandardItem {
  id?: number;
  standard_card_id?: number;
  color_name: string;
  color_code?: string;
  cmyk_values?: string;
  lab_values?: string;
  density?: string;
  dot_gain?: string;
  overprint?: string;
  sort_order?: number;
}

// 质量标准项接口
export interface QualityStandardItem {
  id?: number;
  standard_card_id?: number;
  inspection_item: string;
  standard_value: string;
  tolerance?: string;
  unit?: string;
  inspection_method?: string;
  sort_order?: number;
}

// 列表查询字段（基础字段）
const LIST_FIELDS = `
  id, card_no, customer_name, customer_code, product_name, version, status,
  print_type, material_type, glue_type, packing_type, mold_type,
  finished_size, tolerance, material_name, layout_type,
  date, document_code, creator, create_time, update_time
`;

// GET - 获取标准卡列表或单个标准卡
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
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

    // 解析sequences字段为JSON对象（如果是字符串）
    const cardAny = card as Loose;
    if (cardAny.sequences && typeof cardAny.sequences === 'string') {
      try {
        cardAny.sequences = JSON.parse(cardAny.sequences);
      } catch {
        // 保持原样
      }
    }

    return successResponse(card);
  }

  // 构建查询条件
  let sql = `SELECT ${LIST_FIELDS} FROM prd_standard_card WHERE deleted = 0`;
  let countSql = 'SELECT COUNT(*) as total FROM prd_standard_card WHERE deleted = 0';
  const values: Loose[] = [];

  if (status && status !== 'all') {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    values.push(parseInt(status));
  }

  if (keyword) {
    sql += ' AND (card_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)';
    countSql += ' AND (card_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)';
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword);
  }

  sql += ' ORDER BY create_time DESC';

  // 使用分页查询工具
  const result = await queryPaginated<StandardCard>(sql, countSql, values, {
    page,
    pageSize,
  });

  return paginatedResponse(result.data, result.pagination);
});

// POST - 创建标准卡
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();

    // 生成标准卡编号
    const cardNo = body.card_no || generateDocNo(getSamplePrefix());

    // 检查标准卡编号是否已存在
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM prd_standard_card WHERE card_no = ? AND deleted = 0',
      [cardNo]
    );

    if (existing) {
      return errorResponse('标准卡编号已存在', 409, 409);
    }

    // 处理sequences字段
    let sequencesToStore = body.sequences;
    if (
      typeof sequencesToStore !== 'string' &&
      sequencesToStore !== null &&
      sequencesToStore !== undefined
    ) {
      sequencesToStore = JSON.stringify(sequencesToStore);
    }

    // 构建插入数据
    const insertData: Loose = {
      card_no: cardNo,
      version: body.version || '1.0',
      status: body.status || 1,
      customer_id: body.customer_id || null,
      customer_name: body.customer_name || body.customer || '',
      customer_code: body.customer_code || '',
      product_name: body.product_name || '',
      date: body.date || null,
      document_code: body.document_code || '',
      finished_size: body.finished_size || '',
      tolerance: body.tolerance || '',
      material_name: body.material_name || '',
      material_type: body.material_type || '',
      layout_type: body.layout_type || '',
      spacing: body.spacing || '',
      spacing_value: body.spacing_value || '',
      sheet_width: body.sheet_width || body.sheetSpecs?.width || '',
      sheet_length: body.sheet_length || body.sheetSpecs?.length || '',
      core_type: body.core_type || '',
      paper_direction: body.paper_direction || '',
      roll_width: body.roll_width || '',
      paper_edge: body.paper_edge || '',
      standard_usage: body.standard_usage || '',
      jump_distance: body.jump_distance || '',
      process_flow1: body.process_flow1 || '',
      process_flow2: body.process_flow2 || '',
      print_type: body.print_type || '',
      first_jump_distance: body.first_jump_distance || '',
      sequences: sequencesToStore || null,
      film_manufacturer: body.film_manufacturer || '',
      film_code: body.film_code || '',
      film_size: body.film_size || '',
      process_method: body.process_method || '',
      stamping_method: body.stamping_method || '',
      mold_code: body.mold_code || '',
      back_mold_code: body.back_mold_code || '',
      layout_method: body.layout_method || '',
      layout_way: body.layout_way || '',
      jump_distance2: body.jump_distance2 || '',
      mylar_material: body.mylar_material || '',
      mylar_specs: body.mylar_specs || '',
      mylar_layout: body.mylar_layout || '',
      mylar_jump: body.mylar_jump || '',
      adhesive_type: body.adhesive_type || '',
      adhesive_manufacturer: body.adhesive_manufacturer || '',
      adhesive_code: body.adhesive_code || '',
      adhesive_size: body.adhesive_size || '',
      adhesive_specs: body.adhesive_specs || '',
      dashed_knife: body.dashed_knife !== undefined ? (body.dashed_knife ? 1 : 0) : 0,
      slice_per_row: body.slice_per_row || '',
      slice_per_roll: body.slice_per_roll || '',
      slice_per_bundle: body.slice_per_bundle || '',
      slice_per_bag: body.slice_per_bag || '',
      slice_per_box: body.slice_per_box || '',
      packing_qty: body.packing_qty || '',
      back_knife_mold: body.back_knife_mold || '',
      back_mylar_mold: body.back_mylar_mold || '',
      release_paper_code: body.release_paper_code || '',
      release_paper_type: body.release_paper_type || '',
      release_paper_category: body.release_paper_category || '',
      release_paper_specs: body.release_paper_specs || '',
      padding_material: body.padding_material || '',
      packing_material: body.packing_material || '',
      special_color: body.special_color || '',
      color_formula: body.color_formula || '',
      file_path: body.file_path || '',
      sample_info: body.sample_info || '',
      notes: body.notes || '',
      glue_type: body.glue_type || '',
      packing_type: body.packing_type || '',
      mold_type: body.mold_type || '',
      etch_mold: body.etch_mold || '',
      storage_location: body.storage_location || '',
      extra_field: body.extra_field || '',
      creator: body.creator || '',
      reviewer: body.reviewer || '',
      factory_manager: body.factory_manager || '',
      quality_manager: body.quality_manager || '',
      sales: body.sales || '',
      approver: body.approver || '',
      create_by: body.creator_id || null,
      reviewer_id: body.reviewer_id || null,
      deleted: 0,
    };

    // 动态构建SQL和参数
    const fields = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = fields.map(() => '?').join(', ');

    const result = await execute(
      `INSERT INTO prd_standard_card (${fields.join(', ')}) VALUES (${placeholders})`,
      values as import('@/lib/db').SqlValue[]
    );

    return successResponse({ id: result.insertId, card_no: cardNo }, '标准卡创建成功');
  },
  { errorMessage: '创建标准卡失败' }
);

// PUT - 更新标准卡
export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return commonErrors.badRequest('缺少标准卡ID');
    }

    // 检查标准卡是否存在
    const existingCard = await queryOne<{ id: number }>(
      'SELECT id FROM prd_standard_card WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!existingCard) {
      return commonErrors.notFound('标准卡不存在');
    }

    // 检查标准卡编号唯一性（排除当前记录自身）
    if (body.card_no !== undefined && body.card_no !== '') {
      const cardNoToCheck = body.card_no;
      const duplicate = await queryOne<{ id: number }>(
        'SELECT id FROM prd_standard_card WHERE card_no = ? AND deleted = 0 AND id != ?',
        [cardNoToCheck, id]
      );
      if (duplicate) {
        return errorResponse('标准卡编号已存在', 409, 409);
      }
    }

    // 处理sequences字段
    let sequencesToStore = body.sequences;
    if (
      typeof sequencesToStore !== 'string' &&
      sequencesToStore !== null &&
      sequencesToStore !== undefined
    ) {
      sequencesToStore = JSON.stringify(sequencesToStore);
    }

    // 构建更新数据（过滤掉undefined值）
    const updateData: Loose = {};
    const fieldMappings: Record<string, string> = {
      card_no: 'card_no',
      version: 'version',
      status: 'status',
      customer_id: 'customer_id',
      customer_name: 'customer_name',
      customer_code: 'customer_code',
      product_name: 'product_name',
      date: 'date',
      document_code: 'document_code',
      finished_size: 'finished_size',
      tolerance: 'tolerance',
      material_name: 'material_name',
      material_type: 'material_type',
      layout_type: 'layout_type',
      spacing: 'spacing',
      spacing_value: 'spacing_value',
      sheet_width: 'sheet_width',
      sheet_length: 'sheet_length',
      core_type: 'core_type',
      paper_direction: 'paper_direction',
      roll_width: 'roll_width',
      paper_edge: 'paper_edge',
      standard_usage: 'standard_usage',
      jump_distance: 'jump_distance',
      process_flow1: 'process_flow1',
      process_flow2: 'process_flow2',
      print_type: 'print_type',
      first_jump_distance: 'first_jump_distance',
      sequences: 'sequences',
      film_manufacturer: 'film_manufacturer',
      film_code: 'film_code',
      film_size: 'film_size',
      process_method: 'process_method',
      stamping_method: 'stamping_method',
      mold_code: 'mold_code',
      back_mold_code: 'back_mold_code',
      layout_method: 'layout_method',
      layout_way: 'layout_way',
      jump_distance2: 'jump_distance2',
      mylar_material: 'mylar_material',
      mylar_specs: 'mylar_specs',
      mylar_layout: 'mylar_layout',
      mylar_jump: 'mylar_jump',
      adhesive_type: 'adhesive_type',
      adhesive_manufacturer: 'adhesive_manufacturer',
      adhesive_code: 'adhesive_code',
      adhesive_size: 'adhesive_size',
      adhesive_specs: 'adhesive_specs',
      dashed_knife: 'dashed_knife',
      slice_per_row: 'slice_per_row',
      slice_per_roll: 'slice_per_roll',
      slice_per_bundle: 'slice_per_bundle',
      slice_per_bag: 'slice_per_bag',
      slice_per_box: 'slice_per_box',
      packing_qty: 'packing_qty',
      back_knife_mold: 'back_knife_mold',
      back_mylar_mold: 'back_mylar_mold',
      release_paper_code: 'release_paper_code',
      release_paper_type: 'release_paper_type',
      release_paper_category: 'release_paper_category',
      release_paper_specs: 'release_paper_specs',
      padding_material: 'padding_material',
      packing_material: 'packing_material',
      special_color: 'special_color',
      color_formula: 'color_formula',
      file_path: 'file_path',
      sample_info: 'sample_info',
      notes: 'notes',
      glue_type: 'glue_type',
      packing_type: 'packing_type',
      mold_type: 'mold_type',
      etch_mold: 'etch_mold',
      storage_location: 'storage_location',
      extra_field: 'extra_field',
      creator: 'creator',
      reviewer: 'reviewer',
      factory_manager: 'factory_manager',
      quality_manager: 'quality_manager',
      sales: 'sales',
      approver: 'approver',
      creator_id: 'create_by',
      reviewer_id: 'reviewer_id',
    };

    // 处理传入的body字段
    for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
      if (body[sourceField] !== undefined) {
        if (sourceField === 'sequences') {
          let val = body[sourceField];
          if (typeof val !== 'string' && val !== null && val !== undefined) {
            val = JSON.stringify(val);
          }
          updateData[targetField] = val;
        } else if (sourceField === 'dashed_knife') {
          updateData[targetField] = body[sourceField] ? 1 : 0;
        } else {
          updateData[targetField] = body[sourceField];
        }
      }
    }

    // 特别处理sheetSpecs
    if (body.sheetSpecs) {
      if (body.sheetSpecs.width !== undefined) {
        updateData.sheet_width = body.sheetSpecs.width;
      }
      if (body.sheetSpecs.length !== undefined) {
        updateData.sheet_length = body.sheetSpecs.length;
      }
    }

    // 处理兼容字段
    if (body.customer !== undefined) {
      updateData.customer_name = body.customer;
    }

    // 更新时间
    updateData.update_time = new Date();

    // 防御：查询当前记录完整数据，防止前端遗漏字段导致已有数据被空值覆盖
    const currentCard = await queryOne<Record<string, unknown>>(
      'SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0',
      [id]
    );
    if (currentCard) {
      for (const field of Object.keys(updateData)) {
        const newVal = updateData[field];
        const oldVal = currentCard[field];
        // 如果新值为空字符串/null 但原值有数据，跳过更新（防止误清空）
        if (
          (newVal === '' || newVal === null) &&
          oldVal !== null &&
          oldVal !== '' &&
          oldVal !== undefined
        ) {
          delete updateData[field];
        }
      }
    }

    // 构建SQL
    if (Object.keys(updateData).length === 0) {
      return commonErrors.badRequest('没有要更新的字段');
    }

    const updateFields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = updateFields.map((field) => `${field} = ?`).join(', ');

    // 添加ID到参数末尾
    values.push(id);

    await execute(
      `UPDATE prd_standard_card SET ${setClause} WHERE id = ? AND deleted = 0`,
      values as import('@/lib/db').SqlValue[]
    );

    return successResponse(null, '标准卡更新成功');
  },
  { logTitle: '更新标准卡', logType: 'business' }
);

// DELETE - 删除标准卡（软删除，支持批量）
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest('缺少标准卡ID');
    }

    // 支持批量删除：id=1,2,3
    const ids = id.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n > 0);

    if (ids.length === 0) {
      return commonErrors.badRequest('缺少有效的标准卡ID');
    }

    if (ids.length === 1) {
      // 单条删除
      const cardId = ids[0];
      const existingCard = await queryOne<{ id: number }>(
        'SELECT id FROM prd_standard_card WHERE id = ? AND deleted = 0',
        [cardId]
      );
      if (!existingCard) {
        return commonErrors.notFound('标准卡不存在');
      }
      await execute('UPDATE prd_standard_card SET deleted = 1 WHERE id = ?', [cardId]);
      return successResponse(null, '标准卡删除成功');
    }

    // 批量删除
    const placeholders = ids.map(() => '?').join(', ');
    const existingRows = await query(
      `SELECT id FROM prd_standard_card WHERE id IN (${placeholders}) AND deleted = 0`,
      ids as unknown as import('@/lib/db').SqlValue[]
    );
    if (!existingRows || existingRows.length === 0) {
      return commonErrors.notFound('未找到可删除的标准卡');
    }
    await execute(
      `UPDATE prd_standard_card SET deleted = 1 WHERE id IN (${placeholders})`,
      ids as unknown as import('@/lib/db').SqlValue[]
    );
    return successResponse(
      { deletedCount: existingRows.length },
      `成功删除 ${existingRows.length} 条标准卡`
    );
  },
  { logTitle: '删除标准卡', logType: 'business' }
);
