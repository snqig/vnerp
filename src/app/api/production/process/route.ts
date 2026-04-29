import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取生产流程列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cardNo = searchParams.get('cardNo');

    let sql = `
      SELECT 
        pc.id,
        pc.card_no,
        pc.qr_code,
        pc.work_order_no,
        pc.product_code,
        pc.product_name,
        pc.material_spec,
        pc.work_order_date,
        pc.plan_qty,
        pc.main_label_no,
        pc.burdening_status,
        pc.lock_status,
        pc.create_user_name,
        pc.create_time,
        pc.update_time,
        sc.customer_name,
        sc.customer_code,
        sc.process_flow1,
        sc.process_flow2,
        sc.print_type,
        sc.film_manufacturer,
        sc.film_code,
        sc.mold_code
      FROM prd_process_card pc
      LEFT JOIN prd_standard_card sc ON pc.product_code = sc.id
      WHERE pc.deleted = 0 AND pc.burdening_status >= 1
    `;

    const params: any[] = [];

    if (status) {
      sql += ` AND pc.burdening_status = ?`;
      params.push(status);
    }

    if (cardNo) {
      sql += ` AND pc.card_no LIKE ?`;
      params.push(`%${cardNo}%`);
    }

    sql += ` ORDER BY pc.work_order_date DESC, pc.create_time DESC`;

    const processes = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: processes,
    });
  } catch (error) {
    console.error('获取生产流程失败:', error);
    return NextResponse.json(
      { success: false, message: '获取生产流程失败' },
      { status: 500 }
    );
  }
}

// 更新生产流程状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, processStatus, currentProcess, operatorId, operatorName, remark, cardNo } = body;

    // 更新流程卡状态
    await query(
      `UPDATE prd_process_card 
       SET burdening_status = ?, update_time = NOW() 
       WHERE id = ?`,
      [processStatus, id]
    );

    // 记录流程追踪
    await query(
      `INSERT INTO inv_trace_record (
        trace_no, card_id, card_no, trace_type, 
        operator_id, operator_name, trace_time, remark, create_time
      ) VALUES (
        CONCAT('TR', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(FLOOR(RAND() * 1000), 3, '0')),
        ?, ?, ?, ?, ?, NOW(), ?, NOW()
      )`,
      [id, cardNo, currentProcess, operatorId, operatorName, remark]
    );

    return NextResponse.json({
      success: true,
      message: '流程更新成功',
    });
  } catch (error) {
    console.error('更新生产流程失败:', error);
    return NextResponse.json(
      { success: false, message: '更新生产流程失败' },
      { status: 500 }
    );
  }
}
