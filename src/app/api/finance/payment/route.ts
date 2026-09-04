import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { FinanceApplicationService } from '@/application/services/FinanceApplicationService';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';

const financeService = FinanceApplicationService.create();

// 付款记录列表（仪表盘"付款记录"Tab 调用，原先只导出了 POST 导致该 Tab 永远空白）
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword') || '';
  const supplierId = searchParams.get('supplierId') || '';

  let where = 'WHERE p.deleted = 0';
  const params: SqlValue[] = [];
  if (keyword) {
    where += ' AND (p.payment_no LIKE ? OR p.remark LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like);
  }
  if (supplierId) {
    where += ' AND p.supplier_id = ?';
    params.push(Number(supplierId));
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM fin_payment_record p ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT p.*, s.supplier_name
     FROM fin_payment_record p
     LEFT JOIN pur_supplier s ON p.supplier_id = s.id
     ${where}
     ORDER BY p.payment_date DESC, p.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();

    if (!body.payable_id || !body.amount || !body.payment_date) {
      return errorResponse(ts('k_1e6mg6f'), 400, 400);
    }

    try {
      const result = await financeService.recordPayment({
        payableId: body.payable_id,
        amount: parseFloat(body.amount),
        paymentDate: body.payment_date,
        paymentMethod: body.payment_method || 'bank_transfer',
        currency: body.currency,
        exchangeRate: body.exchange_rate !== undefined ? parseFloat(body.exchange_rate) : undefined,
        remark: body.remark,
        createBy: userInfo.userId,
      });
      return successResponse(result, ts('k_1j2rwh9'));
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404, 404);
      if (error instanceof DomainError) return errorResponse(error.message, 400, 400);
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);
