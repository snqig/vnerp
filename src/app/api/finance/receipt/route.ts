import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { FinanceApplicationService } from '@/application/services/FinanceApplicationService';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';

const financeService = new FinanceApplicationService();

export const POST = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();

    if (!body.receivable_id || !body.amount || !body.receipt_date) {
      return errorResponse('缺少必填字段: receivable_id, amount, receipt_date', 400, 400);
    }

    try {
      const result = await financeService.recordReceipt({
        receivableId: body.receivable_id,
        amount: parseFloat(body.amount),
        receiptDate: body.receipt_date,
        receiptMethod: body.receipt_method || 'bank_transfer',
        remark: body.remark,
        createBy: userInfo.userId,
      });
      return successResponse(result, '收款登记成功');
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404, 404);
      if (error instanceof DomainError) return errorResponse(error.message, 400, 400);
      throw error;
    }
  },
  { permission: 'finance:receipt' }
);
