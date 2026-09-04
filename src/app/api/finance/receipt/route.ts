import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { FinanceApplicationService } from '@/application/services/FinanceApplicationService';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';

const financeService = FinanceApplicationService.create();

// 收款记录列表（仪表盘"收款记录"Tab 调用，原先只导出了 POST 导致该 Tab 永远空白）
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword') || '';
  const customerId = searchParams.get('customerId') || '';

  let where = 'WHERE r.deleted = 0';
  const params: SqlValue[] = [];
  if (keyword) {
    where += ' AND (r.receipt_no LIKE ? OR r.remark LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like);
  }
  if (customerId) {
    where += ' AND r.customer_id = ?';
    params.push(Number(customerId));
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM fin_receipt_record r ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT r.*, c.customer_name
     FROM fin_receipt_record r
     LEFT JOIN crm_customer c ON r.customer_id = c.id
     ${where}
     ORDER BY r.receipt_date DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();

    if (!body.receivable_id || !body.amount || !body.receipt_date) {
      return errorResponse(ts('k_1onzq15'), 400, 400);
    }

    try {
      const result = await financeService.recordReceipt({
        receivableId: body.receivable_id,
        amount: parseFloat(body.amount),
        receiptDate: body.receipt_date,
        receiptMethod: body.receipt_method || 'bank_transfer',
        currency: body.currency,
        exchangeRate: body.exchange_rate !== undefined ? parseFloat(body.exchange_rate) : undefined,
        remark: body.remark,
        createBy: userInfo.userId,
      });
      return successResponse(result, ts('k_g26ckf'));
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404, 404);
      if (error instanceof DomainError) return errorResponse(error.message, 400, 400);
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);
