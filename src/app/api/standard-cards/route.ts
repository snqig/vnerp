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

// 标准卡数据接口（核心字段）
interface StandardCard {
  id?: number;
  card_no: string;
  customer_name: string;
  customer_code?: string;
  product_name: string;
  version?: string;
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
  sequences?: string | object;
  film_manufacturer?: string;
  film_code?: string;
  film_size?: string;
  process_method?: string;
  stamping_method?: string;
  mold_code?: string;
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
  dashed_knife?: number;
  slice_per_row?: string;
  slice_per_roll?: string;
  slice_per_bundle?: string;
  slice_per_bag?: string;
  slice_per_box?: string;
  back_knife_mold?: string;
  back_mylar_mold?: string;
  release_paper_code?: string;
  release_paper_type?: string;
  release_paper_specs?: string;
  padding_material?: string;
  packing_material?: string;
  glue_type?: string;
  packing_type?: string;
  special_color?: string;
  color_formula?: string;
  file_path?: string;
  sample_info?: string;
  notes?: string;
  creator?: string;
  reviewer?: string;
  factory_manager?: string;
  quality_manager?: string;
  sales?: string;
  approver?: string;
  status?: number;
  create_time?: string;
  update_time?: string;
}

// 列表查询字段（精简）
const LIST_FIELDS = `
  id, card_no, customer_name, customer_code, product_name,
  version, date, material_name, print_type, process_method,
  status, create_time
`;

// 所有字段
const ALL_FIELDS = `
  card_no, customer_name, customer_code, product_name, version, date,
  document_code, finished_size, tolerance, material_name, material_type,
  layout_type, spacing, spacing_value, sheet_width, sheet_length,
  core_type, paper_direction, roll_width, paper_edge, standard_usage,
  jump_distance, process_flow1, process_flow2, print_type,
  first_jump_distance, sequences, film_manufacturer, film_code, film_size,
  process_method, stamping_method, mold_code, layout_method, layout_way,
  jump_distance2, mylar_material, mylar_specs, mylar_layout, mylar_jump,
  adhesive_type, adhesive_manufacturer, adhesive_code, adhesive_size,
  dashed_knife, slice_per_row, slice_per_roll, slice_per_bundle,
  slice_per_bag, slice_per_box, back_knife_mold, back_mylar_mold,
  release_paper_code, release_paper_type, release_paper_specs,
  padding_material, packing_material, glue_type, packing_type,
  special_color, color_formula, file_path, sample_info, notes,
  creator, reviewer, factory_manager, quality_manager, sales, approver,
  status
`;

// 构建查询条件
function buildQueryConditions(params: {
  status?: string;
  keyword?: string;
}): { sql: string; countSql: string; values: any[] } {
  let sql = `SELECT ${LIST_FIELDS} FROM prd_standard_card WHERE deleted = 0`;
  let countSql = 'SELECT COUNT(*) as total FROM prd_standard_card WHERE deleted = 0';
  const values: any[] = [];

  if (params.status && params.status !== 'all') {
    const condition = ' AND status = ?';
    sql += condition;
    countSql += condition;
    values.push(parseInt(params.status));
  }

  if (params.keyword) {
    const condition = ' AND (card_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)';
    sql += condition;
    countSql += condition;
    const likeKeyword = `%${params.keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword);
  }

  sql += ' ORDER BY create_time DESC';

  return { sql, countSql, values };
}

// 生成标准卡编号
function generateCardNo(): string {
  return `SC${Date.now()}`;
}

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
  const { sql, countSql, values } = buildQueryConditions({
    status: status ?? undefined,
    keyword: keyword ?? undefined,
  });

  // 使用分页查询工具
  const result = await queryPaginated<StandardCard>(sql, countSql, values, {
    page,
    pageSize,
  });

  return paginatedResponse(result.data, result.pagination);
}, '获取标准卡列表失败');

// POST - 创建标准卡
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body: StandardCard = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, ['customer_name', 'product_name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  const cardNo = body.card_no || generateCardNo();

  // 检查标准卡编号是否已存在
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM prd_standard_card WHERE card_no = ? AND deleted = 0',
    [cardNo]
  );

  if (existing) {
    return errorResponse('标准卡编号已存在', 409, 409);
  }

  const sequences =
    typeof body.sequences === 'object'
      ? JSON.stringify(body.sequences)
      : body.sequences;

  const result = await execute(
    `INSERT INTO prd_standard_card (
      ${ALL_FIELDS}, deleted
    ) VALUES (${Array(71).fill('?').join(', ')}, 0)`,
    [
      cardNo,
      body.customer_name,
      body.customer_code ?? '',
      body.product_name,
      body.version ?? '',
      body.date ?? new Date().toISOString().split('T')[0],
      body.document_code ?? '',
      body.finished_size ?? '',
      body.tolerance ?? '',
      body.material_name ?? '',
      body.material_type ?? '',
      body.layout_type ?? '',
      body.spacing ?? '',
      body.spacing_value ?? '',
      body.sheet_width ?? '',
      body.sheet_length ?? '',
      body.core_type ?? '',
      body.paper_direction ?? '',
      body.roll_width ?? '',
      body.paper_edge ?? '',
      body.standard_usage ?? '',
      body.jump_distance ?? '',
      body.process_flow1 ?? '',
      body.process_flow2 ?? '',
      body.print_type ?? '',
      body.first_jump_distance ?? '',
      sequences ?? null,
      body.film_manufacturer ?? '',
      body.film_code ?? '',
      body.film_size ?? '',
      body.process_method ?? '',
      body.stamping_method ?? '',
      body.mold_code ?? '',
      body.layout_method ?? '',
      body.layout_way ?? '',
      body.jump_distance2 ?? '',
      body.mylar_material ?? '',
      body.mylar_specs ?? '',
      body.mylar_layout ?? '',
      body.mylar_jump ?? '',
      body.adhesive_type ?? '',
      body.adhesive_manufacturer ?? '',
      body.adhesive_code ?? '',
      body.adhesive_size ?? '',
      body.dashed_knife ?? 0,
      body.slice_per_row ?? '',
      body.slice_per_roll ?? '',
      body.slice_per_bundle ?? '',
      body.slice_per_bag ?? '',
      body.slice_per_box ?? '',
      body.back_knife_mold ?? '',
      body.back_mylar_mold ?? '',
      body.release_paper_code ?? '',
      body.release_paper_type ?? '',
      body.release_paper_specs ?? '',
      body.padding_material ?? '',
      body.packing_material ?? '',
      body.glue_type ?? '',
      body.packing_type ?? '',
      body.special_color ?? '',
      body.color_formula ?? '',
      body.file_path ?? '',
      body.sample_info ?? '',
      body.notes ?? '',
      body.creator ?? '',
      body.reviewer ?? '',
      body.factory_manager ?? '',
      body.quality_manager ?? '',
      body.sales ?? '',
      body.approver ?? '',
      body.status ?? 1,
    ]
  );

  return successResponse(
    { id: result.insertId, card_no: cardNo },
    '标准卡创建成功'
  );
}, '创建标准卡失败');

// PUT - 更新标准卡
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body: StandardCard = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('缺少标准卡ID');
  }

  // 验证必填字段
  const validation = validateRequestBody(body, ['customer_name', 'product_name']);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 检查标准卡是否存在
  const existingCard = await queryOne<{ id: number }>(
    'SELECT id FROM prd_standard_card WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!existingCard) {
    return commonErrors.notFound('标准卡不存在');
  }

  const sequences =
    typeof body.sequences === 'object'
      ? JSON.stringify(body.sequences)
      : body.sequences;

  const result = await execute(
    `UPDATE prd_standard_card SET
      customer_name = ?, customer_code = ?, product_name = ?, version = ?, date = ?,
      document_code = ?, finished_size = ?, tolerance = ?, material_name = ?, material_type = ?,
      layout_type = ?, spacing = ?, spacing_value = ?, sheet_width = ?, sheet_length = ?,
      core_type = ?, paper_direction = ?, roll_width = ?, paper_edge = ?, standard_usage = ?,
      jump_distance = ?, process_flow1 = ?, process_flow2 = ?, print_type = ?,
      first_jump_distance = ?, sequences = ?, film_manufacturer = ?, film_code = ?, film_size = ?,
      process_method = ?, stamping_method = ?, mold_code = ?, layout_method = ?, layout_way = ?,
      jump_distance2 = ?, mylar_material = ?, mylar_specs = ?, mylar_layout = ?, mylar_jump = ?,
      adhesive_type = ?, adhesive_manufacturer = ?, adhesive_code = ?, adhesive_size = ?,
      dashed_knife = ?, slice_per_row = ?, slice_per_roll = ?, slice_per_bundle = ?,
      slice_per_bag = ?, slice_per_box = ?, back_knife_mold = ?, back_mylar_mold = ?,
      release_paper_code = ?, release_paper_type = ?, release_paper_specs = ?,
      padding_material = ?, packing_material = ?, glue_type = ?, packing_type = ?,
      special_color = ?, color_formula = ?, file_path = ?, sample_info = ?, notes = ?,
      creator = ?, reviewer = ?, factory_manager = ?, quality_manager = ?, sales = ?, approver = ?,
      status = ?
    WHERE id = ? AND deleted = 0`,
    [
      body.customer_name,
      body.customer_code ?? '',
      body.product_name,
      body.version ?? '',
      body.date ?? new Date().toISOString().split('T')[0],
      body.document_code ?? '',
      body.finished_size ?? '',
      body.tolerance ?? '',
      body.material_name ?? '',
      body.material_type ?? '',
      body.layout_type ?? '',
      body.spacing ?? '',
      body.spacing_value ?? '',
      body.sheet_width ?? '',
      body.sheet_length ?? '',
      body.core_type ?? '',
      body.paper_direction ?? '',
      body.roll_width ?? '',
      body.paper_edge ?? '',
      body.standard_usage ?? '',
      body.jump_distance ?? '',
      body.process_flow1 ?? '',
      body.process_flow2 ?? '',
      body.print_type ?? '',
      body.first_jump_distance ?? '',
      sequences ?? null,
      body.film_manufacturer ?? '',
      body.film_code ?? '',
      body.film_size ?? '',
      body.process_method ?? '',
      body.stamping_method ?? '',
      body.mold_code ?? '',
      body.layout_method ?? '',
      body.layout_way ?? '',
      body.jump_distance2 ?? '',
      body.mylar_material ?? '',
      body.mylar_specs ?? '',
      body.mylar_layout ?? '',
      body.mylar_jump ?? '',
      body.adhesive_type ?? '',
      body.adhesive_manufacturer ?? '',
      body.adhesive_code ?? '',
      body.adhesive_size ?? '',
      body.dashed_knife ?? 0,
      body.slice_per_row ?? '',
      body.slice_per_roll ?? '',
      body.slice_per_bundle ?? '',
      body.slice_per_bag ?? '',
      body.slice_per_box ?? '',
      body.back_knife_mold ?? '',
      body.back_mylar_mold ?? '',
      body.release_paper_code ?? '',
      body.release_paper_type ?? '',
      body.release_paper_specs ?? '',
      body.padding_material ?? '',
      body.packing_material ?? '',
      body.glue_type ?? '',
      body.packing_type ?? '',
      body.special_color ?? '',
      body.color_formula ?? '',
      body.file_path ?? '',
      body.sample_info ?? '',
      body.notes ?? '',
      body.creator ?? '',
      body.reviewer ?? '',
      body.factory_manager ?? '',
      body.quality_manager ?? '',
      body.sales ?? '',
      body.approver ?? '',
      body.status ?? 1,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return commonErrors.notFound('标准卡不存在或已被删除');
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
