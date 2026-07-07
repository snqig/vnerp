import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { FinanceApplicationService } from '@/application/services/FinanceApplicationService';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';

const financeService = FinanceApplicationService.create();

export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();

    if (!body.payable_id || !body.amount || !body.payment_date) {
      return errorResponse('缺少必填字段: payable_id, amount, payment_date', 400, 400);
    }

    try {
      const result = await financeService.recordPayment({
        payableId: body.payable_id,
        amount: parseFloat(body.amount),
        paymentDate: body.payment_date,
        paymentMethod: body.payment_method || 'bank_transfer',
        remark: body.remark,
        createBy: userInfo.userId,
      });
      return successResponse(result, '付款登记成功');
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404, 404);
      if (error instanceof DomainError) return errorResponse(error.message, 400, 400);
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);
