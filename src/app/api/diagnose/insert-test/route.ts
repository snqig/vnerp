import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async (_request: NextRequest) => {
  try {
    const result = await transaction(async (conn) => {
      const errors: string[] = [];

      const testInsert = async (table: string, sql: string, params: Loose[]) => {
        try {
          await conn.execute(sql, params);
          return { table, success: true };
        } catch (e) {
          return { table, success: false, error: (e as Error).message };
        }
      };

      const results = [];

      results.push(
        await testInsert(
          'inv_inbound_order',
          `INSERT INTO inv_inbound_order (order_no, supplier_name, warehouse_id, inbound_date, status, total_quantity, total_amount, create_time, update_time, deleted) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, NOW(), NOW(), 0)`,
          ['IN20250101001', '东莞PET薄膜厂', 1, 'pending', 500, 5000]
        )
      );

      results.push(
        await testInsert(
          'inv_inbound_item',
          `INSERT INTO inv_inbound_item (order_id, material_id, material_name, quantity, unit, unit_price, total_price, create_time) VALUES (?, 1, 'PET薄膜', ?, '卷', 10, ?, NOW())`,
          [1, 500, 5000]
        )
      );

      results.push(
        await testInsert(
          'qc_final_inspection',
          `INSERT INTO qc_final_inspection (inspection_no, work_order_no, product_name, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name, remark, inspection_date, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW(), 0)`,
          ['FI001', 'WO001', '美的空调面板标签', 'WO001', 5000, 5000, 0, 1, '周杰', '检验合格']
        )
      );

      return results;
    });

    return NextResponse.json({
      success: true,
      results: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
});
