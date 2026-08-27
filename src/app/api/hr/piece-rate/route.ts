import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    let where = 'WHERE deleted = 0';
    const params: SqlValue[] = [];
    if (keyword) {
      where += ' AND (process_code LIKE ? OR product_type LIKE ?)';
      params.push('%' + keyword + '%', '%' + keyword + '%');
    }

    const rows = await query<DbRow>(
      `SELECT id, process_code, product_type, unit_price, effective_date, status, unit, quality_threshold, factory_id, remark
       FROM hr_piece_rate ${where} ORDER BY id DESC`,
      params
    );

    const list = rows.map((r) => ({
      id: r.id,
      processCode: r.process_code,
      // hr_piece_rate 无独立工序名称列，暂以工序编号填充工序名称
      processName: r.process_code,
      productType: r.product_type,
      unitPrice: r.unit_price,
      effectiveDate: r.effective_date,
      status: r.status,
    }));

    return successResponse({ list });
  },
  { errorMessage: '获取工序单价列表失败' }
);
