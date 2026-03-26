import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';

// 标准卡数据接口
interface StandardCard {
  id?: number;
  card_no: string;
  customer_name: string;
  customer_code: string;
  product_name: string;
  version: string;
  date: string;
  document_code: string;
  finished_size: string;
  tolerance: string;
  material_name: string;
  material_type: string;
  layout_type: string;
  spacing: string;
  spacing_value: string;
  sheet_width: string;
  sheet_length: string;
  core_type: string;
  paper_direction: string;
  roll_width: string;
  paper_edge: string;
  standard_usage: string;
  jump_distance: string;
  process_flow1: string;
  process_flow2: string;
  print_type: string;
  first_jump_distance: string;
  sequences: string | object;
  film_manufacturer: string;
  film_code: string;
  film_size: string;
  process_method: string;
  stamping_method: string;
  mold_code: string;
  layout_method: string;
  layout_way: string;
  jump_distance2: string;
  mylar_material: string;
  mylar_specs: string;
  mylar_layout: string;
  mylar_jump: string;
  adhesive_type: string;
  adhesive_manufacturer: string;
  adhesive_code: string;
  adhesive_size: string;
  dashed_knife: number;
  slice_per_row: string;
  slice_per_roll: string;
  slice_per_bundle: string;
  slice_per_bag: string;
  slice_per_box: string;
  back_knife_mold: string;
  back_mylar_mold: string;
  release_paper_code: string;
  release_paper_type: string;
  release_paper_specs: string;
  padding_material: string;
  packing_material: string;
  glue_type: string;
  packing_type: string;
  special_color: string;
  color_formula: string;
  file_path: string;
  sample_info: string;
  notes: string;
  creator: string;
  reviewer: string;
  factory_manager: string;
  quality_manager: string;
  sales: string;
  approver: string;
  status: number;
  create_time?: string;
  update_time?: string;
}

// GET - 获取标准卡列表或单个标准卡
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (id) {
      const sql = 'SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0';
      const card = await queryOne<StandardCard>(sql, [parseInt(id)]);
      
      if (!card) {
        return NextResponse.json(
          { success: false, message: '标准卡不存在' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: card,
      });
    }

    let sql = `
      SELECT 
        id, card_no, customer_name, customer_code, product_name,
        version, date, material_name, print_type, process_method,
        status, create_time
      FROM prd_standard_card 
      WHERE deleted = 0
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(parseInt(status));
    }

    if (keyword) {
      sql += ' AND (card_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)';
      const likeKeyword = `%${keyword}%`;
      params.push(likeKeyword, likeKeyword, likeKeyword);
    }

    sql += ' ORDER BY create_time DESC';

    // 分页
    const offset = (page - 1) * pageSize;
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const cards = await query<StandardCard>(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM prd_standard_card WHERE deleted = 0';
    const countParams: any[] = [];
    
    if (status && status !== 'all') {
      countSql += ' AND status = ?';
      countParams.push(parseInt(status));
    }
    if (keyword) {
      countSql += ' AND (card_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)';
      const likeKeyword = `%${keyword}%`;
      countParams.push(likeKeyword, likeKeyword, likeKeyword);
    }
    
    const countResult = await query<{ total: number }>(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: cards,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取标准卡列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取标准卡列表失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - 创建标准卡
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const cardNo = body.card_no || `SC${Date.now()}`;
    
    const existing = await queryOne<StandardCard>(
      'SELECT id FROM prd_standard_card WHERE card_no = ? AND deleted = 0',
      [cardNo]
    );
    
    if (existing) {
      return NextResponse.json(
        { success: false, message: '标准卡编号已存在' },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO prd_standard_card (
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
        status, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
    `;

    const params = [
      cardNo,
      body.customer_name || '',
      body.customer_code || '',
      body.product_name || '',
      body.version || '',
      body.date || new Date().toISOString().split('T')[0],
      body.document_code || '',
      body.finished_size || '',
      body.tolerance || '',
      body.material_name || '',
      body.material_type || '',
      body.layout_type || '',
      body.spacing || '',
      body.spacing_value || '',
      body.sheet_width || '',
      body.sheet_length || '',
      body.core_type || '',
      body.paper_direction || '',
      body.roll_width || '',
      body.paper_edge || '',
      body.standard_usage || '',
      body.jump_distance || '',
      body.process_flow1 || '',
      body.process_flow2 || '',
      body.print_type || '',
      body.first_jump_distance || '',
      typeof body.sequences === 'object' ? JSON.stringify(body.sequences) : body.sequences || null,
      body.film_manufacturer || '',
      body.film_code || '',
      body.film_size || '',
      body.process_method || '',
      body.stamping_method || '',
      body.mold_code || '',
      body.layout_method || '',
      body.layout_way || '',
      body.jump_distance2 || '',
      body.mylar_material || '',
      body.mylar_specs || '',
      body.mylar_layout || '',
      body.mylar_jump || '',
      body.adhesive_type || '',
      body.adhesive_manufacturer || '',
      body.adhesive_code || '',
      body.adhesive_size || '',
      body.dashed_knife || 0,
      body.slice_per_row || '',
      body.slice_per_roll || '',
      body.slice_per_bundle || '',
      body.slice_per_bag || '',
      body.slice_per_box || '',
      body.back_knife_mold || '',
      body.back_mylar_mold || '',
      body.release_paper_code || '',
      body.release_paper_type || '',
      body.release_paper_specs || '',
      body.padding_material || '',
      body.packing_material || '',
      body.glue_type || '',
      body.packing_type || '',
      body.special_color || '',
      body.color_formula || '',
      body.file_path || '',
      body.sample_info || '',
      body.notes || '',
      body.creator || '',
      body.reviewer || '',
      body.factory_manager || '',
      body.quality_manager || '',
      body.sales || '',
      body.approver || ''
    ];

    const result = await execute(sql, params);

    return NextResponse.json({
      success: true,
      message: '标准卡创建成功',
      data: {
        id: (result as any).insertId,
        card_no: cardNo,
      },
    });
  } catch (error) {
    console.error('创建标准卡失败:', error);
    return NextResponse.json(
      { success: false, message: '创建标准卡失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - 更新标准卡
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少标准卡ID' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE prd_standard_card SET
        customer_name = ?,
        customer_code = ?,
        product_name = ?,
        version = ?,
        date = ?,
        document_code = ?,
        finished_size = ?,
        tolerance = ?,
        material_name = ?,
        material_type = ?,
        layout_type = ?,
        spacing = ?,
        spacing_value = ?,
        sheet_width = ?,
        sheet_length = ?,
        core_type = ?,
        paper_direction = ?,
        roll_width = ?,
        paper_edge = ?,
        standard_usage = ?,
        jump_distance = ?,
        process_flow1 = ?,
        process_flow2 = ?,
        print_type = ?,
        first_jump_distance = ?,
        sequences = ?,
        film_manufacturer = ?,
        film_code = ?,
        film_size = ?,
        process_method = ?,
        stamping_method = ?,
        mold_code = ?,
        layout_method = ?,
        layout_way = ?,
        jump_distance2 = ?,
        mylar_material = ?,
        mylar_specs = ?,
        mylar_layout = ?,
        mylar_jump = ?,
        adhesive_type = ?,
        adhesive_manufacturer = ?,
        adhesive_code = ?,
        adhesive_size = ?,
        dashed_knife = ?,
        slice_per_row = ?,
        slice_per_roll = ?,
        slice_per_bundle = ?,
        slice_per_bag = ?,
        slice_per_box = ?,
        back_knife_mold = ?,
        back_mylar_mold = ?,
        release_paper_code = ?,
        release_paper_type = ?,
        release_paper_specs = ?,
        padding_material = ?,
        packing_material = ?,
        glue_type = ?,
        packing_type = ?,
        special_color = ?,
        color_formula = ?,
        file_path = ?,
        sample_info = ?,
        notes = ?,
        creator = ?,
        reviewer = ?,
        factory_manager = ?,
        quality_manager = ?,
        sales = ?,
        approver = ?,
        status = ?
      WHERE id = ? AND deleted = 0
    `;

    const params = [
      body.customer_name || '',
      body.customer_code || '',
      body.product_name || '',
      body.version || '',
      body.date || new Date().toISOString().split('T')[0],
      body.document_code || '',
      body.finished_size || '',
      body.tolerance || '',
      body.material_name || '',
      body.material_type || '',
      body.layout_type || '',
      body.spacing || '',
      body.spacing_value || '',
      body.sheet_width || '',
      body.sheet_length || '',
      body.core_type || '',
      body.paper_direction || '',
      body.roll_width || '',
      body.paper_edge || '',
      body.standard_usage || '',
      body.jump_distance || '',
      body.process_flow1 || '',
      body.process_flow2 || '',
      body.print_type || '',
      body.first_jump_distance || '',
      typeof body.sequences === 'object' ? JSON.stringify(body.sequences) : body.sequences || null,
      body.film_manufacturer || '',
      body.film_code || '',
      body.film_size || '',
      body.process_method || '',
      body.stamping_method || '',
      body.mold_code || '',
      body.layout_method || '',
      body.layout_way || '',
      body.jump_distance2 || '',
      body.mylar_material || '',
      body.mylar_specs || '',
      body.mylar_layout || '',
      body.mylar_jump || '',
      body.adhesive_type || '',
      body.adhesive_manufacturer || '',
      body.adhesive_code || '',
      body.adhesive_size || '',
      body.dashed_knife || 0,
      body.slice_per_row || '',
      body.slice_per_roll || '',
      body.slice_per_bundle || '',
      body.slice_per_bag || '',
      body.slice_per_box || '',
      body.back_knife_mold || '',
      body.back_mylar_mold || '',
      body.release_paper_code || '',
      body.release_paper_type || '',
      body.release_paper_specs || '',
      body.padding_material || '',
      body.packing_material || '',
      body.glue_type || '',
      body.packing_type || '',
      body.special_color || '',
      body.color_formula || '',
      body.file_path || '',
      body.sample_info || '',
      body.notes || '',
      body.creator || '',
      body.reviewer || '',
      body.factory_manager || '',
      body.quality_manager || '',
      body.sales || '',
      body.approver || '',
      body.status || 1,
      id,
    ];

    const result = await execute(sql, params);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: '标准卡不存在或已被删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '标准卡更新成功',
    });
  } catch (error) {
    console.error('更新标准卡失败:', error);
    return NextResponse.json(
      { success: false, message: '更新标准卡失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - 删除标准卡（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少标准卡ID' },
        { status: 400 }
      );
    }

    const result = await execute(
      'UPDATE prd_standard_card SET deleted = 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: '标准卡不存在或已被删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '标准卡删除成功',
    });
  } catch (error) {
    console.error('删除标准卡失败:', error);
    return NextResponse.json(
      { success: false, message: '删除标准卡失败', error: (error as Error).message },
      { status: 500 }
    );
  }
}
