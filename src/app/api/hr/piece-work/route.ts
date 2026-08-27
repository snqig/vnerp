import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const processCode = searchParams.get('processCode') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let where = 'WHERE 1=1';
    const params: SqlValue[] = [];
    if (employeeId) {
      where += ' AND d.employee_id = ?';
      params.push(Number(employeeId));
    }
    if (processCode) {
      where += ' AND d.process_code = ?';
      params.push(processCode);
    }
    if (startDate) {
      where += ' AND d.work_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND d.work_date <= ?';
      params.push(endDate);
    }

    const rows = await query<DbRow>(
      `SELECT d.id, d.work_date, d.process_code, d.product_code, d.quantity, d.defective_quantity, d.unit_price, d.amount, e.name as employee_name
       FROM hr_piece_work_detail d
       LEFT JOIN sys_employee e ON d.employee_id = e.id
       ${where} ORDER BY d.work_date DESC, d.id DESC`,
      params
    );

    const list = rows.map((r) => {
      const quantity = Number(r.quantity) || 0;
      const defective = Number(r.defective_quantity) || 0;
      const passRate = quantity > 0 ? Number((((quantity - defective) / quantity) * 100).toFixed(2)) : 0;
      return {
        id: r.id,
        date: r.work_date,
        employeeName: r.employee_name || '',
        processCode: r.process_code,
        productCode: r.product_code,
        quantity,
        defectCount: defective,
        passRate,
        unitPrice: r.unit_price,
        amount: r.amount,
      };
    });

    return successResponse({ list });
  },
  { errorMessage: '获取计件产量列表失败' }
);
